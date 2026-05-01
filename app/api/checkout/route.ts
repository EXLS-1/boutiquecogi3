import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "better-auth";

interface CheckoutItem {
  id: string;
  quantity: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  email: string;
  userId?: string;
  phone?: string;
  address?: string;
}

function validateCheckoutBody(body: any): { valid: boolean; error?: string; data?: CheckoutBody } {
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return { valid: false, error: "Panier vide ou invalide" };
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    return { valid: false, error: "Email invalide" };
  }

  for (const item of body.items) {
    if (!item.id || typeof item.id !== 'string') {
      return { valid: false, error: `ID produit invalide: ${item.id}` };
    }
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
      return { valid: false, error: `Quantité invalide pour le produit ${item.id}` };
    }
  }

  return {
    valid: true,
    data: {
      items: body.items,
      email: body.email,
      userId: body.userId,
      phone: body.phone || "",
      address: body.address || ""
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    const validation = validateCheckoutBody(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Données invalides" },
        { status: 400 }
      );
    }

    const { items, email, phone, address } = validation.data;

    // Sécurité : On utilise l'ID de la session, pas celui du body
    const userId = session?.user?.id;

    // Agrégation des quantités pour gérer les doublons d'ID dans la requête
    const aggregatedItems = items.reduce((acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Récupérer les produits depuis la base de données (prix réels)
    const productIds = Object.keys(aggregatedItems);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isArchived: false
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        stock: true
      }
    });

    // Vérifier que tous les produits existent
    if (products.length !== items.length) {
      const foundIds = new Set(products.map(p => p.id));
      const missingIds = productIds.filter(id => !foundIds.has(id));
      return NextResponse.json(
        { error: `Produits non trouvés: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Vérifier les stocks
    for (const productId of productIds) {
      const product = products.find(p => p.id === productId);
      const requestedQty = aggregatedItems[productId];
      
      if (!product) {
        return NextResponse.json(
          { error: `Produit non trouvé: ${productId}` },
          { status: 404 }
        );
      }
      if (product.stock < requestedQty) {
        return NextResponse.json(
          { error: `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}` },
          { status: 400 }
        );
      }
    }

    // Calculer le montant total depuis la base de données (sécurisé)
    const totalAmount = items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id)!;
      // Le Dollar utilise les cents (x100)
      const priceInCents = Math.round(Number(product.price) * 100);
      return sum + (priceInCents * item.quantity);
    }, 0);

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Le montant total doit être supérieur à 0" },
        { status: 400 }
      );
    }

    // Créer les line items pour Stripe
    const lineItems = items.map(item => {
      const product = products.find(p => p.id === item.id)!;
      const priceInCents = Math.round(Number(product.price) * 100);
      
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description || "",
            images: product.images && product.images.length > 0 ? product.images.slice(0, 1) : []
          },
          unit_amount: priceInCents
        },
        quantity: item.quantity
      };
    });

    // Créer la commande en base de données *après* la création de la session Stripe
    // pour éviter les commandes orphelines en cas d'échec de Stripe.
    // Ou créer la commande ici en statut 'pending' et la supprimer si Stripe échoue.
    const order = await prisma.order.create({
      data: {
        userId: userId || null,
        totalAmount,
        isPaid: false, // Sera mis à jour par le webhook Stripe
        phone: phone || "",
        address: address || "", // L'adresse complète sera mise à jour par le webhook
        orderItems: {
          create: items.map(item => {
            const product = products.find(p => p.id === item.id)!;
            return {
              productId: item.id,
              quantity: item.quantity,
              price: Math.round(Number(product.price) * 100)
            };
          })
        }
      },
      select: {
        id: true,
        totalAmount: true
      }
    });


    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout`,
      customer_email: email,
      metadata: {
        orderId: order.id,
        userId: userId || "", // Stocker l'ID utilisateur pour le webhook
      }
    });

    // Mettre à jour la commande avec le Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      clientSecret: session.client_secret 
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Une commande avec cette session existe déjà" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}
// tmp-units-probe.ts — détermine l'unité des colonnes monétaires Int (majeur vs centimes)
// Script de diagnostic manuel (non inclus dans le build Next) : on garde les
// selects strictement alignés sur `prisma/schema.prisma`.
import { prisma } from "./lib/prisma";

async function main() {
  // Montants commande = `totalAmount`, `grandTotal`, `taxAmount`,
  // `discountAmount`, `shippingCost` (pas de `subtotalAmount`).
  // Prix produit = scalaire `Product.basePrice` (Decimal) — pas de relation
  // `productPrice` sur ce schema.
  const o = await prisma.order.findFirst({
    select: {
      orderNumber: true,
      subtotalAmount: true,
      grandTotal: true,
      totalAmount: true,
      taxAmount: true,
      discountAmount: true,
      shippingCost: true,
      currency: true,
      items: {
        select: {
          unitPrice: true,
          quantity: true,
          subtotal: true,
          product: { select: { basePrice: true } },
        },
      },
    },
  });
  console.log("ORDER", JSON.stringify(o, null, 2));
}

main()
  .catch((e) => console.log("ERR", e instanceof Error ? e.message : String(e)))
  .finally(() => prisma.$disconnect());

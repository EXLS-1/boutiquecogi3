"use client";

import useCart from "@/store/use-cart";
import Link from "next/link";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function SuccessPage() {
  const { removeAll } = useCart();
  useEffect(() => {
    removeAll();
    // Afficher les notifications de succès
    toast.success("Paiement réussi! 🎉");
    toast.success("Merci pour votre achat!", {
      duration: 3000,
    });
  }, [removeAll]);
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4">✅ Paiement réussi !</h1>
      <p className="mb-4">
        Merci pour votre achat. Votre commande est en cours de traitement.
      </p>
      <Link href="/products" className="text-blue-600 hover:underline">
        Continuer vos achats
      </Link>
    </div>
  );
}

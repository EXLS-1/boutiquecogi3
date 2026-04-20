"use client";

import Image from "next/image";
import { Product } from "@/types/product";
import useCart from "@/store/use-cart";
import toast from "react-hot-toast";

interface Props {
  product: Product;
}

export const ProductDetail = ({ product }: Props) => {
  const { addItem, items, updateQuantity } = useCart();
  const cartItem = items.find(i => i.id === product.id);
  const quantity = cartItem?.quantity ?? 1;

  const handleAdd = () => {
    addItem({ ...product, quantity });
    toast.success("Produit ajouté au panier");
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 grid lg:grid-cols-2 gap-12">
      <Image
        src={product.image}
        alt={product.name}
        width={600}
        height={600}
        className="rounded-xl object-cover"
        priority
      />

      <div className="space-y-6">
        <h1 className="text-5xl font-playfair font-bold">
          {product.name}
        </h1>

        <p className="text-3xl">
          {product.price.toLocaleString()} XOF
        </p>

        <p className="text-gray-600">
          {product.description}
        </p>

        <div className="flex gap-4">
          <button onClick={() => updateQuantity(product.id, "decrease")}>-</button>
          <span>{quantity}</span>
          <button onClick={() => updateQuantity(product.id, "increase")}>+</button>
        </div>

        <button
          onClick={handleAdd}
          className="bg-black text-white px-8 py-4 uppercase tracking-widest"
        >
          Ajouter au panier
        </button>
      </div>
    </div>
  );
};
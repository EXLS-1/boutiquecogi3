"use client";

import { Product } from "@prisma/client"; // Utilisation du type Prisma
import { Card, CardContent, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  products: Product[]; // Unifié avec le reste du site
}

export const Carousel = ({ products }: Props) => {
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    if (products.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [products.length]);

  if (!products || products.length === 0) return null;

  const currentProduct = products[current];

  return (
    <Card className="relative overflow-hidden rounded-lg shadow-md border-gray-300">
      <div className="relative h-125 w-full">
        <Image
          src={currentProduct.images[0]} // Prisma utilise un tableau de chaînes
          alt={currentProduct.name}
          fill
          className="object-cover transition-opacity duration-1000"
        />
      </div>
      <CardContent className="absolute inset-0 flex flex-col items-center justify-end pb-12 bg-linear-to-t from-black/70 to-transparent text-white">
        <CardTitle className="text-4xl font-bold mb-2">
          {currentProduct.name}
        </CardTitle>
        <p className="text-2xl font-light">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(currentProduct.price)}
        </p>
      </CardContent>
    </Card>
  );
};

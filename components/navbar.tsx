"use client";

import Link from "next/link";
import useCart from "@/store/use-cart";
import { AuthButton } from "@/components/auth-button";
import { useUIStore } from "@/store/use-ui-store";
import { useState } from "react";

export const Navbar = () => {
  const { items } = useCart();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const { toggleLeftSidebar, toggleRightSidebar } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-60 h-17.5 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
          {/* Menu Toggle (Mobile/Desktop Left) */}
        <button
          onClick={toggleLeftSidebar}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
          aria-label="Menu"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>

          {/* Logo */}
        <div className="absolute left-1/2 -translate-x-1/2"></div>
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent">
              Boutique COGI
            </div>
          </Link>
        </div>

          {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Femme
          </Link>
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Homme
          </Link>
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Enfant
          </Link>
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Sac
          </Link>
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Chaussure
          </Link>
          <Link href="/" className="text-gray-700 hover:text-cyan-600 transition">
            Accessoire
          </Link>
        </div>

          {/* Actions Droite */}
        <div className="flex items-center gap-2 md:gap-4">
          
          <div className="hidden md:block">
            <AuthButton />
          </div>

          <button
            onClick={toggleRightSidebar}
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
            >
              <i className="fas fa-shopping-cart text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 h-5 w-5 bg-black text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {cartCount}
              </span>
            )}            
          </button>

        </div>

      </div>
    </nav>
  );
};

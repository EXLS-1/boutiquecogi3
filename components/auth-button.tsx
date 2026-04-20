"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export function AuthButton() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fermer le menu quand on clique en dehors
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  if (session) {
    return (
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 text-sm font-medium hover:text-gray-700"
        >
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-xs font-bold">
              {session.user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-4 border-b">
              <p className="font-semibold text-sm">{session.user?.name}</p>
              <p className="text-xs text-gray-600">{session.user?.email}</p>
            </div>
            <Link
              href="/profile"
              className="block px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Mon Profil
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="bg-black text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-800"
    >
      Connexion
    </button>
  );
}

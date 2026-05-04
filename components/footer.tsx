"use client";

import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <footer className="bg-white text-cyan-500 pt-6 pb-6 border-t border-cyan-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-cyan-500 text-lg font-lato">
            &copy; {new Date().getFullYear()} Boutique COGI. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <a href="/terms of sale" className="text-cyan-500 hover:text-rose-500 text-lg transition-colors">Politique de Vente</a>
            <a href="/terms of use" className="text-cyan-500 hover:text-rose-500 text-lg transition-colors">Condition Générale</a>
            <a href="/privacy" className="text-cyan-500 hover:text-rose-500 text-lg transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

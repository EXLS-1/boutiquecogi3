"use client";

import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <footer className="bg-[var(--primary)] text-[var(--primary-foreground)] pt-20 pb-10 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Marque */}
          <div>
            <h3 className="font-playfair text-2xl font-bold tracking-widest uppercase text-[var(--turquoise)] mb-6">
              Boutique COGI
            </h3>
            <p className="font-lato text-sm leading-relaxed text-gray-400">
              L'excellence et la robustesse au service de la mode. Une plateforme sécurisée pour toutes vos envies.
            </p>
          </div>

          {/* Navigation Rapide */}
          <div>
            <h4 className="font-lato font-bold tracking-widest uppercase mb-6 text-white">
              Boutique
            </h4>
            <ul className="space-y-3 font-lato text-sm text-gray-400">
              {['Femme', 'Homme', 'Enfant', 'Accessoires'].map((item) => (
                <li key={item}>
                  <a href={`/category/${item.toLowerCase()}`} className="hover:text-[var(--rose)] transition-colors">
                    Collection {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {/* Newsletter (Nouveau) */}
          <div className="lg:col-span-2">
            <h4 className="font-lato font-bold tracking-widest uppercase mb-6 text-white">
              Newsletter
            </h4>
            <p className="font-lato text-sm text-gray-400 mb-4">
              Inscrivez-vous pour recevoir nos offres exclusives et les dernières nouveautés.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Votre adresse e-mail"
                required
                className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:border-[var(--turquoise)] transition-colors font-lato placeholder:text-gray-500"
              />
              <Button 
                type="submit" 
                className="bg-[var(--turquoise)] text-black hover:bg-[var(--rose)] hover:text-white font-bold uppercase tracking-wider transition-colors"
              >
                S'inscrire
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm font-lato">
            &copy; {new Date().getFullYear()} Boutique COGI. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <a href="/terms" className="text-gray-500 hover:text-[var(--rose)] text-sm transition-colors">CGV</a>
            <a href="/privacy" className="text-gray-500 hover:text-[var(--rose)] text-sm transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
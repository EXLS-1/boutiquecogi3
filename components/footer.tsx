"use client";

import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <footer className="bg-sky-500 text-white pt-20 pb-10 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Marque */}
          <div>
            <h3 className="font-playfair text-2xl font-bold tracking-widest uppercase text-sky-100 mb-6">
              Boutique COGI
            </h3>
            <p className="font-lato text-sm leading-relaxed text-sky-100">
              L'excellence et la robustesse au service de la mode. Une plateforme sécurisée pour toutes vos envies.
            </p>
          </div>

          {/* Navigation Rapide */}
          <div>
            <h4 className="font-lato font-bold tracking-widest uppercase mb-6 text-white">
              Boutique
            </h4>
            <ul className="space-y-3 font-lato text-sm text-sky-100">
              {['Femme', 'Homme', 'Enfant', 'Accessoires'].map((item) => (
                <li key={item}>
                  <a href={`/category/${item.toLowerCase()}`} className="hover:text-rose-500 transition-colors">
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
            <p className="font-lato text-sm text-sky-100 mb-4">
              Inscrivez-vous pour recevoir nos offres exclusives et les dernières nouveautés.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Votre adresse e-mail"
                required
                className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-md focus:outline-none focus:border-sky-500 transition-colors font-lato placeholder:text-slate-300"
              />
              <Button 
                type="submit" 
                className="bg-sky-500 text-black hover:bg-rose-500 hover:text-white font-bold uppercase tracking-wider transition-colors"
              >
                S'inscrire
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/80 text-sm font-lato">
            &copy; {new Date().getFullYear()} Boutique COGI. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <a href="/terms" className="text-white/80 hover:text-rose-500 text-sm transition-colors">CGV</a>
            <a href="/privacy" className="text-white/80 hover:text-rose-500 text-sm transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
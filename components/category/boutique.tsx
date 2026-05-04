// components/boutique.tsx

import BoutiqueFemme from "./boutique-femme";
import BoutiqueHomme from './boutique-homme';
import BoutiqueEnfant from './boutique-enfant';
import BoutiqueSac from './boutique-sac';
import BoutiqueChaussure from './boutique-chaussure';
import BoutiqueAccessoire from './boutique-accessoire';

export default function Boutique() {
  return (
    <section className="py-20 bg-gray-50" id="boutique">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4">
            NOTRE BOUTIQUE
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            Découvrez nos collections par catégorie
          </p>
        </div>

          {/* Grille des catégories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          
            {/* Catégorie : Femme */}
          <BoutiqueFemme />
          
            {/* Catégorie : Homme */}
          <BoutiqueHomme />

            {/* Catégorie : Enfant */}
          <BoutiqueEnfant />

            {/* Catégorie : Sac */}
          <BoutiqueSac />

            {/* Catégorie : Chaussure */}
          <BoutiqueChaussure />

          {/* Catégorie : Accessoire */}
          <BoutiqueAccessoire />

        </div>
      </div>
    </section>
  );
}
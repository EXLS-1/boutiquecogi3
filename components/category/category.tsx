// components/category.tsx

import Femme from "./femme";
import Homme from './homme';
import Enfant from './enfant';
import Sac from './sac';
import Chaussure from './chaussure';
import Accessoire from './accessoire';

export default function Category() {
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
          <Femme />
          
            {/* Catégorie : Homme */}
          <Homme />

            {/* Catégorie : Enfant */}
          <Enfant />

            {/* Catégorie : Sac */}
          <Sac />

            {/* Catégorie : Chaussure */}
          <Chaussure />

          {/* Catégorie : Accessoire */}
          <Accessoire />

        </div>
      </div>
    </section>
  );
}
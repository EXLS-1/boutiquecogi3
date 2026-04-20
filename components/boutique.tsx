// components/boutique.tsx
import image from next

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
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <image
              src="/Media-p-20260218/pict01.jpeg"
              alt="Habit Femme"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                HABIT FEMME
              </h3>
              <p className="text-gray-200 mb-6">Élégance et sophistication</p>
              <a
                href="#catalogue-femme"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>

          {/* Catégorie : Homme */}
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <image
              src="/category-homme.jpeg"
              alt="Habit Homme"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                HABIT HOMME
              </h3>
              <p className="text-gray-200 mb-6">Style moderne et raffiné</p>
              <a
                href="#catalogue-homme"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>

          {/* Catégorie : Enfant */}
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <image
              src="/category-enfant.jpg"
              alt="Habit Enfant"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                HABIT ENFANT
              </h3>
              <p className="text-gray-200 mb-6">Tendresse et qualité</p>
              <a
                href="#catalogue-enfant"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>

          {/* Catégorie : Chaussure */}
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <image
              src="/category-chaussure.jpg"
              alt="Chaussure Dame"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                CHAUSSURE DAME
              </h3>
              <p className="text-gray-200 mb-6">Confort et élégance</p>
              <a
                href="#catalogue-chaussure"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>

          {/* Catégorie : Sac */}
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <img
              src="/category-sac.jpg"
              alt="Sac Dame"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                SAC DAME
              </h3>
              <p className="text-gray-200 mb-6">Accessoires indispensables</p>
              <a
                href="#catalogue-sac"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>

          {/* Catégorie : Accessoire */}
          <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
            <img
              src="/category-accessoire.jpg"
              alt="Accessoire"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
              <h3 className="font-playfair text-2xl font-bold mb-2">
                ACCESSOIRE
              </h3>
              <p className="text-gray-200 mb-6">Touches finales parfaites</p>
              <a
                href="#catalogue-accessoire"
                className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
              >
                VOIR LA COLLECTION
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
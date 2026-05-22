// components/Social/social-network.tsx
import socialData from "@/data/social-data.json";
import SocialButton from "./social/social-button";

export default function SocialNetworks() {
  const networks = socialData?.social || [];

  if (networks.length === 0) {
    return null; // Évite de rendre une section vide si le JSON plante
  }

  return (
    <section className="py-20 bg-gray-50 border-t border-gray-200" id="reseaux">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <h2 className="font-playfair text-3xl md:text-5xl font-bold text-gray-900 uppercase tracking-wider mb-4">
            SUIVEZ-NOUS
          </h2>
          <p className="font-lato text-gray-500 text-lg">
            Restez connecté avec notre communauté
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {networks.map((network) => (
            <SocialButton
              key={network.id}
              url={network.url}
              name={network.name}
              icon={network.icon}
              brandColor={network.brandColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
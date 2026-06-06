// components/social/social-network.tsx

import SocialButton from "@/components/social/social-button";
import { socialNetworks } from "@/data/social-network";

export default function SocialNetworks() {
  if (socialNetworks.length === 0) {
    return null;
  }

  return (
    <section
      id="reseaux"
      aria-labelledby="social-networks-title"
      className="
        border-t
        border-cyan-200
        bg-cyan-50
        py-20
      "
    >
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          text-center
          sm:px-6
          lg:px-8
        "
      >
        <div className="mb-12">
          <h2
            id="social-networks-title"
            className="
              text-3xl
              font-bold
              uppercase
              tracking-wider
              text-cyan-400
              md:text-5xl
            "
          >
            SUIVEZ-NOUS
          </h2>

          <p
            className="
              mt-4
              text-lg
              text-cyan-400
            "
          >
            Restez connecté avec notre communauté
          </p>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            justify-center
            gap-6
          "
        >
          {socialNetworks.map((network) => (
            <SocialButton
              key={network.id}
              url={network.url}
              name={network.name}
              icon={network.icon}
              brandColor={network.brandColor}
              ariaLabel={network.ariaLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
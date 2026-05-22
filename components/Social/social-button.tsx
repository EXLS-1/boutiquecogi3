// components/Social/social-button.tsx
export default function SocialButton({ url, name, icon, brandColor }) {
  const validHref = url && url !== "" ? url : "#";

  // Gestion robuste de la couleur (qu'elle soit un hex ou un gradient)
  const isGradient = brandColor.includes("gradient");
  const backgroundStyle = isGradient 
    ? { backgroundImage: brandColor } 
    : { backgroundColor: brandColor };

  return (
    <a
      href={validHref}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...backgroundStyle,
        // On simule l'ombre Tailwind avec la couleur de la marque
        boxShadow: isGradient ? "0 10px 15px -3px rgba(0, 0, 0, 0.3)" : `0 10px 15px -3px ${brandColor}4D` 
      }}
      className="flex flex-col items-center justify-center w-24 h-24 rounded-full text-white transition-transform hover:-translate-y-2 gap-2"
      aria-label={`Suivez-nous sur ${name}`}
    >
      <i className={`${icon} text-3xl`} aria-hidden="true"></i>
      <span className="text-xs font-bold uppercase tracking-wider">
        {name}
      </span>
    </a>
  );
}
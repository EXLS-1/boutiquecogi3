// components/auth/profile-header.tsx
// This component renders the header section of the user's profile page.
// It displays a welcome message along with the user's name.
interface ProfileHeaderProps {
  userName: string; // Le nom de l'utilisateur
  email: string; // L'adresse email de l'utilisateur
}

export function ProfileHeader({
  userName,
  email,
}: ProfileHeaderProps) {
  return (
    <header className="space-y-4"> {/* Ajustement de l'espacement pour le contenu combiné */}
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Mon Profil
      </h1>

      <p className="text-slate-500">
        Bienvenue,{" "}
        <span className="font-semibold text-cyan-600"> {/* Utilisation de text-cyan-600 pour la cohérence avec le thème */}
          {userName}
        </span>
      </p>

      {/* Intégration du contenu de account-section.tsx */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">
            Informations du compte
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">
              Nom complet
            </p>

            <p className="font-semibold text-slate-900">
              {userName}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">
              Adresse Email
            </p>

            <p className="font-semibold text-slate-900">
              {email}
            </p>
          </div>
        </div>
      </section>
    </header>
  );
}
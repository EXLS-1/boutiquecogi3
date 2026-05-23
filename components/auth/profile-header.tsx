// components/auth/profile-header.tsx

interface ProfileHeaderProps {
  userName: string;
}

export function ProfileHeader({
  userName,
}: ProfileHeaderProps) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Mon Profil
      </h1>

      <p className="text-slate-500">
        Bienvenue,{" "}
        <span className="font-semibold text-turquoise-600">
          {userName}
        </span>
      </p>
    </header>
  );
}
// components/auth/account-section.tsx

interface AccountSectionProps {
  name: string;
  email: string;
}

export function AccountSection({
  name,
  email,
}: AccountSectionProps) {
  return (
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
            {name}
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
  );
}
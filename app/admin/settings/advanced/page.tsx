// app/admin/settings/advanced/page.tsx
import { Require2FA } from '@/components/security/require-2fa';

export default function AdvancedSettingsPage() {
  return (
    <Require2FA redirectIfNotSetup="/admin/setup-2fa">
      <div>
        <h1>Paramètres sensibles</h1>
        {/* Contenu protégé */}
      </div>
    </Require2FA>
  );
}

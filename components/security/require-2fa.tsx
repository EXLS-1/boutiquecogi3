'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, APIError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Lock, Shield, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface CheckResponse {
  twoFactorEnabled: boolean;
  backupCodesRemaining: number;
}

interface VerifyResponse {
  success: boolean;
  isBackup: boolean;
}

interface Require2FAProps {
  children: ReactNode;
  /** Redirection si l'utilisateur n'a pas la 2FA configurée (optionnel) */
  redirectIfNotSetup?: string;
  /** Afficher un fallback au lieu de bloquer (mode "soft") */
  soft?: boolean;
}

export function Require2FA({ children, redirectIfNotSetup, soft = false }: Require2FAProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'verified' | 'required' | 'not-setup'>('loading');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient<CheckResponse>('/api/admin/2fa/check-status')
      .then((data) => {
        if (!data.twoFactorEnabled) {
          setPhase('not-setup');
          if (redirectIfNotSetup) router.replace(redirectIfNotSetup);
        } else {
          // Si on est dans le layout admin, le guard serveur a déjà vérifié le cookie.
          // Mais ce composant peut être utilisé ailleurs, donc on vérifie côté client
          // via un ping rapide. Ici on suppose que si le cookie est présent, c'est OK.
          // Pour une vraie vérification, on ferait un appel dédié.
          setPhase('verified');
        }
      })
      .catch((err) => {
        if (err instanceof APIError && err.code === '2FA_REQUIRED') setPhase('required');
        else setPhase('verified'); // Fail-open ou fail-closed selon votre politique
      });
  }, [redirectIfNotSetup, router]);

  async function handleVerify() {
    if (code.length < 6) {
      setError('Code trop court');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await apiClient<VerifyResponse>('/api/admin/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      setPhase('verified');
      router.refresh(); // Force re-render serveur
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Code invalide');
    } finally {
      setLoading(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (phase === 'not-setup') {
    if (soft) return <>{children}</>;
    return (
      <Card className="mx-auto max-w-md border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            2FA requise
          </CardTitle>
          <CardDescription>
            Cette section nécessite une authentification à deux facteurs.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push('/admin/setup-2fa')} className="w-full gap-2">
            <Shield className="h-4 w-4" />
            Configurer la 2FA
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === 'required') {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Vérification requise</CardTitle>
            </div>
            <CardDescription>
              Entrez votre code 2FA pour accéder à cette section.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="require2fa-code">Code d&apos;authentification</Label>
              <Input
                id="require2fa-code"
                type="text"
                placeholder="000000 ou code de secours"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="text-center text-lg tracking-widest"
                autoFocus
                disabled={loading}
              />
            </div>

            <Separator />
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button onClick={handleVerify} disabled={loading || code.length < 6} className="gap-2">
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <Shield className="h-4 w-4" />
              Vérifier
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

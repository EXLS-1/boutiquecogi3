'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, APIError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Trash2, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  backupCodesRemaining: number;
}

export default function SecurityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiClient<SecurityStatus>('/api/admin/2fa/check-status')
      .then(setStatus)
      .catch(() => setStatus({ twoFactorEnabled: false, backupCodesRemaining: 0 }))
      .finally(() => setLoading(false));
  }, []);

  async function handleDisable() {
    if (!password || !code) {
      setError('Mot de passe et code 2FA requis');
      return;
    }
    setProcessing(true);
    setError('');

    try {
      await apiClient('/api/admin/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password, code }),
      });
      setOpen(false);
      setStatus({ twoFactorEnabled: false, backupCodesRemaining: 0 });
      setPassword('');
      setCode('');
      router.refresh();
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Échec de la désactivation');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Card className="max-w-2xl animate-pulse">
          <CardHeader><div className="h-6 w-1/3 bg-muted rounded" /></CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sécurité du compte</h1>
        <p className="text-muted-foreground">Gérez l&apos;authentification à deux facteurs et les accès.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {status?.twoFactorEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              )}
              Authentification à deux facteurs
            </CardTitle>
            <CardDescription>
              {status?.twoFactorEnabled
                ? 'Votre compte est protégé par une couche supplémentaire.'
                : 'Activez la 2FA pour sécuriser votre compte administrateur.'}
            </CardDescription>
          </div>
          <Badge variant={status?.twoFactorEnabled ? 'default' : 'secondary'}>
            {status?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {status?.twoFactorEnabled && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Codes de secours restants</span>
                <span className="font-medium">{status.backupCodesRemaining} / 10</span>
              </div>
            </div>
          )}

          {!status?.twoFactorEnabled ? (
            <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                L&apos;accès à l&apos;administration nécessite la 2FA. Cliquez ci-dessous pour la configurer.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {!status?.twoFactorEnabled ? (
            <Button onClick={() => router.push('/admin/setup-2fa')} className="gap-2">
              <Shield className="h-4 w-4" />
              Activer la 2FA
            </Button>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Désactiver la 2FA
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmer la désactivation
                  </DialogTitle>
                  <DialogDescription>
                    Cette action est irréversible. Toutes les sessions actives seront déconnectées.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="disable-password">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input
                        id="disable-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disable-code">Code 2FA actuel (6 chiffres)</Label>
                    <Input
                      id="disable-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="tracking-widest text-center"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button variant="destructive" onClick={handleDisable} disabled={processing} className="gap-2">
                    {processing && <RefreshCw className="h-4 w-4 animate-spin" />}
                    <Lock className="h-4 w-4" />
                    Confirmer la désactivation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

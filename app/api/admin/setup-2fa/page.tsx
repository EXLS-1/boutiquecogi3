'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiClient, APIError } from '@/lib/api-client';
import { use2FAStore } from '@/stores/2fa-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Copy, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface SetupResponse {
  success: boolean;
  uri: string;
  qrDataUrl: string;
}

interface VerifyResponse {
  success: boolean;
  backupCodes: string[];
  message: string;
}

export default function Setup2FAPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'scan' | 'verify' | 'backup' | 'done'>('loading');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [manualUri, setManualUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const { setRequiresSetup } = use2FAStore();

  useEffect(() => {
    let cancelled = false;
    apiClient<SetupResponse>('/api/admin/2fa/setup')
      .then((data) => {
        if (cancelled) return;
        setQrDataUrl(data.qrDataUrl);
        setManualUri(data.uri);
        setPhase('scan');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof APIError && err.code === '2FA_ALREADY_ENABLED') {
          router.replace('/admin');
        } else {
          setError(err.message || 'Impossible de charger la configuration 2FA');
          setPhase('scan');
        }
      });
    return () => { cancelled = true; };
  }, [router]);

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient<VerifyResponse>('/api/admin/2fa/verify-setup', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setBackupCodes(res.backupCodes);
      setPhase('backup');
      setRequiresSetup(false);
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Vérification échouée');
    } finally {
      setLoading(false);
    }
  }

  function copyAllCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="aspect-square w-full max-w-[240px] mx-auto" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Authentification à deux facteurs</CardTitle>
          </div>
          <CardDescription>
            {phase === 'scan' && 'Scannez le QR code avec votre application d\'authentification'}
            {phase === 'backup' && 'Sauvegardez immédiatement ces codes de secours'}
            {phase === 'done' && 'Votre compte est maintenant sécurisé'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {phase === 'scan' && (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border bg-white p-2">
                  {qrDataUrl ? (
                    <Image src={qrDataUrl} alt="QR Code 2FA" width={240} height={240} className="rounded" unoptimized />
                  ) : (
                    <div className="flex h-[240px] w-[240px] items-center justify-center text-muted-foreground text-sm">
                      Erreur de génération
                    </div>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p className="mb-2">Vous ne pouvez pas scanner ?</p>
                  <code className="block max-w-[320px] break-all rounded bg-muted px-2 py-1 text-xs">
                    {manualUri}
                  </code>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="code">Code de vérification (6 chiffres)</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="text-center text-lg tracking-widest"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {phase === 'backup' && (
            <div className="space-y-4">
              <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Ces codes ne seront affichés qu'une seule fois. Conservez-les dans un gestionnaire de mots de passe.
                </AlertDescription>
              </Alert>

              <div className="rounded-md border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="secondary">{backupCodes.length} codes</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setRevealed(!revealed)} className="gap-1">
                    {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {revealed ? 'Masquer' : 'Afficher'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((c, i) => (
                    <div
                      key={i}
                      className={`rounded border px-3 py-2 text-center tracking-wide transition-all ${
                        revealed ? 'bg-background' : 'bg-muted blur-sm select-none'
                      }`}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={copyAllCodes}>
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier tous les codes'}
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {phase === 'scan' && (
            <Button onClick={handleVerify} disabled={code.length !== 6 || loading} className="gap-2">
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Vérifier et activer
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {phase === 'backup' && (
            <Button
              onClick={() => router.push('/admin')}
              disabled={!revealed}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              J'ai sauvegardé mes codes
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

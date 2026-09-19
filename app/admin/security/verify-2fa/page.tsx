'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, APIError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface VerifyResponse {
  success: boolean;
  isBackup: boolean;
}

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
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
      // Rechargement dur pour que le layout server re-valide le cookie
      router.refresh();
      router.push('/admin');
    } catch (err) {
      if (err instanceof APIError) setError(err.message);
      else setError('Code invalide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Vérification 2FA</CardTitle>
          </div>
          <CardDescription>
            Entrez le code généré par votre application d&apos;authentification ou un code de secours.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="2fa-code">Code d&apos;authentification</Label>
            <Input
              id="2fa-code"
              type="text"
              placeholder="000000 ou XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="text-center text-lg tracking-widest"
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-center">
              Format : 6 chiffres (TOTP) ou code de secours 16 caractères
            </p>
          </div>

          <Separator />
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading || code.length < 6} className="gap-2">
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


// components/dashboard/settings/payment-settings.tsx
'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { updatePaymentSettingsAction } from '@/lib/actions/payment';
import { paymentSchema, type PaymentValues, MASKED_KEY } from '@/lib/payment';

interface Props { provider: string; publicKey: string; isEnabled: boolean; }

export function PaymentSettings({ provider, publicKey, isEnabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { provider, publicKey, secretKey: MASKED_KEY, isEnabled },
  });

  const onSubmit = (data: PaymentValues) => {
    startTransition(async () => {
      const res = await updatePaymentSettingsAction(data);
      toast[res.success ? 'success' : 'error'](res.success ? 'Paiement mis à jour' : res.error!);
      if(res.success) form.setValue('secretKey', MASKED_KEY); // Remasquer après succès
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Passerelle de Paiement</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="isEnabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <FormLabel>Activer {provider}</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="publicKey" render={({ field }) => (
              <FormItem>
                <FormLabel>Clé Publique</FormLabel>
                <FormControl><Input {...field} placeholder="pk_live_..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="secretKey" render={({ field }) => (
              <FormItem>
                <FormLabel>Clé Secrète (Laisser vide pour ne pas changer)</FormLabel>
                <FormControl><Input type="password" {...field} placeholder={MASKED_KEY} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

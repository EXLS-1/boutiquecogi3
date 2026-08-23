// components/dashboard/settings/general-settings.tsx
'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { updateGeneralSettingsAction } from '@/lib/actions/settings';
import { generalSettingsSchema, type GeneralSettingsValues } from '@/lib/validations/settings';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, CURRENCY_OPTIONS } from '@/lib/constants/settings';

interface GeneralSettingsProps {
  initialData: GeneralSettingsValues;
}

/**
 * Formulaire de configuration des paramètres généraux de la boutique.
 * Optimisé pour la performance (useTransition) et l'accessibilité.
 */
export function GeneralSettings({ initialData }: GeneralSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<GeneralSettingsValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initialData,
  });

  const onSubmit = (data: GeneralSettingsValues) => {
    startTransition(async () => {
      const result = await updateGeneralSettingsAction(data);
      
      if (result.success) {
        toast.success('Paramètres sauvegardés', { description: 'Les modifications ont été appliquées.' });
      } else {
        toast.error('Erreur de sauvegarde', { description: result.error });
      }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Paramètres Généraux</CardTitle>
        <CardDescription>
          Configurez les informations de base de votre boutique en ligne.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Nom de la boutique */}
            <FormField
              control={form.control}
              name={SETTINGS_KEYS.STORE_NAME}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique</FormLabel>
                  <FormControl>
                    <Input placeholder={SETTINGS_DEFAULTS[SETTINGS_KEYS.STORE_NAME]} {...field} />
                  </FormControl>
                  <FormDescription>Le nom public affiché sur le site.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email de support */}
            <FormField
              control={form.control}
              name={SETTINGS_KEYS.SUPPORT_EMAIL}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de support</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={SETTINGS_DEFAULTS[SETTINGS_KEYS.SUPPORT_EMAIL]} {...field} />
                  </FormControl>
                  <FormDescription>Utilisé pour les notifications et le support client.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Devise */}
            <FormField
              control={form.control}
              name={SETTINGS_KEYS.CURRENCY}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Devise par défaut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une devise" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Devise utilisée pour l'affichage des prix.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bouton de soumission */}
            <Button type="submit" disabled={isPending || !form.formState.isDirty} className="w-full sm:w-auto">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

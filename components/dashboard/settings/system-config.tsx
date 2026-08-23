// components/dashboard/settings/system-config.tsx
'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Server, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { updateSystemConfigAction } from '@/lib/actions/system';
import { systemConfigSchema, type SystemConfigValues, LOG_LEVELS } from '@/lib/system';

interface Props { initialData: SystemConfigValues; }

export function SystemConfig({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<SystemConfigValues>({
    resolver: zodResolver(systemConfigSchema),
    defaultValues: initialData,
  });

  const onSubmit = (data: SystemConfigValues) => {
    startTransition(async () => {
      const res = await updateSystemConfigAction(data);
      toast[res.success ? 'success' : 'error'](res.success ? 'Système mis à jour' : res.error!);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Configuration Système</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="isMaintenanceMode" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200 bg-red-50">
                <div>
                  <FormLabel className="text-red-800">Mode Maintenance</FormLabel>
                  <FormDescription className="text-red-600">Coupe l'accès public au site.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="logLevel" render={({ field }) => (
              <FormItem>
                <FormLabel>Niveau de Log</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.values(LOG_LEVELS).map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cacheTtl" render={({ field }) => (
              <FormItem>
                <FormLabel>Durée de vie du Cache (secondes)</FormLabel>
                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} /></FormControl>
                <FormDescription>0 pour désactiver le cache.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Appliquer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

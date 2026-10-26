'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function UnauthorizedPage() {
    const router = useRouter();

    useEffect(() => {
        toast.error("Action non-autorisée");
        const timer = setTimeout(() => {
            router.push('/');
        }, 2000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-6">
                    <ShieldAlert className="h-8 w-8" />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                    Accès refusé
                </h1>

                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-8">
                    Vos privilèges actuels ne permettent pas d'effectuer cette action. Redirection vers l'accueil en cours...
                </p>

                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour à l'accueil
                    </Link>
                </div>
            </div>
        </main>
    );
}

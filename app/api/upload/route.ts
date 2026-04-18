// app/api/upload/route.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  // Vérifier l'authentification et les droits admin
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Validation
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 400 });
  }

  const extension = file.name.split('.').pop();
  const uniqueName = `${uuidv4()}.${extension}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from('images-boutique')
    .upload(`produits/${uniqueName}`, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Générer l'URL publique de l'image fraîchement uploadée
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('images-boutique')
    .getPublicUrl(`produits/${uniqueName}`);
  
  // On retourne à la fois le chemin (si besoin de le supprimer plus tard) et l'URL publique
    return NextResponse.json({ 
    path: data.path, 
    url: publicUrlData.publicUrl 
  });

    return NextResponse.json({ path: data.path });
}

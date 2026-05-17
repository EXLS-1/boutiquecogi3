// app/api/checkout/route.ts
// Ce fichier est une route API pour le checkout. Cependant, le checkout utilise une Server Action `processCinetPayCheckout`.
// Cette route existe pour compatibilité API et renvoie une indication claire que les utilisateurs doivent utiliser la Server Action plutôt que cette route.
// Si un client tente d'accéder à cette route, il recevra une réponse JSON indiquant que cette route n'est pas utilisée pour le checkout et qu'il doit utiliser le formulaire checkout (Server Action CinetPay) à la place.
// Cela permet de guider les développeurs vers la bonne méthode pour implémenter le checkout dans leur application.

import { NextResponse } from "next/server";

/**
 * Le checkout utilise la Server Action `processCinetPayCheckout`.
 * Cette route existe pour compatibilité API et renvoie une indication claire.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Utilisez le formulaire checkout (Server Action CinetPay) plutôt que cette route.",
    },
    { status: 410 }
  );
}

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

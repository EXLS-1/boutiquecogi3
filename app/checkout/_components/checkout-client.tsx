// app/checkout/_components/checkout-client.tsx
"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/hooks/use-mounted";
import { processCinetPayCheckout } from "@/lib/actions/checkout.action";
import {
  buildSignInRedirect,
  CART_ROUTES,
  formatCartAmount,
  formatCartItemCount,
} from "@/lib/cart/cart-domain";
import useCart from "@/store/use-cart";
import { useCartCurrency } from "@/hooks/use-cart-currency";
import { CartCurrencyToggle } from "@/components/cart/cart-currency-toggle";
import {
  CHECKOUT_ISSUE_LABELS,
  buildCheckoutSummary,
  isValidCheckoutUser,
  normalizeMobileMoneyPhone,
  resolveCustomerName,
  resolveUserInitials,
  type CheckoutUser,
} from "./checkout-helpers";

/** Message unique de validation du numéro Mobile Money (RDC). */
const PHONE_ERROR_MESSAGE =
  "Numéro invalide. Format attendu : +243 812 345 678 (M-Pesa, Orange Money, Airtel Money).";

interface CheckoutClientProps {
  /**
   * Utilisateur injecté par `app/checkout/page.tsx` depuis la session
   * Better-Auth. Aucun `any` : le type est déclaré ici et la valeur est
   * revalidée à l'exécution par `isValidCheckoutUser()`.
   */
  user: CheckoutUser | null | undefined;
}

// ─── Sous-composants ────────────────────────────────────────────────────────

/** Bouton de paiement : `useFormStatus` expose l'état `pending` de la Server Action. */
function CheckoutSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isBlocked = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isBlocked}
      aria-disabled={isBlocked}
      className="w-full mt-6 bg-turquoise hover:bg-zinc-900 text-white font-semibold py-4 rounded-lg transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Redirection vers CinetPay…" : "Payer par Mobile Money"}
    </button>
  );
}

/** Écran de secours si la prop `user` n'est pas exploitable (session expirée). */
function CheckoutSessionExpired() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <Shield
        className="mx-auto mb-4 h-10 w-10 text-rose-500"
        aria-hidden="true"
      />
      <h1 className="text-2xl font-semibold mb-3">Session expirée</h1>
      <p className="text-zinc-600 mb-6">
        Votre session n&apos;est plus valide. Reconnectez-vous pour finaliser
        votre commande.
      </p>
      <Button asChild>
        <Link href={buildSignInRedirect(CART_ROUTES.checkout)}>Se reconnecter</Link>
      </Button>
    </div>
  );
}

/** Garde d'hydratation : le panier (localStorage) n'est lisible qu'après montage. */
function CheckoutSkeleton() {
  return (
    <div
      className="container mx-auto max-w-md px-4 py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-24 w-full mb-4" />
      <Skeleton className="h-40 w-full mb-4" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function CheckoutClient({ user }: CheckoutClientProps) {
  // Les hooks sont désormais parfaitement synchrones au premier niveau.
  const { items } = useCart();
  const mounted = useMounted();

  // Devise d'affichage partagée avec la page panier (même hook, même cookie).
  const {
    currency: activeCurrency,
    isPending: isCurrencyPending,
    error: currencyError,
    select: selectCurrency,
  } = useCartCurrency("USD");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // 1. Validation runtime de la prop `user` : jamais de `any`, jamais de crash.
  const checkoutUser = isValidCheckoutUser(user) ? user : null;

  // 2. Normalisation du panier Zustand vers le contrat de la Server Action.
  //    Le total suit la devise active (USD ou CDF) via `resolveUnitPrice`.
  const summary = useMemo(
    () => buildCheckoutSummary(items, activeCurrency),
    [items, activeCurrency],
  );

  const isPayable = summary.lines.length > 0 && summary.total > 0;

  // 3. Garde d'authentification (défense en profondeur : la page redirige déjà).
  if (!checkoutUser) return <CheckoutSessionExpired />;

  // 4. Garde d'hydratation (évite tout mismatch SSR sur le panier persistant).
  if (!mounted) return <CheckoutSkeleton />;

  const displayName = resolveCustomerName(checkoutUser);
  const initials = resolveUserInitials(checkoutUser);

  // Devise partagée avec la page panier : signature compatible `onSelect`.
  const handleCurrencySwitch = (
    currency: Parameters<typeof selectCurrency>[0],
  ): void => {
    void selectCurrency(currency);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (phoneError) setPhoneError(null);
  };

  /** Canonicalise le numéro saisi (sur blur) lorsqu'il est reconnu. */
  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }

    const normalizedPhone = normalizeMobileMoneyPhone(phone);
    if (normalizedPhone) {
      setPhone(normalizedPhone);
      setPhoneError(null);
      return;
    }

    setPhoneError(PHONE_ERROR_MESSAGE);
  };

  /** Bloque la Server Action si le numéro est invalide (`preventDefault`). */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (normalizeMobileMoneyPhone(phone)) {
      setPhoneError(null);
      return;
    }

    event.preventDefault();
    setPhoneError(PHONE_ERROR_MESSAGE);
  };

  return (
    <div
      className="container mx-auto px-4 py-8"
      data-checkout-user-id={checkoutUser.id}
    >
      <h1 className="text-2xl font-semibold mb-6">Finaliser ma commande</h1>

      {/* Identité du client issue de la prop `user` validée. */}
      <div className="max-w-md mx-auto mb-6 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <Avatar>
          {checkoutUser.image ? (
            <AvatarImage src={checkoutUser.image} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-zinc-200 text-zinc-700">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">
            {displayName}
          </p>
          <p className="truncate text-xs text-zinc-500">{checkoutUser.email}</p>
        </div>
        <Badge variant="outline" className="ml-auto shrink-0">
          Connecté
        </Badge>
      </div>

      {/* Devise d'affichage partagée avec la page panier (même hook, même toggle). */}
      <CartCurrencyToggle
        currency={activeCurrency}
        isPending={isCurrencyPending}
        error={currencyError}
        onSelect={handleCurrencySwitch}
        className="mb-4"
      />

      {!isPayable ? (
        /* Panier vide / lignes inexploitables : le formulaire n'est jamais rendu. */
        <div className="max-w-md mx-auto rounded-lg border border-zinc-200 p-6 text-center">
          <h2 className="mb-2 text-lg font-medium">Aucun article payable</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Votre panier est vide ou les articles qu&apos;il contient ne sont
            plus disponibles.
          </p>
          <Button asChild>
            <Link href={CART_ROUTES.products}>Retour à la boutique</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Récapitulatif normalisé : montants strictement identiques à CinetPay. */}
          <ul className="max-w-md mx-auto mb-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {summary.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {line.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {line.quantity} ×{" "}
                  {formatCartAmount(line.price, summary.currency)}
                </span>
                <span className="shrink-0 text-sm font-medium">
                  {formatCartAmount(line.price * line.quantity, summary.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="max-w-md mx-auto mb-4 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
            <span className="text-sm font-medium text-zinc-600">
              Total à payer ({formatCartItemCount(summary.totalQuantity)})
            </span>
            <span className="text-lg font-semibold">
              {formatCartAmount(summary.total, summary.currency)}
            </span>
          </div>

          {summary.issues.length > 0 && (
            <div
              role="status"
              className="max-w-md mx-auto mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
            >
              <p className="mb-1 font-medium">
                Certains articles ont été ajustés :
              </p>
              <ul className="list-inside list-disc">
                {summary.issues.map((issue, index) => (
                  <li key={`${issue.id}-${issue.reason}-${index}`}>
                    {issue.name} — {CHECKOUT_ISSUE_LABELS[issue.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form
            action={processCinetPayCheckout}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto"
          >
            {/* Contrat exact attendu par `processCinetPayCheckout`. */}
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(summary.lines)}
            />
            <input type="hidden" name="amount" value={summary.total} />
            <input type="hidden" name="currency" value={activeCurrency} />

            <div>
              <label
                htmlFor="cinetpay-phone"
                className="block text-sm font-medium mb-1"
              >
                Numéro Mobile Money
              </label>
              <input
                id="cinetpay-phone"
                type="tel"
                name="phone"
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="+243 812 345 678"
                autoComplete="tel"
                inputMode="tel"
                required
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={
                  phoneError ? "cinetpay-phone-error" : "checkout-payment-hint"
                }
                className="w-full p-3 rounded border border-zinc-300 focus:ring-2 focus:ring-turquoise outline-none"
              />
              {phoneError ? (
                <p
                  id="cinetpay-phone-error"
                  role="alert"
                  className="mt-1 text-xs text-rose-600"
                >
                  {phoneError}
                </p>
              ) : (
                <p
                  id="checkout-payment-hint"
                  className="text-xs text-zinc-500 mt-1"
                >
                  M-Pesa, Orange Money ou Airtel Money.
                </p>
              )}
            </div>

            <CheckoutSubmitButton disabled={!isPayable} />

            <div className="mt-8 flex justify-center gap-4 opacity-50 grayscale">
              <span className="text-xs font-semibold">M-PESA</span>
              <span className="text-xs font-semibold">ORANGE</span>
              <span className="text-xs font-semibold">AIRTEL</span>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export function PaymentMethodConfig({ methods = [] }: { methods?: unknown[] }) {
  return <div className="rounded-xl border bg-card p-4">Payment method config ({methods.length})</div>;
}

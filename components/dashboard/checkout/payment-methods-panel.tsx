export function PaymentMethodsPanel({
  canConfigure = false,
  canViewAnalytics = false,
}: {
  canConfigure?: boolean;
  canViewAnalytics?: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      Payment methods panel {canConfigure ? "(config)" : ""} {canViewAnalytics ? "(analytics)" : ""}
    </section>
  );
}

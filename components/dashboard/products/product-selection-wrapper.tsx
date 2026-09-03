export function ProductSelectionWrapper({
  total = 0,
}: {
  products?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
  canDelete?: boolean;
  canManageVariants?: boolean;
  canManageReviews?: boolean;
  clientPermissions?: unknown[];
  userLevel?: number;
}) {
  return <div className="rounded-xl border bg-card p-4">Selection wrapper ({total})</div>;
}

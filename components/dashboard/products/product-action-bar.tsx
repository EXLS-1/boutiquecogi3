export function ProductActionBar({
  canCreate = false,
  canImport = false,
  canExport = false,
}: {
  canCreate?: boolean;
  canImport?: boolean;
  canExport?: boolean;
}) {
  return <div className="rounded-xl border bg-card p-4">Actions</div>;
}

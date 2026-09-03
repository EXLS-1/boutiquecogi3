export function VideoGrid({ videos = [], total = 0 }: { videos?: unknown[]; total?: number; page?: number; limit?: number; canDelete?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Video grid ({total})</div>;
}

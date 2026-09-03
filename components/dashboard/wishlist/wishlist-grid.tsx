export function WishlistGrid({ wishlists = [] }: { wishlists?: unknown[]; canShare?: boolean; isAdminView?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">Wishlist grid ({wishlists.length})</div>;
}

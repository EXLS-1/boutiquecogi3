export function CouponManager({ coupons = [] }: { coupons?: unknown[] }) {
  return <div className="rounded-xl border bg-card p-4">Coupon manager ({coupons.length})</div>;
}

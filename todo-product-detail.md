All done and verified. Here's a summary of the changes:

## `c:\boutiquecogi3\app\products\[id]\page.tsx`

The page referenced components that were never defined. I implemented all of them as inline Server Components at the bottom of the file, matching the file's existing pattern and typed against `ProductDetailData` from `lib/product-catalog/product-detail.ts`:

- **`StarRating`** — renders a 5-star SVG rating, clamped/validated to 0–5, with an ARIA label. Also reused by `ProductReviews`.
- **`ProductPriceSection`** — displays the base price formatted via `Intl.NumberFormat` (with a fallback formatter), plus strikethrough base price and discount percentage when `salePrice` applies.
- **`StockInfo`** — availability indicator (in stock / low stock / pre-order / out of stock) driven by `availabilityStatus` and `availableStock`.
- **`ProductVariants`** — lists each variant's SKU, attributes, and price offset.
- **`ProductOptions`** — renders options as name/value pills.
- **`CouponBadge`** — shows active, non-expired coupons with code, discount amount/percent, minimum order, and expiry date; returns `null` for inactive/expired coupons. The `Date.now()` purity lint warning (`react-hooks/purity`) is handled with an explicit `eslint-disable` since this is a server component with `revalidate = 3600`.
- Additionally, ESLint flagged two more undefined components used elsewhere in the file, so I also implemented **`ProductReviews`** (avatar, stars, verified-purchase badge, comment, date) and **`ProductSidebar`** (SKU, availability, tax class, sold count, tags).

## `c:\boutiquecogi3\components\admin\product-table.tsx`

- `stockDetail` was set via `setStockDetail` but never read. I added "robust usage": a dismissible cyan info banner rendered above the table whenever stock was fetched (via "Voir stock"), showing quantity, reserved, computed available (`quantity - reserved`), and alert threshold, with a "Fermer" button to clear it.

## Verification

- **ESLint**: zero errors/warnings on both files (previously 5 `jsx-no-undef` / `ts(2304)` + 1 `no-unused-vars`, plus 2 more `jsx-no-undef` and 1 purity error surfaced along the way — all resolved).
- **`tsc --noEmit`**: no errors in either target file (the only remaining project-wide diagnostic is a pre-existing parse error in `components/dashboard/product/new-product/dynamic-product-form.tsx` line 134, unrelated to this task — let me know if you'd like that fixed too).
# Fix: Prisma `orderItems` include error on profile page

- [x] Analyze the root cause (Order model relation is `items`, not `orderItems`)
- [x] Create shared mapping helper `lib/orders/map-order-to-card.ts`
- [x] Fix `app/profile/page.tsx` (use `items` include + map to OrderCardData)
- [x] Fix `lib/actions/order.actions.ts` `getPaginatedOrders` (use `items` include + map to OrderCardData)
- [x] Verify with targeted `npx tsc --noEmit` on modified files (clean)

 
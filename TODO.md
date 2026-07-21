# Task: Fix TypeScript errors in cart-sync-manager.tsx

- [x] Read and analyze relevant files
- [x] Plan approved
- [x] Fix import: replace `import useCart from "@/store/use-cart"` with `import { useCartStore } from "@/store/use-cart"`
- [x] Fix destructuring: replace `const { items } = useCart()` with `const items = useCartStore((state) => state.items)`
- [x] Fix dependency array: replace `[session, items?.length]` with `[session, items]`
- [x] Fix data mapping: flatten CartItem[] → { id, name, image, price, quantity }[] before passing to syncCartAction
- [x] Verify no TypeScript errors


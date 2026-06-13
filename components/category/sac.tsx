// components/category/sac.tsx
import { CategoryCard } from './category-card'

export default function BoutiqueSac() {
  return (
    <CategoryCard
      title="SAC DAME"
      subtitle="Accessoires indispensables"
      imageSrc="/Media/pict04.webp"
      imageAlt="Sac Dame"
      href="/products?category=sac"
    />
  )
}
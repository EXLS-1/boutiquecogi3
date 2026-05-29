import { CategoryCard } from './category-card'

export default function BoutiqueAccessoire() {
  return (
    <CategoryCard
      title="ACCESSOIRE"
      subtitle="Accessoires indispensables"
      imageSrc="/Media/pict04.webp"
      imageAlt="Accessoire"
      href="/products?category=accessoire"
    />
  )
}
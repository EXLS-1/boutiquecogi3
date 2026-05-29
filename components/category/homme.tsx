import { CategoryCard } from './category-card'

export default function BoutiqueHomme() {
  return (
    <CategoryCard
      title="HABIT HOMME"
      subtitle="Style moderne et raffiné"
      imageSrc="/Media/pict02.webp"
      imageAlt="Habit Homme"
      href="/products?category=homme"
    />
  )
}
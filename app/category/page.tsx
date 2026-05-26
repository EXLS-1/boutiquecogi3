// app/category/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { 
  Shirt, 
  User, 
  Baby, 
  ShoppingBag, 
  Footprints, 
  Watch, 
  ChevronRight,
  LayoutGrid
} from "lucide-react";

export const metadata: Metadata = {
  title: "Catégories | Boutique COGI3",
  description: "Parcourez nos différentes catégories de mode : Femme, Homme, Enfant, Sacs et Accessoires.",
};

// Données structurées basées sur la documentation technique (section 18.1 du read.md)
const categories = [
  {
    slug: "femme",
    name: "Femme",
    description: "Prêt-à-porter, robes et tendances féminines.",
    icon: Shirt,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    slug: "homme",
    name: "Homme",
    description: "Vêtements, costumes et mode masculine.",
    icon: User,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
  },
  {
    slug: "enfant",
    name: "Enfant",
    description: "Vêtements confortables et durables pour les petits.",
    icon: Baby,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    slug: "sac",
    name: "Sacs",
    description: "Maroquinerie, sacs à main et sacs de voyage.",
    icon: ShoppingBag,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    slug: "chaussure",
    name: "Chaussures",
    description: "Baskets, escarpins et chaussures de ville.",
    icon: Footprints,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    slug: "accessoire",
    name: "Accessoires",
    description: "Montres, bijoux et compléments de style.",
    icon: Watch,
    color: "text-slate-700",
    bg: "bg-slate-50",
  },
];

export default function CategoryIndexPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-10">
        <LayoutGrid className="h-8 w-8 text-cyan-700" />
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nos Catégories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link 
            key={cat.slug} 
            href={`/products?category=${cat.slug}`}
            className="group relative flex flex-col p-6 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-cyan-200 hover:-translate-y-1"
          >
            <div className={`w-14 h-14 ${cat.bg} ${cat.color} rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110`}>
              <cat.icon size={28} />
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{cat.name}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {cat.description}
                </p>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-cyan-500 transition-colors" />
            </div>
            
            <div className="mt-auto pt-4 flex items-center text-sm font-semibold text-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity">
              Voir la collection
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
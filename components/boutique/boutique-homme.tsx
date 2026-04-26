// components/boutique-homme.tsx
import Image from 'next/image'

export default function BoutiqueHomme() {
  return (
    <section className="py-20 bg-gray-50" id="boutique">
  
      <div className="group relative aspect-4/5 overflow-hidden rounded-2xl bg-gray-200 shadow-md">
          <Image
          src="/Media/pict02.webp"
          alt="Habit Homme"
          width={400}
          height={500}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
          <h3 className="font-playfair text-2xl font-bold mb-2">
              HABIT HOMME
          </h3>
          <p className="text-gray-200 mb-6">Style moderne et raffiné</p>
          <a
              href="#catalogue-homme"
              className="inline-block border border-white px-6 py-2 text-sm font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors w-max"
          >
              VOIR LA COLLECTION
          </a>
          </div>
      </div>

    </section>
  )
}
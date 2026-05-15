"use client"

import Link from "next/link"
import Image from "next/image"

interface CategoryItem {
    name: string
    href: string
    image: string
}

interface CategoryShowcaseGridProps {
    title?: string
    items: CategoryItem[]
}

export function CategoryShowcaseGrid({ title, items }: CategoryShowcaseGridProps) {
    return (
        <section className="py-20 bg-[#E5E9F0]">
            <div className="container mx-auto max-w-[1400px] px-6">
                {title && (
                    <div className="flex flex-col items-center justify-center mb-12 text-center">
                        <h2 className="font-serif text-3xl md:text-4xl font-bold uppercase tracking-wider text-tm-text">
                            {title}
                        </h2>
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {items.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group relative aspect-square overflow-hidden rounded-3xl neu-raised bg-[#E5E9F0] p-2 transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="relative w-full h-full overflow-hidden rounded-2xl">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h3 className="text-white text-xl md:text-2xl font-serif font-bold text-center px-4 uppercase tracking-wider">
                                        {item.name}
                                    </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}

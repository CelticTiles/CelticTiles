"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface HeroBannerProps {
    title: string
    subtitle: string
    buttonText?: string
    buttonHref?: string
}

const HERO_IMAGES = [
    "/images/hero/hero-1.png",
    "/images/hero/hero-2.png",
    "/images/hero/hero-3.png",
    "/images/hero/hero-4.png"
]

export function HeroBanner({
    title,
    subtitle,
    buttonText = "Shop Collection",
    buttonHref = "/tiles",
}: HeroBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <section className="relative h-[600px] md:h-[700px] lg:h-[800px] w-full bg-[#E5E9F0] overflow-hidden">
            {/* Background Images with Fade */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="relative w-full h-full"
                    >
                        <Image
                            src={HERO_IMAGES[currentIndex]}
                            alt="Hero Background"
                            fill
                            className="object-cover brightness-[0.85] contrast-[1.05]"
                            priority
                            unoptimized
                        />
                        {/* Gradient Overlay for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Centered Content Container */}
            <div className="container relative z-10 mx-auto max-w-[1400px] h-full flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="max-w-4xl w-full text-center p-8 md:p-12 lg:p-16 rounded-[3rem] bg-[#E5E9F0]/90 backdrop-blur-md neu-raised"
                >
                    <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/40 border border-white/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-tm-red animate-pulse" />
                        <span className="text-tm-red font-bold tracking-tight text-[10px] uppercase">Ireland&apos;s Premium Tile Specialists</span>
                    </div>
                    
                    <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-slate-800 mb-6">
                        {title.split('WITH').map((part, i) => (
                            <span key={i}>
                                {i > 0 && <br className="hidden md:block" />}
                                {i > 0 ? `WITH ${part}` : part}
                            </span>
                        ))}
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
                        {subtitle}
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <Button
                            size="xl"
                            className="bg-tm-red hover:bg-tm-red/90 text-white font-bold px-10 h-14 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 text-lg"
                            asChild
                        >
                            <Link href={buttonHref}>
                                {buttonText}
                            </Link>
                        </Button>
                        

<Button
    variant="outline"
    size="xl"
    className="bg-white/50 hover:bg-white text-slate-900 hover:text-slate-900 font-bold px-10 h-14 rounded-full neu-raised border-none transition-all hover:scale-105 active:scale-95 text-lg"
    asChild
>
    <Link href="/contact">Book Consultation</Link>
</Button>
                        
                    </div>
                </motion.div>
            </div>

            {/* Navigation Dots */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                {HERO_IMAGES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentIndex(i)}
                        className={`h-2 transition-all rounded-full ${
                            currentIndex === i ? "w-8 bg-tm-red" : "w-2 bg-white/50 hover:bg-white"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                        suppressHydrationWarning
                    />
                ))}
            </div>
        </section>
    )
}

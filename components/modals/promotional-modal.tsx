"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"

// ─── ✏️  EASY TO UPDATE ───────────────────────────────────────────────────────
// Swap this to any URL at any time:
//   Local file  →  "/images/promotional.jpeg"
//   Supabase    →  "https://xxxx.supabase.co/storage/v1/object/public/bucket/promo.jpeg"
//   Any CDN     →  "https://cdn.example.com/promo.jpeg"
const PROMO_IMAGE_SRC = "/images/promotional.jpeg"
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = "celtic_promo_dismissed"

export function PromotionalModal() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem(SESSION_KEY)
    if (!alreadyDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ animation: "promoFadeIn 0.3s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal — grows with the image, capped so it never overflows viewport */}
      <div
        className="relative z-10 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ animation: "promoScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Promotional offer"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close promotional offer"
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/85 transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 
          object-contain   → full image shown, zero cropping
          w-full           → stretches to modal width
          max-h-[85vh]     → never overflows screen height
          bg-black         → letterbox fill (matches dark backdrop)
        */}
        <div className="w-full bg-black flex items-center justify-center">
          <Image
            src={PROMO_IMAGE_SRC}
            alt="Celtic Tiles – Bathroom Renovation Package from €4,999"
            width={1200}
            height={750}
            className="w-full h-auto max-h-[85vh] object-contain"
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
          />
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes promoFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes promoScaleIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

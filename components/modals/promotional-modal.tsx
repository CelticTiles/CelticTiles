"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"

// ─── ✏️  EASY TO UPDATE ───────────────────────────────────────────────────────
// Swap this to any URL at any time:
//   Local file  →  "/images/promo-summer-sale-2026.webp"
//   Supabase    →  "https://xxxx.supabase.co/storage/v1/object/public/bucket/promo.webp"
//   Any CDN     →  "https://cdn.example.com/promo.webp"
const PROMO_IMAGE_SRC = "/images/promo-summer-sale-2026.webp"
const PROMO_ALT =
  "Celtic Tiles Summer Tile Sale – up to 40% off selected tiles, 15–30 August. " +
  "Dublin showroom, Long Mile Rd, Walkinstown."

// Campaign window — Dublin time (IST = UTC+1 in August).
// END is EXCLUSIVE: the ad shows through the end of 30 Aug and is gone on 31 Aug.
const PROMO_START = new Date("2026-08-15T00:00:00+01:00")
const PROMO_END = new Date("2026-08-31T00:00:00+01:00")

// Per-campaign key, so visitors who dismissed a previous promo still see this one.
// sessionStorage → one impression per browsing session, not one for the whole campaign.
const SEEN_KEY = "celtic_promo_seen_summer2026"
// ─────────────────────────────────────────────────────────────────────────────

export function PromotionalModal() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // ?promo=preview forces the modal open outside the scheduled window, for QA.
    // It deliberately does not write the seen flag, so it can be reloaded freely.
    const forced =
      new URLSearchParams(window.location.search).get("promo") === "preview"

    if (!forced) {
      const now = new Date()
      if (now < PROMO_START || now >= PROMO_END) return
      try {
        // Already shown earlier in this session — don't show it again
        if (sessionStorage.getItem(SEEN_KEY)) return
      } catch {
        // Private browsing / storage blocked — fail open and show it
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
      // Marked as seen when it APPEARS rather than when it is closed, so a
      // visitor gets exactly one impression per session no matter which page
      // they landed on or how they navigate afterwards.
      if (!forced) {
        try {
          sessionStorage.setItem(SEEN_KEY, "true")
        } catch {
          // Storage unavailable — nothing to record
        }
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  // Escape closes the dialog
  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVisible(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ animation: "promoFadeIn 0.3s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={() => setIsVisible(false)}
        aria-hidden="true"
      />

      {/* Modal — width tuned for the square (1254×1254) creative so it never
          overflows the viewport and needs no letterboxing */}
      <div
        className="relative z-10 w-full max-w-[min(560px,92vw)] rounded-2xl overflow-hidden shadow-2xl"
        style={{ animation: "promoScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Summer Tile Sale offer"
      >
        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          aria-label="Close promotional offer"
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-black/55 text-white hover:bg-black/85 transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <Image
          src={PROMO_IMAGE_SRC}
          alt={PROMO_ALT}
          width={1254}
          height={1254}
          className="w-full h-auto max-h-[85vh] object-contain"
          priority
          sizes="(max-width: 640px) 92vw, 560px"
        />
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

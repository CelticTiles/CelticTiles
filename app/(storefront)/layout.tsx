import { HeaderServerWrapper } from "@/components/layout/header-server-wrapper"
import { FooterServerWrapper } from "@/components/layout/footer-server-wrapper"
import { PromotionalModalClient } from "@/components/modals/promotional-modal-client"
import { Suspense } from "react"

/**
 * Storefront layout — renders Header and Footer once for ALL customer-facing pages.
 * Admin routes are NOT inside this route group and remain isolated.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <PromotionalModalClient />
      </Suspense>
      <Suspense fallback={<div className="h-24 border-b border-border bg-[#E5E9F0]" />}>
        <HeaderServerWrapper />
      </Suspense>
      <div className="flex-1">
        {children}
      </div>
      <Suspense fallback={<div className="h-32 border-t border-border bg-[#E5E9F0]" />}>
        <FooterServerWrapper />
      </Suspense>
    </div>
  )
}

"use client"

import dynamic from "next/dynamic"

const PromotionalModal = dynamic(
  () => import("@/components/modals/promotional-modal").then((m) => ({ default: m.PromotionalModal })),
  { ssr: false }
)

export function PromotionalModalClient() {
  return <PromotionalModal />
}

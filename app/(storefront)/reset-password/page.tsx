import { Suspense } from "react"
import ResetPasswordClient from "./ResetPasswordClient"

export const metadata = {
  title: "Reset Password | Celtic Tiles",
  description: "Set a new password for your Celtic Tiles account.",
}

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Wrap with Suspense to allow client-side search params access */}
      <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
        <ResetPasswordClient />
      </Suspense>
    </div>
  )
}
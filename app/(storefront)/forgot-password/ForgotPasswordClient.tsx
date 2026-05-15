"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setIsLoading(false)
        return
      }

      setMessage("Password reset link has been sent to your email.")
      setIsLoading(false)
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 className="text-3xl font-bold text-tm-text mb-2">Forgot Password</h1>
      <p className="text-tm-text-muted mb-6">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-tm-text mb-2">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold tracking-wide"
          disabled={isLoading}
        >
          {isLoading ? "Sending link..." : "Send Reset Link"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-tm-text-muted">
          Remember your password?{" "}
          <Link href="/login" className="text-tm-red font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}

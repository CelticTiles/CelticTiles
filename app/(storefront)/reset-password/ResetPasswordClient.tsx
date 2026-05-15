"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordClient() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const errorParam = searchParams.get("error_description")
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      toast({
        title: "Error",
        description: decodeURIComponent(errorParam),
        variant: "destructive",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.updateUser({
        password: password,
      })

      if (resetError) {
        setError(resetError.message)
        toast({
          title: "Error",
          description: resetError.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Sign out the recovery session so the user must log in fresh
      await supabase.auth.signOut()

      setMessage("Password has been reset successfully.")
      toast({
        title: "Success",
        description: "Password reset successfully. Redirecting to login...",
      })
      setIsLoading(false)
      
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      const errorMsg = "An unexpected error occurred. Please try again."
      setError(errorMsg)
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 className="text-3xl font-bold text-tm-text mb-2">Reset Password</h1>
      <p className="text-tm-text-muted mb-6">Enter your new password below.</p>

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
          <label htmlFor="password" className="block text-sm font-semibold text-tm-text mb-2">
            New Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-tm-text mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold tracking-wide"
          disabled={isLoading || !!error}
        >
          {isLoading ? "Updating password..." : "Reset Password"}
        </Button>
      </form>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useStore } from "@/hooks/useStore"
import { Chrome, Eye, EyeOff } from "lucide-react"

export default function RegisterClient() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const router = useRouter()
  const { login } = useStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: `${formData.firstName} ${formData.lastName}`,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError("User creation failed")
        setIsLoading(false)
        return
      }

      // Profile is automatically created by database trigger
      
      // Sign out the auto-created session so user must log in explicitly
      await supabase.auth.signOut()

      setMessage("Account created successfully! Redirecting to login...")
      setIsLoading(false)
      
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      setError("Google signup failed")
      setIsLoading(false)
    }
  }



  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 className="text-3xl font-bold mb-2">Create Account</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {message && <p className="text-green-600 mb-4">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          placeholder="First name"
          value={formData.firstName}
          onChange={(e) => handleChange("firstName", e.target.value)}
          required
        />

        <Input
          placeholder="Last name"
          value={formData.lastName}
          onChange={(e) => handleChange("lastName", e.target.value)}
          required
        />

        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          required
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) =>
              handleChange("confirmPassword", e.target.value)
            }
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      {/* <div className="mt-8 pt-6 border-t border-tm-border">
        <p className="text-xs text-center text-tm-text-muted mb-4">Or continue with</p>
        <Button 
          type="button"
          variant="outline" 
          className="w-full text-tm-text hover:text-tm-text hover:bg-gray-50"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <Chrome className="w-4 h-4 mr-2" />
          Google
        </Button>
      </div> */}

      <p className="text-sm mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Login
        </Link>
      </p>
    </div>
  )
}

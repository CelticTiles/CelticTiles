"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useStore } from "@/hooks/useStore"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Chrome, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

function reportAuthAudit(event: string, payload: Record<string, unknown>) {
    fetch('/api/auth/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, ...payload }),
        keepalive: true,
    }).catch(() => {})
}

export default function LoginClient() {
    const supabase = getSupabaseBrowserClient()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const { login } = useStore()

    // Show logout success toast if redirected from logout
    useEffect(() => {
        const cookies = document.cookie.split(';').map(c => c.trim())
        if (cookies.some(c => c === 'logged_out=true')) {
            toast.success('Logged out successfully')
            // Clear the cookie
            document.cookie = 'logged_out=; max-age=0; path=/'
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)
        
        try {
            // ⚠️ CRITICAL: Set preference BEFORE signInWithPassword
            // The storage adapter checks this when storing the session
            // 'false' = use sessionStorage (auto-clears on browser close)
            // 'true' = use localStorage (persists across sessions)
            localStorage.setItem('auth_remember_me', rememberMe.toString())
            
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            
            if (authError) {
                setError(authError.message)
                setIsLoading(false)
                return
            }
            
            if (data.session && data.user) {

                // Fetch user's profile with role
                // Use left join (not !inner) to allow login even if role is missing
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role_id, roles(name)')
                    .eq('id', data.user.id)
                    .single()
                
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error fetching profile:', profileError)
                    // Continue with default role if profile fetch fails
                }
                
                // Extract role name - handle the nested structure
                const profileData = profile as any
                const roleName = (profileData?.roles?.name || 'customer') as 'customer' | 'sales' | 'admin' | 'inventory'
                
                // Get user name
                const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
                
                // Sync to Zustand store
                login(data.user.id, userName, data.user.email!, roleName)
                
                // ✅ Show login success toast
                toast.success(`Welcome back, ${userName}!`)

                reportAuthAudit('login_success', {
                    userId: data.user.id,
                    role: roleName,
                    source: 'login_client',
                    path: window.location.pathname,
                })
                
                // ✅ Clear loading state before redirect
                setIsLoading(false)
                
                // Redirect based on role
                if (roleName === 'admin' || roleName === 'sales' || roleName === 'inventory') {
                    window.location.href = '/admin/dashboard'
                } else {
                    window.location.href = '/'
                }
            }
        } catch {
            setError("An unexpected error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        try {
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
            setError("Google login failed")
            setIsLoading(false)
        }
    }



    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-tm-text mb-2">Login</h1>
            <p className="text-tm-text-muted mb-6">Welcome back! Please login to your account.</p>

            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
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

                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-tm-text mb-2">
                        Password
                    </label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 text-sm cursor-pointer group">
                        <div 
                            onClick={() => setRememberMe(!rememberMe)}
                            className={`
                                w-4 h-4 flex items-center justify-center
                                transition-all duration-200
                                ${rememberMe 
                                    ? 'bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]' 
                                    : 'bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]'
                                }
                                group-hover:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.8)]
                            `}
                        >
                            {rememberMe && (
                                <svg 
                                    className="w-2.5 h-2.5 text-white" 
                                    fill="none" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="3" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path d="M5 13l4 4L19 7"></path>
                                </svg>
                            )}
                        </div>
                        <span className="text-tm-text-muted select-none">Remember me</span>
                    </label>
                    <Link href="/forgot-password" className="text-sm text-tm-red hover:underline">
                        Forgot password?
                    </Link>
                </div>

                <Button 
                    type="submit" 
                    variant="default" 
                    size="lg" 
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold tracking-wide"
                    disabled={isLoading}
                >
                    {isLoading ? "Logging in..." : "Login"}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-tm-text-muted">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-tm-red font-semibold hover:underline">
                        Register here
                    </Link>
                </p>
            </div>

            {/* <div className="mt-8 pt-6 border-t border-tm-border">
                <p className="text-xs text-center text-tm-text-muted mb-4">Or continue with</p>
                <Button 
                    type="button"
                    variant="outline" 
                    className="w-full text-tm-text hover:text-tm-text hover:bg-gray-50"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <Chrome className="w-4 h-4 mr-2" />
                    Google
                </Button>
            </div> */}
        </div>
    )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function NewsletterSignup() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!email.trim()) {
            toast.error('Please enter your email')
            return
        }

        setLoading(true)
        
        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Successfully subscribed to our newsletter!')
                setEmail("")
            } else if (response.status === 409) {
                toast.error('This email is already subscribed')
            } else {
                toast.error(data.error || 'Failed to subscribe. Please try again.')
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error)
            toast.error('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="py-20 bg-[#E5E9F0]">
            <div className="container mx-auto max-w-[1400px] px-4">
                <div className="max-w-2xl mx-auto text-center p-10 md:p-16 rounded-[2.5rem] bg-[#E5E9F0] neu-raised relative overflow-hidden">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 text-tm-text font-serif">
                        Get exclusive offers & fabulous design tips to your inbox
                    </h2>
                    <p className="text-tm-text-muted mb-8 text-sm md:text-base">
                        Subscribe to our newsletter and be the first to know about new products and special deals
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-transparent neu-inset border-none h-12 rounded-full px-6 focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-tm-red hover:bg-tm-red/90 text-white shrink-0 h-12 rounded-full px-8 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Subscribing...' : 'Subscribe'}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    )
}

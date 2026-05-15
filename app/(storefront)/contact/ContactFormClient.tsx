"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export function ContactFormClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      setStatus("success")
      setFormData({ name: "", email: "", phone: "", message: "" })

      // Reset success message after 5 seconds
      setTimeout(() => setStatus("idle"), 5000)
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.message || "Failed to send message. Please try again.")
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2 ml-2">
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-6 py-4 rounded-2xl neu-inset bg-[#E5E9F0] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 placeholder:text-slate-400"
          placeholder="Enter your full name"
          required
          disabled={status === "loading"}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 ml-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-6 py-4 rounded-2xl neu-inset bg-[#E5E9F0] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 placeholder:text-slate-400"
          placeholder="Enter your email address"
          required
          disabled={status === "loading"}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2 ml-2">
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-6 py-4 rounded-2xl neu-inset bg-[#E5E9F0] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 placeholder:text-slate-400"
          placeholder="Enter your phone number"
          disabled={status === "loading"}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2 ml-2">
          Message *
        </label>
        <textarea
          id="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          className="w-full px-6 py-4 rounded-none neu-inset bg-[#E5E9F0] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-slate-800 placeholder:text-slate-400"
          placeholder="How can we help you?"
          required
          disabled={status === "loading"}
        />
      </div>

      {/* Success Message */}
      {status === "success" && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">Message sent successfully! We&apos;ll get back to you within 24 hours.</p>
        </div>
      )}

      {/* Error Message */}
      {status === "error" && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="default"
        size="lg"
        disabled={status === "loading"}
        className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-2xl neu-raised font-bold text-lg tracking-wide shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  )
}

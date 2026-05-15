"use client"

interface Toast {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

let toastId = 0

export function useToast() {
  const toast = (config: Toast) => {
    toastId++
    const id = toastId
    
    // Log to console for now - in production, connect to a toast component
    if (config.variant === "destructive") {
      console.error(`[Toast] ${config.title}:`, config.description)
    }

    // Return dismiss function
    return () => {}
  }

  return { toast }
}

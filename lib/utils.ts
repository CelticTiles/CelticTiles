import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string | null | undefined): string {
    const amount = Number(price)

    if (!Number.isFinite(amount)) {
        return "\u20AC0.00"
    }

    return `\u20AC${amount.toFixed(2)}`
}

export function formatPricePerSqm(price: number | string | null | undefined): string {
    const amount = Number(price)

    if (!Number.isFinite(amount)) {
        return "\u20AC0.00 /m\u00B2"
    }

    return `\u20AC${amount.toFixed(2)} /m\u00B2`
}

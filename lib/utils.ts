import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || isNaN(price)) {
        return "€0.00"
    }
    return `€${price.toFixed(2)}`
}

export function formatPricePerSqm(price: number | null | undefined): string {
    if (price === null || price === undefined || isNaN(price)) {
        return "€0.00 /m²"
    }
    return `€${price.toFixed(2)} /m²`
}

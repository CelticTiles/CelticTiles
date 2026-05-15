"use client"

import { Star } from "lucide-react"

interface StarRatingProps {
    rating: number
    maxRating?: number
    size?: "sm" | "md" | "lg"
    showNumber?: boolean
    className?: string
}

export function StarRating({
    rating,
    maxRating = 5,
    size = "md",
    showNumber = false,
    className = ""
}: StarRatingProps) {
    const sizeClasses = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5"
    }

    const iconSize = sizeClasses[size]

    // Generate array of stars
    const stars = Array.from({ length: maxRating }, (_, index) => {
        const fillPercentage = Math.min(Math.max(rating - index, 0), 1) * 100
        const isFilled = fillPercentage > 0

        return (
            <div key={index} className="relative inline-block">
                {isFilled ? (
                    // Filled star with partial fill support
                    <div className="relative">
                        {/* Background empty star */}
                        <Star
                            className={`${iconSize} text-gray-300`}
                            strokeWidth={1.5}
                        />
                        {/* Foreground filled star with clip */}
                        <div
                            className="absolute top-0 left-0 overflow-hidden"
                            style={{ width: `${fillPercentage}%` }}
                        >
                            <Star
                                className={`${iconSize} text-accent-gold`}
                                strokeWidth={1.5}
                                fill="currentColor"
                            />
                        </div>
                    </div>
                ) : (
                    // Empty star (border only)
                    <Star
                        className={`${iconSize} text-gray-300`}
                        strokeWidth={1.5}
                        fill="none"
                    />
                )}
            </div>
        )
    })

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {stars}
            {showNumber && (
                <span className="text-sm text-tm-text-muted ml-1">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    )
}

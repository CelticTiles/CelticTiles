import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    burgundy: "hsl(var(--primary-burgundy))",
                    light: "hsl(var(--primary-burgundy-light))",
                    dark: "hsl(var(--primary-burgundy-dark))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                    brown: "hsl(var(--secondary-brown))",
                    light: "hsl(var(--secondary-brown-light))",
                    dark: "hsl(var(--secondary-brown-dark))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                    gold: "hsl(var(--accent-gold))",
                    light: "hsl(var(--accent-gold-light))",
                    dark: "hsl(var(--accent-gold-dark))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                neutral: {
                    white: "hsl(var(--neutral-white))",
                    "off-white": "hsl(var(--neutral-off-white))",
                    light: "hsl(var(--neutral-light))",
                    grey: "hsl(var(--neutral-grey))",
                    border: "hsl(var(--neutral-border))",
                    dark: "hsl(var(--neutral-dark))",
                },
                // Celtic Tiles brand colors
                "tm-red": "hsl(0, 78%, 39%)", // Burgundy red from logo
                "tm-text": "hsl(222, 47%, 11%)", // Dark text
                "tm-text-muted": "hsl(0, 0%, 45%)", // Muted text
                success: "hsl(var(--success))",
                error: "hsl(var(--error))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
                serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "slide-up": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.2s ease-out",
                "slide-up": "slide-up 0.2s ease-out",
            },
        },
    },
    plugins: [tailwindAnimate],
} satisfies Config;

export default config;

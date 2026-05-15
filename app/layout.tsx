import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Celtic Tiles - Premium Tiles & Flooring",
  description:
    "Discover premium tiles, outdoor flooring, wall panelling, and bathroom accessories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>

        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

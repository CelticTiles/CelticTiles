"use client";

import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryWithChildren } from "@/lib/loaders";

interface FooterProps {
  categories?: CategoryWithChildren[];
}

const staticLinks = {
  "Useful Links": [
    { name: "About Us", href: "/about" },
    { name: "Contact Us", href: "/contact" },
    { name: "Delivery Information", href: "/delivery" },
    { name: "Returns Policy", href: "/returns" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "FAQs", href: "/faq" },
  ],
  "My Account": [
    { name: "Login", href: "/login" },
    { name: "Register", href: "/register" },
    { name: "My Orders", href: "/account/orders" },
    { name: "My Wishlist", href: "/wishlist" },
  ],
};

export function Footer({ categories = [] }: FooterProps) {
  // Combine clearance with dynamic categories from DB
  const storeLinks = [
    { name: "Clearance", href: "/clearance" },
    ...categories.map((cat) => ({
      name: cat.name,
      href: `/${cat.slug}`,
    })),
  ];
  return (
    <footer className="bg-[#E5E9F0] border border-primary/10">
      <div className="container mx-auto max-w-[1400px] px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Our Store */}
          <div>
            <h3 className="text-base font-bold uppercase tracking-widest mb-6 text-primary border-b border-primary/10 pb-2 inline-block">
              Our Store
            </h3>
            <ul className="space-y-3">
              {storeLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 inline-block duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className="text-base font-bold uppercase tracking-widest mb-6 text-primary border-b border-primary/10 pb-2 inline-block">
              Useful Links
            </h3>
            <ul className="space-y-3">
              {staticLinks["Useful Links"].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 inline-block duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h3 className="text-base font-bold uppercase tracking-widest mb-6 text-primary border-b border-primary/10 pb-2 inline-block">
              My Account
            </h3>
            <ul className="space-y-3">
              {staticLinks["My Account"].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 inline-block duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="text-base font-bold uppercase tracking-widest mb-6 text-primary border-b border-primary/10 pb-2 inline-block">
              Contact Us
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="p-2 bg-[#E5E9F0] neu-raised rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Call Us
                  </p>
                  <a
                    href="tel:+353123456789"
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors block mt-0.5"
                  >
                    +353 14090558
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="p-2 bg-[#E5E9F0] neu-raised rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    Email Us
                  </p>
                  <a
                    href="mailto:admin@celtictiles.ie"
                    className="text-sm font-bold text-foreground hover:text-primary transition-colors block mt-0.5"
                  >
                    admin@celtictiles.ie
                  </a>
                </div>
              </li>
              <li className="pt-2">
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary-dark text-white font-semibold tracking-wide neu-raised rounded-lg"
                >
                  <a
                    href="https://www.google.com/maps/place/Celtic+Tiles/@53.3240536,-6.3380458,17z/data=!3m1!4b1!4m6!3m5!1s0x4867133caf418fc7:0x8584650c497326da!8m2!3d53.3240536!4d-6.3380458!16s%2Fg%2F11c5q8y8qy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Find a Showroom
                  </a>
                </Button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Celtic Tiles. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <a
                href="https://eirvancee.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Eirvancee
              </a>
            </p>
            <div className="flex items-center gap-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              {/* Payment icons would go here */}
              <span className="text-xs text-muted-foreground">
                Secure Payments
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

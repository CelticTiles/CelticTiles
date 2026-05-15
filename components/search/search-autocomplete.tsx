"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSearchPlaceholderTypewriter } from "@/hooks/useSearchPlaceholderTypewriter";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
}

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
}

interface SearchAutocompleteProps {
  onSearch?: (query: string) => void;
}

export function SearchAutocomplete({ onSearch }: SearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Typewriter effect for placeholder
  useSearchPlaceholderTypewriter("#tile-search-input", [
    "Floor Tiles",
    "Wall Tiles",
    "Bathroom Tiles",
    "Kitchen Tiles",
    "Outdoor Tiles",
    "Marble Tiles",
    "Wood Effect Tiles",
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Search products AND categories from Supabase with debounce
  const searchProducts = useCallback(async (searchQuery: string) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (searchQuery.trim().length < 1) {
      setSuggestions([]);
      setCategories([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        signal: abortControllerRef.current!.signal,
      });
      if (!res.ok) throw new Error("Search failed");
      const { products, categories: cats } = await res.json();
      setSuggestions(products);
      setCategories(cats);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setSuggestions([]);
      setCategories([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length > 0) {
      debounceRef.current = setTimeout(() => {
        searchProducts(query);
      }, 200); // 200ms debounce
    } else {
      setSuggestions([]);
      setCategories([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchProducts]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalItems = categories.length + suggestions.length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          // Check if selected item is a category
          if (selectedIndex < categories.length) {
            window.location.href = `/${categories[selectedIndex].slug}`;
          } else {
            // It's a product
            const productIndex = selectedIndex - categories.length;
            window.location.href = `/product/${suggestions[productIndex].slug}`;
          }
        } else if (query.trim()) {
          onSearch?.(query);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
          <Input
            id="tile-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() =>
              query.trim().length > 0 && suggestions.length > 0 && setIsOpen(true)
            }
            onInput={() => {
              // Keep dropdown open as user types (after search results come back)
              if (query.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder="Search for tiles..."
            className="w-full pl-12 pr-4 h-12 bg-transparent neu-inset border-none rounded-full ring-0 focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : categories.length > 0 || suggestions.length > 0 ? (
              <>
                {/* Categories Section */}
                {categories.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground px-3 py-2 font-semibold uppercase tracking-wide">
                      Categories
                    </div>
                    {categories.map((category, index) => (
                      <Link
                        key={category.id}
                        href={`/${category.slug}`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                          index === selectedIndex ? "bg-gray-100" : ""
                        }`}
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                        }}
                      >
                        {/* Category Icon */}
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </div>
                        
                        {/* Category Name */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {category.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Browse all {category.name.toLowerCase()}
                          </div>
                        </div>
                        
                        {/* Arrow Icon */}
                        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </>
                )}

                {/* Products Section */}
                {suggestions.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground px-3 py-2 font-semibold uppercase tracking-wide">
                      Products
                    </div>
                    {suggestions.map((product, index) => {
                      const adjustedIndex = categories.length + index;
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                            adjustedIndex === selectedIndex ? "bg-gray-100" : ""
                          }`}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery("");
                          }}
                        >
                          {/* Product Image Thumbnail */}
                          <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Search className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {product.name}
                            </div>
                          </div>
                          
                          {/* Price */}
                          <div className="text-sm font-semibold text-accent flex-shrink-0">
                            {formatPrice(product.price)}
                          </div>
                        </Link>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

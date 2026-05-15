"use client";

import { useSearchPlaceholderTypewriter } from "@/hooks/useSearchPlaceholderTypewriter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Example component demonstrating the useSearchPlaceholderTypewriter hook
 * This can be used in the search page or header
 */
export function SearchWithTypewriter() {
  // Define the suffix words to rotate through
  const searchSuffixes = [
    "Floor Tiles",
    "Wall Tiles",
    "Wooden Tiles",
    "Ceramic Tiles",
    "Marble Tiles",
    "Outdoor Tiles",
    "Bathroom Tiles",
    "Kitchen Tiles",
  ];

  // Use the hook with the input selector and suffixes
  useSearchPlaceholderTypewriter("#tile-search-box", searchSuffixes);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          id="tile-search-box"
          type="text"
          className="w-full pl-12 pr-4 h-10"
          defaultValue=""
        />
      </div>
    </div>
  );
}

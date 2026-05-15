"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TileCalculator } from "./tile-calculator";
import { type Product } from "@/types";
import { Calculator } from "lucide-react";

interface CalculatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

export function CalculatorModal({
  isOpen,
  onOpenChange,
  product,
}: CalculatorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-2xl font-serif text-primary">
            <div className="p-2 bg-primary/10 rounded-full">
              <Calculator className="h-6 w-6" />
            </div>
            Tile Calculator
          </DialogTitle>
          <DialogDescription>
            Calculate requirements for {product.name}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-2">
          <TileCalculator product={product} compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}

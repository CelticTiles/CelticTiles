"use client";

import { useState } from "react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CalculatorValues {
  area: number;
  boxes: number;
  totalCost: number;
  hasValues: boolean;
}

// ============================================================================
// Utility: Parse coverage per box from product
// ============================================================================

/**
 * Parses the coverage string (e.g., "1.44 m²", "1.44m2", "1.44") to a number.
 * Returns null if the string can't be parsed.
 */
export function parseCoveragePerBox(coverage?: string | null): number | null {
  if (!coverage) return null;
  const match = coverage.match(/[\d.]+/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  return isNaN(val) || val <= 0 ? null : val;
}

// ============================================================================
// Component
// ============================================================================

interface TileCalculatorProps {
  product: Product;
  compact?: boolean;
  onCalculationChange?: (values: CalculatorValues | null) => void;
}

export function TileCalculator({
  product,
  compact = false,
  onCalculationChange,
}: TileCalculatorProps) {
  const [width, setWidth] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [includeWastage, setIncludeWastage] = useState<boolean>(false);
  const [calculatorValues, setCalculatorValues] =
    useState<CalculatorValues | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Coverage per box from product data
  const coveragePerBox = product.sqm_per_box
    ? parseCoveragePerBox(product.sqm_per_box)
    : parseCoveragePerBox(product.coverage || undefined);

  // Price per sqm
  const pricePerSqm = product.pricePerSqm || product.price;

  if (!coveragePerBox) return null;

  const handleCalculate = () => {
    const w = parseFloat(width);
    const l = parseFloat(length);

    if (!isNaN(w) && !isNaN(l) && w > 0 && l > 0) {
      const area = w * l;
      const areaWithWastage = area * (1 + (includeWastage ? 0.1 : 0));
      const boxes = Math.ceil(areaWithWastage / coveragePerBox);
      const totalCost = boxes * coveragePerBox * pricePerSqm;

      const values: CalculatorValues = {
        area: parseFloat(area.toFixed(2)),
        boxes,
        totalCost: parseFloat(totalCost.toFixed(2)),
        hasValues: true,
      };

      setCalculatorValues(values);
      setHasCalculated(true);
      onCalculationChange?.(values);
    }
  };

  const handleCancel = () => {
    setWidth("");
    setLength("");
    setIncludeWastage(false);
    setCalculatorValues(null);
    setHasCalculated(false);
    onCalculationChange?.(null);
  };

  // Coverage shown = boxes × sqm_per_box (actual coverage after rounding up boxes)
  const coverageDisplay = calculatorValues
    ? parseFloat((calculatorValues.boxes * coveragePerBox).toFixed(2))
    : null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* ── Inputs ── */}
      <div className="flex flex-wrap items-end gap-3 p-4">
        {/* Width */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Width
          </label>
          <div className="flex items-center neu-inset rounded overflow-hidden">
            <input
              type="number"
              step="0.01"
              min="0"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0"
              className="w-20 px-3 py-2 text-sm bg-transparent focus:outline-none"
            />
            <span className="px-2 py-2 text-sm font-medium text-slate-500">
              m
            </span>
          </div>
        </div>

        {/* Length */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">
            Length
          </label>
          <div className="flex items-center neu-inset rounded overflow-hidden">
            <input
              type="number"
              step="0.01"
              min="0"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="0"
              className="w-20 px-3 py-2 text-sm bg-transparent focus:outline-none"
            />
            <span className="px-2 py-2 text-sm font-medium text-slate-500">
              m
            </span>
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          className="neu-raised font-bold px-5 py-2 rounded-lg text-sm text-slate-800 hover:text-slate-900 transition-all"
        >
          Calculate Coverage (m²)
        </button>

        {/* Cancel */}
        {hasCalculated && (
          <button
            onClick={handleCancel}
            className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* ── Wastage checkbox ── */}
      <div className="px-4 pb-4">
        <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group select-none">
          <div
            onClick={() => {
              const checked = !includeWastage;
              setIncludeWastage(checked);

              // If results are already showing, recalculate immediately
              if (hasCalculated) {
                const w = parseFloat(width);
                const l = parseFloat(length);
                if (!isNaN(w) && !isNaN(l) && w > 0 && l > 0) {
                  const area = w * l;
                  const areaWithWastage = area * (1 + (checked ? 0.1 : 0));
                  const boxes = Math.ceil(areaWithWastage / coveragePerBox);
                  const totalCost = boxes * coveragePerBox * pricePerSqm;
                  const values: CalculatorValues = {
                    area: parseFloat(area.toFixed(2)),
                    boxes,
                    totalCost: parseFloat(totalCost.toFixed(2)),
                    hasValues: true,
                  };
                  setCalculatorValues(values);
                  onCalculationChange?.(values);
                }
              }
            }}
            className={`w-4 h-4 flex items-center justify-center transition-all duration-200 ${
              includeWastage
                ? "bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]"
                : "bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]"
            } group-hover:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15),inset_-1px_-1px_3px_rgba(255,255,255,0.8)]`}
          >
            {includeWastage && (
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          Add 10% wastage
        </label>
      </div>

      {/* ── Results ── */}
      {calculatorValues && coverageDisplay !== null && (
        <>
          {/* Coverage / Boxes */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Coverage:</span>
              <span className="font-bold text-slate-900">{coverageDisplay}m²</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Boxes:</span>
              <span className="font-bold text-slate-900">{calculatorValues.boxes}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">Coverage per Box:</span>
              <span className="font-bold text-slate-900">{coveragePerBox}m²</span>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 p-4 bg-slate-100">
            <p className="text-xs text-slate-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatPrice(calculatorValues.totalCost)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

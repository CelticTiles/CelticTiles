"use client";

import { useState, useCallback, useRef } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Trash2,
  Link2,
  CheckCircle2,
  PackagePlus,
  Search,
  Upload,
  FileImage,
  X,
  Camera,
  ImageIcon,
  AlertTriangle,
  Info,
  Plus,
} from "lucide-react";
import { searchProductsForQuote } from "@/lib/quotation-actions";
import { useCategories } from "@/hooks/useCategories";
import { createWorker } from "tesseract.js";
import { normaliseOcrText } from "@/lib/ocr-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GRNRow {
  id: string;
  vendor_name: string;
  name: string;
  expected_qty: number;
  received_qty: number;
  product_id: string | null;
  sku: string | null;
  price: number | null;
  stock: number | null;
  is_auto_matched: boolean;
  is_unknown: boolean;
}

interface ProductResult {
  id: string;
  name: string;
  assigned_code: string | null;
  price: number | null;
  stock: number | null;
}

async function readJsonResponse<T>(res: Response): Promise<T | { error?: string }> {
  const text = await res.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text };
  }
}

// ─── Diff Badge ───────────────────────────────────────────────────────────────

function DiffBadge({
  expected,
  received,
}: {
  expected: number;
  received: number;
}) {
  const diff = received - expected;
  if (received === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        ❌ Missing
      </span>
    );
  }
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        ✅ Match
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        ⚠️ Short {Math.abs(diff)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      🔵 Extra {diff}
    </span>
  );
}

// ─── Product Link Modal ────────────────────────────────────────────────────────

function ProductLinkModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      toast.error("Enter at least 2 characters to search.");
      return;
    }
    setIsSearching(true);
    setSearched(false);
    try {
      const data = await searchProductsForQuote(query.trim());
      setResults((data as ProductResult[]) ?? []);
      setSearched(true);
    } catch {
      toast.error("Product search failed.");
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Product</DialogTitle>
          <DialogDescription>
            Search for a product by name or SKU to link it to this row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="grn-product-search-input"
                placeholder="Search by name or SKU..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button
              id="grn-product-search-btn"
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="neu-raised border-transparent text-white shrink-0"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-xl neu-inset p-1 min-h-[80px]">
            {!searched && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Type a name or SKU and press Search.
              </p>
            )}
            {searched && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No products found for &ldquo;{query}&rdquo;.
              </p>
            )}
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onSelect(product);
                  handleClose();
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    SKU: {product.assigned_code || "N/A"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary shrink-0">
                  {product.price != null ? `€${product.price.toFixed(2)}` : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main GRN Page ─────────────────────────────────────────────────────────────

const makeRow = (overrides: Partial<GRNRow> = {}): GRNRow => ({
  id: crypto.randomUUID(),
  vendor_name: "",
  name: "",
  expected_qty: 1,
  received_qty: 1,
  product_id: null,
  sku: null,
  price: null,
  stock: null,
  is_auto_matched: false,
  is_unknown: false,
  ...overrides,
});

export default function GRNPage() {
  const [rows, setRows] = useState<GRNRow[]>(() => [makeRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  // OCR state
  const [inputMode, setInputMode] = useState<"table" | "image">("table");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);

  // New product modal state
  const { categories } = useCategories();
  const [newProductRowId, setNewProductRowId] = useState<string | null>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: "", assigned_code: "", size: "", finish: "", price: "", category_id: "",
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  // Track whether alias-match has completed — only show New Product after that
  const [aliasMatchDone, setAliasMatchDone] = useState(false);

  const openNewProductModal = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    setNewProductRowId(rowId);
    setNewProductForm({
      name: row?.vendor_name || row?.name || "",
      assigned_code: row?.sku || "",
      size: "", finish: "", price: "", category_id: "",
    });
  };

  const handleCreateNewProduct = async () => {
    if (!newProductForm.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setIsSavingProduct(true);
    try {
      // 1. Generate slug from name
      const slug = newProductForm.name.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // 2. Create product
      const productRes = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductForm.name.trim(),
          slug: `${slug}-${Date.now()}`,
          assigned_code: newProductForm.assigned_code.trim() || null,
          size: newProductForm.size.trim() || null,
          finish: newProductForm.finish.trim() || null,
          price: newProductForm.price ? parseFloat(newProductForm.price) : null,
          category_id: newProductForm.category_id || null,
          status: "draft",
          stock: 0,
        }),
      });
      const productData = await productRes.json();
      if (!productRes.ok) throw new Error(productData.error || "Failed to create product");
      const product = productData.product;

      // 3. Auto-create alias so future GRN scans auto-match
      const row = rows.find(r => r.id === newProductRowId);
      const vendorName = row?.vendor_name || row?.name || "";
      if (vendorName.trim()) {
        await fetch("/api/admin/inventory/aliases", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias: vendorName.trim(), product_id: product.id }),
        });
      }

      // 4. Link the GRN row to the new product
      if (newProductRowId) {
        updateRow(newProductRowId, {
          product_id: product.id,
          name: product.name,
          sku: product.assigned_code,
          price: product.price ?? null,
          stock: 0,
          is_auto_matched: false,
        });
      }

      toast.success(`"${product.name}" created as draft and linked.`);
      setNewProductRowId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  // ── Process text → rows + alias auto-match ─────────────────────────────

  const parseAndMatchText = async (text: string) => {
    if (!text.trim()) return;

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: GRNRow[] = lines.map((line) => {
      const trimmedLine = line.trim()
      
      // Strict Product Pattern: [Qty] [Code] [Description...]
      const productRegex = /^(\d+(?:[.,]\d+)?)\s+([A-Z0-9/.-]+)\s+(.+)$/
      const match = trimmedLine.match(productRegex)

      if (!match) return null

      const qtyStr = match[1].replace(",", ".")
      const qty = parseFloat(qtyStr) || 1
      const sku = match[2]
      let remainder = match[3].trim()

      // Robust Price Extraction: Look for the last few numeric/currency tokens
      // We expect: [Optional Discount] [Unit Price] [Total Amount]
      // We match tokens that look like prices: e.g. "€449.99", "449.99", "449,99"
      const tokens = remainder.split(/\s+/);
      let price: number | null = null;
      let descriptionParts = [...tokens];

      // Scan backwards from the end to find the Unit Price and Amount
      // Usually: Description... [Discount] [Unit Price] [Amount]
      // We skip the very last token (Amount) and take the one before it as Unit Price
      if (tokens.length >= 2) {
        const lastToken = tokens[tokens.length - 1];
        const secondLastToken = tokens[tokens.length - 2];
        const thirdLastToken = tokens.length >= 3 ? tokens[tokens.length - 3] : null;

        const isPrice = (s: string) => /^[€£$]?[0-9]+([.,][0-9]{1,2})?$/.test(s);

        if (isPrice(lastToken) && isPrice(secondLastToken)) {
          price = parseFloat(secondLastToken.replace(/[€£$,]/g, (m) => m === "," ? "." : ""));
          // Remove the matched price/amount/discount tokens from the description
          descriptionParts = tokens.slice(0, -2);

          if (thirdLastToken && /^\d+$/.test(thirdLastToken)) {
            descriptionParts = descriptionParts.slice(0, -1);
          }
        }
      }
      
      const description = descriptionParts.join(" ").trim();

      return makeRow({
        vendor_name: description,
        name: description,
        sku: sku,
        expected_qty: qty,
        received_qty: qty,
        price: price,
      });
    }).filter((row): row is GRNRow => row !== null);

    // Merge duplicates
    const merged: GRNRow[] = [];
    for (const row of parsed) {
      const key = row.vendor_name.toLowerCase().trim();
      const existing = merged.find(
        (r) => r.vendor_name.toLowerCase().trim() === key,
      );
      if (existing) {
        existing.expected_qty += row.expected_qty;
        existing.received_qty += row.received_qty;
      } else {
        merged.push({ ...row });
      }
    }

    const mergedCount = parsed.length - merged.length;

    setRows((prev) => {
      const existing = prev.filter((r) => r.vendor_name || r.product_id);
      return [...existing, ...merged];
    });

    toast.success(
      mergedCount > 0
        ? `${merged.length} item${merged.length !== 1 ? "s" : ""} parsed (${mergedCount} duplicate${mergedCount !== 1 ? "s" : ""} merged).`
        : `${merged.length} item${merged.length !== 1 ? "s" : ""} parsed.`,
    );

    // Auto alias-match
    const names = merged.map((r) => r.vendor_name);
    if (names.length > 0) {
      setIsMatching(true);
      setAliasMatchDone(false);
      try {
        const res = await fetch("/api/admin/inventory/grn/alias-match", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names }),
        });
        const payload = await res.json();
        const matches = payload.matches ?? {};

        setRows((prev) =>
          prev.map((row) => {
            const key = row.vendor_name.toLowerCase().trim();
            const match = matches[key];
            if (match) {
              return {
                ...row,
                product_id: match.product_id,
                name: match.name,
                sku: match.sku,
                price: match.price ?? null,
                stock: match.stock ?? null,
                is_auto_matched: true,
              };
            }
            return row;
          }),
        );

        const matchCount = Object.keys(matches).length;
        if (matchCount > 0) {
          toast.success(
            `${matchCount} item${matchCount !== 1 ? "s" : ""} auto-matched via aliases.`,
          );
        }
      } catch {
        // Alias match failure is non-critical — staff can still link manually
      } finally {
        setIsMatching(false);
        setAliasMatchDone(true);
      }
    }
  };

  // ── Row edits ──────────────────────────────────────────────────────────────

  const updateRow = (id: string, updates: Partial<GRNRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addEmptyRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  // ── Image handling ─────────────────────────────────────────────────────────

  const handleFileSelected = async (file: File, autoRunOcr = false) => {
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    
    if (!isImage && !isPdf) {
      toast.error("Please select a valid image or PDF file.");
      return;
    }
    setSelectedImage(file);
    if (isImage) {
      setImagePreview(URL.createObjectURL(file));
    } else if (isPdf) {
      setImagePreview("PDF_PLACEHOLDER");
    } else {
      setImagePreview(null);
    }
    setOcrError(null);
    setOcrWarning(null);
    setInputMode("image");

    if (autoRunOcr) {
      // Camera capture: auto-run OCR immediately
      await runOCR(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file, true); // auto-run OCR
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file, false); // user presses Extract Text manually
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setOcrError(null);
    setOcrWarning(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const runOCR = async (fileOverride?: File) => {
    const file = fileOverride ?? selectedImage;
    if (!file) {
      toast.error("Please select an image first.");
      return;
    }

    setIsOcrRunning(true);
    setOcrError(null);
    setOcrWarning(null);

    try {
      let text = "";
      let confidence = 0;

      if (file.type.startsWith("image/")) {
        // --- Client Side Image OCR ---
        // Using Tesseract on the client avoids Netlify's 10s function timeout
        // and 6MB payload limits.
        let worker: any = null;
        try {
          worker = await createWorker("eng", 1, {
            logger: m => console.log("[Tesseract.js]", m),
          });
          const { data } = await worker.recognize(file);
          text = normaliseOcrText(data.text);
          confidence = Math.round(data.confidence || 0);
        } catch (tessErr: any) {
          console.error("[Tesseract.js Error]", tessErr);
          throw new Error(`Image OCR failed: ${tessErr.message || tessErr}`);
        } finally {
          if (worker) await worker.terminate();
        }
      } else {
        // --- Server Side PDF Scan ---
        // PDFs are usually fast and processed via pdfreader on the server
        const form = new FormData();
        form.append("image", file);
        const res = await fetch("/api/admin/inventory/grn/ocr", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const payload = await readJsonResponse<{ raw_text?: string; confidence?: number; error?: string }>(res);
        const ocrPayload = payload as { raw_text?: string; confidence?: number; error?: string };
        if (!res.ok) throw new Error(ocrPayload?.error || "OCR failed");
        
        text = ocrPayload.raw_text || "";
        confidence = ocrPayload.confidence ?? 0;
      }

      if (!text.trim()) {
        setOcrError("No text was detected. Try a clearer image or a digital PDF.");
        return;
      }

      await parseAndMatchText(text);
      setInputMode("table");

      if (confidence < 60) {
        setOcrWarning(`Low confidence (${confidence}%) — text may contain errors.`);
      } else {
        toast.success("Text extracted successfully!");
      }
    } catch (err: unknown) {
      console.error("[GRN OCR ERROR]", err);
      const message = err instanceof Error ? `${err.name}: ${err.message}` : typeof err === 'string' ? err : JSON.stringify(err);
      setOcrError(`OCR failed: ${message}. Try checking the browser console for more details.`);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // ── Product link ───────────────────────────────────────────────────────────

  const openModal = (rowId: string) => {
    setActiveRowId(rowId);
    setModalOpen(true);
  };

  const handleProductSelect = (product: ProductResult) => {
    if (!activeRowId) return;
    updateRow(activeRowId, {
      product_id: product.id,
      name: product.name,
      sku: product.assigned_code,
      price: product.price ?? null,
      stock: product.stock ?? null,
      is_auto_matched: false,
      is_unknown: false,
    });
    setActiveRowId(null);
  };

  // ── Save GRN ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (rows.length === 0) {
      toast.error("No items to save.");
      return;
    }

    const linkedRows = rows.filter((r) => r.product_id);
    const unknownRows = rows.filter((r) => !r.product_id);

    

    const invalidQty = linkedRows.filter(
      (r) => !r.received_qty || r.received_qty <= 0,
    );
    if (invalidQty.length > 0) {
      toast.error(
        "All linked items must have a received quantity greater than 0.",
      );
      return;
    }

    // Prepare payload for confirmation
    const payload = {
      raw_text: "",
      items: rows.map((r) => ({
  product_id: r.product_id,
  name: r.name || r.vendor_name,
  sku: r.sku,
  expected_qty: r.expected_qty,
  received_qty: r.received_qty,
  price: r.price,
}))
        .map((r) => ({
          product_id: r.product_id,
          name: r.name,
          sku: r.sku,
          expected_qty: r.expected_qty,
          received_qty: r.received_qty,
        })),
    };

    setPendingSavePayload(payload);
    setShowConfirmSave(true);
  };

  const handleConfirmedSave = async () => {
    if (!pendingSavePayload) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/inventory/grn/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingSavePayload),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save GRN");
      }

      const { processed, created, total } = payload;
      let msg = `${processed} item${processed !== 1 ? "s" : ""} updated stock.`;
      if (created > 0) msg += ` ${created} new product${created !== 1 ? "s" : ""} created.`;
      
      toast.success(msg);

      setRows([makeRow()]);
      setShowConfirmSave(false);
      setPendingSavePayload(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };
  // ── Computed ───────────────────────────────────────────────────────────────

  const linkedCount = rows.filter((r) => r.product_id).length;
  const unknownCount = rows.filter((r) => !r.product_id).length;
  const hasDiscrepancy = rows.some(
    (r) => r.product_id && r.received_qty !== r.expected_qty,
  );

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl neu-raised">
          <PackagePlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Goods Received Note
          </h1>
          <p className="text-sm text-muted-foreground">
            Scan or paste items, link products, update stock.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl neu-raised p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-foreground">Line Items</h2>
          {/* Toggle text / image */}
          <div className="flex rounded-xl neu-inset p-1 gap-1">
            <button
              type="button"
              onClick={() => setInputMode("table")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                inputMode === "table"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setInputMode("image")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                inputMode === "image"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Scan / Upload
            </button>
          </div>
        </div>

        {/* Image / Camera Section */}
        {inputMode === "image" && (
          <div className="space-y-3 pb-2 border-b border-border/30">
            <p className="text-xs text-muted-foreground">
              Take a photo of the delivery note or upload an image/PDF. Text will be
              extracted automatically.
            </p>

            {/* Two capture buttons */}
            {!imagePreview && (
              <div className="flex gap-3 flex-wrap">
                {/* Camera — opens rear camera directly on mobile */}
                <Button
                  id="grn-camera-btn"
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="neu-raised border-transparent gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCameraCapture}
                />

                {/* Gallery */}
                <Button
                  id="grn-gallery-btn"
                  type="button"
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  className="neu-raised border-transparent gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Choose from Gallery
                </Button>
                <input
                  ref={galleryInputRef}
                  id="grn-image-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleGallerySelect}
                />
              </div>
            )}

            {/* Preview */}
            {imagePreview && (
              <div className="space-y-3">
                <div className="relative inline-block">
                  {imagePreview === "PDF_PLACEHOLDER" ? (
                    <div className="h-32 w-32 rounded-xl bg-blue-50 flex flex-col items-center justify-center border-2 border-dashed border-blue-200">
                      <PackagePlus className="h-10 w-10 text-blue-500 mb-2" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase">PDF Selected</span>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Selected delivery note"
                      className="max-h-48 max-w-full rounded-xl object-contain shadow-sm border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow-md z-10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {!isOcrRunning && (
                  <Button
                    id="grn-ocr-btn"
                    type="button"
                    onClick={() => runOCR()}
                    disabled={isOcrRunning}
                    className="neu-raised border-transparent text-white hover:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Extract Text
                  </Button>
                )}
              </div>
            )}

            {/* OCR running indicator */}
            {isOcrRunning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting text from image...
              </div>
            )}

            {/* OCR Warning (low confidence) */}
            {ocrWarning && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 p-4">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Low OCR confidence
                  </p>
                  <p className="text-xs text-amber-600/80 mt-0.5">
                    {ocrWarning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOcrWarning(null)}
                  className="text-amber-600/60 hover:text-amber-700 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* OCR Error */}
            {ocrError && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    OCR failed
                  </p>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    {ocrError}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a higher-contrast image, or paste text directly below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOcrError(null)}
                  className="text-destructive/60 hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Hint to switch back */}
            {imagePreview && (
              <button
                type="button"
                onClick={() => setInputMode("table")}
                className="text-xs text-primary underline underline-offset-2"
              >
                Or paste text directly →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="rounded-2xl neu-raised p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-foreground">
              Review &amp; Edit ({rows.length} item
              {rows.length !== 1 ? "s" : ""})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {linkedCount}/{rows.length} linked
              {unknownCount > 0 && (
                <span className="text-blue-600 ml-2">
                  · {unknownCount} new product{unknownCount !== 1 ? "s" : ""} will be created
                </span>
              )}
              {hasDiscrepancy && (
                <span className="text-amber-600 ml-2">
                  · Discrepancies detected
                </span>
              )}
            </p>
          </div>
          <Button
            id="grn-add-row-btn"
            type="button"
            variant="outline"
            size="sm"
            onClick={addEmptyRow}
            className="neu-raised border-transparent text-sm"
          >
            + Add Row
          </Button>
        </div>

        {/* Discrepancy info banner */}
        {hasDiscrepancy && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 p-3">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Stock will be updated using the <strong>Received Qty</strong>, not
              the Expected Qty. Discrepancies are recorded in the GRN log.
            </p>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl neu-inset">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-4 py-3 w-32">Code/SKU</th>
                <th className="px-4 py-3 w-48">Name</th>
                <th className="px-4 py-3 w-24 text-center">Price</th>
                {/* <th className="px-4 py-3 w-24 text-center">Stock</th> */}
                <th className="px-4 py-3 w-28 text-center">Expected</th>
                <th className="px-4 py-3 w-28 text-center">Received</th>
                <th className="px-4 py-3 w-28 text-center">Diff</th>
                <th className="px-4 py-3 w-32">Action</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isUnlinked = !row.product_id;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border/30 last:border-0 ${
                      isUnlinked ? "bg-amber-50/30 dark:bg-amber-900/10" : ""
                    }`}
                  >
                    {/* Code */}
                    <td className="px-4 py-3">
                      <Input
                        value={row.sku || ""}
                        onChange={(e) =>
                          updateRow(row.id, { sku: e.target.value })
                        }
                        placeholder="Code..."
                        className={isUnlinked ? "border-amber-400/50" : ""}
                      />
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <Input
                        value={row.name || ""}
                        onChange={(e) =>
                          updateRow(row.id, { name: e.target.value })
                        }
                        placeholder="Product Name..."
                        className={isUnlinked ? "border-amber-400/50" : ""}
                      />
                    </td>
                    {/* Price */}
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={row.price ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            price: parseFloat(e.target.value) || null,
                          })
                        }
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="Price"
                        className={`w-24 text-center mx-auto ${isUnlinked ? "border-amber-400/50" : ""}`}
                      />
                    </td>
                    {/* Stock */}
                    {/* <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        value={row.stock ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            stock: parseInt(e.target.value, 10) || null,
                          })
                        }
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="Stock"
                        className={`w-20 text-center mx-auto ${isUnlinked ? "border-amber-400/50" : ""}`}
                      />
                    </td> */}
                    {/* Expected Qty */}
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        value={row.expected_qty === 0 ? "" : row.expected_qty}
                        onChange={(e) =>
                          updateRow(row.id, {
                            expected_qty: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="w-20 text-center mx-auto"
                      />
                    </td>
                    {/* Received Qty */}
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        value={row.received_qty === 0 ? "" : row.received_qty}
                        onChange={(e) =>
                          updateRow(row.id, {
                            received_qty: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="w-20 text-center mx-auto"
                      />
                    </td>
                    {/* Diff */}
                    <td className="px-4 py-3 text-center">
                      {row.product_id ? (
                        <DiffBadge
                          expected={row.expected_qty}
                          received={row.received_qty}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>
                    {/* Linked Product / Search / New Product */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => openModal(row.id)}
                          className={`flex items-center justify-center w-full gap-2 px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            row.product_id
                              ? row.is_auto_matched
                                ? "text-blue-700 bg-blue-50 neu-raised"
                                : "text-green-700 bg-green-50 neu-raised"
                              : "text-muted-foreground neu-raised hover:text-primary"
                          }`}
                        >
                          {row.product_id ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Linked</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3.5 w-3.5 shrink-0" />
                              Search
                            </>
                          )}
                        </button>
                        {/* Show New Product only after alias-match ran and row is still unlinked */}
                        {!row.product_id && aliasMatchDone && (
                          <button
                            type="button"
                            onClick={() => openNewProductModal(row.id)}
                            className="flex items-center justify-center w-full gap-1 px-2 py-1.5 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 neu-raised hover:bg-emerald-100 transition-all"
                          >
                            <Plus className="h-3 w-3 shrink-0" />
                            New Product
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Delete */}
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {rows.map((row) => {
            const isUnlinked = !row.product_id;
            return (
              <div
                key={row.id}
                className={`rounded-xl neu-raised p-4 space-y-3 ${
                  isUnlinked ? "border border-amber-400/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={row.vendor_name}
                      onChange={(e) =>
                        updateRow(row.id, { vendor_name: e.target.value })
                      }
                      placeholder="Vendor item name..."
                      className="flex-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    className="shrink-0 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Expected
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={row.expected_qty === 0 ? "" : row.expected_qty}
                      onChange={(e) =>
                        updateRow(row.id, {
                          expected_qty: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Received
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={row.received_qty === 0 ? "" : row.received_qty}
                      onChange={(e) =>
                        updateRow(row.id, {
                          received_qty: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      className="text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {row.product_id ? (
                    <DiffBadge
                      expected={row.expected_qty}
                      received={row.received_qty}
                    />
                  ) : (
                    <span className="text-xs text-amber-600">⚠ Not linked</span>
                  )}

                  <button
                    type="button"
                    onClick={() => openModal(row.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      row.product_id
                        ? row.is_auto_matched
                          ? "text-blue-700 bg-blue-50 neu-raised"
                          : "text-green-700 bg-green-50 neu-raised"
                        : "text-muted-foreground neu-raised hover:text-primary"
                    }`}
                  >
                    {row.product_id ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[100px]">
                          {row.sku || "Linked"}
                        </span>
                        {row.is_auto_matched && (
                          <span className="text-blue-500 text-[10px]">
                            auto
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        Link product
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom bar */}
      {rows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-10 bg-card border-t border-border/30 p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground">
              {linkedCount}/{rows.length} linked
              {unknownCount > 0 && (
                <span className="text-blue-600 ml-2">
                  · {unknownCount} will be created as new products
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRows([makeRow()])}
              disabled={isSaving}
              className="neu-raised border-transparent"
            >
              Reset
            </Button>

            <Button
              id="grn-save-btn"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="neu-raised border-transparent text-white hover:text-white min-w-[120px]"
            >
              
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save GRN"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      <Dialog open={!!newProductRowId} onOpenChange={(o) => !isSavingProduct && !o && setNewProductRowId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              This will create a <strong>draft</strong> product and auto-link it to this GRN row. An alias will be saved so future scans auto-match it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Product Name *</label>
              <Input
                value={newProductForm.name}
                onChange={e => setNewProductForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Composición JUNGLE DARK Set x6"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">SKU / Code</label>
                <Input
                  value={newProductForm.assigned_code}
                  onChange={e => setNewProductForm(p => ({ ...p, assigned_code: e.target.value }))}
                  placeholder="e.g. E125"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Size</label>
                <Input
                  value={newProductForm.size}
                  onChange={e => setNewProductForm(p => ({ ...p, size: e.target.value }))}
                  placeholder="e.g. 30x60, 60*120 CM"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Finish</label>
                <Input
                  value={newProductForm.finish}
                  onChange={e => setNewProductForm(p => ({ ...p, finish: e.target.value }))}
                  placeholder="e.g. Polished, Matt"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Price (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProductForm.price}
                  onChange={e => setNewProductForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  onWheel={e => (e.target as HTMLElement).blur()}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Category</label>
              <select
                value={newProductForm.category_id}
                onChange={e => setNewProductForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select category (optional)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
              Product will be created as <strong>draft</strong> — it won&apos;t appear on the storefront until published from the Products admin page.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProductRowId(null)} disabled={isSavingProduct} className="neu-raised border-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewProduct}
              disabled={isSavingProduct || !newProductForm.name.trim()}
              className="neu-raised border-transparent text-white hover:text-white"
            >
              {isSavingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create & Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Link Modal */}
      <ProductLinkModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveRowId(null);
        }}
        onSelect={handleProductSelect}
      />

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirm Stock Update</DialogTitle>
            <DialogDescription>
              Please review the changes before updating stock levels. This
              action will:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium text-sm">Stock Updates:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingSavePayload?.items?.map((item: any, index: number) => {
                  const discrepancy = item.received_qty !== item.expected_qty;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {discrepancy && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Expected: {item.expected_qty}
                          </span>
                        )}
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                          Stock → {item.received_qty}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasDiscrepancy && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Discrepancies detected:</strong> Stock will be updated
                  using received quantities, not expected quantities. All
                  discrepancies will be logged for review.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirmSave(false);
                setPendingSavePayload(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmedSave}
              disabled={isSaving}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isSaving ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

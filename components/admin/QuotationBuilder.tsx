"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { saveQuotation } from "@/lib/quotation-actions";
import { QuotationProductSearch } from "./QuotationProductSearch";
import { generateQuotationPDF } from "@/lib/quotation-pdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Quotation,
  QuotationItem,
  QuotationProductItem,
  QuotationSectionHeader,
} from "@/lib/supabase-types";

interface QuotationBuilderProps {
  initialData?: Quotation | null;
  vatRate: number;
  currentUserName?: string;
}

export function QuotationBuilder({
  initialData,
  vatRate,
  currentUserName,
}: QuotationBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || searchParams.get("name") || "",
    customer_email: initialData?.customer_email || searchParams.get("email") || "",
    customer_phone: initialData?.customer_phone || searchParams.get("phone") || "",
    quote_type: initialData?.quote_type || "Material Quote",
    delivery_collection: initialData?.delivery_collection || "Collection",
    delivery_address_line1: initialData?.delivery_address_line1 || "",
    delivery_address_line2: initialData?.delivery_address_line2 || "",
    delivery_city: initialData?.delivery_city || "",
    delivery_postcode: initialData?.delivery_postcode || "",
    customer_order_no: initialData?.customer_order_no || "",
    sales_rep_name: initialData?.sales_rep_name || currentUserName || "",
    instructions: initialData?.instructions || "",
    status: initialData?.status || "draft",
    discount_enabled: initialData?.discount_enabled || false,
    discount_percentage: initialData?.discount_percentage || 0,
    lead_id: initialData?.lead_id || searchParams.get("lead_id") || null,
  });

  const [items, setItems] = useState<QuotationItem[]>(initialData?.items || []);

  // Auto-calculate amounts when items change, including quote-level discount
  const totals = useMemo(() => {
    let totalIncVat = 0;

    // Recalculate item amounts
    const updatedItems = items.map((item) => {
      if (item.type === "product") {
        // Calculate amount with item discount applied
        const baseAmount = item.unit_price * item.quantity;
        const discountAmount = baseAmount * (item.discount_percentage / 100);
        const amountIncVat = baseAmount - discountAmount;
        totalIncVat += amountIncVat;

        return {
          ...item,
          amount: amountIncVat,
          vat_amount: 0,
          vat_rate: vatRate,
        };
      }
      return item;
    });

    // Apply quote-level discount if enabled
    let quoteDiscountAmount = 0;
    if (formData.discount_enabled && formData.discount_percentage > 0) {
      quoteDiscountAmount = totalIncVat * (formData.discount_percentage / 100);
    }

    const subtotalAfterDiscount = totalIncVat - quoteDiscountAmount;

    return {
      items: updatedItems,
      subtotal: subtotalAfterDiscount,
      quoteDiscount: quoteDiscountAmount,
      vat_total: 0,
      total: subtotalAfterDiscount,
    };
  }, [items, vatRate, formData.discount_enabled, formData.discount_percentage]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "delivery_collection" && value === "Collection"
        ? {
            delivery_address_line1: "",
            delivery_address_line2: "",
            delivery_city: "",
            delivery_postcode: "",
          }
        : {}),
    }));
  };

  const handleAddProduct = (product: any) => {
    const existingItem = items.find(
      (item) => item.type === "product" && item.product_id === product.id,
    ) as QuotationProductItem | undefined;

    if (existingItem) {
      toast.warning(`"${product.name}" is already in the quote.`);
      setHighlightedItemId(existingItem.id);
      setTimeout(() => setHighlightedItemId(null), 2000);
      // Scroll to the highlighted row
      setTimeout(() => {
        document.getElementById(`item-row-${existingItem.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } else {
      const newItem: QuotationProductItem = {
        id: crypto.randomUUID(),
        type: "product",
        sort_order: items.length,
        product_id: product.id,
        code: product.assigned_code || "N/A",
        description: product.name,
        quantity: 1,
        unit_price: product.price || 0,
        discount_percentage: 0,
        amount: product.price || 0,
        vat_rate: vatRate,
        vat_amount: (product.price || 0) * (vatRate / 100),
        image_url: product.image || null,
      };
      setItems([...items, newItem]);
    }
  };

  const handleAddSection = () => {
    const newItem: QuotationSectionHeader = {
      id: crypto.randomUUID(),
      type: "section_header",
      sort_order: items.length,
      label: "New Section Header...",
    };
    setItems([...items, newItem]);
  };

  const updateItem = (
    id: string,
    updates: Partial<QuotationProductItem | QuotationSectionHeader>,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? ({ ...item, ...updates } as QuotationItem) : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    const temp = newItems[index];
    newItems[index] = newItems[swapIndex];
    newItems[swapIndex] = temp;

    setItems(newItems);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name) {
      toast.error("Customer name is required.");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item to the quotation.");
      return;
    }

    if (formData.delivery_collection === "Delivery") {
      if (!formData.delivery_address_line1?.trim()) {
        toast.error("Delivery address line 1 is required for delivery.");
        return;
      }

      if (!formData.delivery_city?.trim()) {
        toast.error("Delivery city is required for delivery.");
        return;
      }

      if (!formData.delivery_postcode?.trim()) {
        toast.error("Delivery postcode is required for delivery.");
        return;
      }
    }

    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payloadData = {
        ...formData,
        items: totals.items,
        subtotal: totals.subtotal,
        vat_total: totals.vat_total,
        total: totals.total,
      };

      if (initialData?.id) {
        // Update
        const saved = await saveQuotation(
          { id: initialData.id, ...payloadData },
          false,
        );
        toast.success("Quotation updated");
        setShowConfirm(false);
        router.push(`/admin/quotations`);
      } else {
        // Create
        const saved = await saveQuotation(payloadData, true);
        toast.success("Quotation created");
        setShowConfirm(false);

        try {
          const blob = await generateQuotationPDF(saved);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${saved.quote_number || "quote"}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (pdfErr) {
          toast.error("Saved, but PDF failed to generate.");
        }

        router.push(`/admin/quotations`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle enter key to prevent accidental form submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  return (
    <>
      <form
        onSubmit={handlePreSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-8 pb-20"
      >
        {/* Settings Panel */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <h2 className="font-semibold text-lg border-b pb-2">
            Customer Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) =>
                  handleFieldChange("customer_name", e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) =>
                  handleFieldChange("customer_email", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) =>
                  handleFieldChange("customer_phone", e.target.value)
                }
              />
            </div>
          </div>

          <h2 className="font-semibold text-lg border-b pb-2 pt-4">
            Quote Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Quote Type</Label>
              <Input
                value={formData.quote_type}
                onChange={(e) =>
                  handleFieldChange("quote_type", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery/Collection</Label>
              <Select
                value={formData.delivery_collection}
                onValueChange={(value) =>
                  handleFieldChange("delivery_collection", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Collection">Collection</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cust. Order No.</Label>
              <Input
                value={formData.customer_order_no}
                onChange={(e) =>
                  handleFieldChange("customer_order_no", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Sales Rep Name</Label>
              <Input
                value={formData.sales_rep_name}
                onChange={(e) =>
                  handleFieldChange("sales_rep_name", e.target.value)
                }
              />
            </div>
          </div>

          {/* Discount Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    discount_enabled: !prev.discount_enabled,
                    discount_percentage: !prev.discount_enabled ? prev.discount_percentage : 0,
                  }))
                }
                className={`w-4 h-4 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  formData.discount_enabled
                    ? "bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]"
                    : "bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]"
                }`}
              >
                {formData.discount_enabled && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <Label
                htmlFor="discount_enabled"
                className="cursor-pointer font-semibold"
              >
                Apply Quote-Level Discount
              </Label>
            </div>
            {formData.discount_enabled && (
              <div className="ml-7 space-y-2">
                <Label>Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_percentage: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="Enter discount %"
                  className="w-32"
                />
                <p className="text-xs text-blue-600">
                  Discount Amount: €{totals.quoteDiscount?.toFixed(2) || "0.00"}
                </p>
              </div>
            )}
          </div>
          {formData.delivery_collection === "Delivery" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Delivery Address Line 1 *</Label>
                <Input
                  value={formData.delivery_address_line1}
                  onChange={(e) =>
                    handleFieldChange("delivery_address_line1", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Address Line 2</Label>
                <Input
                  value={formData.delivery_address_line2}
                  onChange={(e) =>
                    handleFieldChange("delivery_address_line2", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery City *</Label>
                <Input
                  value={formData.delivery_city}
                  onChange={(e) =>
                    handleFieldChange("delivery_city", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Postcode *</Label>
                <Input
                  value={formData.delivery_postcode}
                  onChange={(e) =>
                    handleFieldChange("delivery_postcode", e.target.value)
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Line Items Panel */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
            <h2 className="font-semibold text-lg">Line Items</h2>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
              <div className="w-full sm:w-80 relative">
                <QuotationProductSearch onSelectProduct={handleAddProduct} />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSection}
                className="shrink-0 w-full sm:w-auto neu-raised border-transparent"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Sub-header
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              Search for products above to build the quote.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm text-left" style={{ overflowY: "visible" }}>
                <thead className="text-xs text-gray-700 bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Ord</th>
                    <th className="px-4 py-3 w-20">Qty</th>
                    <th className="px-4 py-3 w-32">Code</th>
                    <th className="px-4 py-3 min-w-[200px]">Description</th>
                    <th className="px-4 py-3 w-24">Disc%</th>
                    <th className="px-4 py-3 w-24">Unit Price</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    {/* <th className="px-4 py-3 text-right">VAT</th> */}
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {totals.items.map((item, index) => {
                    if (item.type === "section_header") {
                      return (
                        <tr key={item.id} className="bg-gray-100 border-b">
                          <td className="px-4 py-2 border-r align-middle text-center">
                            <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => moveItem(index, "up")}
                              >
                                <ArrowUp className="w-3 h-3 hover:text-blue-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(index, "down")}
                              >
                                <ArrowDown className="w-3 h-3 hover:text-blue-600" />
                              </button>
                            </div>
                          </td>
                          <td colSpan={6} className="px-4 py-2">
                            <Input
                              value={item.label}
                              onChange={(e) =>
                                updateItem(item.id, { label: e.target.value })
                              }
                              className="font-bold border-gray-300"
                              placeholder="Enter section title..."
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={item.id}
                        id={`item-row-${item.id}`}
                        className={`border-b transition-colors duration-300 ${
                          highlightedItemId === item.id
                            ? "bg-amber-100 ring-2 ring-amber-400"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-2 border-r align-middle text-center">
                          <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => moveItem(index, "up")}
                            >
                              <ArrowUp className="w-3 h-3 hover:text-blue-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(index, "down")}
                            >
                              <ArrowDown className="w-3 h-3 hover:text-blue-600" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20"
                          />
                        </td>
                        <td className="px-4 py-2 font-medium">{item.code}</td>
                        <td className="px-4 py-2">
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, {
                                description: e.target.value,
                              })
                            }
                            className="min-w-[200px]"
                          />
                        </td>
                        <td className="px-4 py-2 overflow-visible">
                          <div className="flex items-center gap-1">
                            <div
                              onClick={() =>
                                updateItem(item.id, {
                                  discount_percentage: item.discount_percentage > 0 ? 0 : 5,
                                })
                              }
                              className={`w-3.5 h-3.5 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                                item.discount_percentage > 0
                                  ? "bg-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]"
                                  : "bg-[#E5E9F0] shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.9)]"
                              }`}
                            >
                              {item.discount_percentage > 0 && (
                                <svg className="w-2 h-2 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {item.discount_percentage > 0 && (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                onWheel={(e) => (e.target as HTMLElement).blur()}
                                value={item.discount_percentage}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    discount_percentage:
                                      parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-16 text-center"
                                placeholder="%"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            value={item.unit_price === 0 ? "" : item.unit_price}
                            onChange={(e) =>
                              updateItem(item.id, {
                                unit_price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          €{item.amount.toFixed(2)}
                        </td>
                        {/* <td className="px-4 py-2 text-right font-medium text-gray-500">
                        €{item.vat_amount.toFixed(2)}
                      </td> */}
                        <td className="px-4 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between gap-6 pt-6">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="space-y-2">
                  <Label>Instructions / Notes</Label>
                  <Textarea
                    rows={4}
                    value={formData.instructions}
                    onChange={(e) =>
                      handleFieldChange("instructions", e.target.value)
                    }
                    placeholder="Installation instructions or special notes..."
                  />
                </div>
              </div>
              <div className="w-full md:w-1/3 space-y-3 p-5 rounded-3xl neu-inset border-transparent">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-800">Subtotal</span>
                  <span>
                    €
                    {(() => {
                      let total = 0;
                      items.forEach((item) => {
                        if (item.type === "product") {
                          const baseAmount = item.unit_price * item.quantity;
                          const discountAmount =
                            baseAmount * (item.discount_percentage / 100);
                          total += baseAmount - discountAmount;
                        }
                      });
                      return total.toFixed(2);
                    })()}
                  </span>
                </div>
                {formData.discount_enabled &&
                  formData.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>
                        Quote Discount ({formData.discount_percentage}%)
                      </span>
                      <span>
                        -€{totals.quoteDiscount?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  )}
                <p className="text-xs text-red-500 font-medium">
                  * All prices include VAT ({vatRate}%)
                </p>
                <div className="flex justify-between font-bold text-lg pt-2 border-t text-gray-800">
                  <span>Total Amount</span>
                  <span>€{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-10 bg-white border-t p-4 shadow-lg flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/quotations")}
            disabled={isSubmitting}
            className="neu-raised border-transparent"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="w-32 neu-raised text-white border-transparent hover:text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save Quote"
            )}
          </Button>
        </div>
      </form>

      <Dialog
        open={showConfirm}
        onOpenChange={(open) => !isSubmitting && setShowConfirm(open)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Quotation</DialogTitle>
            <DialogDescription>
              {initialData?.id
                ? "Are you sure you want to update this quotation?"
                : "Are you sure you want to save this quotation? Once saved, the PDF will be generated immediately."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isSubmitting}
              className="neu-raised border-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}/*  */
              className="neu-raised text-white border-transparent hover:text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

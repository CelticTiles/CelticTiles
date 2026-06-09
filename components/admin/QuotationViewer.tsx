"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Quotation } from "@/lib/supabase-types";

interface QuotationViewerProps {
  quotation: Quotation;
}

export function QuotationViewer({ quotation }: QuotationViewerProps) {
  const handleConvertToSale = () => {
    // Store quote data in sessionStorage for /quotecart page
    const quoteData = {
      quoteId: quotation.id,
      quoteNumber: quotation.quote_number,
      customerName: quotation.customer_name,
      customerEmail: quotation.customer_email || "",
      customerPhone: quotation.customer_phone || "",
      items: quotation.items,
      subtotal: quotation.subtotal,
      total: quotation.total,
      quoteDiscount: quotation.discount_enabled && quotation.discount_percentage
        ? quotation.subtotal * ((quotation.discount_percentage ?? 0) / 100)
        : 0,
      quoteDiscountPercentage: quotation.discount_percentage ?? 0,
      deliveryCollection: quotation.delivery_collection,
      deliveryAddress: quotation.delivery_collection === "Delivery" ? {
        street: [quotation.delivery_address_line1, quotation.delivery_address_line2].filter(Boolean).join(", "),
        city: quotation.delivery_city || "",
        state: quotation.delivery_city || "",
        pincode: quotation.delivery_postcode || "",
      } : undefined,
    }
    sessionStorage.setItem("quoteCart", JSON.stringify(quoteData))
    window.location.href = "/quotecart"
  };

  const statusColors: Record<string, string> = {
    draft: "bg-blue-100 text-blue-800",
    sent: "bg-purple-100 text-purple-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {quotation.quote_number}
            </h2>
            <p className="text-gray-600 mt-1">{quotation.customer_name}</p>
          </div>
          <Badge className={statusColors[quotation.status] || ""}>
            {quotation.status?.charAt(0).toUpperCase() +
              quotation.status?.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Quote Date</p>
            <p className="font-semibold">
              {quotation.quote_date
                ? format(new Date(quotation.quote_date), "MMM d, yyyy")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Valid Until</p>
            <p className="font-semibold">
              {quotation.valid_until
                ? format(new Date(quotation.valid_until), "MMM d, yyyy")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Quote Type</p>
            <p className="font-semibold">{quotation.quote_type || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">Sales Rep</p>
            <p className="font-semibold">{quotation.sales_rep_name || "-"}</p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Email</p>
            <p className="font-semibold">{quotation.customer_email || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="font-semibold">{quotation.customer_phone || "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">Delivery / Collection</p>
            <p className="font-semibold">
              {quotation.delivery_collection || "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Customer Order No.</p>
            <p className="font-semibold">
              {quotation.customer_order_no || "-"}
            </p>
          </div>
        </div>

        {quotation.delivery_collection === "Delivery" && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-gray-600 text-sm mb-2">Delivery Address</p>
            <div className="text-sm font-semibold space-y-1">
              <p>{quotation.delivery_address_line1}</p>
              {quotation.delivery_address_line2 && (
                <p>{quotation.delivery_address_line2}</p>
              )}
              <p>
                {quotation.delivery_city}
                {quotation.delivery_postcode &&
                  `, ${quotation.delivery_postcode}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit Price</th>
                <th className="px-4 py-2 text-right">Disc%</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotation.items.map((item) => {
                if (item.type === "section_header") {
                  return (
                    <tr key={item.id} className="bg-gray-100">
                      <td colSpan={6} className="px-4 py-2 font-bold">
                        {item.label}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{item.code}</td>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      €{item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item.discount_percentage > 0
                        ? `${item.discount_percentage}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      €{item.amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Instructions */}
          <div className="md:col-span-2">
            <h3 className="font-semibold text-lg mb-2">Instructions / Notes</h3>
            <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
              {quotation.instructions || "No special instructions"}
            </div>
          </div>

          {/* Right: Summary */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">
                €{(quotation.total - quotation.vat_total).toFixed(2)}
              </span>
            </div>

            {quotation.discount_enabled &&
              (quotation.discount_percentage ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount ({quotation.discount_percentage ?? 0}%)</span>
                  <span className="font-semibold">
                    -€
                    {(
                      quotation.subtotal *
                      ((quotation.discount_percentage ?? 0) / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              )}

            <div className="flex justify-between text-sm border-t pt-2">
              <span>VAT (23%)</span>
              <span className="font-semibold">
                €{quotation.vat_total.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>€{quotation.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Section (if available) */}
      {quotation.history &&
        Array.isArray(quotation.history) &&
        quotation.history.length > 0 && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold text-lg">Change History</h3>
            <div className="space-y-2 text-sm">
              {quotation.history.map((entry: any, idx: number) => (
                <div key={idx} className="flex gap-3 p-2 bg-gray-50 rounded">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {entry.username || entry.updated_by}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {format(new Date(entry.updated_at), "MMM d, yyyy HH:mm")}
                    </p>
                    <p className="text-gray-700 mt-1">
                      {JSON.stringify(entry.changes)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap items-center">
        {(quotation.status === "draft" || quotation.status === "sent") && (
          <Button
            asChild
            variant="outline"
            className="neu-raised border-transparent"
          >
            <Link href={`/admin/quotations/${quotation.id}/edit`}>
              Edit Quotation
            </Link>
          </Button>
        )}

        {quotation.status === "draft" && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConvertToSale}
              className="neu-raised text-white border-transparent hover:text-white"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-[10px] text-muted-foreground italic ml-1">
              * This will redirect to the storefront checkout with quote details pre-filled.
            </p>
          </div>
        )}

        {quotation.status === "accepted" && (
          <div className="flex items-center gap-2 p-3 px-4 bg-green-50 border border-green-100 rounded-full text-green-700 text-sm font-semibold">
            <Badge className="bg-green-500 hover:bg-green-500">Converted</Badge>
            This quotation has been converted to a completed sale.
          </div>
        )}
      </div>
    </div>
  );
}

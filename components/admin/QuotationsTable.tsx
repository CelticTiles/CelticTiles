"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import {
  Edit,
  Trash2,
  FileText,
  Loader2,
  Download,
  Eye,
  ArrowUpDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteQuotation } from "@/lib/quotation-actions";
import type { Quotation } from "@/lib/supabase-types";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/lib/quotation-pdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuotationsTableProps {
  initialQuotations: Quotation[];
}

type SortField = "date" | "invoiced_date" | "changed_date" | "total" | "customer";
type SortDirection = "asc" | "desc";
type DateRangePreset = "all" | "weekly" | "monthly" | "yearly" | "custom";

function getPresetRange(preset: DateRangePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (preset === "weekly")  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (preset === "monthly") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (preset === "yearly")  return { from: startOfYear(now), to: endOfYear(now) };
  return { from: null, to: null };
}

function exportQuotationsToExcel(quotations: Quotation[], rangeLabel: string) {
  import("xlsx").then((XLSX) => {
    const rows = quotations.map((q) => ({
      "Quote #":        q.quote_number,
      "Customer Name":  q.customer_name,
      "Customer Email": q.customer_email ?? "",
      "Customer Phone": q.customer_phone ?? "",
      "Status":         q.status,
      "Quote Date":     q.quote_date ? format(parseISO(q.quote_date), "dd/MM/yyyy") : "",
      "Valid Until":    q.valid_until ? format(parseISO(q.valid_until), "dd/MM/yyyy") : "",
      "Subtotal (€)":   q.subtotal.toFixed(2),
      "VAT (€)":        q.vat_total.toFixed(2),
      "Total (€)":      q.total.toFixed(2),
      "Delivery":       q.delivery_collection ?? "",
      "City":           q.delivery_city ?? "",
      "Sales Rep":      q.sales_rep_name ?? "",
      "Items":          q.items
        .filter((i) => i.type === "product")
        .map((i) => i.type === "product" ? `${i.description} x${i.quantity}` : "")
        .join("; ") || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 }, { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 50 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    XLSX.writeFile(wb, `Quotations_${rangeLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  });
}

export function QuotationsTable({ initialQuotations }: QuotationsTableProps) {
  const [quotations, setQuotations]         = useState(initialQuotations);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [generatingId, setGeneratingId]     = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState("");
  const [sortField, setSortField]           = useState<SortField>("date");
  const [sortDirection, setSortDirection]   = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [datePreset, setDatePreset]         = useState<DateRangePreset>("all");
  const [customFrom, setCustomFrom]         = useState("");
  const [customTo, setCustomTo]             = useState("");

  const filteredQuotations = useMemo(() => {
    let from: Date | null = null;
    let to: Date | null = null;

    if (datePreset === "custom") {
      from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      to   = customTo   ? new Date(customTo   + "T23:59:59.999") : null;
    } else if (datePreset !== "all") {
      ({ from, to } = getPresetRange(datePreset));
    }

    let filtered = quotations.filter((q) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        q.quote_number.toLowerCase().includes(query) ||
        q.customer_name.toLowerCase().includes(query) ||
        (q.customer_email?.toLowerCase().includes(query) ?? false) ||
        (q.customer_phone?.toLowerCase().includes(query) ?? false) ||
        (q.quote_date && format(new Date(q.quote_date), "dd/MM/yyyy").includes(query));

      const matchesStatus = statusFilter === "all" || q.status === statusFilter;

      const quoteDate = q.quote_date ? new Date(q.quote_date) : null;
      const matchesDate =
        !quoteDate ||
        ((!from || quoteDate >= from) && (!to || quoteDate <= to));

      return matchesSearch && matchesStatus && matchesDate;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "date":
          aVal = new Date(a.quote_date || 0).getTime();
          bVal = new Date(b.quote_date || 0).getTime();
          break;
        case "invoiced_date":

          // Let's use updated_at if status is 'accepted' as a proxy for invoiced date, otherwise fallback to 0.
          aVal = a.status === "accepted" ? new Date(a.updated_at || 0).getTime() : 0;
          bVal = b.status === "accepted" ? new Date(b.updated_at || 0).getTime() : 0;
          break;
        case "changed_date":
          aVal = new Date(a.updated_at || a.created_at || 0).getTime();
          bVal = new Date(b.updated_at || b.created_at || 0).getTime();
          break;
        case "total":
          aVal = a.total; bVal = b.total;
          break;
        case "customer":
          aVal = a.customer_name; bVal = b.customer_name;
          break;
      }
      return sortDirection === "asc"
        ? aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        : aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return filtered;
  }, [quotations, searchQuery, sortField, sortDirection, statusFilter, datePreset, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    if (datePreset === "weekly")  return "Weekly";
    if (datePreset === "monthly") return "Monthly";
    if (datePreset === "yearly")  return "Yearly";
    if (datePreset === "custom" && customFrom && customTo) return `${customFrom}_to_${customTo}`;
    return "All";
  }, [datePreset, customFrom, customTo]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = useCallback(() => {
    exportQuotationsToExcel(filteredQuotations, rangeLabel);
  }, [filteredQuotations, rangeLabel]);

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    setDeletingId(quoteToDelete);
    try {
      await deleteQuotation(quoteToDelete);
      setQuotations(quotations.filter((q) => q.id !== quoteToDelete));
      toast.success("Quotation deleted");
    } catch {
      toast.error("Failed to delete quotation");
    } finally {
      setDeletingId(null);
      setQuoteToDelete(null);
    }
  };

  const handleDownloadPDF = async (quote: Quotation) => {
    setGeneratingId(quote.id);
    try {
      const blob = await generateQuotationPDF(quote);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.quote_number || "quote"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleViewPDF = async (quote: Quotation) => {
    setGeneratingId(quote.id);
    try {
      const blob = await generateQuotationPDF(quote);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to generate PDF preview");
    } finally {
      setGeneratingId(null);
    }
  };

  if (quotations.length === 0) {
    return (
      <div className="neu-raised rounded-2xl p-12 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-gray-900">No quotations found</h3>
        <p className="mt-1">Get started by creating a new quotation.</p>
        <Button asChild className="mt-6">
          <Link href="/admin/quotations/new">Create Quotation</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="text-sm font-medium text-gray-700 block mb-2">Search</label>
            <Input
              placeholder="Quote #, customer name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="w-40">
            <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="w-44">
            <label className="text-sm font-medium text-gray-700 block mb-2">Date Range</label>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="w-40">
            <label className="text-sm font-medium text-gray-700 block mb-2">Sort by</label>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Quote Date</SelectItem>
                <SelectItem value="invoiced_date">Invoiced Date</SelectItem>
                <SelectItem value="changed_date">Changed Date</SelectItem>
                <SelectItem value="total">Total Amount</SelectItem>
                <SelectItem value="customer">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection((p) => (p === "asc" ? "desc" : "asc"))}
              title={sortDirection === "asc" ? "Ascending" : "Descending"}
              className="mb-0"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>

            {/* Export */}
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredQuotations.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Custom date inputs */}
        {datePreset === "custom" && (
          <div className="flex flex-wrap gap-3 items-center p-3 bg-accent/10 rounded-lg border border-border">
            <span className="text-sm font-medium text-muted-foreground">From:</span>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            <span className="text-sm font-medium text-muted-foreground">To:</span>
            <Input type="date" value={customTo}   onChange={(e) => setCustomTo(e.target.value)}   className="w-40" />
            {(customFrom || customTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setCustomFrom(""); setCustomTo(""); }}>Clear</Button>
            )}
          </div>
        )}

        {/* Results summary */}
        {(datePreset !== "all" || statusFilter !== "all") && (
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-foreground">{filteredQuotations.length}</span> of{" "}
            <span className="font-semibold text-foreground">{quotations.length}</span> quotations
            {datePreset !== "all" && <> · <span className="font-semibold text-foreground">{rangeLabel}</span></>}
            {statusFilter !== "all" && <> · Status: <span className="font-semibold text-foreground capitalize">{statusFilter}</span></>}
          </p>
        )}
      </div>

      {filteredQuotations.length === 0 ? (
        <div className="neu-raised rounded-2xl p-8 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>No quotations match your search criteria.</p>
        </div>
      ) : (
        <div className="neu-raised rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left bg-transparent">
              <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Quote No.</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th
                    className="px-6 py-4 font-medium cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort("date")}
                  >
                    Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-6 py-4 font-medium text-right cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort("total")}
                  >
                    Total {sortField === "total" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                      <Link href={`/admin/quotations/${quote.id}`} className="text-primary hover:underline font-semibold">
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{quote.customer_name}</div>
                      {quote.status && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          quote.status === "accepted" ? "bg-green-100 text-green-700" :
                          quote.status === "sent"     ? "bg-blue-100 text-blue-700" :
                          quote.status === "declined" ? "bg-red-100 text-red-700" :
                          quote.status === "expired"  ? "bg-gray-100 text-gray-600" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{quote.status}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {quote.customer_email && <div className="text-xs text-slate-500">{quote.customer_email}</div>}
                      {quote.customer_phone && <div className="text-xs text-slate-500">{quote.customer_phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {quote.quote_date ? format(new Date(quote.quote_date), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-slate-900">
                      €{quote.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleViewPDF(quote)}
                          disabled={generatingId === quote.id}
                          className="h-8 w-8 px-0 neu-raised hover:bg-black/5"
                          title="View Quote PDF"
                        >
                          {generatingId === quote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline" size="sm" asChild
                          className="h-8 w-8 px-0 neu-raised hover:bg-black/5"
                          title="Edit Quotation"
                        >
                          <Link href={`/admin/quotations/${quote.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleDownloadPDF(quote)}
                          disabled={generatingId === quote.id}
                          className="h-8 w-8 px-0 neu-raised hover:bg-black/5"
                          title="Download PDF"
                        >
                          {generatingId === quote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="h-8 w-8 px-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 neu-raised"
                          onClick={() => setQuoteToDelete(quote.id)}
                          disabled={deletingId === quote.id}
                          title="Delete Quote"
                        >
                          {deletingId === quote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={!!quoteToDelete}
        onOpenChange={(open) => !deletingId && !open && setQuoteToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Quotation</DialogTitle>
            <DialogDescription>
              Are you sure you want to completely delete this quotation? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setQuoteToDelete(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Yes, Delete Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

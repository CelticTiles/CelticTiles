// Canonical Supabase types wrapper for app imports.
// Source of truth: /supabase/database.types.ts

import type {
  Database as SupabaseDatabase,
  Tables as SupabaseTables,
  TablesInsert as SupabaseTablesInsert,
  TablesUpdate as SupabaseTablesUpdate,
} from "@/supabase/database.types";

export type Database = SupabaseDatabase;

export type TableName = keyof Database["public"]["Tables"];
export type TableRow<T extends TableName> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends TableName> =
  Database["public"]["Tables"][T]["Update"];

// App-level aliases
export type Category = SupabaseTables<"categories"> & {
  children?: Category[];
  // Backward-compat with older schema snapshots
  display_order?: number | null;
};

export type Product = SupabaseTables<"products">;
export type Order = SupabaseTables<"orders">;
export type Coupon = SupabaseTables<"coupons">;
export type Profile = SupabaseTables<"profiles">;

// Joined review shape used in UI components
export type Review = SupabaseTables<"reviews"> & {
  profiles?: Pick<Profile, "full_name"> | null;
};

export type NewsletterSubscription = SupabaseTables<"newsletter_subscriptions">;

// Quotation helper types used by admin quotation flows.
// Kept explicit here because quotations are not present in the current generated schema snapshot.
export interface QuotationProductItem {
  id: string;
  type: "product";
  sort_order: number;
  product_id: string | null;
  code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  image_url?: string | null;
}

export interface QuotationSectionHeader {
  id: string;
  type: "section_header";
  sort_order: number;
  label: string;
}

export type QuotationItem = QuotationProductItem | QuotationSectionHeader;

export interface Quotation {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  quote_type: string;
  quote_date: string;
  valid_until: string | null;
  delivery_collection: string;
  delivery_address_line1?: string | null;
  delivery_address_line2?: string | null;
  delivery_city?: string | null;
  delivery_postcode?: string | null;
  discount_enabled?: boolean;
  discount_percentage?: number;
  customer_order_no: string | null;
  sales_rep_name: string | null;
  items: QuotationItem[];
  subtotal: number;
  vat_total: number;
  total: number;
  instructions: string | null;
  history?: Array<{
    updated_at: string;
    updated_by: string;
    changes: Record<string, unknown>;
  }> | null;
  lead_id?: string | null;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SupabaseRow<T extends TableName> = SupabaseTables<T>;
export type SupabaseInsert<T extends TableName> = SupabaseTablesInsert<T>;
export type SupabaseUpdate<T extends TableName> = SupabaseTablesUpdate<T>;

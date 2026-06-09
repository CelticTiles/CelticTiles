"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Quotation } from "@/lib/supabase-types";
import { revalidatePath } from "next/cache";
import { getServerSession } from "./loaders";
import { sendAdminNewOrderNotification } from "./email";


// ──────────────────────────────────────────────────────────────
// Helper: returns an untyped Supabase query builder for tables
// not yet auto-generated in the Database type.
// This avoids TS2345 "never" errors when the generic can't
// resolve a table name through the createServerClient<Database> chain.
// ──────────────────────────────────────────────────────────────
async function getSupabase() {
  const supabase = await createServerSupabase();
  return supabase as any;
}

export async function getQuotations(filters?: { status?: string }) {
  const supabase = await getSupabase();
  let query = supabase
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Quotation[];
}

export async function getQuotationById(id: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Quotation;
}

export async function searchProductsForQuote(searchQuery: string) {
  if (!searchQuery || searchQuery.length < 2) return [];

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, assigned_code, price, stock, image")
    .eq("status", "active")
    .or(`assigned_code.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
    .limit(15);

  if (error) throw new Error(error.message);
  return data;
}

export async function saveQuotation(
  quotationData: Record<string, unknown>,
  isNew: boolean = false,
) {
  const supabase = await getSupabase();
  const session = await getServerSession();

  if (
    !session.userId ||
    (session.userRole !== "admin" && session.userRole !== "sales")
  ) {
    throw new Error("Unauthorized to save quotes");
  }

  const finalData: Record<string, unknown> = { ...quotationData };

  if (isNew) {
    // Generate new quote number via DB function
    const { data: quoteNum, error: rpcError } = await supabase.rpc(
      "generate_quote_number",
    );
    if (rpcError)
      throw new Error(`Failed to generate quote number: ${rpcError.message}`);

    finalData.quote_number = quoteNum;
    finalData.created_by = session.userId;
  } else {
    // Cannot change creator or quote_number on update
    delete finalData.quote_number;
    delete finalData.created_by;
  }

  // Strip the GENERATED ALWAYS column — PG will reject it
  delete finalData.valid_until;

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  if (isNew) {
    // INSERT — new row, DB generates the id
    const result = await supabase
      .from("quotations")
      .insert(finalData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // UPDATE — existing row by id
    const id = finalData.id;
    delete finalData.id;
    
    // Safety check: ensure we don't update if already accepted
    const result = await supabase
      .from("quotations")
      .update(finalData)
      .eq("id", id)
      .neq("status", "accepted")
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/quotations");
  if (!isNew && quotationData.id) {
    revalidatePath(`/admin/quotations/${quotationData.id}`);
  }

  // Auto status update: if quote linked to a lead, update lead to 'Quoted'
  // TASK 1: Two-way Quotation ↔ CRM connection
  const savedQuote = data as Record<string, unknown>;

  if (isNew) {
    let resolvedLeadId = savedQuote?.lead_id as string | null;

    if (!resolvedLeadId) {
      // Step 1: Check by phone (unique identifier)
      if (savedQuote?.customer_phone) {
        const { data: leadByPhone } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", savedQuote.customer_phone)
          .maybeSingle();
        if (leadByPhone) resolvedLeadId = leadByPhone.id;
      }

      // Step 2: Fallback — check by email
      if (!resolvedLeadId && savedQuote?.customer_email) {
        const { data: leadByEmail } = await supabase
          .from("leads")
          .select("id")
          .eq("email", savedQuote.customer_email)
          .maybeSingle();
        if (leadByEmail) resolvedLeadId = leadByEmail.id;
      }

      // Step 3: No existing lead — create new one
      if (!resolvedLeadId) {
        const addressParts = [
          savedQuote.delivery_address_line1 as string,
          savedQuote.delivery_address_line2 as string,
          savedQuote.delivery_city as string,
          savedQuote.delivery_postcode as string,
        ].filter(Boolean);
        
        const addressString = addressParts.length > 0 ? `Address: ${addressParts.join(", ")}` : "";
        const baseMessage = `Auto-created from quote ${savedQuote.quote_number}`;
        const finalMessage = [addressString, baseMessage].filter(Boolean).join("\n\n");

        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            name: savedQuote.customer_name,
            email: savedQuote.customer_email || "",
            phone: savedQuote.customer_phone || null,
            source: "quotation",
            status: "Quoted",
            message: finalMessage,
          })
          .select("id")
          .single();
        if (newLead) resolvedLeadId = newLead.id;
      }

      // Link lead_id back to the quotation
      if (resolvedLeadId) {
        await supabase
          .from("quotations")
          .update({ lead_id: resolvedLeadId })
          .eq("id", savedQuote.id);
      }
    }

    // Update lead status to Quoted + log activity
    if (resolvedLeadId) {
      await supabase.from("leads").update({ status: "Quoted" }).eq("id", resolvedLeadId);
      await supabase.from("activity_logs").insert({
        lead_id: resolvedLeadId,
        action: "quote_created",
        note: `Quote ${savedQuote.quote_number} created`,
        performed_by: session.userId,
      });
    }
  }

  return data as unknown as Quotation;
}

export async function deleteQuotation(id: string) {
  const supabase = await getSupabase();

  // Fetch quote number so we can clean up storage
  const { data: quote } = await supabase
    .from("quotations")
    .select("quote_number")
    .eq("id", id)
    .single();

  if (quote?.quote_number) {
    // fire-and-forget storage delete
    supabase.storage
      .from("uploads")
      .remove([`quotations/${quote.quote_number}/${quote.quote_number}.pdf`]);
  }

  const { error } = await supabase.from("quotations").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/quotations");
  return true;
}

export async function convertQuotationToOrder(quotationId: string) {
  const supabase = await getSupabase();
  const session = await getServerSession();

  if (!session.userId) {
    throw new Error("Unauthorized: user not authenticated");
  }

  // Get the quotation
  const { data: quote, error: quoteError } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .single();

  if (quoteError || !quote) {
    throw new Error("Quotation not found");
  }

  const quoteItems = (quote.items || []).filter((i: any) => i.type === "product");
  const undiscountedNetSubtotal = quoteItems.reduce((sum: number, i: any) => {
    const amount = Number(i.amount) || (Number(i.unit_price) * Number(i.quantity)) || 0;
    const vatAmount = Number(i.vat_amount) || 0;
    return sum + (amount - vatAmount);
  }, 0);
  const tax = Number(quote.vat_total) || 0;
  const total = Number(quote.total) || 0;
  const discountedNetSubtotal = total - tax;
  const netDiscount = Math.max(0, undiscountedNetSubtotal - discountedNetSubtotal);

  // Create order from quotation
  const orderData = {
    customer_name: quote.customer_name,
    customer_email: quote.customer_email || "",
    customer_phone: quote.customer_phone || null,
    customer_id: quote.lead_id ? quote.lead_id.toString() : (quote.customer_email || quote.customer_name),
    items: quote.items,
    subtotal: undiscountedNetSubtotal,
    tax: tax,
    discount: netDiscount,
    total: total,
    payment_status: "unpaid",
    status: "New",
    source: "quotation",
    delivery_address: quote.delivery_collection === "Delivery"
      ? {
          street: [quote.delivery_address_line1, quote.delivery_address_line2].filter(Boolean).join(", "),
          city: quote.delivery_city || "",
          state: "",
          pincode: quote.delivery_postcode || "",
        }
      : { street: "Collection", city: "", state: "", pincode: "" },
  };

  // Generate order number via RPC
  const { data: orderNum, error: orderNumError } = await supabase.rpc(
    "generate_order_number",
  );
  if (orderNumError)
    throw new Error(
      `Failed to generate order number: ${orderNumError.message}`,
    );

  const { data: newOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      ...orderData,
      order_number: orderNum,
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  // ✅ Notify Admin about new order (non-blocking)
  sendAdminNewOrderNotification({
    customerName: newOrder.customer_name,
    orderNumber: newOrder.order_number,
    total: newOrder.total,
  }).catch(err => console.error('[Email] Admin notification failed:', err))

  // Update quotation status to accepted

  await supabase.from("quotations").update({ status: "accepted" }).eq("id", quotationId);

  // Auto status update: if quote linked to a lead, update lead to 'Converted' + log activity
  // Try lead_id first, fall back to customer_email match for quotes created before lead_id was saved
  let resolvedLeadId = quote.lead_id || null;

  if (!resolvedLeadId && quote.customer_email) {
    const { data: leadByEmail } = await supabase
      .from("leads")
      .select("id")
      .eq("email", quote.customer_email)
      .maybeSingle();
    if (leadByEmail) resolvedLeadId = leadByEmail.id;
  }

  if (resolvedLeadId) {
    await supabase.from("leads").update({ status: "Converted" }).eq("id", resolvedLeadId);
    await supabase.from("activity_logs").insert({
      lead_id: resolvedLeadId,
      action: "order_created",
      note: `Order ${orderNum} created from quote ${quote.quote_number}`,
      performed_by: session.userId,
    });
  }

  // Task 21 + 22: Auto customer creation — check by email, create if not exists
  if (quote.customer_email) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", quote.customer_email)
      .maybeSingle();

    if (!existingProfile) {
      const { data: customerRole } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "customer")
        .single();

      if (customerRole) {
        // Generate a new UUID for the profile — cannot reuse lead_id or order customer_id
        const newProfileId = crypto.randomUUID();
        await supabase.from("profiles").insert({
          id: newProfileId,
          email: quote.customer_email,
          full_name: quote.customer_name,
          phone: quote.customer_phone || null,
          role_id: customerRole.id,
        });
      }
    }
  }

  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/crm/leads");

  return newOrder;
}

export async function recordQuotationChange(
  quotationId: string,
  changes: Record<string, unknown>,
) {
  const supabase = await getSupabase();
  const session = await getServerSession();

  if (!session.userId) {
    throw new Error("Unauthorized: user not authenticated");
  }

  // Get current quotation history
  const { data: quote, error: fetchError } = await supabase
    .from("quotations")
    .select("history")
    .eq("id", quotationId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch quotation: ${fetchError.message}`);
  }

  // Build new history entry
  const existingHistory = Array.isArray(quote?.history) ? quote.history : [];
  const newHistoryEntry = {
    updated_at: new Date().toISOString(),
    updated_by: session.userId,
    username: session.userEmail || "Unknown",
    changes,
  };

  const updatedHistory = [...existingHistory, newHistoryEntry];

  // Update quotation with new history
  const { error: updateError } = await supabase
    .from("quotations")
    .update({ history: updatedHistory })
    .eq("id", quotationId);

  if (updateError) {
    throw new Error(`Failed to record change: ${updateError.message}`);
  }

  revalidatePath(`/admin/quotations/${quotationId}`);
  return true;
}

export async function getStoreVatRate(): Promise<number> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("site_settings")
    .select("tax_rate")
    .eq("id", 1)
    .single();
  return (data?.tax_rate as number) || 23;
}

export async function updateQuotationPdfUrl(id: string, pdfUrl: string) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("quotations")
    .update({ pdf_url: pdfUrl })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/quotations");
  revalidatePath(`/admin/quotations/${id}`);
  return true;
}

import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

// GET  /api/admin/inventory/aliases          — list all aliases
// POST /api/admin/inventory/aliases          — create alias
// DELETE /api/admin/inventory/aliases?id=   — delete alias

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    const { data, error } = await supabase
      .from("product_aliases" as never)
      .select(`
        id,
        alias,
        source,
        created_at,
        product_id,
        created_by,
        products!inner (
          id,
          name,
          assigned_code
        ),
        profiles (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ aliases: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch aliases"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { alias, product_id } = await req.json()

    if (!alias || typeof alias !== "string" || alias.trim().length < 2) {
      return NextResponse.json({ error: "Alias must be at least 2 characters" }, { status: 400 })
    }
    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    // Check for duplicate (case-insensitive)
    const { data: existing } = await supabase
      .from("product_aliases" as never)
      .select("id")
      .eq("alias" as never, alias.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "This alias already exists" }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("product_aliases" as never)
      .insert({
        alias: alias.toLowerCase().trim(),
        product_id,
        source: "manual",
        created_by: session.userId,
      } as never)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ alias: data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create alias"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized — admin only" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    const { error } = await supabase
      .from("product_aliases" as never)
      .delete()
      .eq("id" as never, id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete alias"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: templates, error } = await supabase
      .from("warmup_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching templates:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error("[v0] Error in templates GET:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()

    const { name, subject, body: emailBody, category } = body

    const { data: template, error } = await supabase
      .from("warmup_templates")
      .insert({
        name,
        subject,
        body: emailBody,
        category: category || "general",
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating template:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("[v0] Error in templates POST:", error)
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { data, error } = await supabase.from("automation_tasks").update(body).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error updating task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("automation_tasks").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { TaskQueue } from "@/lib/queue/task-queue"
import { NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    const body = await request.json().catch(() => ({}))
    const maxConcurrentTasks = body.maxConcurrentTasks || 1
    const maxTasksPerBatch = body.maxTasksPerBatch || 10

    const { data: apiKeySetting, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "gologin_api_key")
      .single()

    if (settingsError || !apiKeySetting?.value) {
      return NextResponse.json(
        { error: "GoLogin API key not found. Please save it in Settings first." },
        { status: 400 },
      )
    }

    const queue = new TaskQueue(apiKeySetting.value, maxConcurrentTasks)
    const result = await queue.processPendingTasks(maxTasksPerBatch)

    return NextResponse.json({
      success: true,
      message: "Batch processed",
      ...result,
    })
  } catch (error: any) {
    console.error("[v0] Error processing queue:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { TaskQueue } from "@/lib/queue/task-queue"
import { setCurrentQueue } from "@/lib/queue/queue-manager"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

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

    const queue = new TaskQueue(apiKeySetting.value)
    setCurrentQueue(queue)

    try {
      await queue.processPendingTasks()
    } finally {
      setCurrentQueue(null)
    }

    return NextResponse.json({ success: true, message: "Queue processed" })
  } catch (error: any) {
    console.error("[v0] Error processing queue:", error)
    setCurrentQueue(null)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { stopCurrentQueue } from "@/lib/queue/queue-manager"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const stopped = stopCurrentQueue()

    return NextResponse.json({
      success: true,
      message: stopped ? "Queue stop requested - will abort after current task" : "No queue currently processing",
    })
  } catch (error: any) {
    console.error("[v0] Error stopping queue:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

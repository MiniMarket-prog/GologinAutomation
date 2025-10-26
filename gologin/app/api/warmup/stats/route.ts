import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get total campaigns
    const { count: totalCampaigns } = await supabase
      .from("warmup_campaigns")
      .select("*", { count: "exact", head: true })

    // Get active campaigns
    const { count: activeCampaigns } = await supabase
      .from("warmup_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")

    // Get total accounts in warmup
    const { count: totalAccounts } = await supabase.from("warmup_accounts").select("*", { count: "exact", head: true })

    // Get total emails sent today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: emailsSentToday } = await supabase
      .from("warmup_logs")
      .select("*", { count: "exact", head: true })
      .eq("action_type", "send")
      .gte("created_at", today.toISOString())

    // Get success rate (emails sent vs bounced)
    const { data: logs } = await supabase
      .from("warmup_logs")
      .select("action_type, status")
      .in("action_type", ["send", "bounce"])

    let successRate = 100
    if (logs && logs.length > 0) {
      const sent = logs.filter((l) => l.action_type === "send").length
      const bounced = logs.filter((l) => l.action_type === "bounce").length
      successRate = sent > 0 ? ((sent - bounced) / sent) * 100 : 100
    }

    return NextResponse.json({
      stats: {
        totalCampaigns: totalCampaigns || 0,
        activeCampaigns: activeCampaigns || 0,
        totalAccounts: totalAccounts || 0,
        emailsSentToday: emailsSentToday || 0,
        successRate: Math.round(successRate),
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching warmup stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

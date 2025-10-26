import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Fetch all campaigns with account counts
    const { data: campaigns, error } = await supabase
      .from("warmup_campaigns")
      .select(`
        *,
        warmup_accounts(count)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching campaigns:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (error) {
    console.error("[v0] Error in campaigns GET:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()

    const { name, description, accounts, cohorts, schedule, templates, seedAccounts } = body

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("warmup_campaigns")
      .insert({
        name,
        description,
        status: "active",
        total_accounts: accounts.length,
        cohorts_count: cohorts,
        schedule_config: schedule,
      })
      .select()
      .single()

    if (campaignError) {
      console.error("[v0] Error creating campaign:", campaignError)
      return NextResponse.json({ error: campaignError.message }, { status: 500 })
    }

    // Add accounts to campaign with cohort assignments
    const accountsToInsert = accounts.map((accountId: string, index: number) => ({
      campaign_id: campaign.id,
      profile_id: accountId,
      cohort_number: (index % cohorts) + 1,
      status: "active",
    }))

    const { error: accountsError } = await supabase.from("warmup_accounts").insert(accountsToInsert)

    if (accountsError) {
      console.error("[v0] Error adding accounts to campaign:", accountsError)
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error("[v0] Error in campaigns POST:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}

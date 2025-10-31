import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { KameleoAccountCreator } from "@/lib/kameleo/account-creator"
import type { KameleoAccountTask, UserProxy } from "@/lib/kameleo/types"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get pending tasks for this user
    const { data: tasks, error } = await supabase
      .from("kameleo_account_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .returns<KameleoAccountTask[]>()

    if (error) {
      console.error("[v0] Error fetching tasks:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending tasks",
        hasMore: false,
      })
    }

    const task = tasks[0]
    console.log("[v0] Processing task:", task.id)

    // Parse recovery emails
    const recoveryEmails = task.recovery_email ? task.recovery_email.split(",") : []

    let proxyConfig: { host: string; port: number; username?: string; password?: string } | undefined = undefined

    if (task.proxy_id) {
      const { data: proxy, error: proxyError } = (await supabase
        .from("user_proxies")
        .select("*")
        .eq("id", task.proxy_id)
        .eq("is_working", true)
        .returns<UserProxy[]>()
        .single()) as any

      if (proxyError) {
        console.error("[v0] Error fetching proxy:", proxyError)
        return NextResponse.json({ success: false, error: "Failed to fetch proxy configuration" }, { status: 500 })
      }

      if (!proxy) {
        return NextResponse.json({ success: false, error: "Proxy not found or not working" }, { status: 404 })
      }

      proxyConfig = {
        host: proxy.proxy_server,
        port: proxy.proxy_port,
        username: proxy.proxy_username,
        password: proxy.proxy_password,
      }
    }

    // Create account
    const accountCreator = new KameleoAccountCreator()

    const result = await accountCreator.createAccount({
      taskId: task.id,
      profileId: task.profile_id,
      profileType: task.profile_type as "empty" | "with_gmail",
      country: task.country,
      recoveryEmails,
      proxy: proxyConfig,
      autoRetryWithNewProfile: true,
    })

    console.log("[v0] Account creation completed:", result.success ? "success" : "failed")

    // Check if there are more pending tasks
    const { count } = await supabase
      .from("kameleo_account_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")

    return NextResponse.json({
      success: true,
      result,
      hasMore: (count || 0) > 0,
    })
  } catch (error: any) {
    console.error("[v0] Error in process route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { createServerClient } from "@/lib/supabase/server"
import { AccountCreator } from "@/lib/automation/account-creator"
import { NextResponse } from "next/server"

export const maxDuration = 300 // 5 minutes for account creation

export async function POST() {
  try {
    const supabase = await createServerClient()

    // Get pending tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("account_creation_tasks")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5) // Process 5 at a time

    if (tasksError) throw tasksError

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending tasks to process",
        processed: 0,
      })
    }

    console.log(`[v0] Processing ${tasks.length} account creation tasks`)

    const results = {
      processed: 0,
      completed: 0,
      failed: 0,
    }

    // Process each task
    for (const task of tasks) {
      try {
        console.log(`[v0] Processing task ${task.id}`)

        // Update status to creating
        await supabase.from("account_creation_tasks").update({ status: "creating" }).eq("id", task.id)

        let existingProfileData = null
        if (task.use_existing_profile && task.existing_profile_id) {
          const { data: profile, error: profileError } = await supabase
            .from("gologin_profiles")
            .select("*")
            .eq("id", task.existing_profile_id)
            .single()

          if (profileError || !profile) {
            throw new Error(`Existing profile not found: ${task.existing_profile_id}`)
          }

          existingProfileData = profile
          console.log(`[v0] Using existing profile: ${profile.profile_name} (${profile.gmail_email})`)
        }

        const proxyConfig = task.proxy_server
          ? {
              server: task.proxy_server,
              username: task.proxy_username || undefined,
              password: task.proxy_password || undefined,
            }
          : undefined

        if (proxyConfig) {
          console.log("[v0] Proxy configuration:", {
            server: proxyConfig.server,
            hasUsername: !!proxyConfig.username,
            hasPassword: !!proxyConfig.password,
            username: proxyConfig.username ? `${proxyConfig.username.substring(0, 3)}***` : "none",
          })
        }

        const creator = new AccountCreator(proxyConfig, existingProfileData)
        const result = await creator.createAccount()

        // Update task with results
        await supabase
          .from("account_creation_tasks")
          .update({
            status: "completed",
            email: result.email,
            password: result.password,
            first_name: result.firstName,
            last_name: result.lastName,
            phone_number: result.phoneNumber,
            completed_at: new Date().toISOString(),
          })
          .eq("id", task.id)

        results.completed++
        console.log(`[v0] Task ${task.id} completed successfully`)
      } catch (error: any) {
        console.error(`[v0] Task ${task.id} failed:`, error)

        // Update task with error
        await supabase
          .from("account_creation_tasks")
          .update({
            status: "failed",
            error_message: error.message || "Unknown error",
          })
          .eq("id", task.id)

        results.failed++
      }

      results.processed++
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} tasks`,
      ...results,
    })
  } catch (error: any) {
    console.error("[v0] Error processing account creation tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

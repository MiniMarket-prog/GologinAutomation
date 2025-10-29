import { createServerClient } from "@/lib/supabase/server"
import { kameleoAPI } from "@/lib/kameleo/api"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      password,
      recovery,
      folderPath,
      profileName,
      deviceType = "desktop",
      browser = "chrome",
      os,
      proxy,
    } = body

    if (!email || !password || !folderPath || !profileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Creating Kameleo profile...")

    // Create profile in Kameleo
    const kameleoProfile = await kameleoAPI.createProfile({
      name: profileName,
      deviceType,
      browser,
      os,
      proxy,
    })

    console.log("[v0] Kameleo profile created:", kameleoProfile.id)

    const { data: profile, error: dbError } = await supabase
      .from("kameleo_profiles")
      .insert({
        profile_id: kameleoProfile.id,
        profile_name: profileName,
        folder_path: folderPath,
        gmail_email: email,
        gmail_password: password,
        recovery_email: recovery,
        assigned_user_id: user.id,
        status: "idle",
        fingerprint_config: {
          device_type: deviceType,
          browser,
          os,
        },
        proxy_config: proxy,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] Profile saved to database")

    // Create setup task
    const { data: task, error: taskError } = await supabase
      .from("automation_tasks")
      .insert({
        profile_id: profile.id,
        task_type: "setup_gmail",
        status: "pending",
        config: {
          email,
          password,
          recovery,
        },
      })
      .select()
      .single()

    if (taskError) {
      console.error("[v0] Task creation error:", taskError)
    }

    return NextResponse.json({
      success: true,
      profile,
      task,
    })
  } catch (error) {
    console.error("[v0] Error creating Kameleo profile:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Kameleo profile" },
      { status: 500 },
    )
  }
}

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await request.json()
    const { email, password, recovery, folderName, profileName, assignToUserEmail, localConfig, fingerprintSettings } =
      body

    if (!email || !password || !folderName || !profileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const targetUserEmail = assignToUserEmail || user.email!
    console.log("[v0] Creating local profile for user:", targetUserEmail)

    let dbUserId: string

    const { data: existingUser } = await adminClient.from("users").select("id").eq("email", targetUserEmail).single()

    if (existingUser) {
      dbUserId = existingUser.id
    } else {
      const { data: newUser, error: userError } = await adminClient
        .from("users")
        .insert({
          email: targetUserEmail,
          role: "user",
        })
        .select("id")
        .single()

      if (userError) {
        const { data: retryUser } = await adminClient.from("users").select("id").eq("email", targetUserEmail).single()
        if (retryUser) {
          dbUserId = retryUser.id
        } else {
          return NextResponse.json({ error: "Failed to create or find user" }, { status: 500 })
        }
      } else {
        dbUserId = newUser.id
      }
    }

    const { data: profile, error: dbError } = await adminClient
      .from("gologin_profiles")
      .insert({
        profile_id: null,
        profile_type: "local",
        profile_name: profileName,
        gmail_email: email,
        gmail_password: password,
        recovery_email: recovery,
        folder_name: folderName,
        assigned_user_id: dbUserId,
        browser_type: localConfig?.browser_type || "chrome",
        local_config: { ...localConfig, buster_extension_path: localConfig?.buster_extension_path || "" },
        fingerprint_config: fingerprintSettings || localConfig?.fingerprint || null,
        status: "idle",
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] Local profile created:", profile.id)
    console.log("[v0] Fingerprint config stored:", JSON.stringify(profile.fingerprint_config, null, 2))

    const { data: task, error: taskError } = await adminClient
      .from("automation_tasks")
      .insert({
        profile_id: profile.id,
        task_type: "setup_gmail",
        status: "pending",
        config: {
          email,
          password,
          recoveryEmail: recovery,
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
    console.error("[v0] Error creating local profile:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create local profile" },
      { status: 500 },
    )
  }
}

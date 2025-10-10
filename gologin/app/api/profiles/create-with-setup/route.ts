import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createProfile } from "@/lib/gologin/api"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    // Check authentication
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

    // Check if user exists in custom users table
    const { data: existingUser } = await adminClient.from("users").select("id").eq("id", user.id).single()

    // If user doesn't exist, create them
    if (!existingUser) {
      console.log("[v0] User not found in custom users table, creating...")
      const { error: userError } = await adminClient.from("users").insert({
        id: user.id,
        email: user.email!,
        role: "user",
      })

      if (userError) {
        console.error("[v0] Error creating user:", userError)
        // Continue anyway - the trigger might have created it
      } else {
        console.log("[v0] User created successfully")
      }
    }
    // </CHANGE>

    const body = await request.json()
    const { email, password, recovery, folderName, profileName } = body

    if (!email || !password || !folderName || !profileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Creating profile in GoLogin...")

    // Create profile in GoLogin
    const gologinProfile = await createProfile({
      name: profileName,
      folderName: folderName,
    })

    console.log("[v0] GoLogin profile created:", gologinProfile.id)

    // Save to database
    const { data: profile, error: dbError } = await supabase
      .from("gologin_profiles")
      .insert({
        profile_id: gologinProfile.id,
        profile_name: profileName,
        gmail_email: email,
        gmail_password: password,
        folder_name: folderName,
        assigned_user_id: user.id,
        status: "idle",
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] Profile saved to database")

    // Create Gmail setup task
    const { data: task, error: taskError } = await supabase
      .from("automation_tasks")
      .insert({
        profile_id: profile.id,
        task_type: "setup_gmail",
        status: "pending",
        created_by: user.id,
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
    } else {
      console.log("[v0] Gmail setup task created:", task.id)
    }

    return NextResponse.json({
      success: true,
      profile,
      task,
    })
  } catch (error) {
    console.error("[v0] Error creating profile:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create profile" },
      { status: 500 },
    )
  }
}

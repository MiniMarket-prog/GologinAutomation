import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createProfile } from "@/lib/gologin/api"
import { createClient } from "@supabase/supabase-js"
import { gologinAPI } from "@/lib/gologin/api"

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

    const body = await request.json()
    const { email, password, recovery, folderName, profileName, assignToUserEmail } = body

    if (!email || !password || !folderName || !profileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const targetUserEmail = assignToUserEmail || user.email!
    console.log("[v0] Target user email:", targetUserEmail)

    let dbUserId: string

    // First try to find existing user by email
    const { data: existingUser } = await adminClient.from("users").select("id").eq("email", targetUserEmail).single()

    if (existingUser) {
      console.log("[v0] User found in database:", existingUser.id)
      dbUserId = existingUser.id
    } else {
      console.log("[v0] User not found in custom users table, creating...")
      const { data: newUser, error: userError } = await adminClient
        .from("users")
        .insert({
          email: targetUserEmail,
          role: "user",
        })
        .select("id")
        .single()

      if (userError) {
        console.error("[v0] Error creating user:", userError)
        // If creation failed due to duplicate key, try to fetch the user again
        const { data: retryUser } = await adminClient.from("users").select("id").eq("email", targetUserEmail).single()
        if (retryUser) {
          console.log("[v0] User found after retry:", retryUser.id)
          dbUserId = retryUser.id
        } else {
          return NextResponse.json({ error: "Failed to create or find user" }, { status: 500 })
        }
      } else {
        console.log("[v0] User created successfully:", newUser.id)
        dbUserId = newUser.id
      }
    }

    console.log("[v0] Creating profile in GoLogin...")

    const folders = await gologinAPI.getFolders()
    const folder = folders.find((f: any) => f.name === folderName)
    const folderId = folder?.id || folder?._id

    if (folderId) {
      console.log(`[v0] Found folder "${folderName}" with ID: ${folderId}`)
    } else {
      console.log(`[v0] Folder "${folderName}" not found, profile will be created in default folder`)
    }

    // Create profile in GoLogin with folderId
    const gologinProfile = await createProfile({
      name: profileName,
      folderId: folderId,
    })

    console.log("[v0] GoLogin profile created:", gologinProfile.id)

    const { data: profile, error: dbError } = (await adminClient
      .from("gologin_profiles")
      .insert({
        profile_id: gologinProfile.id,
        profile_name: profileName,
        gmail_email: email,
        gmail_password: password,
        recovery_email: recovery,
        folder_name: folderName,
        assigned_user_id: dbUserId,
        status: "idle",
      })
      .select()
      .single()) as any

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      throw dbError
    }

    console.log("[v0] Profile saved to database")

    const { data: task, error: taskError } = (await adminClient
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
      .single()) as any

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

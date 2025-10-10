import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createProfile } from "@/lib/gologin/api"

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

    const body = await request.json()
    const { profiles, folderName } = body

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: "No profiles provided" }, { status: 400 })
    }

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    console.log(`[v0] Creating ${profiles.length} profiles in folder: ${folderName}`)

    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const profileData of profiles) {
      try {
        const { email, password, recovery } = profileData

        if (!email || !password) {
          results.failed++
          results.errors.push(`Missing email or password for profile`)
          continue
        }

        // Generate profile name from email prefix
        const profileName = email.split("@")[0]

        // Create profile in GoLogin
        const gologinProfile = await createProfile({
          name: profileName,
          folderName: folderName,
        })

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
          results.failed++
          results.errors.push(`Failed to save ${email}: ${dbError.message}`)
          continue
        }

        // Create Gmail setup task
        await supabase.from("automation_tasks").insert({
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

        results.created++
        console.log(`[v0] Created profile: ${profileName}`)
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to create profile: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    console.log(`[v0] Bulk creation complete: ${results.created} created, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error("[v0] Error in bulk creation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create profiles" },
      { status: 500 },
    )
  }
}

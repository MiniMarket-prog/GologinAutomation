import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { createProfile, createFolder } from "@/lib/gologin/api"
import crypto from "crypto"

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

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single()

    if (userError || !dbUser) {
      console.error("[v0] User lookup error:", userError)
      console.error("[v0] Auth user email:", user.email)
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log(`[v0] Found database user ID: ${dbUser.id} for email: ${user.email}`)

    const body = await request.json()
    const { csvData, folderName, profileType = "gologin", localConfig } = body

    if (!csvData) {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 })
    }

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    interface ProfileData {
      email: string
      password: string
      recovery?: string
      proxy?: {
        server: string
        username?: string
        password?: string
      }
    }

    const lines = csvData.trim().split("\n")
    const profiles = lines
      .map((line: string) => {
        const parts = line.split(",").map((s: string) => s.trim())
        const [email, password, recovery, proxyIp, proxyUsername, proxyPassword, proxyPort] = parts

        const profile: ProfileData = { email, password, recovery }

        // If proxy IP and port are provided, construct the proxy server URL
        if (proxyIp && proxyPort) {
          profile.proxy = {
            server: `http://${proxyIp}:${proxyPort}`,
            username: proxyUsername || undefined,
            password: proxyPassword || undefined,
          }
        }

        return profile
      })
      .filter((p: ProfileData) => p.email && p.password)

    console.log(`[v0] Creating ${profiles.length} ${profileType} profiles in folder: ${folderName}`)

    const emailsToCheck = profiles.map((p: ProfileData) => p.email).filter(Boolean)
    const adminSupabase = getSupabaseAdminClient()

    const { data: existingProfiles, error: checkError } = await (adminSupabase as any)
      .from("gologin_profiles")
      .select("gmail_email")
      .in("gmail_email", emailsToCheck)

    if (checkError) {
      console.error("[v0] Error checking existing emails:", checkError)
    }

    const existingEmails = new Set(existingProfiles?.map((p: any) => p.gmail_email) || [])
    const skippedEmails: string[] = []
    const profilesToCreate = profiles.filter((p: ProfileData) => {
      if (existingEmails.has(p.email)) {
        skippedEmails.push(p.email)
        return false
      }
      return true
    })

    console.log(`[v0] Found ${existingEmails.size} existing emails, skipping ${skippedEmails.length} duplicates`)
    if (skippedEmails.length > 0) {
      console.log(`[v0] Skipped emails: ${skippedEmails.join(", ")}`)
    }

    if (profilesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        failed: 0,
        skipped: skippedEmails.length,
        skippedEmails,
        errors: [],
        message: "All emails already exist in database",
      })
    }

    let folderId: string | undefined
    if (profileType === "gologin") {
      try {
        console.log(`[v0] Creating/getting folder "${folderName}"...`)
        const folder = await createFolder(folderName)
        folderId = folder.id
        console.log(`[v0] ✓ Folder ready with ID: ${folderId}`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : ""
        if (errorMsg.includes("already exists")) {
          console.log(`[v0] Folder already exists, fetching existing folder...`)
          try {
            const { gologinAPI } = await import("@/lib/gologin/api")
            const folders = await gologinAPI.getFolders()
            const existingFolder = folders.find((f: any) => f.name === folderName)
            if (existingFolder) {
              folderId = existingFolder.id
              console.log(`[v0] ✓ Found existing folder with ID: ${folderId}`)
            }
          } catch (fetchError) {
            console.log(`[v0] ⚠ Could not fetch existing folder: ${fetchError}`)
          }
        }

        if (!folderId) {
          console.log(`[v0] ⚠ Folder creation failed: ${errorMsg}`)
          console.log(`[v0] Profiles will be created in default folder`)
        }
      }
    }

    const results = {
      created: 0,
      failed: 0,
      skipped: skippedEmails.length,
      skippedEmails,
      errors: [] as string[],
    }

    for (const profileData of profilesToCreate) {
      try {
        const { email, password, recovery, proxy } = profileData

        if (!email || !password) {
          results.failed++
          results.errors.push(`Missing email or password for profile`)
          continue
        }

        const profileName = email.split("@")[0]

        console.log(`[v0] Creating ${profileType} profile: ${profileName} in folder: ${folderName}`)

        let profileId: string
        let dbProfileType: "gologin" | "local"
        let profileInsert: any

        if (profileType === "local") {
          const profileProxy =
            proxy ||
            (localConfig?.proxy
              ? {
                  server: localConfig.proxy.server,
                  username: localConfig.proxy.username || undefined,
                  password: localConfig.proxy.password || undefined,
                }
              : undefined)

          profileId = crypto.randomUUID()
          dbProfileType = "local"
          console.log(`[v0] ✓ Local profile ID generated: ${profileId}`)

          profileInsert = {
            profile_name: profileName,
            gmail_email: email,
            gmail_password: password,
            recovery_email: recovery,
            folder_name: folderName,
            assigned_user_id: dbUser.id,
            status: "idle",
            profile_type: dbProfileType,
            local_config: {
              ...localConfig,
              proxy: profileProxy,
            },
          }
        } else {
          const gologinProfile = await createProfile({
            name: profileName,
            folderId: folderId,
          })
          profileId = gologinProfile.id
          dbProfileType = "gologin"
          console.log(`[v0] ✓ GoLogin profile created successfully:`)
          console.log(`[v0]   - Profile ID: ${gologinProfile.id}`)
          console.log(`[v0]   - Profile Name: ${profileName}`)
          console.log(`[v0]   - Folder: ${folderName}`)
          console.log(`[v0]   - Check in GoLogin: https://app.gologin.com/profile/${gologinProfile.id}`)

          profileInsert = {
            profile_name: profileName,
            gmail_email: email,
            gmail_password: password,
            recovery_email: recovery,
            folder_name: folderName,
            assigned_user_id: dbUser.id,
            status: "idle",
            profile_type: dbProfileType,
            profile_id: profileId,
          }
        }

        const { data: profile, error: dbError } = await (adminSupabase as any)
          .from("gologin_profiles")
          .insert(profileInsert)
          .select()
          .single()

        if (dbError) {
          results.failed++
          results.errors.push(`Failed to save ${email}: ${dbError.message}`)
          console.error(`[v0] Database error for ${email}:`, dbError)
          if (dbProfileType === "gologin") {
            console.error(`[v0] ⚠ Note: Profile was created in GoLogin but failed to save to database`)
            console.error(`[v0] ⚠ Profile ID: ${profileId} - you may need to manually delete it from GoLogin`)
          }
          continue
        }

        console.log(`[v0] ✓ Profile saved to database with ID: ${profile.id}`)

        const { data: task, error: taskError } = await (adminSupabase as any)
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
          console.error(`[v0] Failed to create task for ${email}:`, taskError)
          results.failed++
          results.errors.push(`Failed to create task for ${email}: ${taskError.message}`)
          continue
        }

        results.created++
        console.log(`[v0] ✓ Successfully created ${dbProfileType} profile and task for: ${profileName}`)
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        results.errors.push(`Failed to create profile: ${errorMsg}`)
        console.error(`[v0] Error creating profile:`, error)
      }
    }

    console.log(
      `[v0] Bulk creation complete: ${results.created} created, ${results.failed} failed, ${results.skipped} skipped`,
    )

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

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    console.log("[v0] Bulk task creation request:", body)

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user exists by ID first
    const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.user.id).single()

    if (!existingUser) {
      // Try to find by email in case user exists with different ID
      const { data: userByEmail } = await supabase.from("users").select("id").eq("email", user.user.email).single()

      if (!userByEmail) {
        // User doesn't exist at all, create them
        console.log("[v0] User not found in public.users, creating record...")
        const { error: insertError } = await supabase
          .from("users")
          .upsert(
            {
              id: user.user.id,
              email: user.user.email,
              role: "user",
            },
            {
              onConflict: "email",
              ignoreDuplicates: true,
            },
          )
          .select()

        if (insertError) {
          console.error("[v0] Failed to create user record:", insertError)
          return NextResponse.json({ error: "Failed to create user record" }, { status: 500 })
        }
        console.log("[v0] User record created successfully")
      } else {
        console.log("[v0] User found by email, using existing record")
      }
    }

    const { profile_ids, task_type, config, sequential } = body

    if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
      return NextResponse.json({ error: "Invalid profile_ids array" }, { status: 400 })
    }

    const validProfileIds = profile_ids.filter((id) => id != null && id !== "")

    if (validProfileIds.length === 0) {
      return NextResponse.json({ error: "No valid profile IDs provided" }, { status: 400 })
    }

    if (validProfileIds.length !== profile_ids.length) {
      console.warn("[v0] Filtered out invalid profile IDs:", {
        original: profile_ids.length,
        valid: validProfileIds.length,
        invalid: profile_ids.filter((id) => id == null || id === ""),
      })
    }

    const orConditions = validProfileIds
      .flatMap((id) => {
        const conditions = [`profile_id.eq.${id}`]
        // Only try to match against UUID column if the ID is in UUID format
        if (isValidUUID(id)) {
          conditions.push(`id.eq.${id}`)
        }
        return conditions
      })
      .join(",")

    const { data: profiles, error: profileError } = await supabase
      .from("gologin_profiles")
      .select("id, profile_id, profile_type")
      .or(orConditions)

    if (profileError) {
      console.error("[v0] Error looking up profiles:", profileError)
      throw profileError
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: "No matching profiles found in database. Please sync profiles first." },
        { status: 404 },
      )
    }

    const profileIdMap = new Map(
      profiles.flatMap((p) => {
        const entries: [string, string][] = []
        if (p.profile_id) entries.push([p.profile_id, p.id])
        entries.push([p.id, p.id]) // Always map database id to itself
        return entries
      }),
    )

    console.log("[v0] Profile ID mapping:", {
      requested: validProfileIds.length,
      found: profiles.length,
      profileTypes: profiles.map((p) => ({ id: p.id, type: p.profile_type })),
      mapping: Object.fromEntries(profileIdMap),
    })

    const foundProfileIds = validProfileIds.filter((profileId) => profileIdMap.has(profileId))

    if (foundProfileIds.length === 0) {
      return NextResponse.json(
        { error: "None of the selected profiles exist in the database. Please sync profiles first." },
        { status: 404 },
      )
    }

    if (foundProfileIds.length < validProfileIds.length) {
      const missing = validProfileIds.filter((id) => !profileIdMap.has(id))
      console.warn("[v0] Some profiles not found in database:", missing)
    }

    const now = new Date()
    const tasks = foundProfileIds.map((gologinProfileId, index) => {
      const scheduledAt = sequential ? new Date(now.getTime() + index * 5000).toISOString() : now.toISOString()

      return {
        profile_id: profileIdMap.get(gologinProfileId),
        task_type,
        config: config || {},
        scheduled_at: scheduledAt,
        created_by: user.user.id,
      }
    })

    console.log("[v0] Inserting tasks:", tasks)

    const { data, error } = await supabase.from("automation_tasks").insert(tasks).select()

    if (error) {
      console.error("[v0] Database error creating bulk tasks:", error)
      throw error
    }

    console.log("[v0] Successfully created bulk tasks:", data)

    return NextResponse.json({ success: true, count: data.length, tasks: data })
  } catch (error: any) {
    console.error("[v0] Error creating bulk tasks:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

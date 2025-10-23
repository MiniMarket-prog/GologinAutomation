import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = user.user_metadata?.role === "admin"

    let query = supabase
      .from("gologin_profiles")
      .select("local_config, assigned_user_id, updated_at, profile_name, users(email)")

    // Non-admin users only see their own profiles
    if (!isAdmin) {
      query = query.eq("assigned_user_id", user.id)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error("Error fetching profiles:", error)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const proxyMap = new Map<
      string,
      { count: number; lastUsed: string | null; usernames: Set<string>; profileNames: string[]; ip: string | null }
    >()

    profiles?.forEach((profile: any) => {
      const proxyServer = profile.local_config?.proxy?.server || "No proxy"
      const lastUsed = profile.updated_at
      const username = profile.users?.email || "Unknown"
      const profileName = profile.profile_name || "Unnamed"

      // Extract IP from proxy server (format: http://ip:port or http://user:pass@ip:port)
      let proxyIp: string | null = null
      if (proxyServer !== "No proxy") {
        const match = proxyServer.match(/(?:http:\/\/)?(?:[^@]+@)?([^:]+)/)
        proxyIp = match ? match[1] : null
      }

      if (!proxyMap.has(proxyServer)) {
        proxyMap.set(proxyServer, { count: 0, lastUsed: null, usernames: new Set(), profileNames: [], ip: proxyIp })
      }

      const entry = proxyMap.get(proxyServer)!
      entry.count++
      entry.usernames.add(username)
      entry.profileNames.push(profileName)

      // Update last used if this profile was used more recently
      if (!entry.lastUsed || (lastUsed && new Date(lastUsed) > new Date(entry.lastUsed))) {
        entry.lastUsed = lastUsed
      }
    })

    const statsWithLocation = await Promise.all(
      Array.from(proxyMap.entries()).map(async ([proxy_server, data]) => {
        let location = undefined

        if (data.ip) {
          try {
            const geoResponse = await fetch(`http://ip-api.com/json/${data.ip}?fields=status,country,city,query`)
            const geoData = await geoResponse.json()
            if (geoData.status === "success") {
              location = {
                country: geoData.country,
                city: geoData.city,
                ip: geoData.query,
              }
            }
          } catch (error) {
            console.error(`Failed to fetch geolocation for ${data.ip}:`, error)
          }
        }

        return {
          proxy_server,
          profile_count: data.count,
          last_used: data.lastUsed,
          usernames: Array.from(data.usernames),
          profile_names: data.profileNames,
          location,
        }
      }),
    )

    // Sort by profile count (descending)
    const stats = statsWithLocation.sort((a, b) => b.profile_count - a.profile_count)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Error in proxy stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

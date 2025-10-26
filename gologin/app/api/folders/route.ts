import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/utils/auth"
import { GoLoginAPI } from "@/lib/gologin/api"

export async function GET() {
  try {
    const userIsAdmin = await isAdmin()
    const supabase = await getSupabaseServerClient()

    if (userIsAdmin) {
      const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY!)
      const gologinFolders = await gologinAPI.getFolders()
      const gologinFolderNames = gologinFolders.map((f: any) => f.name).filter(Boolean)

      const { data: profiles, error } = await supabase.from("gologin_profiles").select("folder_name, profile_type")

      if (error) throw error

      // Build folder map with counts
      const folderMap = new Map<string, { gologin: number; local: number }>()

      // Initialize with GoLogin folders
      gologinFolderNames.forEach((name: string) => {
        if (!folderMap.has(name)) {
          folderMap.set(name, { gologin: 0, local: 0 })
        }
      })

      profiles?.forEach((profile) => {
        const folderName = profile.folder_name || "(No Folder)"
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, { gologin: 0, local: 0 })
        }
        const counts = folderMap.get(folderName)!
        if (profile.profile_type === "local") {
          counts.local++
        } else {
          counts.gologin++
        }
      })

      // Convert to array format
      const foldersWithTypes = Array.from(folderMap.entries())
        .map(([name, counts]) => ({
          name,
          gologinCount: counts.gologin,
          localCount: counts.local,
          totalCount: counts.gologin + counts.local,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json({ folders: foldersWithTypes })
    }

    const { data: profiles, error } = await supabase.from("gologin_profiles").select("folder_name, profile_type")

    if (error) throw error

    // Build folder map with counts
    const folderMap = new Map<string, { gologin: number; local: number }>()

    profiles?.forEach((profile) => {
      const folderName = profile.folder_name || "(No Folder)"
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, { gologin: 0, local: 0 })
      }
      const counts = folderMap.get(folderName)!
      if (profile.profile_type === "local") {
        counts.local++
      } else {
        counts.gologin++
      }
    })

    const foldersWithTypes = Array.from(folderMap.entries())
      .map(([name, counts]) => ({
        name,
        gologinCount: counts.gologin,
        localCount: counts.local,
        totalCount: counts.gologin + counts.local,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ folders: foldersWithTypes })
  } catch (error: any) {
    console.error("[v0] Error fetching folders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

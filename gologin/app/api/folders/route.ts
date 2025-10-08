import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/utils/auth"
import { GoLoginAPI } from "@/lib/gologin/api"

export async function GET() {
  try {
    const userIsAdmin = await isAdmin()

    if (userIsAdmin) {
      const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY!)
      const folders = await gologinAPI.getFolders()
      const folderNames = folders
        .map((f: any) => f.name)
        .filter(Boolean)
        .sort()

      return NextResponse.json({ folders: folderNames })
    }

    // For regular users, get folders from their assigned profiles
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.from("gologin_profiles").select("folder_name").not("folder_name", "is", null)

    if (error) throw error

    const uniqueFolders = Array.from(new Set(data.map((p) => p.folder_name).filter(Boolean))) as string[]

    return NextResponse.json({ folders: uniqueFolders.sort() })
  } catch (error: any) {
    console.error("[v0] Error fetching folders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

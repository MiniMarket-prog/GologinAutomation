import { NextResponse } from "next/server"
import { gologinAPI } from "@/lib/gologin/api"

export async function GET() {
  try {
    console.log("[v0] Testing GoLogin API connection...")

    const profiles = await gologinAPI.getProfiles()

    console.log("[v0] GoLogin API test successful:", {
      profileCount: profiles.length,
      endpoint: gologinAPI.getEndpoint(),
    })

    return NextResponse.json({
      success: true,
      profileCount: profiles.length,
      endpoint: gologinAPI.getEndpoint(),
    })
  } catch (error) {
    console.error("[v0] GoLogin API test failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

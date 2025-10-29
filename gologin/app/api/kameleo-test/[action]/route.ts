import { type NextRequest, NextResponse } from "next/server"
import { kameleoAPI } from "@/lib/kameleo/api"
import { FiveSimAPI } from "@/lib/services/fivesim-api"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  console.log("[v0] POST handler called for kameleo-test route")

  try {
    const { action } = await params
    console.log("[v0] Action parameter:", action)

    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.error("[kameleo-test] Failed to parse request body:", parseError)
    }

    let result: any

    switch (action) {
      case "connection":
        // Test Kameleo Local API connection
        try {
          const profiles = await kameleoAPI.getProfiles()
          result = {
            success: true,
            message: "Kameleo Local API is running and accessible",
            endpoint: "http://localhost:5050",
            profileCount: profiles.length,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to connect to Kameleo Local API",
            error: error.message,
            hint: "Make sure Kameleo Desktop is running with CLI: Kameleo.CLI.exe email=YOUR_EMAIL password=YOUR_PASSWORD",
          }
        }
        break

      case "swagger":
        try {
          const response = await fetch("http://localhost:5050/swagger/v1/swagger.json")
          if (!response.ok) {
            throw new Error(`Swagger endpoint returned ${response.status}`)
          }
          const swaggerDoc = await response.json()
          result = {
            success: true,
            message: "Swagger documentation fetched successfully",
            endpoints: Object.keys(swaggerDoc.paths || {}),
            swaggerDoc,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to fetch Swagger documentation",
            error: error.message,
            hint: "Visit http://localhost:5050/swagger in your browser to view the documentation",
          }
        }
        break

      case "database":
        try {
          const supabase = getSupabaseAdminClient()
          const { data, error } = await supabase.from("kameleo_profiles").select("*").limit(5)

          if (error) {
            throw error
          }

          result = {
            success: true,
            message: "Database connection successful",
            tableExists: true,
            profileCount: data?.length || 0,
            profiles: data,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Database test failed",
            error: error.message,
            hint: "Make sure the kameleo_profiles table exists. Run the migration script: scripts/06-add-kameleo-support.sql",
          }
        }
        break

      case "fingerprints":
        // Search for base profiles
        const { deviceType, browser } = body
        try {
          const baseProfiles = await kameleoAPI.searchBaseProfiles(deviceType || "desktop", browser || "chrome")
          result = {
            success: true,
            message: `Found ${baseProfiles.length} base profiles`,
            count: baseProfiles.length,
            baseProfiles: baseProfiles.slice(0, 5), // Return first 5 for preview
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to search base profiles",
            error: error.message,
          }
        }
        break

      case "create":
        // Create a test profile
        const { name, deviceType: dt, browser: br } = body
        if (!name) {
          return NextResponse.json({ error: "Profile name is required" }, { status: 400 })
        }
        try {
          const profile = await kameleoAPI.createProfile({
            name,
            deviceType: dt || "desktop",
            browser: br || "chrome",
          })
          result = {
            success: true,
            message: "Profile created successfully",
            profile,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to create profile",
            error: error.message,
          }
        }
        break

      case "list":
        // List all profiles
        try {
          const profiles = await kameleoAPI.getProfiles()
          result = {
            success: true,
            message: `Found ${profiles.length} profiles`,
            count: profiles.length,
            profiles,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to list profiles",
            error: error.message,
          }
        }
        break

      case "start":
        // Start a profile
        const { profileId: startId } = body
        if (!startId) {
          return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
        }
        try {
          const startResult = await kameleoAPI.startProfile(startId)
          result = {
            success: true,
            message: "Profile started successfully",
            profileId: startId,
            webdriverUrl: startResult.webdriverUrl,
            seleniumUrl: startResult.seleniumUrl,
            port: startResult.port,
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to start profile",
            error: error.message,
          }
        }
        break

      case "stop":
        // Stop a profile
        const { profileId: stopId } = body
        if (!stopId) {
          return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
        }
        try {
          await kameleoAPI.stopProfile(stopId)
          result = {
            success: true,
            message: "Profile stopped successfully",
          }
        } catch (error: any) {
          result = {
            success: false,
            message: "Failed to stop profile",
            error: error.message,
          }
        }
        break

      case "5sim":
        // Test 5sim API integration
        const apiKey = process.env.FIVESIM_API_KEY
        if (!apiKey) {
          result = {
            success: false,
            message: "5sim API key not configured",
            hint: "Add FIVESIM_API_KEY to your environment variables",
          }
        } else {
          try {
            const fivesim = new FiveSimAPI(apiKey)
            const balance = await fivesim.getBalance()
            result = {
              success: true,
              message: "5sim API is working",
              balance: balance.balance,
              currency: balance.currency,
            }
          } catch (error: any) {
            result = {
              success: false,
              message: "5sim API test failed",
              error: error.message,
            }
          }
        }
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!result) {
      result = {
        success: false,
        message: "No result generated",
        error: "Internal error: result was undefined",
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[kameleo-test] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

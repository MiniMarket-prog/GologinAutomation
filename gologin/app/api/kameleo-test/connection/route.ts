import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("http://localhost:5050/profiles", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: "Kameleo API returned an error",
        status: response.status,
        hint: "Make sure Kameleo CLI is running on port 5050",
      })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Kameleo Local API",
      profileCount: Array.isArray(data) ? data.length : 0,
      swaggerUrl: "http://localhost:5050/swagger",
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Failed to connect to Kameleo Local API",
      error: error.message,
      hint: "Kameleo CLI is not running. Start it with: Kameleo.CLI.exe email=YOUR_EMAIL password=YOUR_PASSWORD",
    })
  }
}

export async function POST() {
  console.log("[v0] POST handler called for connection route")

  try {
    const response = await fetch("http://localhost:5050/profiles", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: "Kameleo API returned an error",
        status: response.status,
        hint: "Make sure Kameleo CLI is running on port 5050",
      })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Successfully connected to Kameleo Local API",
      profileCount: Array.isArray(data) ? data.length : 0,
      swaggerUrl: "http://localhost:5050/swagger",
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Failed to connect to Kameleo Local API",
      error: error.message,
      hint: "Kameleo CLI is not running. Start it with: Kameleo.CLI.exe email=YOUR_EMAIL password=YOUR_PASSWORD",
    })
  }
}

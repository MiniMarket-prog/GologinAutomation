import { NextResponse } from "next/server"

/**
 * API endpoint to check if the app is running on Vercel
 */
export async function GET() {
  const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV
  const environment = process.env.VERCEL_ENV || "development"

  return NextResponse.json({
    isVercel,
    environment,
  })
}

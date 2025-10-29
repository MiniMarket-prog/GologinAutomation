import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try to fetch the Swagger documentation
    const response = await fetch("http://localhost:5050/swagger/v1/swagger.json", {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: "Failed to fetch Swagger documentation",
        status: response.status,
        hint: "Visit http://localhost:5050/swagger in your browser to see the API documentation",
      })
    }

    const swaggerDoc = await response.json()

    // Extract available endpoints
    const endpoints = Object.keys(swaggerDoc.paths || {})

    return NextResponse.json({
      success: true,
      message: "Successfully fetched Swagger documentation",
      endpoints,
      swaggerUrl: "http://localhost:5050/swagger",
      documentation: swaggerDoc,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Failed to connect to Kameleo API",
      error: error.message,
      hint: "Make sure Kameleo CLI is running. Visit http://localhost:5050/swagger to verify.",
    })
  }
}

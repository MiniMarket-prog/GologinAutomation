import { type NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { ip, port, username, password } = await request.json()

    if (!ip || !port) {
      return NextResponse.json({ success: false, message: "IP and port are required" }, { status: 400 })
    }

    const startTime = Date.now()

    // Build proxy URL
    const proxyUrl = `http://${ip}:${port}`

    const args = [`--proxy-server=${proxyUrl}`, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]

    const browser = await puppeteer.launch({
      headless: true,
      args,
    })

    try {
      const page = await browser.newPage()

      // Set proxy authentication if provided
      if (username && password) {
        await page.authenticate({ username, password })
      }

      // Try to access a test URL
      const response = await page.goto("https://www.google.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })

      const responseTime = Date.now() - startTime

      let location = undefined
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,query`)
        const geoData = await geoResponse.json()
        if (geoData.status === "success") {
          location = {
            country: geoData.country,
            city: geoData.city,
            ip: geoData.query,
          }
        }
      } catch (error) {
        console.error("Failed to fetch geolocation:", error)
      }

      if (response && response.ok()) {
        await browser.close()
        return NextResponse.json({
          success: true,
          message: "Proxy connection successful",
          responseTime,
          location,
        })
      } else {
        await browser.close()
        return NextResponse.json({
          success: false,
          message: `Proxy returned status: ${response?.status() || "unknown"}`,
          location,
        })
      }
    } catch (error: any) {
      await browser.close()
      return NextResponse.json({
        success: false,
        message: `Proxy test failed: ${error.message}`,
      })
    }
  } catch (error: any) {
    console.error("Proxy test error:", error)
    return NextResponse.json({
      success: false,
      message: `Failed to test proxy: ${error.message}`,
    })
  }
}

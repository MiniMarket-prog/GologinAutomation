import { type NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"

export const maxDuration = 60

async function detectProxyType(ip: string, isp: string, org: string): Promise<string> {
  const ispLower = isp.toLowerCase()
  const orgLower = org.toLowerCase()

  // Datacenter indicators
  const datacenterKeywords = [
    "amazon",
    "aws",
    "google cloud",
    "microsoft azure",
    "digitalocean",
    "ovh",
    "hetzner",
    "linode",
    "vultr",
    "cloudflare",
    "hosting",
    "datacenter",
    "data center",
    "server",
    "colocation",
  ]

  // Mobile carrier indicators
  const mobileKeywords = [
    "mobile",
    "cellular",
    "wireless",
    "t-mobile",
    "vodafone",
    "orange",
    "telefonica",
    "verizon wireless",
    "sprint",
    "att mobility",
  ]

  // Check for datacenter
  if (datacenterKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "Datacenter"
  }

  // Check for mobile
  if (mobileKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "Mobile"
  }

  // Check for residential ISP
  const residentialKeywords = ["telecom", "communications", "broadband", "cable", "fiber", "internet service", "isp"]

  if (residentialKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "ISP (Static Residential)"
  }

  // Default to residential if it's not datacenter or mobile
  return "Residential"
}

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
      let proxyType = "Unknown"
      try {
        const geoResponse = await fetch(
          `http://ip-api.com/json/${ip}?fields=status,country,city,query,isp,org,as,mobile,proxy,hosting`,
        )
        const geoData = await geoResponse.json()
        if (geoData.status === "success") {
          location = {
            country: geoData.country,
            city: geoData.city,
            ip: geoData.query,
          }

          // Detect proxy type based on ISP and organization
          proxyType = await detectProxyType(ip, geoData.isp || "", geoData.org || "")

          // Override with API detection if available
          if (geoData.hosting) {
            proxyType = "Datacenter"
          } else if (geoData.mobile) {
            proxyType = "Mobile"
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
          proxyType, // Added proxy type to response
        })
      } else {
        await browser.close()
        return NextResponse.json({
          success: false,
          message: `Proxy returned status: ${response?.status() || "unknown"}`,
          location,
          proxyType, // Added proxy type to response
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

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import puppeteer from "puppeteer"

export const maxDuration = 60

// Helper function to detect proxy type
async function detectProxyType(ip: string, isp: string, org: string): Promise<string> {
  const ispLower = isp.toLowerCase()
  const orgLower = org.toLowerCase()

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

  if (datacenterKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "Datacenter"
  }

  if (mobileKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "Mobile"
  }

  const residentialKeywords = ["telecom", "communications", "broadband", "cable", "fiber", "internet service", "isp"]

  if (residentialKeywords.some((keyword) => ispLower.includes(keyword) || orgLower.includes(keyword))) {
    return "ISP (Static Residential)"
  }

  return "Residential"
}

// Helper function to test proxy
async function testProxy(ip: string, port: number, username?: string, password?: string) {
  const startTime = Date.now()
  const proxyUrl = `http://${ip}:${port}`

  const args = [`--proxy-server=${proxyUrl}`, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]

  const browser = await puppeteer.launch({
    headless: true,
    args,
  })

  try {
    const page = await browser.newPage()

    if (username && password) {
      await page.authenticate({ username, password })
    }

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

        proxyType = await detectProxyType(ip, geoData.isp || "", geoData.org || "")

        if (geoData.hosting) {
          proxyType = "Datacenter"
        } else if (geoData.mobile) {
          proxyType = "Mobile"
        }
      }
    } catch (error) {
      console.error("Failed to fetch geolocation:", error)
    }

    await browser.close()

    if (response && response.ok()) {
      return {
        success: true,
        responseTime,
        location,
        proxyType,
      }
    } else {
      return {
        success: false,
        error: `Proxy returned status: ${response?.status() || "unknown"}`,
      }
    }
  } catch (error: any) {
    await browser.close()
    return {
      success: false,
      error: error.message,
    }
  }
}

// GET - List all user proxies
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: proxies, error } = await supabase
      .from("user_proxies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching user proxies:", error)
      return NextResponse.json({ error: "Failed to fetch proxies" }, { status: 500 })
    }

    return NextResponse.json({ proxies })
  } catch (error) {
    console.error("Error in GET /api/user-proxies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a new proxy with validation
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, proxy_server, proxy_port, proxy_username, proxy_password } = await request.json()

    if (!proxy_server || !proxy_port) {
      return NextResponse.json({ error: "Proxy server and port are required" }, { status: 400 })
    }

    // Test the proxy before adding
    console.log(`[v0] Testing proxy ${proxy_server}:${proxy_port}...`)
    const testResult = await testProxy(proxy_server, proxy_port, proxy_username, proxy_password)

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: "Proxy validation failed",
          message: testResult.error,
        },
        { status: 400 },
      )
    }

    // Add proxy to database
    const { data: proxy, error } = await supabase
      .from("user_proxies")
      .insert({
        user_id: user.id,
        name: name || `${proxy_server}:${proxy_port}`,
        proxy_server,
        proxy_port,
        proxy_username,
        proxy_password,
        proxy_type: testResult.proxyType,
        location_country: testResult.location?.country,
        location_city: testResult.location?.city,
        location_ip: testResult.location?.ip,
        is_working: true,
        last_tested_at: new Date().toISOString(),
        response_time: testResult.responseTime,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding proxy:", error)
      return NextResponse.json({ error: "Failed to add proxy" }, { status: 500 })
    }

    return NextResponse.json({ proxy, testResult })
  } catch (error: any) {
    console.error("Error in POST /api/user-proxies:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

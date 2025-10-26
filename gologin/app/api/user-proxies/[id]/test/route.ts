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

// POST - Test a specific proxy
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get proxy from database
    const { data: proxy, error: fetchError } = await supabase
      .from("user_proxies")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !proxy) {
      return NextResponse.json({ error: "Proxy not found" }, { status: 404 })
    }

    // Test the proxy
    const startTime = Date.now()
    const proxyUrl = `http://${proxy.proxy_server}:${proxy.proxy_port}`

    const args = [`--proxy-server=${proxyUrl}`, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]

    const browser = await puppeteer.launch({
      headless: true,
      args,
    })

    try {
      const page = await browser.newPage()

      if (proxy.proxy_username && proxy.proxy_password) {
        await page.authenticate({
          username: proxy.proxy_username,
          password: proxy.proxy_password,
        })
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
          `http://ip-api.com/json/${proxy.proxy_server}?fields=status,country,city,query,isp,org,as,mobile,proxy,hosting`,
        )
        const geoData = await geoResponse.json()
        if (geoData.status === "success") {
          location = {
            country: geoData.country,
            city: geoData.city,
            ip: geoData.query,
          }

          proxyType = await detectProxyType(proxy.proxy_server, geoData.isp || "", geoData.org || "")

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

      const isWorking = response && response.ok()

      // Update proxy in database
      await supabase
        .from("user_proxies")
        .update({
          is_working: isWorking,
          last_tested_at: new Date().toISOString(),
          response_time: responseTime,
          proxy_type: proxyType,
          location_country: location?.country,
          location_city: location?.city,
          location_ip: location?.ip,
        })
        .eq("id", params.id)

      return NextResponse.json({
        success: isWorking,
        message: isWorking ? "Proxy is working" : `Proxy returned status: ${response?.status() || "unknown"}`,
        responseTime,
        location,
        proxyType,
      })
    } catch (error: any) {
      await browser.close()

      // Update proxy as not working
      await supabase
        .from("user_proxies")
        .update({
          is_working: false,
          last_tested_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      return NextResponse.json({
        success: false,
        message: `Proxy test failed: ${error.message}`,
      })
    }
  } catch (error: any) {
    console.error("Error in POST /api/user-proxies/[id]/test:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

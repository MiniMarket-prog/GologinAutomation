import puppeteer from "puppeteer-core"
import { GoLoginAPI } from "@/lib/gologin/api"

export class ProfileLauncher {
  private gologinAPI: GoLoginAPI
  private apiKey: string

  constructor(apiKey: string) {
    this.gologinAPI = new GoLoginAPI(apiKey)
    this.apiKey = apiKey
  }

  async launchProfile(profileId: string) {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Launching GoLogin profile: ${profileId}`)
    console.log(`[v0] ========================================`)

    try {
      // Start the profile via GoLogin API
      console.log(`[v0] Step 1: Starting profile via GoLogin API...`)
      const profileData = await this.gologinAPI.startProfile(profileId)

      console.log(`[v0] ✓ Profile data received:`, JSON.stringify(profileData, null, 2))

      // GoLogin cloud browser uses a specific connect URL format
      const wsUrl = `https://cloudbrowser.gologin.com/connect?token=${this.apiKey}&profile=${profileId}`

      console.log(`[v0] Step 2: Connecting to WebSocket...`)
      console.log(`[v0] WebSocket URL: ${wsUrl.replace(this.apiKey, "***API_KEY***")}`)

      // Connect to the browser via WebSocket
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsUrl,
        defaultViewport: null,
      })

      console.log(`[v0] ✓ Connected to browser`)

      // Get the first page
      console.log(`[v0] Step 3: Getting browser page...`)
      const pages = await browser.pages()
      console.log(`[v0] Found ${pages.length} open pages`)
      const page = pages[0] || (await browser.newPage())

      console.log(`[v0] ========================================`)
      console.log(`[v0] ✓✓✓ Profile ${profileId} launched successfully ✓✓✓`)
      console.log(`[v0] ========================================`)

      return { browser, page, success: true }
    } catch (error: any) {
      console.error(`[v0] ========================================`)
      console.error(`[v0] ❌ Failed to launch profile ${profileId}`)
      console.error(`[v0] Error type: ${error.name}`)
      console.error(`[v0] Error message: ${error.message}`)
      console.error(`[v0] Error stack:`, error.stack)
      console.error(`[v0] ========================================`)
      return { browser: null, page: null, success: false, error: error.message }
    }
  }

  async closeProfile(profileId: string, browser: any) {
    console.log(`[v0] Closing profile: ${profileId}`)

    try {
      if (browser) {
        console.log(`[v0] Disconnecting browser...`)
        await browser.disconnect()
        console.log(`[v0] ✓ Browser disconnected`)
      }

      // Stop the profile via GoLogin API
      console.log(`[v0] Stopping profile via GoLogin API...`)
      await this.gologinAPI.stopProfile(profileId)

      console.log(`[v0] ✓✓✓ Profile ${profileId} closed successfully ✓✓✓`)
      return { success: true }
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to close profile ${profileId}`)
      console.error(`[v0] Error:`, error.message)
      return { success: false, error: error.message }
    }
  }
}

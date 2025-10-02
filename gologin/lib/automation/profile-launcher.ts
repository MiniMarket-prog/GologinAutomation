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
        protocolTimeout: 300000, // 5 minutes timeout for protocol operations
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
      let stopAttempts = 0
      const maxAttempts = 3
      let lastError: any = null

      while (stopAttempts < maxAttempts) {
        try {
          await this.gologinAPI.stopProfile(profileId)
          console.log(`[v0] ✓✓✓ Profile ${profileId} closed successfully ✓✓✓`)
          return { success: true }
        } catch (error: any) {
          stopAttempts++
          lastError = error
          console.log(`[v0] Stop attempt ${stopAttempts}/${maxAttempts} failed: ${error.message}`)

          if (stopAttempts < maxAttempts) {
            console.log(`[v0] Waiting 2 seconds before retry...`)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      }

      // If we got here, all attempts failed
      console.error(`[v0] ⚠️ Could not stop profile via API after ${maxAttempts} attempts`)
      console.error(`[v0] Last error: ${lastError?.message}`)
      console.log(`[v0] Profile may need to be manually stopped in GoLogin dashboard`)

      // Return success anyway since browser is disconnected
      return { success: true, warning: "Profile stopped locally but API call failed" }
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to close profile ${profileId}`)
      console.error(`[v0] Error:`, error.message)
      return { success: false, error: error.message }
    }
  }
}

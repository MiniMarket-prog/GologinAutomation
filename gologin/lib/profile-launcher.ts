import puppeteer from "puppeteer-core"
import { GoLoginAPI } from "@/lib/api"

export class ProfileLauncher {
  private gologinAPI: GoLoginAPI

  constructor(apiKey: string) {
    this.gologinAPI = new GoLoginAPI(apiKey)
  }

  async launchProfile(profileId: string) {
    console.log(`[v0] Launching GoLogin profile: ${profileId}`)

    try {
      // Start the profile via GoLogin API
      const profileData = await this.gologinAPI.startProfile(profileId)

      if (!profileData.wsUrl) {
        throw new Error("Failed to get WebSocket URL from GoLogin")
      }

      // Connect to the browser via WebSocket
      const browser = await puppeteer.connect({
        browserWSEndpoint: profileData.wsUrl,
        defaultViewport: null,
      })

      console.log(`[v0] Connected to profile ${profileId}`)

      // Get the first page
      const pages = await browser.pages()
      const page = pages[0] || (await browser.newPage())

      return { browser, page, success: true }
    } catch (error: any) {
      console.error(`[v0] Failed to launch profile ${profileId}:`, error)
      return { browser: null, page: null, success: false, error: error.message }
    }
  }

  async closeProfile(profileId: string, browser: any) {
    console.log(`[v0] Closing profile: ${profileId}`)

    try {
      if (browser) {
        await browser.disconnect()
      }

      // Stop the profile via GoLogin API
      await this.gologinAPI.stopProfile(profileId)

      console.log(`[v0] Profile ${profileId} closed successfully`)
      return { success: true }
    } catch (error: any) {
      console.error(`[v0] Failed to close profile ${profileId}:`, error)
      return { success: false, error: error.message }
    }
  }
}

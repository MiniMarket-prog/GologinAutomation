import puppeteer from "puppeteer-core"
import { GoLoginAPI } from "@/lib/gologin/api"

export type LaunchMode = "cloud" | "local"

export class ProfileLauncher {
  private gologinAPI: GoLoginAPI
  private apiKey: string
  private mode: LaunchMode
  private gologinInstance: any = null

  constructor(apiKey: string, mode: LaunchMode = "cloud") {
    this.gologinAPI = new GoLoginAPI(apiKey)
    this.apiKey = apiKey
    this.mode = mode
  }

  async validateProfile(profileId: string): Promise<{ valid: boolean; error?: string; errorType?: string }> {
    try {
      console.log(`[v0] Validating profile ${profileId} with GoLogin API...`)
      await this.gologinAPI.getProfileStatus(profileId)
      console.log(`[v0] ✓ Profile validation successful`)
      return { valid: true }
    } catch (error: any) {
      console.error(`[v0] ❌ Profile validation failed:`, error.message)

      // Check if it's a 404 error (profile deleted)
      if (error.message.includes("404") || error.message.includes("not found") || error.message.includes("deleted")) {
        return {
          valid: false,
          error: "Profile has been deleted from GoLogin",
          errorType: "PROFILE_DELETED",
        }
      }

      // Check if it's an auth error
      if (error.message.includes("401") || error.message.includes("unauthorized")) {
        return {
          valid: false,
          error: "GoLogin API authentication failed",
          errorType: "AUTH_ERROR",
        }
      }

      // Generic error
      return {
        valid: false,
        error: `Profile validation failed: ${error.message}`,
        errorType: "VALIDATION_ERROR",
      }
    }
  }

  async launchProfile(profileId: string) {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Launching GoLogin profile: ${profileId}`)
    console.log(`[v0] Mode: ${this.mode.toUpperCase()}`)
    console.log(`[v0] ========================================`)

    try {
      let wsUrl: string

      if (this.mode === "local") {
        console.log(`[v0] Step 1: Starting profile locally using GoLogin SDK...`)

        try {
          const { GologinApi } = await import("gologin")

          this.gologinInstance = GologinApi({
            token: this.apiKey,
          })

          console.log(`[v0] Launching local profile...`)
          const { browser: localBrowser } = await this.gologinInstance.launch({ profileId })
          wsUrl = localBrowser.wsEndpoint()

          console.log(`[v0] ✓ Local profile launched`)
          console.log(`[v0] Using LOCAL mode - connecting to local Orbita browser`)
        } catch (importError: any) {
          console.error(`[v0] ❌ Failed to load GoLogin SDK for local mode`)
          console.error(`[v0] Error: ${importError.message}`)

          if (
            importError.message &&
            (importError.message.includes("404") ||
              importError.message.includes("not found") ||
              importError.message.includes("deleted"))
          ) {
            throw new Error("PROFILE_DELETED: Profile has been deleted from GoLogin")
          }

          console.error(`[v0] Local mode requires running in a Node.js environment with GoLogin Desktop app installed`)
          throw new Error(
            "Local mode is not available in this environment. Please use Cloud mode or run the application locally with Node.js.",
          )
        }
      } else {
        console.log(`[v0] Step 1: Starting profile via GoLogin API...`)
        await this.gologinAPI.startProfile(profileId)

        wsUrl = `wss://cloudbrowser.gologin.com/connect?token=${this.apiKey}&profile=${profileId}`
        console.log(`[v0] Using CLOUD mode - connecting to GoLogin cloud browser`)
      }

      console.log(`[v0] Step 2: Connecting to WebSocket...`)
      console.log(`[v0] WebSocket URL: ${wsUrl.replace(this.apiKey, "***API_KEY***")}`)

      const browser = await puppeteer.connect({
        browserWSEndpoint: wsUrl,
        defaultViewport: null,
        protocolTimeout: 300000, // 5 minutes timeout for protocol operations
      })

      console.log(`[v0] ✓ Connected to browser`)

      console.log(`[v0] Step 3: Getting browser page...`)
      const pages = await browser.pages()
      console.log(`[v0] Found ${pages.length} open pages`)
      const page = pages[0] || (await browser.newPage())

      console.log(`[v0] ========================================`)
      console.log(`[v0] ✓✓✓ Profile ${profileId} launched successfully in ${this.mode.toUpperCase()} mode ✓✓✓`)
      console.log(`[v0] ========================================`)

      return { browser, page, success: true }
    } catch (error: any) {
      console.error(`[v0] ========================================`)
      console.error(`[v0] ❌ Failed to launch profile ${profileId}`)
      console.error(`[v0] Error type: ${error.name}`)
      console.error(`[v0] Error message: ${error.message}`)
      console.error(`[v0] Error stack:`, error.stack)
      console.error(`[v0] ========================================`)

      const errorType = error.message?.startsWith("PROFILE_DELETED:") ? "PROFILE_DELETED" : "LAUNCH_ERROR"
      return { browser: null, page: null, success: false, error: error.message, errorType }
    }
  }

  async closeProfile(profileId: string, browser: any) {
    console.log(`[v0] Closing profile: ${profileId}`)

    try {
      if (browser) {
        console.log(`[v0] Closing browser...`)
        await browser.close()
        console.log(`[v0] ✓ Browser closed`)
      }

      if (this.mode === "cloud") {
        console.log(`[v0] Stopping profile via GoLogin API...`)
        let stopAttempts = 0
        const maxAttempts = 3
        let lastError: any = null

        while (stopAttempts < maxAttempts) {
          try {
            await this.gologinAPI.stopProfile(profileId)
            console.log(`[v0] ✓✓✓ Profile ${profileId} closed successfully ✓✓✓`)
            break
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

        if (stopAttempts === maxAttempts) {
          console.error(`[v0] ⚠️ Could not stop profile via API after ${maxAttempts} attempts`)
          console.error(`[v0] Last error: ${lastError?.message}`)
          console.log(`[v0] Profile may need to be manually stopped in GoLogin dashboard`)
        }
      } else {
        console.log(`[v0] ✓ Profile closed`)
      }

      return { success: true }
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to close profile ${profileId}`)
      console.error(`[v0] Error:`, error.message)
      return { success: false, error: error.message }
    }
  }
}

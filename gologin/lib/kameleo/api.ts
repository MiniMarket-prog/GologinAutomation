// Kameleo Local API integration using direct HTTP calls
// API Documentation: http://localhost:5050

interface KameleoBaseProfile {
  id: string
  name: string
  deviceType: string
  browserProduct: string
  osFamily: string
  language: string
}

interface KameleoProfile {
  id: string
  name: string
  baseProfileId: string
  proxy?: {
    type: string
    host: string
    port: number
    username?: string
    password?: string
  }
  automation?: {
    enableCdp: boolean
    cdpPort?: number
  }
}

interface StartProfileResult {
  webdriverUrl: string
  seleniumUrl: string
  port: number
  profileId: string
  lifetimeState: any
}

export class KameleoAPI {
  private baseUrl: string

  constructor(baseUrl = "http://localhost:5050") {
    this.baseUrl = baseUrl
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()

      let errorDetails = error
      let parsedError: any = null

      try {
        parsedError = JSON.parse(error)

        // Extract meaningful error message from Kameleo API response
        if (parsedError.error) {
          if (parsedError.error.global && Array.isArray(parsedError.error.global)) {
            errorDetails = parsedError.error.global.join(", ")
          } else if (typeof parsedError.error === "object") {
            // Handle nested error objects
            const errorMessages = Object.entries(parsedError.error)
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(", ")}`
                }
                return `${key}: ${value}`
              })
              .join("; ")
            errorDetails = errorMessages
          } else {
            errorDetails = String(parsedError.error)
          }
        }
      } catch (parseError) {
        // If parsing fails, use the raw error text
        errorDetails = error
      }

      const errorMessage = `Kameleo API error (${response.status}): ${errorDetails}`
      console.error("[v0] Kameleo API Error:", errorMessage)

      throw {
        code: "KAMELEO_API_ERROR",
        status: response.status,
        message: errorMessage,
        details: error,
        parsedError,
      }
    }

    return response.json()
  }

  async isServerAlive(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${this.baseUrl}/profiles`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      return response.ok
    } catch (error: any) {
      console.error("[v0] Kameleo server check failed:", error.message)
      return false
    }
  }

  /**
   * Search for available base profiles
   * NOTE: The Kameleo Local API does not expose base profile search.
   * Base profiles must be browsed through the Kameleo desktop app.
   * This method returns a helpful message instead.
   */
  async searchBaseProfiles(
    deviceType: "desktop" | "mobile" = "desktop",
    browser = "chrome",
    os?: string,
  ): Promise<KameleoBaseProfile[]> {
    console.log(`[v0] Base profile search is not available via Kameleo Local API`)
    console.log(`[v0] Use the Kameleo desktop app to browse and select base profiles`)

    throw {
      code: "FEATURE_NOT_AVAILABLE",
      message: "Base profile search is not available via Kameleo Local API",
      hint: "Use the Kameleo desktop app to find a base profile ID, or list existing profiles to see their base profile IDs",
    }
  }

  /**
   * Create a new Kameleo profile
   * NOTE: The Kameleo Local API does not support profile creation.
   * Profiles must be created through the Kameleo desktop application.
   * Once created, they can be managed via this API.
   */
  async createProfile(options: {
    name: string
    baseProfileId?: string
    deviceType?: "desktop" | "mobile"
    browser?: "chrome" | "firefox" | "edge" | "safari"
    os?: string
    proxy?: {
      server: string
      username?: string
      password?: string
    }
  }): Promise<KameleoProfile> {
    console.log(`[v0] Profile creation requested: ${options.name}`)
    console.log(`[v0] The Kameleo Local API does not support profile creation`)

    throw {
      code: "FEATURE_NOT_AVAILABLE",
      message: "Profile creation is not supported via Kameleo Local API",
      hint: "Please create profiles using the Kameleo desktop application. Once created, you can manage them (start, stop, delete) via this API.",
      details: {
        requestedProfile: options.name,
        suggestion:
          "Open the Kameleo desktop app and create a new profile with your desired settings. Then use the 'List Profiles' feature to see and manage your profiles via the API.",
      },
    }
  }

  /**
   * Start a Kameleo profile locally
   * @param profileId - Profile ID to start
   * @param options - Optional start options including CDP port
   * @returns WebDriver connection info
   */
  async startProfile(profileId: string, options?: { cdpPort?: number }): Promise<StartProfileResult> {
    try {
      console.log(`[v0] Starting Kameleo profile: ${profileId}`)

      const body: any = {}
      if (options?.cdpPort) {
        body.automation = {
          enableCdp: true,
          cdpPort: options.cdpPort,
        }
        console.log(`[v0] Starting with CDP enabled on port ${options.cdpPort}`)
      }

      const result = await this.request<any>(`/profiles/${profileId}/start`, {
        method: "POST",
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      console.log(`[v0] ✓ Profile started successfully`)
      console.log(`[v0] API response:`, JSON.stringify(result, null, 2))

      // Kameleo WebDriver is always at /webdriver endpoint
      // Users pass profile ID via options: options.add_experimental_option("kameleo:profileId", profileId)
      return {
        webdriverUrl: `${this.baseUrl}/webdriver`,
        seleniumUrl: `${this.baseUrl}/webdriver`,
        port: 5050,
        profileId: profileId,
        lifetimeState: result.lifetimeState,
      }
    } catch (error: any) {
      console.error("[v0] Failed to start Kameleo profile:", error.message || error)

      if (error.status === 503) {
        console.error("[v0] Hint: Profile failed to launch. This could be due to:")
        console.error("  - Browser fingerprint issues")
        console.error("  - Corrupted profile data")
        console.error("  - Insufficient system resources")
        console.error("  - Kameleo service issues")
        console.error("  - Try creating a new profile with a different fingerprint")
      }

      throw error
    }
  }

  /**
   * Connect to a started Kameleo profile using Puppeteer
   * @param webdriverUrl - WebDriver URL from startProfile result
   */
  async connectWithPuppeteer(webdriverUrl: string): Promise<any> {
    try {
      console.log(`[v0] Connecting Puppeteer to Kameleo browser at ${webdriverUrl}`)

      const puppeteer = await import("puppeteer-core")

      const browser = await puppeteer.connect({
        browserWSEndpoint: webdriverUrl,
        defaultViewport: null,
      })

      console.log("[v0] ✓ Puppeteer connected successfully")
      return browser
    } catch (error: any) {
      console.error("[v0] Failed to connect Puppeteer:", error.message || error)
      throw {
        code: "PUPPETEER_CONNECTION_FAILED",
        message: `Failed to connect Puppeteer: ${error.message}`,
        hint: "Make sure puppeteer-core is installed and the profile is started",
      }
    }
  }

  /**
   * Stop a running Kameleo profile
   * @param profileId - Profile ID to stop
   */
  async stopProfile(profileId: string): Promise<void> {
    try {
      console.log(`[v0] Stopping Kameleo profile: ${profileId}`)
      await this.request(`/profiles/${profileId}/stop`, {
        method: "POST",
      })
      console.log(`[v0] ✓ Profile stopped successfully`)
    } catch (error: any) {
      if (error.status === 409) {
        console.log(`[v0] Profile was not running (already stopped)`)
        return
      }

      console.error("[v0] Failed to stop Kameleo profile:", error.message || error)
      throw error
    }
  }

  /**
   * Get all Kameleo profiles
   */
  async getProfiles(): Promise<KameleoProfile[]> {
    try {
      console.log(`[v0] Fetching Kameleo profiles...`)
      const profiles = await this.request<KameleoProfile[]>("/profiles")
      console.log(`[v0] Found ${profiles.length} profiles`)
      return profiles
    } catch (error: any) {
      console.error("[v0] Failed to fetch Kameleo profiles:", error.message || error)
      throw error
    }
  }

  /**
   * Delete a Kameleo profile
   * @param profileId - Profile ID to delete
   */
  async deleteProfile(profileId: string): Promise<void> {
    try {
      console.log(`[v0] Deleting Kameleo profile: ${profileId}`)
      await this.request(`/api/v1/profiles/${profileId}`, {
        method: "DELETE",
      })
      console.log(`[v0] ✓ Profile deleted successfully`)
    } catch (error: any) {
      console.error("[v0] Failed to delete Kameleo profile:", error.message || error)
      throw error
    }
  }

  /**
   * Update a Kameleo profile
   * @param profileId - Profile ID to update
   * @param updates - Profile updates
   */
  async updateProfile(profileId: string, updates: Partial<KameleoProfile>): Promise<KameleoProfile> {
    try {
      console.log(`[v0] Updating Kameleo profile: ${profileId}`)
      const profile = await this.request<KameleoProfile>(`/profiles/${profileId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      })
      console.log(`[v0] ✓ Profile updated successfully`)
      return profile
    } catch (error: any) {
      console.error("[v0] Failed to update Kameleo profile:", error.message || error)
      throw error
    }
  }

  /**
   * Enable Chrome DevTools Protocol on a Kameleo profile
   * This must be done before starting the profile to allow Puppeteer connection
   * @param profileId - Profile ID to enable CDP on
   */
  async enableCdp(profileId: string): Promise<void> {
    try {
      console.log(`[v0] Enabling CDP for Kameleo profile: ${profileId}`)

      // Some APIs require a full PUT with the complete profile object
      try {
        // First, get the current profile
        const currentProfile = await this.request<any>(`/profiles/${profileId}`, {
          method: "GET",
        })

        console.log(`[v0] Current profile retrieved, updating with CDP enabled...`)

        // Update the profile with CDP enabled
        const updatedProfile = {
          ...currentProfile,
          automation: {
            ...(currentProfile.automation || {}),
            enableCdp: true,
          },
        }

        // Send the complete profile back with PUT
        await this.request(`/profiles/${profileId}`, {
          method: "PUT",
          body: JSON.stringify(updatedProfile),
        })

        console.log(`[v0] ✓ CDP enabled successfully`)
      } catch (getError: any) {
        // If GET fails, try a simple PATCH with just the automation field
        console.log(`[v0] GET failed, trying direct update...`)
        await this.request(`/profiles/${profileId}`, {
          method: "PUT",
          body: JSON.stringify({
            automation: {
              enableCdp: true,
            },
          }),
        })
        console.log(`[v0] ✓ CDP enabled successfully`)
      }
    } catch (error: any) {
      console.error("[v0] Failed to enable CDP:", error.message || error)
      // CDP might already be enabled or not required in newer versions
      console.log("[v0] Continuing without explicit CDP enabling...")
    }
  }
}

export const kameleoAPI = new KameleoAPI()

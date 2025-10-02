// GoLogin API integration
export class GoLoginAPI {
  private apiKey: string
  private baseUrl = "https://api.gologin.com"
  private successfulEndpoint: string | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  getEndpoint(): string | null {
    return this.successfulEndpoint
  }

  async getProfiles() {
    try {
      const profilesUrl = `${this.baseUrl}/browser/v2`
      console.log(`[v0] Fetching profiles from ${profilesUrl}`)

      const response = await fetch(profilesUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GoLogin API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      this.successfulEndpoint = profilesUrl

      if (Array.isArray(data)) return data
      if (data.profiles && Array.isArray(data.profiles)) return data.profiles
      if (data.data && Array.isArray(data.data)) return data.data

      console.log(`[v0] Unexpected response structure:`, data)
      return []
    } catch (error: any) {
      console.error("[v0] Failed to fetch profiles:", error.message)
      throw new Error(
        `Failed to fetch profiles from GoLogin. ${error.message}. ` +
          `Please check your API key at https://app.gologin.com/personalArea/TokenApi`,
      )
    }
  }

  async startProfile(profileId: string) {
    console.log(`[v0] Starting profile ${profileId}...`)

    const response = await fetch(`${this.baseUrl}/browser/${profileId}/web`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to start profile: ${errorText}`)
    }

    const data = await response.json()
    console.log(`[v0] Start profile response:`, JSON.stringify(data, null, 2))

    return data
  }

  async stopProfile(profileId: string) {
    const endpoints = [`/browser/${profileId}/stop`, `/browser/v2/${profileId}/stop`, `/browser/${profileId}/web/stop`]

    let lastError: any = null

    for (const endpoint of endpoints) {
      try {
        console.log(`[v0] Trying to stop profile at: ${endpoint}`)
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        })

        if (response.ok) {
          console.log(`[v0] ✓ Profile stopped successfully using endpoint: ${endpoint}`)
          return response.json()
        }

        // If 404, the profile might already be stopped - not a critical error
        if (response.status === 404) {
          console.log(`[v0] Profile might already be stopped (404 at ${endpoint})`)
          lastError = { status: 404, message: "Profile not found or already stopped" }
          continue
        }

        const errorText = await response.text()
        lastError = { status: response.status, message: errorText }
      } catch (error: any) {
        console.log(`[v0] Error trying endpoint ${endpoint}:`, error.message)
        lastError = error
      }
    }

    // If all endpoints failed with 404, consider it a success (profile already stopped)
    if (lastError?.status === 404) {
      console.log(`[v0] Profile appears to be already stopped, continuing...`)
      return { success: true, message: "Profile already stopped" }
    }

    // If we got here, all endpoints failed with non-404 errors
    throw new Error(`Failed to stop profile after trying all endpoints: ${JSON.stringify(lastError)}`)
  }

  async getProfileStatus(profileId: string) {
    const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get profile status: ${errorText}`)
    }

    return response.json()
  }
}

export const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY || "")

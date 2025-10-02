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
    const response = await fetch(`${this.baseUrl}/browser/${profileId}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to stop profile: ${errorText}`)
    }

    return response.json()
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

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
      console.log(`[v0] Fetching profiles using page-based pagination`)

      const allProfiles: any[] = []
      let page = 1
      let hasMore = true
      let totalCount: number | null = null

      while (hasMore) {
        // Try different pagination approaches
        const urls = [
          `${this.baseUrl}/browser/v2?page=${page}`,
          `${this.baseUrl}/browser/v2?skip=${(page - 1) * 30}&limit=30`,
          `${this.baseUrl}/browser?page=${page}`,
        ]

        let profiles: any[] = []
        let success = false

        for (const url of urls) {
          try {
            console.log(`[v0] Trying: ${url}`)
            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
              },
            })

            if (!response.ok) continue

            const data = await response.json()

            if (data.allProfilesCount !== undefined) {
              totalCount = data.allProfilesCount
            } else if (data.total !== undefined) {
              totalCount = data.total
            }

            if (Array.isArray(data)) {
              profiles = data
            } else if (data.profiles && Array.isArray(data.profiles)) {
              profiles = data.profiles
            } else if (data.data && Array.isArray(data.data)) {
              profiles = data.data
            }

            if (profiles.length > 0) {
              console.log(`[v0] ✓ Success with ${url} - got ${profiles.length} profiles`)
              success = true
              break
            }
          } catch (error) {
            continue
          }
        }

        if (!success || profiles.length === 0) {
          console.log(`[v0] No more profiles found at page ${page}`)
          hasMore = false
          break
        }

        if (page === 1 && totalCount !== null) {
          console.log(`[v0] Total profiles reported: ${totalCount}`)
        }

        if (page === 1 && profiles.length > 0) {
          console.log(`[v0] Sample profile structure:`, JSON.stringify(profiles[0], null, 2))
        }

        // Check for duplicates before adding
        const existingIds = new Set(allProfiles.map((p) => p.id))
        const newProfiles = profiles.filter((p) => !existingIds.has(p.id))

        console.log(
          `[v0] Page ${page}: ${profiles.length} profiles, ${newProfiles.length} new (${profiles.length - newProfiles.length} duplicates)`,
        )

        if (newProfiles.length === 0) {
          console.log(`[v0] All profiles on page ${page} are duplicates - stopping`)
          hasMore = false
          break
        }

        allProfiles.push(...newProfiles)
        page++

        if (totalCount !== null && allProfiles.length >= totalCount) {
          console.log(`[v0] Reached total count of ${totalCount}`)
          hasMore = false
        }

        // Safety limit
        if (page > 20) {
          console.log(`[v0] Reached page limit of 20`)
          hasMore = false
        }
      }

      console.log(`[v0] ✓ Fetched ${allProfiles.length} unique profiles`)
      this.successfulEndpoint = `${this.baseUrl}/browser/v2`

      return allProfiles
    } catch (error: any) {
      console.error("[v0] Failed to fetch profiles:", error.message)
      throw new Error(
        `Failed to fetch profiles from GoLogin. ${error.message}. ` +
          `Please check your API key at https://app.gologin.com/personalArea/TokenApi`,
      )
    }
  }

  async startProfile(profileId: string) {
    console.log(`[v0] Starting profile ${profileId} in cloud mode...`)

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
    try {
      const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()

        // Parse error response
        let errorMessage = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorText
        } catch {
          // Keep original error text if not JSON
        }

        throw new Error(`${response.status}: ${errorMessage}`)
      }

      return response.json()
    } catch (error: any) {
      // Re-throw with more context
      if (error.message) {
        throw error
      }
      throw new Error(`Failed to get profile status: ${error}`)
    }
  }

  async getFolders() {
    try {
      const foldersUrl = `${this.baseUrl}/folders`
      console.log(`[v0] Fetching folders from ${foldersUrl}`)

      const response = await fetch(foldersUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GoLogin API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // The API returns an array of folders or an object with folders property
      const folders = Array.isArray(data) ? data : data.folders || []
      console.log(`[v0] ✓ Fetched ${folders.length} folders from GoLogin`)

      return folders
    } catch (error: any) {
      console.error("[v0] Failed to fetch folders:", error.message)
      // Don't throw - folders are optional, return empty array
      return []
    }
  }
}

export const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY || "")

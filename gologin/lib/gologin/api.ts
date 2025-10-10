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

  async createProfile(options: { name: string; folderName?: string }) {
    try {
      console.log(`[v0] Creating profile: ${options.name} in folder: ${options.folderName || "default"}`)

      const osOptions = ["win", "mac", "lin"]
      const randomOS = osOptions[Math.floor(Math.random() * osOptions.length)]

      // Platform must match the OS
      const platformMap: Record<string, string> = {
        win: "Win32",
        mac: "MacIntel",
        lin: "Linux x86_64",
      }

      // Random resolutions
      const resolutions = ["1920x1080", "1366x768", "1440x900", "1536x864", "1600x900", "2560x1440"]
      const randomResolution = resolutions[Math.floor(Math.random() * resolutions.length)]

      // Random languages
      const languages = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "pt-BR"]
      const randomLanguage = languages[Math.floor(Math.random() * languages.length)]

      const body: any = {
        name: options.name,
        browserType: "chrome",
        os: randomOS,
        navigator: {
          userAgent: "random",
          resolution: randomResolution,
          language: randomLanguage,
          platform: platformMap[randomOS],
        },
        proxy: {
          mode: "none",
        },
      }

      // If folder name is provided, try to find the folder ID
      if (options.folderName) {
        const folders = await this.getFolders()
        const folder = folders.find((f: any) => f.name === options.folderName)
        if (folder) {
          body.folderId = folder.id
        }
      }

      const response = await fetch(`${this.baseUrl}/browser`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create profile: ${errorText}`)
      }

      const data = await response.json()
      console.log(`[v0] ✓ Profile created successfully:`, data.id)

      return data
    } catch (error: any) {
      console.error("[v0] Failed to create profile:", error.message)
      throw new Error(`Failed to create profile in GoLogin: ${error.message}`)
    }
  }

  async createFolder(name: string) {
    try {
      console.log(`[v0] Creating folder: ${name}`)

      const response = await fetch(`${this.baseUrl}/folders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create folder: ${errorText}`)
      }

      const data = await response.json()
      console.log(`[v0] ✓ Folder created successfully:`, data.id)

      return data
    } catch (error: any) {
      console.error("[v0] Failed to create folder:", error.message)
      throw new Error(`Failed to create folder in GoLogin: ${error.message}`)
    }
  }
}

export const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY || "")

export async function createProfile(options: { name: string; folderName?: string }) {
  return gologinAPI.createProfile(options)
}

export async function createFolder(name: string) {
  return gologinAPI.createFolder(name)
}

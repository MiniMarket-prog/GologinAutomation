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
      console.log(`[v0] Starting profile sync from GoLogin...`)

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
              success = true
              break
            }
          } catch (error) {
            continue
          }
        }

        if (!success || profiles.length === 0) {
          hasMore = false
          break
        }

        if (page === 1 && totalCount !== null) {
          console.log(`[v0] Total profiles available: ${totalCount}`)
        }

        // Check for duplicates before adding
        const existingIds = new Set(allProfiles.map((p) => p.id))
        const newProfiles = profiles.filter((p) => !existingIds.has(p.id))

        if (newProfiles.length === 0) {
          hasMore = false
          break
        }

        allProfiles.push(...newProfiles)
        page++

        if (totalCount !== null && allProfiles.length >= totalCount) {
          hasMore = false
        }

        // Safety limit
        if (page > 20) {
          hasMore = false
        }
      }

      console.log(`[v0] ✓ Synced ${allProfiles.length} profiles from GoLogin`)
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

    if (data.remoteOrbitaUrl) {
      // Convert https:// to wss:// for WebSocket connection
      const wsUrl = data.remoteOrbitaUrl.replace("https://", "wss://")
      console.log(`[v0] Converted to WebSocket URL: ${wsUrl}`)
      return { ...data, wsUrl }
    }

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

      return folders
    } catch (error: any) {
      console.error("[v0] Failed to fetch folders:", error.message)
      // Don't throw - folders are optional, return empty array
      return []
    }
  }

  async createProfile(options: { name: string; folderName?: string; folderId?: string }) {
    try {
      console.log(`[v0] Creating profile: ${options.name}`)

      if (options.folderId) {
        console.log(`[v0] Assigning to folder ID: ${options.folderId}`)
      } else if (options.folderName) {
        console.log(`[v0] Will search for folder: ${options.folderName}`)
      } else {
        console.log(`[v0] Creating in default folder`)
      }

      const osOptions = ["win", "mac", "lin"]
      const randomOS = osOptions[Math.floor(Math.random() * osOptions.length)]

      // Windows: only "win11" is accepted
      // macOS: only "M1", "M2", "M3", "M4" are accepted (Apple Silicon chips)
      // Linux: osSpec is not supported by GoLogin API
      const osSpecMap: Record<string, string[]> = {
        win: ["win11"], // Only win11 is accepted by GoLogin API
        mac: ["M1", "M2", "M3", "M4"], // Apple Silicon chips
      }

      // Only get osSpec if the OS supports it (not Linux)
      const randomOsSpec =
        randomOS !== "lin" ? osSpecMap[randomOS][Math.floor(Math.random() * osSpecMap[randomOS].length)] : undefined

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

      const userAgents: Record<string, string[]> = {
        win: [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        ],
        mac: [
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        ],
        lin: ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"],
      }
      const randomUserAgent = userAgents[randomOS][Math.floor(Math.random() * userAgents[randomOS].length)]

      const hardwareConcurrency = [4, 8, 12, 16][Math.floor(Math.random() * 4)]
      const deviceMemory = [4, 8, 16][Math.floor(Math.random() * 3)]

      const commonFonts = [
        "Arial",
        "Arial Black",
        "Arial Narrow",
        "Arial Rounded MT Bold",
        "Avant Garde",
        "Calibri",
        "Candara",
        "Century Gothic",
        "Franklin Gothic Medium",
        "Futura",
        "Geneva",
        "Gill Sans",
        "Helvetica",
        "Helvetica Neue",
        "Impact",
        "Lucida Grande",
        "Optima",
        "Segoe UI",
        "Tahoma",
        "Trebuchet MS",
        "Verdana",
        "Big Caslon",
        "Bodoni MT",
        "Book Antiqua",
        "Bookman Old Style",
        "Calisto MT",
        "Cambria",
        "Didot",
        "Garamond",
        "Georgia",
        "Goudy Old Style",
        "Hoefler Text",
        "Lucida Bright",
        "Palatino",
        "Palatino Linotype",
        "Perpetua",
        "Rockwell",
        "Rockwell Extra Bold",
        "Baskerville",
        "Times",
        "Times New Roman",
        "Andale Mono",
        "Consolas",
        "Courier",
        "Courier New",
        "Lucida Console",
        "Lucida Sans Typewriter",
        "Monaco",
        "Monospace",
        "Copperplate",
        "Papyrus",
        "Brush Script MT",
        "Comic Sans MS",
        "Bradley Hand",
        "Luminari",
        "Snell Roundhand",
        "Agency FB",
        "Algerian",
        "Bauhaus 93",
        "Berlin Sans FB",
        "Bernard MT Condensed",
        "Blackadder ITC",
        "Bodoni MT Black",
        "Bodoni MT Poster Compressed",
        "Britannic Bold",
        "Broadway",
        "Brush Script Std",
        "Californian FB",
        "Castellar",
        "Centaur",
        "Chiller",
        "Colonna MT",
        "Cooper Black",
        "Copperplate Gothic Bold",
        "Copperplate Gothic Light",
        "Curlz MT",
        "Edwardian Script ITC",
        "Elephant",
        "Engravers MT",
        "Eras Bold ITC",
        "Eras Demi ITC",
        "Eras Light ITC",
        "Eras Medium ITC",
        "Felix Titling",
        "Footlight MT Light",
        "Forte",
        "Franklin Gothic Book",
        "Franklin Gothic Demi",
        "Franklin Gothic Demi Cond",
        "Franklin Gothic Heavy",
        "Freestyle Script",
        "French Script MT",
        "Gabriola",
        "Gigi",
        "Gloucester MT Extra Condensed",
        "Goudy Stout",
        "Haettenschweiler",
        "Harlow Solid Italic",
        "Harrington",
        "High Tower Text",
        "Imprint MT Shadow",
        "Informal Roman",
        "Jokerman",
        "Juice ITC",
        "Kristen ITC",
        "Kunstler Script",
        "Lucida Calligraphy",
        "Lucida Fax",
        "Lucida Handwriting",
        "Lucida Sans",
        "Lucida Sans Unicode",
        "Magneto",
        "Maiandra GD",
        "Matura MT Script Capitals",
        "Mistral",
        "Modern No. 20",
        "Monotype Corsiva",
        "MS Gothic",
        "MS Outlook",
        "MS PGothic",
        "MS Reference Sans Serif",
        "MS Reference Specialty",
        "MS Sans Serif",
        "MS Serif",
        "MT Extra",
        "Niagara Engraved",
        "Niagara Solid",
        "OCR A Extended",
        "Old English Text MT",
        "Onyx",
        "Palace Script MT",
        "Parchment",
        "Playbill",
        "Poor Richard",
        "Pristina",
        "Rage Italic",
        "Ravie",
        "Showcard Gothic",
        "Snap ITC",
        "Stencil",
        "Sylfaen",
        "Symbol",
        "Tempus Sans ITC",
        "Tw Cen MT",
        "Tw Cen MT Condensed",
        "Viner Hand ITC",
        "Vivaldi",
        "Vladimir Script",
        "Wide Latin",
        "Wingdings",
        "Wingdings 2",
        "Wingdings 3",
      ]

      const body: any = {
        name: options.name,
        browserType: "chrome",
        os: randomOS,
        ...(randomOsSpec && { osSpec: randomOsSpec }),
        // Enable auto-language detection based on IP
        autoLang: true,
        // Disable profile locking to allow modifications
        lockEnabled: false,
        navigator: {
          userAgent: randomUserAgent,
          resolution: randomResolution,
          language: randomLanguage,
          platform: platformMap[randomOS],
          hardwareConcurrency: hardwareConcurrency,
          deviceMemory: deviceMemory,
          maxTouchPoints: 0, // Desktop devices typically have 0 touch points
        },
        // Timezone configuration - auto-fill based on IP
        timezone: {
          enabled: true,
          fillBasedOnIp: true,
        },
        // Geolocation configuration - prompt mode with IP-based filling
        geolocation: {
          mode: "prompt",
          enabled: true,
          fillBasedOnIp: true,
        },
        fonts: {
          families: commonFonts,
          enableMasking: true,
          enableDomRect: true,
        },
        // WebGL configuration with noise mode
        webGL: {
          mode: "noise",
          noise: 0.5,
          getClientRectsNoise: 0.5,
        },
        // WebGL metadata with masking
        webGLMetadata: {
          mode: "mask",
          vendor: "Google Inc. (NVIDIA)",
          renderer: "ANGLE (NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0)",
        },
        // Canvas set to OFF as per default profile settings
        canvas: {
          mode: "off",
        },
        // Audio context with noise
        audioContext: {
          mode: "noise",
          noise: 0.1,
        },
        // Client rects set to OFF as per default profile settings
        clientRects: {
          mode: "off",
        },
        // WebRTC configuration - based on IP
        webRTC: {
          mode: "alerted",
          enabled: true,
          customize: true,
          fillBasedOnIp: true,
        },
        // Media devices configuration
        mediaDevices: {
          videoInputs: 1,
          audioInputs: 1,
          audioOutputs: 1,
          enableMasking: true,
        },
        // Proxy configuration - none by default
        proxy: {
          mode: "none",
        },
        chromeExtensions: [],
        userChromeExtensions: [],
      }

      let folderName: string | undefined
      if (options.folderId) {
        // Get the folder name from the folder ID
        const folders = await this.getFolders()
        const folder = folders.find((f: any) => (f.id || f._id) === options.folderId)
        if (folder) {
          folderName = folder.name
          console.log(`[v0] Found folder name "${folderName}" for ID: ${options.folderId}`)

          // Try multiple parameter formats
          body.folderName = folderName
          body.folder_name = folderName
          body.folderId = options.folderId
          body.folder_id = options.folderId
          body.folder = options.folderId
          body.folders = [folderName] // Try with folder name in array

          console.log(`[v0] Testing folder assignment with:`)
          console.log(`[v0]   - folderName: "${folderName}"`)
          console.log(`[v0]   - folder_name: "${folderName}"`)
          console.log(`[v0]   - folderId: "${options.folderId}"`)
          console.log(`[v0]   - folder_id: "${options.folderId}"`)
          console.log(`[v0]   - folder: "${options.folderId}"`)
          console.log(`[v0]   - folders: ["${folderName}"]`)
        } else {
          console.log(`[v0] ⚠ Could not find folder with ID: ${options.folderId}`)
        }
      } else if (options.folderName) {
        const folders = await this.getFolders()
        const folder = folders.find((f: any) => f.name === options.folderName)
        if (folder) {
          folderName = folder.name
          body.folderId = folder.id
          body.folderName = folderName
          console.log(`[v0] ✓ Found folder "${options.folderName}" with ID: ${folder.id}`)
        } else {
          console.log(`[v0] ⚠ Folder "${options.folderName}" not found, creating profile in default folder`)
        }
      }

      console.log(
        `[v0] Creating profile with enhanced fingerprinting:`,
        JSON.stringify(
          {
            name: body.name,
            os: body.os,
            userAgent: body.navigator.userAgent.substring(0, 50) + "...",
            resolution: body.navigator.resolution,
            language: body.navigator.language,
            hardwareConcurrency: body.navigator.hardwareConcurrency,
            deviceMemory: body.navigator.deviceMemory,
            webGLVendor: body.webGLMetadata.vendor,
            webGLRenderer: body.webGLMetadata.renderer.substring(0, 50) + "...",
            folderId: body.folderId || "default",
          },
          null,
          2,
        ),
      )

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
        console.error(`[v0] ❌ Profile creation failed with status ${response.status}:`, errorText)
        throw new Error(`Failed to create profile: ${errorText}`)
      }

      const data = await response.json()
      console.log(`[v0] ✓ Profile created with ID: ${data.id}`)
      console.log(
        `[v0] Profile creation response:`,
        JSON.stringify(
          {
            id: data.id,
            name: data.name,
            folderId: data.folderId,
            folder: data.folder,
            folders: data.folders,
            status: data.status,
            os: data.os,
          },
          null,
          2,
        ),
      )

      console.log(`[v0] Waiting for profile to sync to GoLogin cloud...`)
      const syncSuccess = await this.waitForProfileSync(data.id)

      if (syncSuccess) {
        console.log(`[v0] ✓ Profile synced to cloud and ready to use`)
        console.log(`[v0] ✓ Profile should now be visible in your GoLogin account`)
        console.log(`[v0] ✓ Profile URL: https://app.gologin.com/profile/${data.id}`)
      } else {
        console.warn(`[v0] ⚠ Profile created but sync verification timed out - profile may still be syncing`)
        console.warn(`[v0] ⚠ Check your GoLogin account in a few minutes: https://app.gologin.com`)
      }

      // Move profile to folder if folderId is provided
      if (options.folderId) {
        const moveSuccess = await this.moveProfileToFolder(data.id, options.folderId)
        if (!moveSuccess) {
          console.warn(`[v0] ⚠ Could not move profile to folder after creation`)
        }
      }

      return data
    } catch (error: any) {
      console.error("[v0] Failed to create profile:", error.message)
      throw new Error(`Failed to create profile in GoLogin: ${error.message}`)
    }
  }

  async createFolder(name: string) {
    try {
      console.log(`[v0] Creating folder: ${name}`)

      const response = await fetch(`${this.baseUrl}/folders/folder`, {
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

  async moveProfileToFolder(profileId: string, folderId: string): Promise<boolean> {
    try {
      console.log(`[v0] Moving profile ${profileId} to folder ${folderId}...`)

      // Try different endpoints that might work for moving profiles to folders
      const endpoints = [
        { method: "PATCH", url: `${this.baseUrl}/browser/${profileId}`, body: { folderId } },
        { method: "PATCH", url: `${this.baseUrl}/browser/${profileId}`, body: { folder: folderId } },
        { method: "PATCH", url: `${this.baseUrl}/browser/${profileId}`, body: { folders: [folderId] } },
        { method: "PUT", url: `${this.baseUrl}/browser/${profileId}`, body: { folderId } },
        { method: "POST", url: `${this.baseUrl}/browser/${profileId}/folder`, body: { folderId } },
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`[v0] Trying ${endpoint.method} ${endpoint.url} with body:`, JSON.stringify(endpoint.body))

          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(endpoint.body),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`[v0] ✓ Profile moved to folder successfully using ${endpoint.method} ${endpoint.url}`)
            console.log(`[v0] Response:`, JSON.stringify(data, null, 2))
            return true
          } else {
            const errorText = await response.text()
            console.log(`[v0] Failed with ${endpoint.method} ${endpoint.url}: ${response.status} - ${errorText}`)
          }
        } catch (error: any) {
          console.log(`[v0] Error with ${endpoint.method} ${endpoint.url}:`, error.message)
        }
      }

      console.warn(`[v0] ⚠ Could not move profile to folder - tried all known endpoints`)
      return false
    } catch (error: any) {
      console.error("[v0] Failed to move profile to folder:", error.message)
      return false
    }
  }

  private async waitForProfileSync(profileId: string, maxAttempts = 15): Promise<boolean> {
    console.log(`[v0] Starting profile sync verification (max ${maxAttempts} attempts, ~30 seconds)`)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[v0] Sync check ${attempt}/${maxAttempts}...`)

        const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        })

        if (response.ok) {
          const profile = await response.json()

          // Log detailed profile information
          console.log(
            `[v0] Profile found - ID: ${profile.id}, Name: ${profile.name}, Status: ${profile.status || "unknown"}`,
          )

          if (profile.folderId) {
            console.log(`[v0] Profile assigned to folder ID: ${profile.folderId}`)
          }

          // Profile is synced if it's accessible via API
          if (profile.id === profileId) {
            // Check if profile has a ready status (if status field exists)
            if (profile.status && profile.status !== "ready") {
              console.log(`[v0] Profile found but status is "${profile.status}", waiting for "ready" status...`)
            } else {
              console.log(`[v0] ✓ Profile is synced and accessible in GoLogin cloud`)
              return true
            }
          }
        } else {
          console.log(`[v0] Profile not yet accessible (HTTP ${response.status})`)
        }

        // Wait 2 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error: any) {
        console.log(`[v0] Sync check attempt ${attempt} error: ${error.message}`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    console.warn(`[v0] ⚠ Profile sync verification timed out after ${maxAttempts} attempts`)
    console.warn(`[v0] ⚠ Profile was created but may need more time to appear in GoLogin app`)
    console.warn(`[v0] ⚠ Try refreshing the GoLogin app or waiting a few minutes`)
    return false
  }
}

export const gologinAPI = new GoLoginAPI(process.env.GOLOGIN_API_KEY || "")

export async function createProfile(options: { name: string; folderName?: string; folderId?: string }) {
  return gologinAPI.createProfile(options)
}

export async function createFolder(name: string) {
  return gologinAPI.createFolder(name)
}

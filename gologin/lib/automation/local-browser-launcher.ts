import puppeteer from "puppeteer-core"
import type { Browser, Page } from "puppeteer-core"
import type { LocalProfileConfig } from "@/lib/types"
import path from "path"
import fs from "fs"
import os from "os"

export class LocalBrowserLauncher {
  private userDataBaseDir: string

  constructor(userDataBaseDir?: string) {
    const defaultBaseDir = this.getDefaultProfilesDirectory()
    this.userDataBaseDir = userDataBaseDir || defaultBaseDir

    if (!fs.existsSync(this.userDataBaseDir)) {
      fs.mkdirSync(this.userDataBaseDir, { recursive: true })
      console.log(`[v0] Created profiles directory: ${this.userDataBaseDir}`)
    }
  }

  private getDefaultProfilesDirectory(): string {
    const platform = os.platform()
    const homeDir = os.homedir()

    switch (platform) {
      case "win32":
        return path.join(process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local"), "gologin-local-profiles")
      case "darwin":
        return path.join(homeDir, "Library", "Application Support", "gologin-local-profiles")
      default:
        return path.join(homeDir, ".local", "share", "gologin-local-profiles")
    }
  }

  getUserDataDir(profileId: string): string {
    return path.join(this.userDataBaseDir, profileId)
  }

  async launchProfile(
    profileId: string,
    profileName: string,
    config?: LocalProfileConfig,
  ): Promise<{ browser: Browser | null; page: Page | null; success: boolean; error?: string }> {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Launching LOCAL browser profile: ${profileName}`)
    console.log(`[v0] Profile ID: ${profileId}`)
    console.log(`[v0] Using basic anti-detection (no stealth plugin)`)
    console.log(`[v0] ========================================`)

    try {
      const userDataDir = config?.user_data_dir || this.getUserDataDir(profileId)

      console.log(`[v0] 📁 LOCAL PROFILE STORAGE LOCATION:`)
      console.log(`[v0] 📁 Path: ${userDataDir}`)
      console.log(`[v0] 📁 Base directory: ${this.userDataBaseDir}`)

      if (!fs.existsSync(userDataDir)) {
        console.log(`[v0] Creating new profile directory: ${userDataDir}`)
        fs.mkdirSync(userDataDir, { recursive: true })
        console.log(`[v0] ✓ Profile directory created`)
      } else {
        console.log(`[v0] ✓ Profile directory already exists`)
        try {
          const files = fs.readdirSync(userDataDir)
          console.log(`[v0] 📂 Found ${files.length} items in profile directory`)
          if (files.length > 0) {
            console.log(`[v0] 📂 Profile has existing data (session should persist)`)
            const preview = files.slice(0, 5).join(", ")
            console.log(`[v0] 📂 Sample items: ${preview}${files.length > 5 ? "..." : ""}`)
          } else {
            console.log(`[v0] 📂 Profile directory is empty (new profile)`)
          }
        } catch (err) {
          console.log(`[v0] ⚠ Could not read profile directory contents`)
        }
      }

      const args = [
        `--user-data-dir=${userDataDir}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-popup-blocking",
        "--disable-notifications",
      ]

      if (config?.window_size) {
        const { width, height, x, y } = config.window_size
        args.push(`--window-size=${width},${height}`)
        if (x !== undefined && y !== undefined) {
          args.push(`--window-position=${x},${y}`)
        }
        console.log(`[v0] 🖥️ Window size: ${width}x${height}${x !== undefined ? ` at position (${x}, ${y})` : ""}`)
      } else {
        // Default window size if not specified
        args.push(`--window-size=1366,768`)
        console.log(`[v0] 🖥️ Using default window size: 1366x768`)
      }

      if (config?.browser_args) {
        args.push(...config.browser_args)
      }

      console.log(`[v0] Step 1: Launching Chrome...`)

      const executablePath = this.findChromeExecutable()
      console.log(`[v0] Chrome executable: ${executablePath}`)

      const browser = await puppeteer.launch({
        executablePath,
        headless: false,
        args,
        defaultViewport: config?.viewport || { width: 1920, height: 1080 },
        ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=AutomationControlled"],
      })

      console.log(`[v0] ✓ Browser launched`)

      console.log(`[v0] Step 2: Getting browser page...`)
      const pages = await browser.pages()
      console.log(`[v0] Found ${pages.length} open pages`)
      const page = pages[0] || (await browser.newPage())

      const userAgent =
        config?.user_agent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

      await page.setUserAgent(userAgent)

      // Hide webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        })
      })

      console.log(`[v0] ✓ User agent and webdriver property configured`)

      console.log(`[v0] ========================================`)
      console.log(`[v0] ✓✓✓ Local profile "${profileName}" launched successfully ✓✓✓`)
      console.log(`[v0] 🛡️ Basic anti-detection enabled`)
      console.log(`[v0] ========================================`)

      return { browser, page, success: true }
    } catch (error: any) {
      console.error(`[v0] ========================================`)
      console.error(`[v0] ❌ Failed to launch local profile "${profileName}"`)
      console.error(`[v0] Error type: ${error.name}`)
      console.error(`[v0] Error message: ${error.message}`)
      console.error(`[v0] ========================================`)
      return { browser: null, page: null, success: false, error: error.message }
    }
  }

  async closeProfile(
    profileId: string,
    browser: Browser,
    profileName: string,
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[v0] Closing local profile: ${profileName} (${profileId})`)

    try {
      if (browser) {
        console.log(`[v0] Closing browser...`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await browser.close()
        console.log(`[v0] ✓ Browser closed`)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const userDataDir = this.getUserDataDir(profileId)
        if (fs.existsSync(userDataDir)) {
          try {
            const files = fs.readdirSync(userDataDir)
            console.log(`[v0] 💾 Profile data saved: ${files.length} items in directory`)
            console.log(`[v0] 💾 Profile location: ${userDataDir}`)

            const hasPreferences = files.includes("Preferences")
            const hasCookies = files.some((f) => f.includes("Cookies"))
            const hasDefault = files.includes("Default")

            if (hasPreferences || hasCookies || hasDefault) {
              console.log(`[v0] ✓ Profile contains session data (login should persist)`)
            } else {
              console.log(`[v0] ⚠ Profile may not have saved session data properly`)
            }
          } catch (err) {
            console.log(`[v0] ⚠ Could not verify profile data`)
          }
        }
      }

      console.log(`[v0] ✓✓✓ Local profile "${profileName}" closed successfully ✓✓✓`)
      return { success: true }
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to close local profile "${profileName}"`)
      console.error(`[v0] Error:`, error.message)
      return { success: false, error: error.message }
    }
  }

  private findChromeExecutable(): string {
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    ]

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        return chromePath
      }
    }

    throw new Error(
      "Chrome executable not found. Please install Google Chrome or set CHROME_PATH environment variable.",
    )
  }
}

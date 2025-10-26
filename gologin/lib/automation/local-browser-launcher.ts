import puppeteer, { type Browser, type Page } from "puppeteer-core"
import type { LocalProfileConfig } from "@/lib/types"
import path from "path"
import fs from "fs"
import os from "os"
import { spawn } from "child_process"

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

  private generateUserAgent(os?: string): string {
    const chromeVersion = "131.0.0.0"
    const webkitVersion = "537.36"

    // Normalize OS values
    const normalizedOS = os?.toLowerCase()

    if (normalizedOS === "mac" || normalizedOS === "macos") {
      // macOS user agent
      const macVersions = ["10_15_7", "11_0_0", "12_0_0", "13_0_0", "14_0_0"]
      const randomMacVersion = macVersions[Math.floor(Math.random() * macVersions.length)]
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomMacVersion}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVersion}`
    }

    if (normalizedOS === "lin" || normalizedOS === "linux") {
      // Linux user agent
      return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVersion}`
    }

    // Default to Windows user agent
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVersion}`
  }

  async launchProfile(
    profileId: string,
    profileName: string,
    config?: LocalProfileConfig,
  ): Promise<{ browser: Browser | null; page: Page | null; success: boolean; error?: string }> {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Launching LOCAL CHROME profile: ${profileName}`)
    console.log(`[v0] Profile ID: ${profileId}`)
    console.log(`[v0] Config received:`, JSON.stringify(config, null, 2))
    console.log(`[v0] Fingerprint config:`, JSON.stringify(config?.fingerprint, null, 2))
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

      let executablePath: string
      const actualBrowserType = "chrome"

      try {
        executablePath = this.findChromeExecutable()
        console.log(`[v0] chrome executable: ${executablePath}`)
      } catch (error: any) {
        throw error
      }

      const args = this.buildBrowserArgs(actualBrowserType, userDataDir, config)

      console.log(`[v0] Step 1: Launching ${actualBrowserType} with user data directory...`)
      console.log(`[v0] Launch args: ${args.slice(0, 3).join(" ")}...`)

      const browser = await puppeteer.launch({
        executablePath,
        headless: false,
        args,
        defaultViewport: config?.viewport || null,
        ignoreDefaultArgs: ["--enable-automation"],
      })

      console.log(`[v0] ✓ Browser launched`)

      browser.on("targetcreated", async (target) => {
        if (target.type() === "page") {
          try {
            const newPage = await target.page()
            if (newPage) {
              console.log(`[v0] 🆕 New tab detected, applying stealth...`)

              // Set user agent for new tab
              if (!config?.user_agent) {
                const fingerprintOS = config?.fingerprint?.os
                const generatedUserAgent = this.generateUserAgent(fingerprintOS)
                await newPage.setUserAgent(generatedUserAgent)
                console.log(`[v0] ✓ User agent set for new tab: ${fingerprintOS || "default (Windows)"}`)
              } else {
                await newPage.setUserAgent(config.user_agent)
              }

              // Apply comprehensive stealth to new tab
              await this.applyComprehensiveStealth(newPage, config)
              console.log(`[v0] ✓ Stealth applied to new tab`)
            }
          } catch (error: any) {
            console.log(`[v0] ⚠ Failed to apply stealth to new tab: ${error.message}`)
          }
        }
      })

      console.log(`[v0] Step 2: Getting browser page...`)
      const pages = await browser.pages()
      console.log(`[v0] Found ${pages.length} open pages`)
      const page = pages[0] || (await browser.newPage())

      console.log(`[v0] Applying comprehensive anti-detection measures...`)

      if (!config?.user_agent) {
        const fingerprintOS = config?.fingerprint?.os
        console.log(`[v0] Fingerprint OS value: "${fingerprintOS}"`)
        const generatedUserAgent = this.generateUserAgent(fingerprintOS)
        await page.setUserAgent(generatedUserAgent)
        console.log(`[v0] ✓ User agent set based on OS: ${fingerprintOS || "default (Windows)"}`)
        console.log(`[v0] ✓ User agent: ${generatedUserAgent}`)
      } else {
        await page.setUserAgent(config.user_agent)
        console.log(`[v0] ✓ Custom user agent set: ${config.user_agent}`)
      }

      await this.applyComprehensiveStealth(page, config)

      if (config?.proxy?.username && config?.proxy?.password) {
        await page.authenticate({
          username: config.proxy.username,
          password: config.proxy.password,
        })
        console.log(`[v0] ✓ Proxy authentication configured`)
      }

      if (config?.proxy?.server && config?.proxy?.username && config?.proxy?.password) {
        console.log(`[v0] Checking for proxy login page...`)
        try {
          // Navigate to a test page to trigger proxy authentication
          await page
            .goto("https://www.google.com", {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            })
            .catch(() => {
              console.log(`[v0] Initial navigation timed out (may be on proxy login page)`)
            })

          // Wait a bit for page to load
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Check if we're on a proxy login page
          const isProxyLoginPage = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || ""
            const title = document.title.toLowerCase()

            // Common proxy login page indicators
            const proxyIndicators = [
              "proxy authentication",
              "proxy login",
              "proxy authorization",
              "authentication required",
              "407 proxy authentication required",
              "squid",
              "access denied",
            ]

            return proxyIndicators.some((indicator) => bodyText.includes(indicator) || title.includes(indicator))
          })

          if (isProxyLoginPage) {
            console.log(`[v0] 🔐 Proxy login page detected! Attempting automatic login...`)

            // Try to find and fill username field
            const usernameSelectors = [
              'input[type="text"]',
              'input[name="username"]',
              'input[name="user"]',
              'input[name="login"]',
              'input[id="username"]',
              'input[placeholder*="username"]',
              'input[placeholder*="user"]',
            ]

            let usernameInput = null
            for (const selector of usernameSelectors) {
              usernameInput = await page.$(selector).catch(() => null)
              if (usernameInput) {
                console.log(`[v0] Found username input with selector: ${selector}`)
                break
              }
            }

            if (usernameInput) {
              await usernameInput.type(config.proxy.username, { delay: 50 })
              console.log(`[v0] ✓ Username entered`)

              // Try to find and fill password field
              const passwordSelectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[name="pass"]',
                'input[id="password"]',
              ]

              let passwordInput = null
              for (const selector of passwordSelectors) {
                passwordInput = await page.$(selector).catch(() => null)
                if (passwordInput) {
                  console.log(`[v0] Found password input with selector: ${selector}`)
                  break
                }
              }

              if (passwordInput) {
                await passwordInput.type(config.proxy.password, { delay: 50 })
                console.log(`[v0] ✓ Password entered`)

                // Try to find and click submit button
                const submitSelectors = [
                  'button[type="submit"]',
                  'input[type="submit"]',
                  'button:contains("Login")',
                  'button:contains("Submit")',
                  'button:contains("Sign in")',
                ]

                let submitButton = null
                for (const selector of submitSelectors) {
                  submitButton = await page.$(selector).catch(() => null)
                  if (submitButton) {
                    console.log(`[v0] Found submit button with selector: ${selector}`)
                    break
                  }
                }

                if (submitButton) {
                  await submitButton.click()
                  console.log(`[v0] ✓ Submit button clicked`)
                } else {
                  // If no submit button found, try pressing Enter
                  console.log(`[v0] No submit button found, pressing Enter...`)
                  await passwordInput.press("Enter")
                }

                // Wait for navigation after login
                console.log(`[v0] Waiting for proxy login to complete...`)
                await new Promise((resolve) => setTimeout(resolve, 3000))

                // Verify we're no longer on proxy login page
                const stillOnLoginPage = await page.evaluate(() => {
                  const bodyText = document.body.textContent?.toLowerCase() || ""
                  return bodyText.includes("proxy authentication") || bodyText.includes("authentication required")
                })

                if (!stillOnLoginPage) {
                  console.log(`[v0] ✓✓✓ Proxy login successful! ✓✓✓`)
                } else {
                  console.log(`[v0] ⚠ Still on proxy login page - credentials may be incorrect`)
                }
              } else {
                console.log(`[v0] ⚠ Password input not found on proxy login page`)
              }
            } else {
              console.log(`[v0] ⚠ Username input not found on proxy login page`)
            }
          } else {
            console.log(`[v0] ✓ No proxy login page detected - proxy authentication working via page.authenticate()`)
          }
        } catch (error: any) {
          console.log(`[v0] ⚠ Error during proxy login detection: ${error.message}`)
          console.log(`[v0] Continuing anyway - proxy may still work via page.authenticate()`)
        }
      }

      console.log(`[v0] ========================================`)
      console.log(`[v0] ✓✓✓ Local chrome profile "${profileName}" launched successfully ✓✓✓`)
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

  async launchManually(
    profileId: string,
    profileName: string,
    config?: LocalProfileConfig,
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Launching profile MANUALLY (no automation): ${profileName}`)
    console.log(`[v0] Profile ID: ${profileId}`)
    console.log(`[v0] ========================================`)

    try {
      const userDataDir = config?.user_data_dir || this.getUserDataDir(profileId)

      if (!fs.existsSync(userDataDir)) {
        console.log(`[v0] Creating new profile directory: ${userDataDir}`)
        fs.mkdirSync(userDataDir, { recursive: true })
      }

      let executablePath: string
      try {
        executablePath = this.findChromeExecutable()
        console.log(`[v0] Chrome executable: ${executablePath}`)
      } catch (error: any) {
        throw error
      }

      // Build args for manual launch (no automation flags)
      const args = [
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--disable-translate",
        "--disable-default-apps",
        "--disable-sync",
        "--password-store=basic",
        "--use-mock-keychain",
      ]

      // Add proxy if configured
      if (config?.proxy?.server) {
        args.push(`--proxy-server=${config.proxy.server}`)
        console.log(`[v0] 🌐 Proxy configured: ${config.proxy.server}`)
      }

      // Add window size
      if (config?.viewport) {
        args.push(`--window-size=${config.viewport.width},${config.viewport.height}`)
      } else {
        args.push(`--window-size=1920,1080`)
      }

      console.log(`[v0] Launching Chrome manually...`)
      console.log(`[v0] This browser will NOT be controlled by automation`)
      console.log(`[v0] You can use it normally without any detection`)

      // Launch Chrome as a separate process (not controlled by Puppeteer)
      const chromeProcess = spawn(executablePath, args, {
        detached: true,
        stdio: "ignore",
      })

      // Detach the process so it continues running independently
      chromeProcess.unref()

      console.log(`[v0] ✓✓✓ Chrome launched manually ✓✓✓`)
      console.log(`[v0] Browser is running independently (no automation control)`)
      console.log(`[v0] Close the browser window when you're done`)
      console.log(`[v0] ========================================`)

      return { success: true }
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to launch profile manually`)
      console.error(`[v0] Error: ${error.message}`)
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

  private findFirefoxExecutable(): string {
    const possiblePaths = [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
      process.env.LOCALAPPDATA + "\\Mozilla Firefox\\firefox.exe",
      "/Applications/Firefox.app/Contents/MacOS/firefox",
      "/usr/bin/firefox",
      "/usr/bin/firefox-esr",
      "/snap/bin/firefox",
      "/usr/local/bin/firefox",
    ]

    for (const firefoxPath of possiblePaths) {
      if (firefoxPath && fs.existsSync(firefoxPath)) {
        return firefoxPath
      }
    }

    throw new Error(
      "Firefox executable not found. Please install Mozilla Firefox or set FIREFOX_PATH environment variable.",
    )
  }

  private buildBrowserArgs(
    browserType: "chrome" | "firefox",
    userDataDir: string,
    config?: LocalProfileConfig,
  ): string[] {
    const args = [
      `--user-data-dir=${userDataDir}`,
      // Instead relying on ignoreDefaultArgs and JavaScript stealth scripts
      "--disable-features=IsolateOrigins,site-per-process,AutomationControlled",
      "--exclude-switches=enable-automation",
      "--disable-infobars",
      "--disable-session-crashed-bubble",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      "--disable-translate",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-domain-reliability",
      "--disable-component-update",
      "--disable-client-side-phishing-detection",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-dev-shm-usage",
      "--window-position=0,0",
      ...(config?.browser_args || []),
    ]

    if (config?.proxy?.server) {
      const proxyUrl = config.proxy.server
      args.push(`--proxy-server=${proxyUrl}`)

      if (config.proxy.username && config.proxy.password) {
        console.log(`[v0] 🔒 Proxy configured: ${proxyUrl} (with authentication)`)
      } else {
        console.log(`[v0] 🌐 Proxy configured: ${proxyUrl}`)
      }
    }

    if (config?.viewport) {
      args.push(`--window-size=${config.viewport.width},${config.viewport.height}`)
    } else {
      args.push(`--window-size=1920,1080`)
    }

    return args
  }

  private async applyComprehensiveStealth(page: Page, config?: LocalProfileConfig): Promise<void> {
    const fingerprint = config?.fingerprint || {}

    let platformString = "Win32"
    const normalizedOS = fingerprint.os?.toLowerCase()

    if (normalizedOS === "mac" || normalizedOS === "macos") {
      platformString = "MacIntel"
    } else if (normalizedOS === "lin" || normalizedOS === "linux") {
      platformString = "Linux x86_64"
    }

    let screenConfig = fingerprint.screen
    if (screenConfig) {
      screenConfig = {
        width: screenConfig.width || 1920,
        height: screenConfig.height || 1080,
        availWidth: screenConfig.availWidth || screenConfig.width || 1920,
        availHeight: screenConfig.availHeight || (screenConfig.height || 1080) - 40,
        colorDepth: screenConfig.colorDepth || 24,
        pixelDepth: screenConfig.pixelDepth || 24,
      }
    }

    let languagesArray = fingerprint.languages || ["en-US", "en"]
    if (fingerprint.language && !fingerprint.languages) {
      languagesArray = [fingerprint.language, fingerprint.language.split("-")[0]]
    }

    const fingerprintConfig = {
      ...fingerprint,
      hardware_concurrency: fingerprint.hardware_concurrency,
      device_memory: fingerprint.device_memory,
      screen: screenConfig,
      languages: languagesArray,
      timezone: fingerprint.timezone,
      webgl: fingerprint.webgl,
      canvas: fingerprint.canvas,
      audio: fingerprint.audio,
      webrtc: fingerprint.webrtc,
    }

    const comprehensiveStealthScript = (fp: any, platform: string) => {
      // 1. Remove webdriver property completely
      delete (navigator as any).__proto__.webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      })

      // 2. Override platform
      Object.defineProperty(navigator, "platform", {
        get: () => platform,
      })

      // 3. Fix plugins to be properly iterable
      const pluginsData = [
        {
          0: {
            type: "application/x-google-chrome-pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
            enabledPlugin: Plugin,
          },
          description: "Portable Document Format",
          filename: "internal-pdf-viewer",
          length: 1,
          name: "Chrome PDF Plugin",
        },
        {
          0: { type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
          description: "",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          length: 1,
          name: "Chrome PDF Viewer",
        },
        {
          0: {
            type: "application/x-nacl",
            suffixes: "",
            description: "Native Client Executable",
            enabledPlugin: Plugin,
          },
          1: {
            type: "application/x-pnacl",
            suffixes: "",
            description: "Portable Native Client Executable",
            enabledPlugin: Plugin,
          },
          description: "",
          filename: "internal-nacl-plugin",
          length: 2,
          name: "Native Client",
        },
      ]

      Object.defineProperty(navigator, "plugins", {
        get: () => {
          const plugins = pluginsData
          // Make it iterable
          ;(plugins as any)[Symbol.iterator] = function* () {
            for (let i = 0; i < plugins.length; i++) {
              yield plugins[i]
            }
          }
          return plugins
        },
      })

      // 4. Fix mimeTypes
      Object.defineProperty(navigator, "mimeTypes", {
        get: () => {
          const mimeTypes = [
            { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
            { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
            { type: "application/x-nacl", suffixes: "", description: "Native Client Executable" },
            { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable" },
          ]
          ;(mimeTypes as any)[Symbol.iterator] = function* () {
            for (let i = 0; i < mimeTypes.length; i++) {
              yield mimeTypes[i]
            }
          }
          return mimeTypes
        },
      })

      // 5. Hardware properties
      if (fp.hardware_concurrency) {
        Object.defineProperty(navigator, "hardwareConcurrency", {
          get: () => fp.hardware_concurrency,
        })
      }

      if (fp.device_memory) {
        Object.defineProperty(navigator, "deviceMemory", {
          get: () => fp.device_memory,
        })
      }

      // 6. Languages
      if (fp.languages && fp.languages.length > 0) {
        Object.defineProperty(navigator, "languages", {
          get: () => fp.languages,
        })
        Object.defineProperty(navigator, "language", {
          get: () => fp.languages[0],
        })
      }

      // 7. Screen properties
      if (fp.screen) {
        Object.defineProperty(screen, "width", { get: () => fp.screen.width })
        Object.defineProperty(screen, "height", { get: () => fp.screen.height })
        Object.defineProperty(screen, "availWidth", { get: () => fp.screen.availWidth })
        Object.defineProperty(screen, "availHeight", { get: () => fp.screen.availHeight })
        Object.defineProperty(screen, "colorDepth", { get: () => fp.screen.colorDepth })
        Object.defineProperty(screen, "pixelDepth", { get: () => fp.screen.pixelDepth })
      }

      // 8. Timezone
      if (fp.timezone) {
        const originalDateTimeFormat = Intl.DateTimeFormat
        Intl.DateTimeFormat = ((...args: any[]) => {
          const instance = new originalDateTimeFormat(...args)
          const originalResolvedOptions = instance.resolvedOptions.bind(instance)
          instance.resolvedOptions = () => {
            const options = originalResolvedOptions()
            options.timeZone = fp.timezone
            return options
          }
          return instance
        }) as any

        const timezoneOffsets: Record<string, number> = {
          "America/New_York": 300,
          "America/Los_Angeles": 480,
          "America/Chicago": 360,
          "Europe/London": 0,
          "Europe/Paris": -60,
          "Europe/Berlin": -60,
          "Asia/Tokyo": -540,
          "Asia/Shanghai": -480,
          "Asia/Dubai": -240,
          "Australia/Sydney": -660,
        }

        const offset = timezoneOffsets[fp.timezone] || 0
        Date.prototype.getTimezoneOffset = () => offset
      }

      // 9. Enhanced Chrome object with more properties
      if (!(window as any).chrome) {
        ;(window as any).chrome = {}
      }
      ;(window as any).chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
          RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" },
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: "chrome_update",
            INSTALL: "install",
            SHARED_MODULE_UPDATE: "shared_module_update",
            UPDATE: "update",
          },
          OnRestartRequiredReason: { APP_UPDATE: "app_update", OS_UPDATE: "os_update", PERIODIC: "periodic" },
          PlatformArch: {
            ARM: "arm",
            ARM64: "arm64",
            MIPS: "mips",
            MIPS64: "mips64",
            X86_32: "x86-32",
            X86_64: "x86-64",
          },
          PlatformNaclArch: { ARM: "arm", MIPS: "mips", MIPS64: "mips64", X86_32: "x86-32", X86_64: "x86-64" },
          PlatformOs: { ANDROID: "android", CROS: "cros", LINUX: "linux", MAC: "mac", OPENBSD: "openbsd", WIN: "win" },
          RequestUpdateCheckStatus: {
            NO_UPDATE: "no_update",
            THROTTLED: "throttled",
            UPDATE_AVAILABLE: "update_available",
          },
          connect: () => {},
          sendMessage: () => {},
          id: undefined,
        },
        csi: () => {},
        loadTimes: () => {},
      }

      // 10. Battery API
      if (!(navigator as any).getBattery) {
        ;(navigator as any).getBattery = () =>
          Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Number.POSITIVE_INFINITY,
            level: 1,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          })
      }

      // 11. Connection API
      if (!(navigator as any).connection) {
        Object.defineProperty(navigator, "connection", {
          get: () => ({
            effectiveType: "4g",
            rtt: 50,
            downlink: 10,
            saveData: false,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          }),
          configurable: true,
        })
      }

      // 12. Permissions API
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters)

      // 13. maxTouchPoints
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 0,
      })

      // 14. WebGL
      if (fp.webgl && (fp.webgl.vendor || fp.webgl.renderer)) {
        const getParameterProxyHandler = {
          apply: (target: any, ctx: any, args: any) => {
            const param = args[0]
            if (param === 37445 && fp.webgl.vendor) return fp.webgl.vendor
            if (param === 37446 && fp.webgl.renderer) return fp.webgl.renderer
            return target.apply(ctx, args)
          },
        }

        const originalGetContext = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]): any {
          const context = originalGetContext.apply(this, [type, ...args] as any)
          if (context && (type === "webgl" || type === "webgl2")) {
            const webglContext = context as any
            const originalGetParameter = webglContext.getParameter
            webglContext.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler)

            if (fp.webgl.noise) {
              const originalReadPixels = webglContext.readPixels
              webglContext.readPixels = function (...args: any[]) {
                originalReadPixels.apply(this, args as any)
                const pixels = args[6]
                if (pixels) {
                  for (let i = 0; i < pixels.length; i++) {
                    pixels[i] = pixels[i] + Math.random() * 0.1 - 0.05
                  }
                }
              }
            }
          }
          return context
        }
      }

      // 15. Canvas
      if (fp.canvas) {
        if (fp.canvas.mode === "noise" || fp.canvas.noise) {
          const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
          HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
            const context = this.getContext("2d")
            if (context) {
              const imageData = context.getImageData(0, 0, this.width, this.height)
              for (let i = 0; i < imageData.data.length; i += 4) {
                imageData.data[i] = imageData.data[i] + Math.random() * 2 - 1
                imageData.data[i + 1] = imageData.data[i + 1] + Math.random() * 2 - 1
                imageData.data[i + 2] = imageData.data[i + 2] + Math.random() * 2 - 1
              }
              context.putImageData(imageData, 0, 0)
            }
            return originalToDataURL.apply(this, args as any)
          }
        }
      }

      // 16. Audio
      if (fp.audio && fp.audio.noise) {
        const audioContext = window.AudioContext || (window as any).webkitAudioContext
        if (audioContext) {
          const originalCreateOscillator = audioContext.prototype.createOscillator
          audioContext.prototype.createOscillator = function () {
            const oscillator = originalCreateOscillator.apply(this)
            const originalStart = oscillator.start
            oscillator.start = function (...args: any[]) {
              oscillator.frequency.value = oscillator.frequency.value + Math.random() * 0.001 - 0.0005
              return originalStart.apply(this, args as any)
            }
            return oscillator
          }
        }
      }

      // 17. WebRTC
      if (fp.webrtc && fp.webrtc.mode === "disabled") {
        ;(navigator as any).getUserMedia = undefined
        ;(window as any).RTCPeerConnection = undefined
        ;(window as any).RTCSessionDescription = undefined
        ;(window as any).webkitRTCPeerConnection = undefined
      }

      // 18. Media devices
      if (fp.media_devices && fp.media_devices.enable_masking) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices
        navigator.mediaDevices.enumerateDevices = async () => {
          const videoInputs = fp.media_devices.video_inputs || 1
          const audioInputs = fp.media_devices.audio_inputs || 1
          const audioOutputs = fp.media_devices.audio_outputs || 1

          const maskedDevices = []
          for (let i = 0; i < videoInputs; i++) {
            maskedDevices.push({
              deviceId: `videoinput${i}`,
              kind: "videoinput" as MediaDeviceKind,
              label: `Camera ${i + 1}`,
              groupId: `group${i}`,
              toJSON: () => ({}),
            })
          }
          for (let i = 0; i < audioInputs; i++) {
            maskedDevices.push({
              deviceId: `audioinput${i}`,
              kind: "audioinput" as MediaDeviceKind,
              label: `Microphone ${i + 1}`,
              groupId: `group${i}`,
              toJSON: () => ({}),
            })
          }
          for (let i = 0; i < audioOutputs; i++) {
            maskedDevices.push({
              deviceId: `audiooutput${i}`,
              kind: "audiooutput" as MediaDeviceKind,
              label: `Speaker ${i + 1}`,
              groupId: `group${i}`,
              toJSON: () => ({}),
            })
          }
          return maskedDevices as MediaDeviceInfo[]
        }
      }

      // 19. Make all overrides look native
      const nativeFunctionToString = Function.prototype.toString
      const originalFunctionToString = nativeFunctionToString.bind(Function.prototype.toString)

      Function.prototype.toString = function () {
        if (this === nativeFunctionToString) {
          return originalFunctionToString()
        }
        if (
          this === window.navigator.permissions.query ||
          this === (navigator as any).getBattery ||
          this === navigator.mediaDevices.enumerateDevices
        ) {
          return "function () { [native code] }"
        }
        return nativeFunctionToString.call(this)
      }

      // 20. Hide CDP runtime
      if ((window as any).__nightmare) {
        delete (window as any).__nightmare
      }
      if ((document as any).__nightmare) {
        delete (document as any).__nightmare
      }
      if ((window as any)._phantom) {
        delete (window as any)._phantom
      }
      if ((window as any).callPhantom) {
        delete (window as any).callPhantom
      }
      if ((window as any).Buffer) {
        delete (window as any).Buffer
      }
      if ((window as any).emit) {
        delete (window as any).emit
      }
      if ((window as any).spawn) {
        delete (window as any).spawn
      }

      // 21. Fix iframe contentWindow
      const originalCreateElement = document.createElement
      document.createElement = function (tagName: string, options?: any) {
        const element = originalCreateElement.call(this, tagName, options)
        if (tagName.toLowerCase() === "iframe") {
          try {
            Object.defineProperty(element, "contentWindow", {
              get: () => {
                const iframe = originalCreateElement.call(document, "iframe") as HTMLIFrameElement
                const win = iframe.contentWindow
                if (win) {
                  Object.defineProperty(win.navigator, "webdriver", {
                    get: () => undefined,
                  })
                }
                return win
              },
            })
          } catch (e) {}
        }
        return element
      }

      console.log("[v0] ✓ Comprehensive stealth applied")
    }

    await page.evaluateOnNewDocument(comprehensiveStealthScript, fingerprintConfig, platformString)
    await page.evaluate(comprehensiveStealthScript, fingerprintConfig, platformString)

    console.log(`[v0] ✓ Comprehensive anti-detection applied`)
    console.log(`[v0] ✓ Platform: ${platformString}`)
    if (screenConfig) {
      console.log(`[v0] ✓ Screen: ${screenConfig.width}x${screenConfig.height}`)
    }
    if (fingerprint.language) {
      console.log(`[v0] ✓ Language: ${fingerprint.language}`)
    }
    if (fingerprint.timezone) {
      console.log(`[v0] ✓ Timezone: ${fingerprint.timezone}`)
    }
    if (fingerprintConfig.hardware_concurrency) {
      console.log(`[v0] ✓ CPU Cores: ${fingerprintConfig.hardware_concurrency}`)
    }
    if (fingerprintConfig.device_memory) {
      console.log(`[v0] ✓ RAM: ${fingerprintConfig.device_memory}GB`)
    }
  }
}

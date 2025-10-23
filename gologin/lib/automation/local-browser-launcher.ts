import puppeteer, { type Browser, type Page } from "puppeteer-core"
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
    console.log(`[v0] Launching LOCAL CHROME profile: ${profileName}`)
    console.log(`[v0] Profile ID: ${profileId}`)
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
        ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=AutomationControlled"],
      })

      console.log(`[v0] ✓ Browser launched`)

      console.log(`[v0] Step 2: Getting browser page...`)
      const pages = await browser.pages()
      console.log(`[v0] Found ${pages.length} open pages`)
      const page = pages[0] || (await browser.newPage())

      console.log(`[v0] Applying anti-detection measures...`)

      // Set realistic user agent if not provided
      if (!config?.user_agent) {
        const userAgent = await browser.userAgent()
        const cleanUserAgent = userAgent.replace(/HeadlessChrome/g, "Chrome")
        await page.setUserAgent(cleanUserAgent)
        console.log(`[v0] ✓ User agent cleaned`)
      } else {
        await page.setUserAgent(config.user_agent)
        console.log(`[v0] ✓ Custom user agent set`)
      }

      // Override navigator properties and add stealth scripts
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        })

        // Override plugins to look real
        Object.defineProperty(navigator, "plugins", {
          get: () => [
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
          ],
        })

        // Override languages
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en", "fr"],
        })

        // Override permissions
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters)

        // Add chrome runtime
        if (!(window as any).chrome) {
          ;(window as any).chrome = {}
        }
        ;(window as any).chrome.runtime = {
          connect: () => {},
          sendMessage: () => {},
        }

        // Override automation-related properties
        Object.defineProperty(navigator, "maxTouchPoints", {
          get: () => 1,
        })

        // Make toString() look normal
        const originalToString = Function.prototype.toString
        Function.prototype.toString = function () {
          if (this === window.navigator.permissions.query) {
            return "function query() { [native code] }"
          }
          return originalToString.call(this)
        }
      })

      console.log(`[v0] ✓ Anti-detection scripts applied`)

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

  private buildBrowserArgs(
    browserType: "chrome" | "firefox",
    userDataDir: string,
    config?: LocalProfileConfig,
  ): string[] {
    const args = [
      `--user-data-dir=${userDataDir}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process,AutomationControlled",
      "--disable-site-isolation-trials",
      "--disable-web-security",
      "--disable-features=CrossSiteDocumentBlockingIfIsolating",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-session-crashed-bubble",
      "--disable-infobars",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--enable-features=NetworkService,NetworkServiceInProcess",
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--mute-audio",
      "--no-default-browser-check",
      "--autoplay-policy=user-gesture-required",
      "--disable-background-networking",
      "--disable-breakpad",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
      "--disable-ipc-flooding-protection",
      "--disable-offer-store-unmasked-wallet-cards",
      "--disable-popup-blocking",
      "--disable-print-preview",
      "--disable-speech-api",
      "--hide-scrollbars",
      "--ignore-gpu-blocklist",
      "--mute-audio",
      "--no-pings",
      "--no-zygote",
      "--use-gl=swiftshader",
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
}

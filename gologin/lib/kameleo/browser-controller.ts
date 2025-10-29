// Browser controller for Kameleo + Puppeteer integration
import puppeteer, { type Browser, type Page } from "puppeteer"
import { kameleoAPI } from "./api"

interface BrowserConfig {
  profileId: string
  proxy?: {
    host: string
    port: number
    username?: string
    password?: string
  }
  headless?: boolean
}

interface BrowserSession {
  browser: Browser
  page: Page
  profileId: string
  webdriverUrl: string
}

export class KameleoBrowserController {
  private session: BrowserSession | null = null

  /**
   * Launch a Kameleo profile and connect Puppeteer
   */
  async launch(config: BrowserConfig): Promise<BrowserSession> {
    console.log("[v0] Launching Kameleo profile:", config.profileId)

    try {
      console.log("[v0] Enabling CDP on profile before starting...")
      await kameleoAPI.enableCdp(config.profileId)

      // Start the Kameleo profile with CDP enabled on port 9222
      const startResult = await kameleoAPI.startProfile(config.profileId, { cdpPort: 9222 })

      if (!startResult.webdriverUrl) {
        throw new Error("Failed to get WebDriver URL from Kameleo")
      }

      console.log("[v0] Kameleo profile started, WebDriver URL:", startResult.webdriverUrl)

      // Connect Puppeteer to Kameleo WebDriver
      const browser = await this.connectPuppeteer(startResult.webdriverUrl, config)

      // Get the first page
      const pages = await browser.pages()
      let page = pages[0]

      if (!page) {
        page = await browser.newPage()
      }

      // Apply anti-detection measures
      await this.applyAntiDetection(page)

      // Configure proxy if provided
      if (config.proxy) {
        await this.configureProxy(page, config.proxy)
      }

      this.session = {
        browser,
        page,
        profileId: config.profileId,
        webdriverUrl: startResult.webdriverUrl,
      }

      console.log("[v0] Browser session established successfully")
      return this.session
    } catch (error) {
      console.error("[v0] Failed to launch browser:", error)
      throw error
    }
  }

  /**
   * Connect Puppeteer to Kameleo WebDriver endpoint
   */
  private async connectPuppeteer(webdriverUrl: string, config: BrowserConfig): Promise<Browser> {
    try {
      console.log("[v0] Attempting to connect to Kameleo browser via CDP...")

      console.log("[v0] Waiting 10 seconds for browser to initialize with CDP enabled...")
      await new Promise((resolve) => setTimeout(resolve, 10000))

      const webdriverPort = new URL(webdriverUrl).port || "5050"

      const bridgeWithProfileId = `ws://localhost:${webdriverPort}/devtools/browser?profileId=${config.profileId}`
      console.log(`[v0] Trying Kameleo WebDriver bridge with profileId: ${bridgeWithProfileId}`)

      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: bridgeWithProfileId,
          defaultViewport: null,
        })
        console.log("[v0] ✓ Puppeteer connected via WebDriver bridge with profileId")
        return browser
      } catch (bridgeError: any) {
        console.log(`[v0] WebDriver bridge with profileId failed: ${bridgeError.message}`)
      }

      // Try WebDriver bridge without profileId
      const bridgeEndpoint = `ws://localhost:${webdriverPort}/devtools/browser`
      console.log(`[v0] Trying Kameleo WebDriver bridge: ${bridgeEndpoint}`)

      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: bridgeEndpoint,
          defaultViewport: null,
        })
        console.log("[v0] ✓ Puppeteer connected via WebDriver bridge")
        return browser
      } catch (bridgeError: any) {
        console.log(`[v0] WebDriver bridge failed: ${bridgeError.message}`)
        console.log("[v0] Trying direct CDP connection on port 9222...")
      }

      const cdpEndpoint = "ws://localhost:9222/devtools/browser"
      console.log(`[v0] Trying direct CDP endpoint: ${cdpEndpoint}`)

      try {
        const browser = await puppeteer.connect({
          browserWSEndpoint: cdpEndpoint,
          defaultViewport: null,
        })
        console.log("[v0] ✓ Puppeteer connected via direct CDP")
        return browser
      } catch (cdpError: any) {
        console.log(`[v0] Direct CDP failed: ${cdpError.message}`)
      }

      console.log("[v0] Trying to discover CDP endpoint via /json/version...")

      const possiblePorts = [9222, 5050, 9223, 9224, 9225]
      let lastError: Error | null = null

      for (const port of possiblePorts) {
        try {
          const debugUrl = `http://localhost:${port}/json/version`
          console.log(`[v0] Checking: ${debugUrl}`)

          const debugResponse = await fetch(debugUrl, {
            signal: AbortSignal.timeout(2000),
          })

          if (!debugResponse.ok) {
            console.log(`[v0] Port ${port} returned ${debugResponse.status}`)
            continue
          }

          const debugInfo = await debugResponse.json()
          console.log(`[v0] Debug info from port ${port}:`, JSON.stringify(debugInfo, null, 2))

          const browserWSEndpoint = debugInfo.webSocketDebuggerUrl

          if (!browserWSEndpoint) {
            console.log(`[v0] No webSocketDebuggerUrl on port ${port}`)
            continue
          }

          console.log(`[v0] Found WebSocket: ${browserWSEndpoint}`)

          const browser = await puppeteer.connect({
            browserWSEndpoint,
            defaultViewport: null,
          })

          console.log("[v0] ✓ Puppeteer connected via discovered endpoint")
          return browser
        } catch (error: any) {
          console.log(`[v0] Port ${port} failed: ${error.message}`)
          lastError = error
          continue
        }
      }

      throw new Error(
        `Failed to connect to Kameleo browser. Tried:\n` +
          `1. WebDriver bridge with profileId: ws://localhost:${webdriverPort}/devtools/browser?profileId=${config.profileId}\n` +
          `2. WebDriver bridge: ws://localhost:${webdriverPort}/devtools/browser\n` +
          `3. Direct CDP: ws://localhost:9222/devtools/browser\n` +
          `4. Discovery on ports: ${possiblePorts.join(", ")}\n` +
          `Last error: ${lastError?.message || "Unknown"}\n\n` +
          `Troubleshooting:\n` +
          `- Check if Kameleo profile is running in the Kameleo app\n` +
          `- Verify CDP is enabled in profile settings\n` +
          `- Try manually checking http://localhost:9222/json/version\n` +
          `- Check Kameleo UI → profile → "DevTools" for the correct WS URL`,
      )
    } catch (error) {
      console.error("[v0] Failed to connect Puppeteer:", error)
      throw new Error(`Failed to connect to Kameleo browser: ${error}`)
    }
  }

  /**
   * Apply anti-detection measures to the page
   */
  private async applyAntiDetection(page: Page): Promise<void> {
    try {
      // Hide WebDriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        })
      })

      // Override permissions
      await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: "denied" } as PermissionStatus)
            : originalQuery(parameters)
      })

      // Randomize viewport size slightly
      const width = 1920 + Math.floor(Math.random() * 100)
      const height = 1080 + Math.floor(Math.random() * 100)
      await page.setViewport({ width, height })

      console.log("[v0] Anti-detection measures applied")
    } catch (error) {
      console.error("[v0] Failed to apply anti-detection:", error)
      // Don't throw - continue even if anti-detection fails
    }
  }

  /**
   * Configure proxy authentication
   */
  private async configureProxy(page: Page, proxy: BrowserConfig["proxy"]): Promise<void> {
    if (!proxy) return

    try {
      if (proxy.username && proxy.password) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        })
        console.log("[v0] Proxy authentication configured")
      }
    } catch (error) {
      console.error("[v0] Failed to configure proxy:", error)
      throw error
    }
  }

  /**
   * Get the current page
   */
  getPage(): Page {
    if (!this.session) {
      throw new Error("Browser session not initialized. Call launch() first.")
    }
    return this.session.page
  }

  /**
   * Get the current browser
   */
  getBrowser(): Browser {
    if (!this.session) {
      throw new Error("Browser session not initialized. Call launch() first.")
    }
    return this.session.browser
  }

  /**
   * Close the browser and stop the Kameleo profile
   */
  async close(): Promise<void> {
    if (!this.session) {
      return
    }

    try {
      console.log("[v0] Closing browser session")

      // Close the browser
      await this.session.browser.close()

      // Stop the Kameleo profile
      await kameleoAPI.stopProfile(this.session.profileId)

      console.log("[v0] Browser session closed successfully")
      this.session = null
    } catch (error) {
      console.error("[v0] Error closing browser:", error)
      this.session = null
      throw error
    }
  }

  /**
   * Check if browser session is active
   */
  isActive(): boolean {
    return this.session !== null
  }
}

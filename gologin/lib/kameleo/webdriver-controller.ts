import { Builder, type WebDriver, By, until, Capabilities } from "selenium-webdriver"
import { KameleoAPI } from "./api"

export interface KameleoWebDriverConfig {
  profileId: string
  proxy?: {
    host: string
    port: number
    username?: string
    password?: string
  }
}

class KameleoWebDriverController {
  private driver: WebDriver | null = null
  private profileId: string
  private webdriverUrl: string | null = null
  private kameleoAPI: KameleoAPI

  constructor(config: KameleoWebDriverConfig) {
    this.profileId = config.profileId
    this.kameleoAPI = new KameleoAPI()
  }

  async launch(): Promise<WebDriver> {
    try {
      console.log("[v0] Launching Kameleo profile:", this.profileId)

      console.log("[v0] Ensuring no other profiles are running...")
      await this.kameleoAPI.stopAllProfiles()

      // Start the Kameleo profile
      console.log("[v0] Starting Kameleo profile...")
      const result = await this.kameleoAPI.startProfile(this.profileId)
      this.webdriverUrl = result.webdriverUrl

      if (!this.webdriverUrl) {
        throw new Error("Failed to get WebDriver URL from Kameleo API")
      }

      console.log("[v0] ✓ Profile started successfully")
      console.log("[v0] WebDriver URL:", this.webdriverUrl)

      console.log("[v0] Waiting 10 seconds for browser to fully initialize...")
      await new Promise((resolve) => setTimeout(resolve, 10000))

      console.log("[v0] Connecting to WebDriver endpoint with profile ID...")
      const capabilities = new Capabilities()
      capabilities.set("browserName", "chrome")
      capabilities.set("kameleo:profileId", this.profileId)

      this.driver = await new Builder().usingServer(this.webdriverUrl).withCapabilities(capabilities).build()

      console.log("[v0] ✓ WebDriver connected successfully")

      // Inject stealth scripts via CDP (before page loads)
      console.log("[v0] Injecting stealth scripts via CDP (before page loads)...")
      await this.injectStealthScriptsViaCDP()
      console.log("[v0] ✓ Stealth scripts injected via CDP")

      return this.driver
    } catch (error: any) {
      console.error("[v0] Failed to launch Kameleo browser:", error)

      // Extract meaningful error message
      let errorMessage = "Unknown error"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error.details) {
        try {
          const details = JSON.parse(error.details)
          if (details.error && details.error.global) {
            errorMessage = details.error.global.join(", ")
          } else {
            errorMessage = error.details
          }
        } catch {
          errorMessage = error.details
        }
      }

      throw new Error(`Failed to launch Kameleo browser: ${errorMessage}`)
    }
  }

  async navigateTo(url: string): Promise<void> {
    if (!this.driver) {
      throw new Error("WebDriver not initialized. Call launch() first.")
    }
    await this.driver.get(url)
  }

  async findElement(selector: string): Promise<any> {
    if (!this.driver) {
      throw new Error("WebDriver not initialized. Call launch() first.")
    }
    return await this.driver.findElement(By.css(selector))
  }

  async waitForElement(selector: string, timeout = 10000): Promise<any> {
    if (!this.driver) {
      throw new Error("WebDriver not initialized. Call launch() first.")
    }
    return await this.driver.wait(until.elementLocated(By.css(selector)), timeout)
  }

  async type(selector: string, text: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.sendKeys(text)
  }

  async click(selector: string): Promise<void> {
    const element = await this.waitForElement(selector)
    await element.click()
  }

  async getText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector)
    return await element.getText()
  }

  async executeScript(script: string, ...args: any[]): Promise<any> {
    if (!this.driver) {
      throw new Error("WebDriver not initialized. Call launch() first.")
    }
    return await this.driver.executeScript(script, ...args)
  }

  async takeScreenshot(): Promise<string> {
    if (!this.driver) {
      throw new Error("WebDriver not initialized. Call launch() first.")
    }
    return await this.driver.takeScreenshot()
  }

  async close(): Promise<void> {
    try {
      if (this.driver) {
        console.log("[v0] Closing WebDriver session...")
        await this.driver.quit()
        this.driver = null
      }

      if (this.profileId) {
        console.log("[v0] Stopping Kameleo profile...")
        try {
          await this.kameleoAPI.stopProfile(this.profileId)
          console.log("[v0] ✓ Profile stopped successfully")
        } catch (stopError: any) {
          // If profile is not running (409 error), that's fine - just log it
          if (stopError.status === 409) {
            console.log("[v0] Profile was not running (already stopped)")
          } else {
            console.error("[v0] Failed to stop Kameleo profile:", stopError.message || stopError)
          }
        }
      }
    } catch (error: any) {
      console.error("[v0] Error closing browser:", error.message || error)
    }
  }

  getDriver(): WebDriver | null {
    return this.driver
  }

  private async injectStealthScriptsViaCDP(): Promise<void> {
    if (!this.driver) return

    try {
      // Combine all stealth scripts into one
      const stealthScript = `
        // Hide navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Override chrome property to look more realistic
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };

        // Add realistic plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format", 
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
              1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ]
        });

        // Add realistic languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Hide automation in iframe
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            return window;
          }
        });
      `

      // Use CDP to inject script before any page loads
      await (this.driver as any).executeCdpCommand("Page.addScriptToEvaluateOnNewDocument", {
        source: stealthScript,
      })

      console.log("[v0] Stealth scripts registered via CDP - will run before every page load")
    } catch (error) {
      console.error("[v0] Error injecting stealth scripts via CDP:", error)
      console.log("[v0] Falling back to post-load injection...")
      // Fallback to old method if CDP fails
      await this.injectStealthScripts()
    }
  }

  private async injectStealthScripts(): Promise<void> {
    if (!this.driver) return

    try {
      // Hide navigator.webdriver
      await this.driver.executeScript(`
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      `)

      // Override chrome property to look more realistic
      await this.driver.executeScript(`
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
      `)

      // Add realistic plugins
      await this.driver.executeScript(`
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
              description: "Portable Document Format", 
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
              1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ]
        });
      `)

      // Add realistic languages
      await this.driver.executeScript(`
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
      `)

      // Override permissions
      await this.driver.executeScript(`
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      `)

      // Hide automation in iframe
      await this.driver.executeScript(`
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
            return window;
          }
        });
      `)

      console.log("[v0] Stealth scripts injected successfully")
    } catch (error) {
      console.error("[v0] Error injecting stealth scripts:", error)
      // Don't throw - continue even if stealth injection fails
    }
  }
}

export { KameleoWebDriverController }

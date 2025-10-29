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

      // Start the Kameleo profile
      console.log("[v0] Starting Kameleo profile...")
      const result = await this.kameleoAPI.startProfile(this.profileId)
      this.webdriverUrl = result.webdriverUrl

      console.log("[v0] ✓ Profile started successfully")
      console.log("[v0] WebDriver URL:", this.webdriverUrl)

      // Wait for browser to initialize
      console.log("[v0] Waiting 5 seconds for browser to initialize...")
      await new Promise((resolve) => setTimeout(resolve, 5000))

      console.log("[v0] Connecting to WebDriver endpoint with profile ID...")
      const capabilities = new Capabilities()
      capabilities.set("browserName", "chrome")
      capabilities.set("kameleo:profileId", this.profileId)

      this.driver = await new Builder().usingServer(this.webdriverUrl).withCapabilities(capabilities).build()

      console.log("[v0] ✓ WebDriver connected successfully")
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
}

export { KameleoWebDriverController }

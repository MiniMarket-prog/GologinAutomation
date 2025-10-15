import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleLogin(
  gmailAutomator: GmailAutomator,
  page: Page,
  config: { duration?: number; minDuration?: number; maxDuration?: number; waitForManualClose?: boolean } = {},
) {
  let durationSeconds: number
  if (config.duration === -1 || config.waitForManualClose) {
    // Manual close mode - wait indefinitely
    durationSeconds = -1
    console.log(`[v0] Manual close mode enabled - profile will stay open until you close it manually`)
  } else if (config.minDuration && config.maxDuration) {
    // Random duration between min and max
    durationSeconds = Math.floor(Math.random() * (config.maxDuration - config.minDuration + 1)) + config.minDuration
    console.log(`[v0] Using random duration: ${durationSeconds}s (range: ${config.minDuration}-${config.maxDuration}s)`)
  } else {
    // Fixed duration or default to 10 seconds
    durationSeconds = config.duration || 10
  }

  if (durationSeconds !== -1) {
    console.log(`[v0] Opening Gmail and keeping profile open for ${durationSeconds} seconds...`)
  }

  try {
    const browser = page.browser()
    const pages = await browser.pages()
    console.log(`[v0] Found ${pages.length} open tab(s)`)

    console.log(`[v0] Opening Gmail in a new tab...`)
    const gmailPage = await browser.newPage()
    console.log(`[v0] ✓ New tab created for Gmail`)

    console.log("[v0] Navigating to Gmail inbox...")
    await gmailPage.goto("https://mail.google.com/mail/u/0/#inbox", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Check if we got redirected to workspace.google.com (marketing page)
    const currentUrl = gmailPage.url()
    console.log(`[v0] Current URL after navigation: ${currentUrl}`)

    if (currentUrl.includes("workspace.google.com")) {
      console.log("[v0] ⚠️ Detected redirect to workspace.google.com marketing page")
      console.log("[v0] Navigating to Gmail login page instead...")

      await gmailPage.goto("https://accounts.google.com/signin/v2/identifier?service=mail", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })

      await new Promise((resolve) => setTimeout(resolve, 3000))
      console.log(`[v0] New URL: ${gmailPage.url()}`)
    }

    console.log("[v0] Checking if logged into Gmail...")
    const isLoggedIn = await gmailPage.evaluate(() => {
      const hasComposeButton = !!document.querySelector('[gh="cm"]')
      const hasInboxLabel =
        !!document.querySelector('[aria-label*="Inbox"]') || !!document.querySelector('[title*="Inbox"]')
      const hasGmailLogo = !!document.querySelector('img[alt*="Gmail"]')
      const hasLoginForm =
        !!document.querySelector('input[type="email"]') || !!document.querySelector('input[type="password"]')

      return (hasComposeButton || hasInboxLabel) && !hasLoginForm
    })

    if (!isLoggedIn) {
      console.log(`[v0] ⚠️ User is not logged in to Gmail`)
    } else {
      console.log(`[v0] ✓ User is logged in to Gmail`)
    }

    if (durationSeconds === -1) {
      console.log(`[v0] Profile is now open. Close the browser window manually to continue to the next profile.`)

      // Wait for the browser to be disconnected (user closes it manually)
      return new Promise((resolve) => {
        const browser = page.browser()

        browser.on("disconnected", () => {
          console.log(`[v0] ✓ Browser closed manually by user`)
          resolve({
            success: true,
            message: `Profile closed manually by user`,
            duration: -1,
            loggedIn: isLoggedIn,
            manualClose: true,
          })
        })

        // Also listen for page close
        gmailPage.on("close", () => {
          console.log(`[v0] ✓ Page closed`)
          resolve({
            success: true,
            message: `Profile closed manually by user`,
            duration: -1,
            loggedIn: isLoggedIn,
            manualClose: true,
          })
        })
      })
    }

    // Normal timed mode
    console.log(`[v0] Waiting for ${durationSeconds} seconds before closing...`)
    await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000))
    console.log(`[v0] ✓ Duration completed`)

    return {
      success: true,
      message: `Profile kept open for ${durationSeconds} seconds`,
      duration: durationSeconds,
      loggedIn: isLoggedIn,
    }
  } catch (error: any) {
    console.error("[v0] ❌ Login task failed")
    console.error("[v0] Error:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

import type { GmailAutomator } from "../gmail-automator"

export interface GmailStatusResult {
  success: boolean
  status: "ok" | "blocked" | "password_required" | "verification_required" | "error" | "unknown"
  message: string
  details?: {
    hasInbox?: boolean
    hasComposeButton?: boolean
    hasLoginForm?: boolean
    errorText?: string
    url?: string
  }
}

export async function handleCheckGmail(
  gmailAutomator: GmailAutomator,
  config: Record<string, any>,
): Promise<GmailStatusResult> {
  console.log("[v0] Starting Gmail account status check...")

  try {
    const page = (gmailAutomator as any).page
    const browser = page.browser()

    console.log("[v0] Opening new tab for Gmail check...")
    const newPage = await browser.newPage()

    try {
      console.log("[v0] Navigating to Gmail...")
      await newPage.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })

      // Wait for page to stabilize
      await new Promise((resolve) => setTimeout(resolve, 3000))

      console.log("[v0] Analyzing Gmail page state...")
      const pageState = await newPage.evaluate(() => {
        const url = window.location.href
        const title = document.title

        // Check for Gmail UI elements
        const hasComposeButton = !!document.querySelector('[gh="cm"]')
        const hasInboxLabel =
          !!document.querySelector('[aria-label*="Inbox"]') ||
          !!document.querySelector('[title*="Inbox"]') ||
          !!document.querySelector('[aria-label*="Boîte de réception"]') // French
        const hasGmailLogo = !!document.querySelector('img[alt*="Gmail"]')
        const hasEmailRows = document.querySelectorAll("tr.zA").length > 0

        // Check for login/auth forms
        const hasEmailInput = !!document.querySelector('input[type="email"]')
        const hasPasswordInput = !!document.querySelector('input[type="password"]')
        const hasLoginForm = hasEmailInput || hasPasswordInput

        // Check for error messages
        const errorSelectors = [
          '[jsname="B34EJ"]', // Google error message container
          ".dEOOab", // Error text
          '[role="alert"]',
          ".error-msg",
        ]

        let errorText = ""
        for (const selector of errorSelectors) {
          const errorElement = document.querySelector(selector)
          if (errorElement && errorElement.textContent) {
            errorText = errorElement.textContent.trim()
            break
          }
        }

        // Check for specific error/warning indicators
        const hasBlockedMessage =
          document.body.textContent?.includes("blocked") ||
          document.body.textContent?.includes("suspended") ||
          document.body.textContent?.includes("disabled") ||
          document.body.textContent?.includes("bloqué") || // French
          document.body.textContent?.includes("suspendu") || // French
          false

        const hasVerificationMessage =
          document.body.textContent?.includes("verify") ||
          document.body.textContent?.includes("verification") ||
          document.body.textContent?.includes("vérif") || // French
          document.body.textContent?.includes("unusual activity") ||
          document.body.textContent?.includes("activité inhabituelle") || // French
          false

        const hasPasswordMessage =
          document.body.textContent?.includes("password") ||
          document.body.textContent?.includes("mot de passe") || // French
          document.body.textContent?.includes("sign in") ||
          document.body.textContent?.includes("connexion") || // French
          false

        // Check for 2FA/verification prompts
        const has2FAPrompt =
          !!document.querySelector("[data-challengetype]") ||
          !!document.querySelector('[id*="challenge"]') ||
          !!document.querySelector('[name="totpPin"]')

        return {
          url,
          title,
          hasComposeButton,
          hasInboxLabel,
          hasGmailLogo,
          hasEmailRows,
          hasLoginForm,
          hasEmailInput,
          hasPasswordInput,
          errorText,
          hasBlockedMessage,
          hasVerificationMessage,
          hasPasswordMessage,
          has2FAPrompt,
          bodyTextSample: document.body.textContent?.substring(0, 500) || "",
        }
      })

      console.log("[v0] Page state analysis:", JSON.stringify(pageState, null, 2))

      // Determine account status based on page state
      let status: GmailStatusResult["status"] = "unknown"
      let message = ""

      // First, check for positive indicators (account is working)
      const hasWorkingGmailUI =
        (pageState.hasComposeButton || pageState.hasInboxLabel || pageState.hasEmailRows) && !pageState.hasLoginForm

      if (hasWorkingGmailUI) {
        // Account is working - Gmail UI is loaded and no login form
        status = "ok"
        message = "Gmail account is working normally"
      } else if (pageState.hasLoginForm || (pageState.hasPasswordMessage && !hasWorkingGmailUI)) {
        // Login form is present or password required
        status = "password_required"
        message = "Account requires login or password"
      } else if (pageState.has2FAPrompt) {
        // 2FA prompt is present
        status = "verification_required"
        message = "Account requires verification or 2FA"
      } else if (pageState.hasVerificationMessage && !hasWorkingGmailUI) {
        // Verification message without working UI
        status = "verification_required"
        message = "Account requires verification"
      } else if (pageState.hasBlockedMessage && !hasWorkingGmailUI) {
        // Blocked message without working UI
        status = "blocked"
        message = "Gmail account is blocked or suspended"
      } else if (pageState.errorText) {
        // Generic error
        status = "error"
        message = `Error: ${pageState.errorText}`
      } else {
        // Cannot determine status
        status = "unknown"
        message = "Unable to determine account status"
      }

      console.log(`[v0] ✓ Gmail status check complete: ${status}`)

      // Close the new tab
      await newPage.close()

      return {
        success: true,
        status,
        message,
        details: {
          hasInbox: pageState.hasInboxLabel || pageState.hasEmailRows,
          hasComposeButton: pageState.hasComposeButton,
          hasLoginForm: pageState.hasLoginForm,
          errorText: pageState.errorText || undefined,
          url: pageState.url,
        },
      }
    } catch (error: any) {
      // Make sure to close the new tab even if there's an error
      try {
        await newPage.close()
      } catch (closeError) {
        console.log("[v0] Could not close new tab:", closeError)
      }
      throw error
    }
  } catch (error: any) {
    console.error("[v0] ❌ Gmail status check failed")
    console.error("[v0] Error:", error.message)

    return {
      success: false,
      status: "error",
      message: `Failed to check Gmail status: ${error.message}`,
    }
  }
}

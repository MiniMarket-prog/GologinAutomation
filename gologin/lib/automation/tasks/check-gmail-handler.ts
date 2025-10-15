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
    loginAttempted?: boolean
    loginSuccess?: boolean
  }
}

export async function handleCheckGmail(
  gmailAutomator: GmailAutomator,
  config: Record<string, any>,
): Promise<GmailStatusResult> {
  console.log("[v0] Starting Gmail account status check...")

  const email = config?.email
  const password = config?.password
  const recoveryEmail = config?.recoveryEmail || config?.recovery_email || config?.recovery // Support all key variations
  const shouldAttemptLogin = email && password

  if (shouldAttemptLogin) {
    console.log(`[v0] Gmail credentials provided, will attempt auto-login for: ${email}`)
    if (recoveryEmail) {
      console.log(`[v0] Recovery email available: ${recoveryEmail}`)
    }
  } else {
    console.log("[v0] No Gmail credentials provided, will only check current status")
  }

  try {
    const page = (gmailAutomator as any).page
    const browser = page.browser()

    console.log("[v0] Checking for existing tabs...")
    const existingPages = await browser.pages()
    console.log(`[v0] Found ${existingPages.length} existing tabs`)

    console.log("[v0] Opening Gmail in a new tab...")
    const gmailPage = await browser.newPage()
    console.log(`[v0] ✓ New tab created for Gmail check`)

    try {
      console.log("[v0] Navigating to Gmail...")
      await gmailPage.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })

      await new Promise((resolve) => setTimeout(resolve, 3000))

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

      console.log("[v0] Analyzing initial Gmail page state...")
      const initialPageState = await gmailPage.evaluate(() => {
        const hasLoginForm =
          !!document.querySelector('input[type="email"]') || !!document.querySelector('input[type="password"]')
        const hasGmailUI =
          !!document.querySelector('[gh="cm"]') ||
          !!document.querySelector('[aria-label*="Inbox"]') ||
          document.querySelectorAll("tr.zA").length > 0
        const hasReauthChallenge =
          document.body.textContent?.includes("Confirmez qu'il s'agit bien de vous") ||
          document.body.textContent?.includes("Confirm it's you") ||
          document.body.textContent?.includes("Veuillez vous reconnecter") ||
          document.body.textContent?.includes("Please sign in again") ||
          false

        return {
          hasLoginForm,
          hasGmailUI,
          hasReauthChallenge,
          url: window.location.href,
        }
      })

      console.log("[v0] Initial state:", JSON.stringify(initialPageState, null, 2))

      let loginAttempted = false
      let loginSuccess = false

      if ((initialPageState.hasLoginForm || initialPageState.hasReauthChallenge) && shouldAttemptLogin) {
        if (initialPageState.hasReauthChallenge) {
          console.log("[v0] Re-authentication challenge detected, attempting to handle...")
        } else {
          console.log("[v0] Login form detected, attempting to sign in...")
        }
        loginAttempted = true

        try {
          const { GmailAutomator } = await import("../gmail-automator")

          const defaultBehavior = {
            typing_speed: { min: 100, max: 300 },
            action_delay: { min: 500, max: 2000 },
            mouse_movement: { enabled: true, speed: "medium" },
            scroll_behavior: { enabled: true, pause_probability: 0.3 },
            random_pauses: {
              enabled: true,
              probability: 0.2,
              duration: { min: 1000, max: 3000 },
            },
          }

          const tempAutomator = new GmailAutomator(gmailPage, defaultBehavior)

          const loginResult = await tempAutomator.login(email!, password!, recoveryEmail, 5000)

          if (loginResult.success) {
            console.log("[v0] ✓ Login successful!")
            loginSuccess = true
          } else {
            console.log(`[v0] ⚠️ Login failed: ${loginResult.error}`)
            loginSuccess = false
          }
        } catch (loginError: any) {
          console.error("[v0] ❌ Login attempt failed:", loginError.message)
          loginSuccess = false
        }
      }

      console.log("[v0] Analyzing final Gmail page state...")
      const pageState = await gmailPage.evaluate(() => {
        const url = window.location.href
        const title = document.title

        const hasComposeButton = !!document.querySelector('[gh="cm"]')
        const hasInboxLabel =
          !!document.querySelector('[aria-label*="Inbox"]') ||
          !!document.querySelector('[title*="Inbox"]') ||
          !!document.querySelector('[aria-label*="Boîte de réception"]')
        const hasGmailLogo = !!document.querySelector('img[alt*="Gmail"]')
        const hasEmailRows = document.querySelectorAll("tr.zA").length > 0

        const hasEmailInput = !!document.querySelector('input[type="email"]')
        const hasPasswordInput = !!document.querySelector('input[type="password"]')
        const hasLoginForm = hasEmailInput || hasPasswordInput

        const errorSelectors = ['[jsname="B34EJ"]', ".dEOOab", '[role="alert"]', ".error-msg"]

        let errorText = ""
        for (const selector of errorSelectors) {
          const errorElement = document.querySelector(selector)
          if (errorElement && errorElement.textContent) {
            errorText = errorElement.textContent.trim()
            break
          }
        }

        const bodyText = document.body.textContent || ""
        const hasReauthMessage =
          bodyText.includes("Confirmez qu'il s'agit bien de vous") ||
          bodyText.includes("Confirm it's you") ||
          bodyText.includes("Veuillez vous reconnecter") ||
          bodyText.includes("Please sign in again")

        const hasBlockedMessage =
          !hasReauthMessage && // Don't classify re-auth as blocked
          (bodyText.includes("account has been disabled") ||
            bodyText.includes("account has been suspended") ||
            bodyText.includes("compte a été désactivé") ||
            bodyText.includes("compte a été suspendu") ||
            bodyText.includes("This account is disabled") ||
            bodyText.includes("Ce compte est désactivé") ||
            false)

        const hasVerificationMessage =
          bodyText.includes("verify") ||
          bodyText.includes("verification") ||
          bodyText.includes("vérif") ||
          bodyText.includes("unusual activity") ||
          bodyText.includes("activité inhabituelle") ||
          false

        const hasPasswordMessage =
          bodyText.includes("password") ||
          bodyText.includes("mot de passe") ||
          bodyText.includes("sign in") ||
          bodyText.includes("connexion") ||
          false

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

      console.log("[v0] Final page state analysis:", JSON.stringify(pageState, null, 2))

      let status: GmailStatusResult["status"] = "unknown"
      let message = ""

      const hasWorkingGmailUI =
        (pageState.hasComposeButton || pageState.hasInboxLabel || pageState.hasEmailRows) && !pageState.hasLoginForm

      if (hasWorkingGmailUI) {
        status = "ok"
        message = loginAttempted
          ? "Successfully logged in to Gmail"
          : "Gmail account is working normally (already logged in)"
      } else if (pageState.hasLoginForm || (pageState.hasPasswordMessage && !hasWorkingGmailUI)) {
        status = "password_required"
        message = loginAttempted
          ? "Login failed - incorrect password or additional verification required"
          : "Account requires login or password"
      } else if (pageState.has2FAPrompt) {
        status = "verification_required"
        message = "Account requires verification or 2FA"
      } else if (pageState.hasVerificationMessage && !hasWorkingGmailUI) {
        status = "verification_required"
        message = "Account requires verification"
      } else if (pageState.hasBlockedMessage && !hasWorkingGmailUI) {
        status = "blocked"
        message = "Gmail account is blocked or suspended"
      } else if (pageState.errorText) {
        status = "error"
        message = `Error: ${pageState.errorText}`
      } else {
        status = "unknown"
        message = "Unable to determine account status"
      }

      console.log(`[v0] ✓ Gmail status check complete: ${status}`)
      if (loginAttempted) {
        console.log(`[v0] Login attempt result: ${loginSuccess ? "SUCCESS" : "FAILED"}`)
      }

      console.log("[v0] Closing Gmail tab...")
      await gmailPage.close()
      console.log("[v0] ✓ Gmail tab closed")

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
          loginAttempted,
          loginSuccess,
        },
      }
    } catch (error: any) {
      try {
        await gmailPage.close()
      } catch (e) {
        // Ignore close errors
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

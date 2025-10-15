import type { GmailAutomator } from "../gmail-automator"

export interface GmailSetupResult {
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

export async function handleSetupGmail(
  gmailAutomator: GmailAutomator,
  config: Record<string, any>,
): Promise<GmailSetupResult> {
  console.log("[v0] Starting Gmail account setup...")

  const email = config?.email
  const password = config?.password
  const recoveryEmail = config?.recoveryEmail || config?.recovery // Support both keys for backward compatibility
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
    const pages = await browser.pages()
    console.log(`[v0] Found ${pages.length} open tab(s)`)

    console.log(`[v0] Opening Gmail in a new tab...`)
    const gmailPage = await browser.newPage()
    console.log(`[v0] ✓ New tab created for Gmail setup`)

    console.log("[v0] Navigating to Gmail...")
    await gmailPage.goto("https://mail.google.com/mail/u/0/#inbox", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    // Wait for page to stabilize
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

    console.log("[v0] Analyzing initial Gmail page state...")
    const initialPageState = await gmailPage.evaluate(() => {
      const hasLoginForm =
        !!document.querySelector('input[type="email"]') || !!document.querySelector('input[type="password"]')
      const hasGmailUI =
        !!document.querySelector('[gh="cm"]') ||
        !!document.querySelector('[aria-label*="Inbox"]') ||
        document.querySelectorAll("tr.zA").length > 0

      return {
        hasLoginForm,
        hasGmailUI,
        url: window.location.href,
      }
    })

    console.log("[v0] Initial state:", JSON.stringify(initialPageState, null, 2))

    let loginAttempted = false
    let loginSuccess = false

    if (initialPageState.hasLoginForm && shouldAttemptLogin) {
      console.log("[v0] Login form detected, attempting to sign in...")
      loginAttempted = true

      try {
        const loginResult = await gmailAutomator.login(email!, password!, recoveryEmail, 45000)

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

      // Check for Gmail UI elements
      const hasComposeButton = !!document.querySelector('[gh="cm"]')
      const hasInboxLabel =
        !!document.querySelector('[aria-label*="Inbox"]') ||
        !!document.querySelector('[title*="Inbox"]') ||
        !!document.querySelector('[aria-label*="Boîte de réception"]') ||
        !!document.querySelector('[aria-label*="صندوق الوارد"]') // Arabic
      const hasGmailLogo = !!document.querySelector('img[alt*="Gmail"]')
      const hasEmailRows = document.querySelectorAll("tr.zA").length > 0

      // Check for login/auth forms
      const hasEmailInput = !!document.querySelector('input[type="email"]')
      const hasPasswordInput = !!document.querySelector('input[type="password"]')
      const hasLoginForm = hasEmailInput || hasPasswordInput

      // Enhanced error message detection
      const errorSelectors = [
        '[jsname="B34EJ"]',
        ".dEOOab",
        '[role="alert"]',
        ".error-msg",
        "[data-error]",
        ".Ekjuhf", // Google error container
      ]

      let errorText = ""
      for (const selector of errorSelectors) {
        const errorElement = document.querySelector(selector)
        if (errorElement && errorElement.textContent) {
          errorText = errorElement.textContent.trim()
          break
        }
      }

      // Check for specific error messages in multiple languages
      const bodyText = document.body.textContent?.toLowerCase() || ""

      // Wrong password indicators
      const hasWrongPasswordMessage =
        bodyText.includes("wrong password") ||
        bodyText.includes("incorrect password") ||
        bodyText.includes("mot de passe incorrect") || // French
        bodyText.includes("كلمة مرور خاطئة") || // Arabic
        bodyText.includes("couldn't sign you in") ||
        bodyText.includes("couldn't find your google account")

      // Account blocked/suspended indicators
      const hasBlockedMessage =
        bodyText.includes("blocked") ||
        bodyText.includes("suspended") ||
        bodyText.includes("disabled") ||
        bodyText.includes("bloqué") || // French
        bodyText.includes("suspendu") || // French
        bodyText.includes("محظور") || // Arabic
        bodyText.includes("معطل") // Arabic

      // Verification/2FA indicators
      const hasVerificationMessage =
        bodyText.includes("verify") ||
        bodyText.includes("verification") ||
        bodyText.includes("vérif") || // French
        bodyText.includes("unusual activity") ||
        bodyText.includes("activité inhabituelle") || // French
        bodyText.includes("التحقق") || // Arabic
        bodyText.includes("نشاط غير عادي") // Arabic

      // Password change required
      const hasPasswordChangeMessage =
        bodyText.includes("password was changed") ||
        bodyText.includes("mot de passe a été modifié") || // French
        bodyText.includes("تم تغيير كلمة المرور") // Arabic

      // Too many attempts
      const hasTooManyAttemptsMessage =
        bodyText.includes("too many attempts") ||
        bodyText.includes("try again later") ||
        bodyText.includes("trop de tentatives") || // French
        bodyText.includes("محاولات كثيرة جداً") // Arabic

      const has2FAPrompt =
        !!document.querySelector("[data-challengetype]") ||
        !!document.querySelector('[id*="challenge"]') ||
        !!document.querySelector('[name="totpPin"]')

      const isRejectedPage = url.includes("/signin/rejected") || url.includes("/signin/challenge")

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
        isRejectedPage,
        hasWrongPasswordMessage,
        hasBlockedMessage,
        hasVerificationMessage,
        hasPasswordChangeMessage,
        hasTooManyAttemptsMessage,
        has2FAPrompt,
      }
    })

    console.log("[v0] Final page state analysis:", JSON.stringify(pageState, null, 2))

    let status: GmailSetupResult["status"] = "unknown"
    let message = ""

    const hasWorkingGmailUI =
      (pageState.hasComposeButton || pageState.hasInboxLabel || pageState.hasEmailRows) && !pageState.hasLoginForm

    if (hasWorkingGmailUI) {
      status = "ok"
      message = loginAttempted
        ? "Successfully logged in to Gmail and account is working"
        : "Gmail account is working normally (already logged in)"
    } else if (pageState.isRejectedPage) {
      status = "blocked"
      message = "Google rejected the login attempt - Account may be flagged or requires additional verification"
    } else if (pageState.hasWrongPasswordMessage) {
      status = "password_required"
      message = "Login failed - Wrong password or email address"
    } else if (pageState.hasPasswordChangeMessage) {
      status = "password_required"
      message = "Login failed - Password was recently changed, please wait and try again"
    } else if (pageState.hasTooManyAttemptsMessage) {
      status = "blocked"
      message = "Too many login attempts - Account temporarily locked, please try again later"
    } else if (pageState.hasBlockedMessage) {
      status = "blocked"
      message = "Gmail account is blocked, suspended, or disabled"
    } else if (pageState.has2FAPrompt) {
      status = "verification_required"
      message = "Account requires 2-Factor Authentication (2FA) verification"
    } else if (pageState.hasVerificationMessage) {
      status = "verification_required"
      message = "Account requires verification due to unusual activity"
    } else if (pageState.hasLoginForm) {
      status = "password_required"
      message = loginAttempted
        ? "Login failed - Please check credentials or account may require additional verification"
        : "Account requires login credentials"
    } else if (pageState.errorText) {
      status = "error"
      message = `Gmail error: ${pageState.errorText}`
    } else {
      status = "unknown"
      message = "Unable to determine Gmail account status"
    }

    console.log(`[v0] ✓ Gmail setup complete: ${status}`)
    console.log(`[v0] Message: ${message}`)
    if (loginAttempted) {
      console.log(`[v0] Login attempt result: ${loginSuccess ? "SUCCESS" : "FAILED"}`)
    }

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
    console.error("[v0] ❌ Gmail setup failed")
    console.error("[v0] Error:", error.message)

    return {
      success: false,
      status: "error",
      message: `Failed to setup Gmail: ${error.message}`,
    }
  }
}

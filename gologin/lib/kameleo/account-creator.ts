// Main orchestrator for Gmail account creation with Kameleo
import { KameleoWebDriverController } from "./webdriver-controller"
import { GmailAutomationWebDriver } from "./gmail-automation-webdriver"
import { VerificationHandler } from "./verification-handler"
import { generateAccountData } from "./account-data-generator"
import { getSupabaseAdminClient } from "../supabase/admin"

interface CreateAccountOptions {
  taskId: string
  profileId: string
  profileType: "empty" | "with_gmail"
  country: string
  recoveryEmails?: string[]
  proxy?: {
    host: string
    port: number
    username?: string
    password?: string
  }
  autoRetryWithNewProfile?: boolean
}

interface CreateAccountResult {
  success: boolean
  email?: string
  password?: string
  phone?: string
  error?: string
}

export class KameleoAccountCreator {
  private webDriverController: KameleoWebDriverController
  private verificationHandler: VerificationHandler

  constructor() {
    this.webDriverController = new KameleoWebDriverController({
      profileId: "", // Will be set in createAccount
    })
    const fiveSimApiKey = process.env.FIVESIM_API_KEY
    if (!fiveSimApiKey) {
      throw new Error("FIVESIM_API_KEY environment variable is required")
    }
    this.verificationHandler = new VerificationHandler(fiveSimApiKey)
  }

  /**
   * Create a Gmail account
   */
  async createAccount(options: CreateAccountOptions): Promise<CreateAccountResult> {
    const supabase = getSupabaseAdminClient()
    let orderId: string | null = null
    let currentProfileId = options.profileId

    try {
      console.log("[v0] Starting account creation for task:", options.taskId)

      // Update task status to processing
      await (supabase as any)
        .from("kameleo_account_tasks")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", options.taskId)

      // Generate account data
      const accountData = generateAccountData(options.recoveryEmails)
      console.log("[v0] Generated account data:", accountData.email)

      let driver
      let launchAttempts = 0
      const maxLaunchAttempts = options.autoRetryWithNewProfile ? 3 : 1

      while (launchAttempts < maxLaunchAttempts) {
        try {
          console.log("[v0] Launching Kameleo browser (attempt", launchAttempts + 1, "of", maxLaunchAttempts, ")")
          this.webDriverController = new KameleoWebDriverController({
            profileId: currentProfileId,
            proxy: options.proxy,
          })
          driver = await this.webDriverController.launch()
          console.log("[v0] ✓ Browser launched successfully")
          break
        } catch (launchError: any) {
          launchAttempts++
          console.error(`[v0] Launch attempt ${launchAttempts} failed:`, launchError.message)

          // Check if it's a profile launch failure (503 error)
          const isProfileLaunchFailure =
            launchError.message?.includes("503") ||
            launchError.message?.includes("Failed to launch browser") ||
            launchError.message?.includes("Failed to start profile")

          if (isProfileLaunchFailure && launchAttempts < maxLaunchAttempts && options.autoRetryWithNewProfile) {
            console.log("[v0] Profile launch failed. Creating new profile and retrying...")

            // Import KameleoAPI to create a new profile
            const { KameleoAPI } = await import("./api")
            const kameleoAPI = new KameleoAPI()

            try {
              // Create a new profile with the same settings
              const newProfile = await kameleoAPI.createProfile({
                name: `Auto-retry-${Date.now()}`,
                baseProfileId: "d6d0e92e-e9e0-4c9e-a9e0-e9e0e9e0e9e0", // Default Chrome base profile
              })

              currentProfileId = newProfile.id
              console.log("[v0] ✓ Created new profile:", currentProfileId)

              // Update task with new profile ID
              await (supabase as any)
                .from("kameleo_account_tasks")
                .update({
                  profile_id: currentProfileId,
                })
                .eq("id", options.taskId)

              console.log("[v0] Retrying with new profile...")
              continue
            } catch (createError: any) {
              console.error("[v0] Failed to create new profile:", createError.message)
              throw launchError // Throw original error if we can't create a new profile
            }
          } else {
            // Not a profile failure or out of retries
            throw launchError
          }
        }
      }

      if (!driver) {
        throw new Error("Failed to launch browser after all retry attempts")
      }

      const gmailAutomation = new GmailAutomationWebDriver(driver)

      // Navigate to Gmail signup
      await gmailAutomation.navigateToSignup()

      // Check for bot detection
      const botCheck = await gmailAutomation.checkForBotDetection()
      if (botCheck.detected) {
        throw new Error(`Bot detection: ${botCheck.type}`)
      }

      // Fill name and email
      await gmailAutomation.fillNameAndEmail(accountData)

      // Fill birth date and gender
      await gmailAutomation.fillBirthDateAndGender(accountData.birthDate)

      // Choose email
      await gmailAutomation.chooseEmail(accountData.email)

      // Fill password
      await gmailAutomation.fillPassword(accountData.password)

      // Get phone number for verification
      console.log("[v0] Getting phone number for verification")
      const { phone, orderId: newOrderId } = await this.verificationHandler.getPhoneNumber(options.country)
      orderId = newOrderId

      // Fill phone number
      await gmailAutomation.fillPhoneNumber(phone)

      // Wait for and enter verification code
      console.log("[v0] Waiting for verification code")
      const verificationCode = await this.verificationHandler.getVerificationCode(orderId)
      await gmailAutomation.enterVerificationCode(verificationCode)

      // Add recovery email if provided
      if (accountData.recoveryEmail) {
        await gmailAutomation.addRecoveryEmail(accountData.recoveryEmail)
      }

      // Accept terms
      await gmailAutomation.acceptTerms()

      // Check if account was created successfully
      const isCreated = await gmailAutomation.isAccountCreated()

      if (!isCreated) {
        throw new Error("Account creation verification failed")
      }

      console.log("[v0] Account created successfully:", accountData.email)

      // Mark order as finished
      if (orderId) {
        await this.verificationHandler.finishOrder(orderId)
      }
      // Update task as completed
      await (supabase as any)
        .from("kameleo_account_tasks")
        .update({
          status: "completed",
          email: accountData.email,
          password: accountData.password,
          first_name: accountData.firstName,
          last_name: accountData.lastName,
          birth_date: `${accountData.birthDate.month} ${accountData.birthDate.day}, ${accountData.birthDate.year}`,
          phone: phone,
          recovery_email: accountData.recoveryEmail,
          completed_at: new Date().toISOString(),
        })
        .eq("id", options.taskId)

      await this.webDriverController.close()

      return {
        success: true,
        email: accountData.email,
        password: accountData.password,
        phone: phone,
      }
    } catch (error: any) {
      console.error("[v0] Account creation failed:", error)

      let errorMessage = "Unknown error"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error.details) {
        try {
          const details = JSON.parse(error.details)
          if (details.error) {
            if (details.error.global) {
              errorMessage = details.error.global.join(", ")
            } else {
              errorMessage = JSON.stringify(details.error)
            }
          } else {
            errorMessage = error.details
          }
        } catch {
          errorMessage = error.details
        }
      } else if (error.code) {
        errorMessage = `Error ${error.code}: ${error.status || "Unknown status"}`
      }

      console.error("[v0] Extracted error message:", errorMessage)

      // Cancel phone order if exists
      if (orderId) {
        try {
          await this.verificationHandler.cancelOrder(orderId)
        } catch (cancelError) {
          console.error("[v0] Failed to cancel phone order:", cancelError)
        }
      }

      // Update task as failed
      const { data: currentTask } = await supabase
        .from("kameleo_account_tasks")
        .select("retry_count")
        .eq("id", options.taskId)
        .single()

      const retryCount = (currentTask as any)?.retry_count || 0
      await (supabase as any)
        .from("kameleo_account_tasks")
        .update({
          status: "failed",
          error_message: errorMessage,
          retry_count: retryCount + 1,
        })
        .eq("id", options.taskId)

      try {
        await this.webDriverController.close()
      } catch (closeError) {
        console.error("[v0] Error closing browser:", closeError)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

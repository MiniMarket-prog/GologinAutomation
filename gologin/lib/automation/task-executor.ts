import { ProfileLauncher } from "./profile-launcher"
import { GmailAutomator } from "./gmail-automator"
import type { AutomationTask, BehaviorPattern, GoLoginProfile } from "@/lib/types"

export class TaskExecutor {
  private launcher: ProfileLauncher
  private behaviorPattern: BehaviorPattern["config"]

  constructor(gologinApiKey: string, behaviorPattern: BehaviorPattern["config"]) {
    this.launcher = new ProfileLauncher(gologinApiKey)
    this.behaviorPattern = behaviorPattern
  }

  async executeTask(task: AutomationTask, profile: GoLoginProfile) {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Starting task execution`)
    console.log(`[v0] Task ID: ${task.id}`)
    console.log(`[v0] Task Type: ${task.task_type}`)
    console.log(`[v0] Profile: ${profile.profile_name} (${profile.profile_id})`)
    console.log(`[v0] ========================================`)

    const startTime = Date.now()
    let result: any = { success: false }

    try {
      // Launch the profile
      console.log(`[v0] Step 1: Launching profile...`)
      const { browser, page, success, error } = await this.launcher.launchProfile(profile.profile_id)

      if (!success || !browser || !page) {
        const errorMsg = error || "Failed to launch profile"
        console.error(`[v0] ❌ Profile launch failed: ${errorMsg}`)
        throw new Error(errorMsg)
      }

      console.log(`[v0] ✓ Profile launched successfully`)

      // Create Gmail automator
      console.log(`[v0] Step 2: Initializing Gmail automator...`)
      const gmailAutomator = new GmailAutomator(page, this.behaviorPattern)
      console.log(`[v0] ✓ Gmail automator ready`)

      // Execute task based on type
      console.log(`[v0] Step 3: Executing task type: ${task.task_type}`)
      switch (task.task_type) {
        case "login":
          if (!profile.gmail_email || !profile.gmail_password) {
            throw new Error("Gmail credentials not configured for this profile")
          }
          console.log(`[v0] Logging in with email: ${profile.gmail_email}`)
          result = await gmailAutomator.login(profile.gmail_email, profile.gmail_password)
          break

        case "check_inbox":
          console.log(`[v0] Checking inbox...`)
          result = await gmailAutomator.checkInbox()
          break

        case "read_email":
          const emailIndex = task.config?.emailIndex || 0
          console.log(`[v0] Reading email at index: ${emailIndex}`)
          result = await gmailAutomator.readEmail(emailIndex)
          break

        case "star_email":
          const starIndex = task.config?.emailIndex || 0
          console.log(`[v0] Starring email at index: ${starIndex}`)
          result = await gmailAutomator.starEmail(starIndex)
          break

        case "send_email":
          if (!task.config?.to || !task.config?.subject || !task.config?.body) {
            throw new Error("Email configuration incomplete (missing to, subject, or body)")
          }
          console.log(`[v0] Sending email to: ${task.config.to}`)
          result = await gmailAutomator.sendEmail(task.config.to, task.config.subject, task.config.body)
          break

        default:
          throw new Error(`Unknown task type: ${task.task_type}`)
      }

      console.log(`[v0] ✓ Task execution result:`, result)

      // Close the profile
      console.log(`[v0] Step 4: Closing profile...`)
      await this.launcher.closeProfile(profile.profile_id, browser)
      console.log(`[v0] ✓ Profile closed`)

      const duration = Date.now() - startTime

      console.log(`[v0] ========================================`)
      console.log(`[v0] ✓ Task completed successfully in ${duration}ms`)
      console.log(`[v0] ========================================`)

      return {
        success: result.success,
        duration,
        result: result,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      console.error(`[v0] ========================================`)
      console.error(`[v0] ❌ Task execution failed after ${duration}ms`)
      console.error(`[v0] Error type: ${error.name}`)
      console.error(`[v0] Error message: ${error.message}`)
      console.error(`[v0] Error stack:`, error.stack)
      console.error(`[v0] ========================================`)

      return {
        success: false,
        duration,
        error: error.message,
      }
    }
  }
}

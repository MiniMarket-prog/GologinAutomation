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
    console.log(`[v0] Executing task ${task.id} for profile ${profile.profile_name}`)

    const startTime = Date.now()
    let result: any = { success: false }

    try {
      // Launch the profile
      const { browser, page, success, error } = await this.launcher.launchProfile(profile.profile_id)

      if (!success || !browser || !page) {
        throw new Error(error || "Failed to launch profile")
      }

      // Create Gmail automator
      const gmailAutomator = new GmailAutomator(page, this.behaviorPattern)

      // Execute task based on type
      switch (task.task_type) {
        case "login":
          if (!profile.gmail_email || !profile.gmail_password) {
            throw new Error("Gmail credentials not configured")
          }
          result = await gmailAutomator.login(profile.gmail_email, profile.gmail_password)
          break

        case "check_inbox":
          result = await gmailAutomator.checkInbox()
          break

        case "read_email":
          const emailIndex = task.config?.emailIndex || 0
          result = await gmailAutomator.readEmail(emailIndex)
          break

        case "star_email":
          const starIndex = task.config?.emailIndex || 0
          result = await gmailAutomator.starEmail(starIndex)
          break

        case "send_email":
          if (!task.config?.to || !task.config?.subject || !task.config?.body) {
            throw new Error("Email configuration incomplete")
          }
          result = await gmailAutomator.sendEmail(task.config.to, task.config.subject, task.config.body)
          break

        default:
          throw new Error(`Unknown task type: ${task.task_type}`)
      }

      // Close the profile
      await this.launcher.closeProfile(profile.profile_id, browser)

      const duration = Date.now() - startTime

      return {
        success: result.success,
        duration,
        result: result,
      }
    } catch (error: any) {
      console.error(`[v0] Task execution failed:`, error)

      const duration = Date.now() - startTime

      return {
        success: false,
        duration,
        error: error.message,
      }
    }
  }
}

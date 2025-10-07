import { ProfileLauncher, type LaunchMode } from "./profile-launcher"
import { GmailAutomator } from "./gmail-automator"
import type { AutomationTask, BehaviorPattern, GoLoginProfile } from "@/lib/types"

import { handleLogin } from "./tasks/login-handler"
import { handleCheckInbox } from "./tasks/check-inbox-handler"
import { handleReadEmail } from "./tasks/read-email-handler"
import { handleStarEmail } from "./tasks/star-email-handler"
import { handleSendEmail } from "./tasks/send-email-handler"
import { handleReplyToEmail } from "./tasks/reply-email-handler"
import { handleReportToInbox } from "./tasks/report-to-inbox-handler"
import { handleCheckGmail } from "./tasks/check-gmail-handler"

export class TaskExecutor {
  private launcher: ProfileLauncher
  private behaviorPattern: BehaviorPattern["config"]

  constructor(gologinApiKey: string, mode: LaunchMode, behaviorPattern: BehaviorPattern["config"]) {
    this.launcher = new ProfileLauncher(gologinApiKey, mode)
    this.behaviorPattern = behaviorPattern
  }

  async executeTask(task: AutomationTask, profile: GoLoginProfile) {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Starting task execution`)
    console.log(`[v0] Task ID: ${task.id}`)
    console.log(`[v0] Task Type: ${task.task_type}`)
    console.log(`[v0] Profile: ${profile.profile_name} (${profile.profile_id})`)
    if (task.config?.count) {
      console.log(`[v0] Action Count: ${task.config.count}`)
    }
    console.log(`[v0] ========================================`)

    const startTime = Date.now()
    let result: any = { success: false }
    let browser: any = null

    try {
      console.log(`[v0] Step 1: Launching profile...`)
      const launchResult = await this.launcher.launchProfile(profile.profile_id)
      browser = launchResult.browser
      const page = launchResult.page

      if (!launchResult.success || !browser || !page) {
        const errorMsg = launchResult.error || "Failed to launch profile"
        console.error(`[v0] ❌ Profile launch failed: ${errorMsg}`)
        throw new Error(errorMsg)
      }

      console.log(`[v0] ✓ Profile launched successfully`)

      console.log(`[v0] Step 2: Initializing Gmail automator...`)
      const gmailAutomator = new GmailAutomator(page, this.behaviorPattern)
      console.log(`[v0] ✓ Gmail automator ready`)

      console.log(`[v0] Step 3: Executing task type: ${task.task_type}`)
      switch (task.task_type) {
        case "login":
          result = await handleLogin(gmailAutomator, page, task.config)
          break

        case "check_inbox":
          result = await handleCheckInbox(gmailAutomator, page)
          break

        case "read_email":
          result = await handleReadEmail(gmailAutomator, page, task.config)
          break

        case "star_email":
          result = await handleStarEmail(gmailAutomator, page, task.config)
          break

        case "send_email":
          result = await handleSendEmail(gmailAutomator, page, task.config)
          break

        case "reply_to_email":
          result = await handleReplyToEmail(gmailAutomator, page, task.config)
          break

        case "report_to_inbox":
          result = await handleReportToInbox(gmailAutomator, page, task.config)
          break

        case "check_gmail_status":
          result = await handleCheckGmail(gmailAutomator, task.config)
          break

        default:
          throw new Error(`Unknown task type: ${task.task_type}`)
      }

      console.log(`[v0] ✓ Task execution result:`, result)

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
    } finally {
      if (browser) {
        console.log(`[v0] Step 4: Closing profile...`)
        try {
          await this.launcher.closeProfile(profile.profile_id, browser)
          console.log(`[v0] ✓ Profile closed`)
        } catch (closeError: any) {
          console.error(`[v0] ⚠️ Error during profile cleanup: ${closeError.message}`)
        }
      }
    }
  }
}

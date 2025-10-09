import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleReportToInbox(
  gmailAutomator: GmailAutomator,
  page: Page,
  config: { search_query?: string },
) {
  console.log("[v0] Handling report to inbox task")

  if (!config.search_query) {
    throw new Error("search_query is required for report_to_inbox task")
  }

  console.log(`[v0] Search query: ${config.search_query}`)

  await gmailAutomator.ensureGmailLoaded()

  const result = await gmailAutomator.reportToInbox(config.search_query)

  if (!result.success) {
    throw new Error(result.error || "Failed to report email to inbox")
  }

  return {
    success: true,
    emailDetails: result.emailDetails,
  }
}

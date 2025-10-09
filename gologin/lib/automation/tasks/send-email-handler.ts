import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleSendEmail(
  gmailAutomator: GmailAutomator,
  page: Page,
  config: { to?: string; subject?: string; body?: string },
) {
  if (!config?.to || !config?.subject || !config?.body) {
    throw new Error("Email configuration incomplete (missing to, subject, or body)")
  }

  console.log(`[v0] Sending email to: ${config.to}`)
  await gmailAutomator.ensureGmailLoaded()
  return await gmailAutomator.sendEmail(config.to, config.subject, config.body)
}

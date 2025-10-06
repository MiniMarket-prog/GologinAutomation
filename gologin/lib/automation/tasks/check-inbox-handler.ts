import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleCheckInbox(gmailAutomator: GmailAutomator, page: Page) {
  console.log(`[v0] Checking inbox...`)
  return await gmailAutomator.checkInbox()
}

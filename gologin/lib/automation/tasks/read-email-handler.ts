import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleReadEmail(gmailAutomator: GmailAutomator, page: Page, config: { count?: number }) {
  const readCount = config?.count || 1
  console.log(`[v0] Reading ${readCount} email(s)...`)

  const readResults = []
  for (let i = 0; i < readCount; i++) {
    console.log(`[v0] Reading email ${i + 1}/${readCount} at index ${i}`)
    const readResult = await gmailAutomator.readEmail(i)
    readResults.push(readResult)
    if (!readResult.success) {
      console.log(`[v0] Failed to read email ${i + 1}, stopping...`)
      break
    }
  }

  return {
    success: readResults.every((r) => r.success),
    count: readResults.filter((r) => r.success).length,
    results: readResults,
  }
}

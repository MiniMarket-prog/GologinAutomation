import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleReplyToEmail(
  gmailAutomator: GmailAutomator,
  page: Page,
  config: { searchFrom?: string; replyMessage?: string; count?: number; action_count?: number },
) {
  if (!config?.searchFrom || !config?.replyMessage) {
    throw new Error("Reply configuration incomplete (missing searchFrom or replyMessage)")
  }

  console.log(`[v0] Searching for emails from: ${config.searchFrom}`)

  const searchQuery = `from:${config.searchFrom}`
  const searchResult = await gmailAutomator.searchEmails(searchQuery)

  if (!searchResult.success || searchResult.count === 0) {
    throw new Error(`No emails found from ${config.searchFrom}`)
  }

  console.log(`[v0] Found ${searchResult.count} email(s) in search results`)

  const replyCount = config?.count || config.action_count || 1
  console.log(`[v0] Replying to ${replyCount} email(s)...`)

  const replyResults = []

  for (let i = 0; i < Math.min(replyCount, searchResult.count || 0); i++) {
    console.log(`[v0] Replying to email ${i + 1}/${replyCount} at index ${i}`)

    const replyResult = await gmailAutomator.replyToEmail(i, config.replyMessage)

    replyResults.push(replyResult)

    if (!replyResult.success) {
      console.log(`[v0] Failed to reply to email at index ${i}, stopping...`)
      break
    }

    console.log(`[v0] ✓ Successfully replied to email ${i + 1}/${replyCount}`)
  }

  const successCount = replyResults.filter((r) => r.success).length

  return {
    success: successCount > 0,
    count: successCount,
    requested: replyCount,
    results: replyResults,
  }
}

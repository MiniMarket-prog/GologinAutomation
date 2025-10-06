import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleStarEmail(gmailAutomator: GmailAutomator, page: Page, config: { count?: number }) {
  const starCount = config?.count || 1
  console.log(`[v0] Starring ${starCount} email(s)...`)

  const starResults = []
  let currentIndex = 0
  let starredCount = 0
  const maxAttempts = 50 // Prevent infinite loop if all emails are starred

  while (starredCount < starCount && currentIndex < maxAttempts) {
    console.log(`[v0] Attempting to star email ${starredCount + 1}/${starCount} at index ${currentIndex}`)
    const starResult = await gmailAutomator.starEmail(currentIndex)

    if (!starResult.success) {
      console.log(`[v0] Failed to star email at index ${currentIndex}, stopping...`)
      starResults.push(starResult)
      break
    }

    if (starResult.alreadyStarred) {
      console.log(`[v0] Email at index ${currentIndex} was already starred, moving to next email...`)
      currentIndex++
      continue
    }

    // Successfully starred a new email
    starResults.push(starResult)
    starredCount++
    currentIndex++
    console.log(`[v0] ✓ Successfully starred ${starredCount}/${starCount} emails`)
  }

  if (starredCount < starCount && currentIndex >= maxAttempts) {
    console.log(`[v0] ⚠️ Reached maximum attempts (${maxAttempts}), only starred ${starredCount}/${starCount} emails`)
  }

  return {
    success: starredCount > 0,
    count: starredCount,
    requested: starCount,
    results: starResults,
  }
}

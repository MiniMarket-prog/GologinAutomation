import type { Page } from "puppeteer-core"
import type { GmailAutomator } from "../gmail-automator"

export async function handleStarEmail(gmailAutomator: GmailAutomator, page: Page, config: { count?: number }) {
  const starCount = config?.count || 1
  console.log(`[v0] Starring ${starCount} email(s)...`)

  console.log("[v0] Opening Gmail in a new tab...")
  const browser = page.browser()
  const gmailPage = await browser.newPage()

  // Navigate to Gmail inbox first
  console.log("[v0] Navigating to Gmail inbox...")
  await gmailPage.goto("https://mail.google.com/mail/u/0/#inbox", {
    waitUntil: "networkidle2",
    timeout: 30000,
  })

  // Wait for Gmail to load
  await new Promise((resolve) => setTimeout(resolve, 3000))
  console.log("[v0] ✓ Gmail inbox loaded")

  const starResults = []
  let currentIndex = 0
  let starredCount = 0
  const maxAttempts = 50 // Prevent infinite loop if all emails are starred

  while (starredCount < starCount && currentIndex < maxAttempts) {
    console.log(`[v0] Attempting to star email ${starredCount + 1}/${starCount} at index ${currentIndex}`)

    const starResult = await (gmailAutomator as any).starEmailOnPage(gmailPage, currentIndex)

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

  console.log("[v0] Waiting 5 seconds for Gmail to save changes...")
  await new Promise((resolve) => setTimeout(resolve, 5000))
  console.log("[v0] ✓ Changes saved")

  console.log("[v0] ✓ Star email task complete. Gmail tab remains open for verification.")

  return {
    success: starredCount > 0,
    count: starredCount,
    requested: starCount,
    results: starResults,
  }
}

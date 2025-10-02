import type { Page } from "puppeteer-core"
import { HumanBehavior } from "./human-behavior"
import type { BehaviorPattern } from "@/lib/types"

export interface EmailData {
  to: string
  subject: string
  body: string
  attachments?: string[]
}

export interface EmailFilter {
  from?: string
  subject?: string
  unreadOnly?: boolean
  hasAttachment?: boolean
}

export class GmailOperations {
  private page: Page
  private behavior: HumanBehavior

  constructor(page: Page, behaviorPattern: BehaviorPattern["config"]) {
    this.page = page
    this.behavior = new HumanBehavior(behaviorPattern)
  }

  async searchEmails(query: string) {
    console.log(`[v0] Searching emails with query: ${query}`)

    try {
      // Click search box
      const searchBox = await this.page.waitForSelector('input[aria-label="Search mail"]')
      if (!searchBox) throw new Error("Search box not found")

      await this.behavior.randomPause()
      await searchBox.click()
      await this.behavior.waitRandom(500)

      // Type search query
      await this.behavior.typeWithHumanSpeed(query, searchBox)
      await this.behavior.waitRandom(1000)

      // Press enter
      await this.page.keyboard.press("Enter")
      await this.behavior.waitRandom(3000)

      // Get search results
      const results = await this.page.evaluate(() => {
        const emailRows = Array.from(document.querySelectorAll("tr.zA"))
        return emailRows.slice(0, 20).map((row) => {
          const sender = row.querySelector(".yW span")?.textContent || ""
          const subject = row.querySelector(".y6 span")?.textContent || ""
          const time = row.querySelector(".xW span")?.textContent || ""
          return { sender, subject, time }
        })
      })

      console.log(`[v0] Found ${results.length} emails matching query`)

      return { success: true, results }
    } catch (error: any) {
      console.error("[v0] Search emails failed:", error)
      return { success: false, error: error.message }
    }
  }

  async markAsRead(emailIndex: number) {
    console.log(`[v0] Marking email ${emailIndex} as read`)

    try {
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Right click on email
      await emailRows[emailIndex].click({ button: "right" })
      await this.behavior.waitRandom(500)

      // Find and click "Mark as read" option
      const markAsReadButton = await this.page.$('div[role="menuitem"][aria-label*="Mark as read"]')
      if (markAsReadButton) {
        await markAsReadButton.click()
        await this.behavior.waitRandom(1000)
      }

      console.log("[v0] Email marked as read")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Mark as read failed:", error)
      return { success: false, error: error.message }
    }
  }

  async archiveEmail(emailIndex: number) {
    console.log(`[v0] Archiving email ${emailIndex}`)

    try {
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Click on email to select
      await emailRows[emailIndex].click()
      await this.behavior.waitRandom(500)

      // Click archive button
      const archiveButton = await this.page.$('div[aria-label="Archive"]')
      if (!archiveButton) throw new Error("Archive button not found")

      await archiveButton.click()
      await this.behavior.waitRandom(1000)

      console.log("[v0] Email archived")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Archive email failed:", error)
      return { success: false, error: error.message }
    }
  }

  async deleteEmail(emailIndex: number) {
    console.log(`[v0] Deleting email ${emailIndex}`)

    try {
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Click on email to select
      await emailRows[emailIndex].click()
      await this.behavior.waitRandom(500)

      // Click delete button
      const deleteButton = await this.page.$('div[aria-label="Delete"]')
      if (!deleteButton) throw new Error("Delete button not found")

      await deleteButton.click()
      await this.behavior.waitRandom(1000)

      console.log("[v0] Email deleted")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Delete email failed:", error)
      return { success: false, error: error.message }
    }
  }

  async replyToEmail(emailIndex: number, replyText: string) {
    console.log(`[v0] Replying to email ${emailIndex}`)

    try {
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Click on email
      await emailRows[emailIndex].click()
      await this.behavior.waitRandom(2000)

      // Click reply button
      const replyButton = await this.page.waitForSelector('[aria-label="Reply"]')
      if (!replyButton) throw new Error("Reply button not found")

      await this.behavior.randomPause()
      await replyButton.click()
      await this.behavior.waitRandom(2000)

      // Type reply
      const replyBox = await this.page.waitForSelector('[role="textbox"][aria-label*="Message"]')
      if (!replyBox) throw new Error("Reply box not found")

      await replyBox.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(replyText, replyBox)
      await this.behavior.waitRandom(2000)

      // Send reply
      const sendButton = await this.page.waitForSelector('[role="button"][aria-label*="Send"]')
      if (!sendButton) throw new Error("Send button not found")

      await this.behavior.randomPause()
      await sendButton.click()
      await this.behavior.waitRandom(2000)

      console.log("[v0] Reply sent")

      // Go back to inbox
      await this.page.goBack()
      await this.behavior.waitRandom(1500)

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Reply to email failed:", error)
      return { success: false, error: error.message }
    }
  }

  async getUnreadCount() {
    console.log("[v0] Getting unread count")

    try {
      const unreadCount = await this.page.evaluate(() => {
        const inboxLink = document.querySelector('a[href*="#inbox"]')
        if (inboxLink) {
          const countElement = inboxLink.querySelector(".bsU")
          if (countElement) {
            return Number.parseInt(countElement.textContent || "0")
          }
        }
        return 0
      })

      console.log(`[v0] Unread count: ${unreadCount}`)

      return { success: true, count: unreadCount }
    } catch (error: any) {
      console.error("[v0] Get unread count failed:", error)
      return { success: false, error: error.message }
    }
  }
}

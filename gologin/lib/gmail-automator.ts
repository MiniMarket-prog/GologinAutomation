import type { Page } from "puppeteer-core"
import { HumanBehavior } from "./human-behavior"
import type { BehaviorPattern } from "@/lib/types"

export class GmailAutomator {
  private page: Page
  private behavior: HumanBehavior

  constructor(page: Page, behaviorPattern: BehaviorPattern["config"]) {
    this.page = page
    this.behavior = new HumanBehavior(behaviorPattern)
  }

  async login(email: string, password: string) {
    console.log("[v0] Starting Gmail login with human behavior")

    try {
      // Navigate to Gmail
      await this.page.goto("https://accounts.google.com/signin/v2/identifier?service=mail", {
        waitUntil: "networkidle2",
      })

      await this.behavior.waitRandom(2000)

      // Enter email
      const emailInput = await this.page.waitForSelector('input[type="email"]')
      if (!emailInput) throw new Error("Email input not found")

      await this.behavior.randomPause()
      await this.behavior.typeWithHumanSpeed(email, emailInput)
      await this.behavior.waitRandom(1000)

      // Click next
      const nextButton = await this.page.$("#identifierNext button")
      if (nextButton) {
        await nextButton.click()
      }

      await this.behavior.waitRandom(3000)

      // Enter password
      const passwordInput = await this.page.waitForSelector('input[type="password"]', { timeout: 10000 })
      if (!passwordInput) throw new Error("Password input not found")

      await this.behavior.randomPause()
      await this.behavior.typeWithHumanSpeed(password, passwordInput)
      await this.behavior.waitRandom(1000)

      // Click next
      const passwordNextButton = await this.page.$("#passwordNext button")
      if (passwordNextButton) {
        await passwordNextButton.click()
      }

      // Wait for Gmail to load
      await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 })
      await this.behavior.waitRandom(2000)

      console.log("[v0] Gmail login successful")
      return { success: true }
    } catch (error: any) {
      console.error("[v0] Gmail login failed:", error)
      return { success: false, error: error.message }
    }
  }

  async checkInbox() {
    console.log("[v0] Checking inbox with human behavior")

    try {
      // Ensure we're on inbox
      await this.page.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
      })

      await this.behavior.waitRandom(2000)

      // Scroll naturally to see emails
      await this.behavior.scrollNaturally(this.page, 300)
      await this.behavior.randomPause()

      // Get unread count
      const unreadCount = await this.page.evaluate(() => {
        const unreadElement = document.querySelector('[aria-label*="Unread"]')
        if (unreadElement) {
          const match = unreadElement.textContent?.match(/\d+/)
          return match ? Number.parseInt(match[0]) : 0
        }
        return 0
      })

      // Get email list
      const emails = await this.page.evaluate(() => {
        const emailRows = Array.from(document.querySelectorAll("tr.zA"))
        return emailRows.slice(0, 10).map((row) => {
          const sender = row.querySelector(".yW span")?.textContent || ""
          const subject = row.querySelector(".y6 span")?.textContent || ""
          const time = row.querySelector(".xW span")?.textContent || ""
          const isUnread = row.classList.contains("zE")
          return { sender, subject, time, isUnread }
        })
      })

      console.log(`[v0] Found ${emails.length} emails, ${unreadCount} unread`)

      return { success: true, unreadCount, emails }
    } catch (error: any) {
      console.error("[v0] Check inbox failed:", error)
      return { success: false, error: error.message }
    }
  }

  async readEmail(emailIndex: number) {
    console.log(`[v0] Reading email at index ${emailIndex}`)

    try {
      // Get email rows
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Click on email with human-like behavior
      await this.behavior.randomPause()
      await emailRows[emailIndex].click()
      await this.behavior.waitRandom(2000)

      // Scroll to read content
      await this.behavior.scrollNaturally(this.page, 200)
      await this.behavior.randomPause()
      await this.behavior.scrollNaturally(this.page, 200)

      // Extract email content
      const emailContent = await this.page.evaluate(() => {
        const subject = document.querySelector("h2.hP")?.textContent || ""
        const sender = document.querySelector(".gD")?.textContent || ""
        const body = document.querySelector(".a3s.aiL")?.textContent || ""
        return { subject, sender, body: body.substring(0, 500) }
      })

      console.log("[v0] Email read successfully")

      // Go back to inbox
      await this.behavior.waitRandom(1000)
      await this.page.goBack()
      await this.behavior.waitRandom(1500)

      return { success: true, content: emailContent }
    } catch (error: any) {
      console.error("[v0] Read email failed:", error)
      return { success: false, error: error.message }
    }
  }

  async starEmail(emailIndex: number) {
    console.log(`[v0] Starring email at index ${emailIndex}`)

    try {
      // Get email rows
      const emailRows = await this.page.$$("tr.zA")

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range`)
      }

      // Hover over email row
      await emailRows[emailIndex].hover()
      await this.behavior.waitRandom(500)

      // Find and click star button
      const starButton = await emailRows[emailIndex].$('span[role="checkbox"][aria-label*="Star"]')
      if (!starButton) throw new Error("Star button not found")

      await this.behavior.randomPause()
      await starButton.click()
      await this.behavior.waitRandom(1000)

      console.log("[v0] Email starred successfully")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Star email failed:", error)
      return { success: false, error: error.message }
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[v0] Sending email to ${to}`)

    try {
      // Click compose button
      const composeButton = await this.page.waitForSelector('[role="button"][gh="cm"]')
      if (!composeButton) throw new Error("Compose button not found")

      await this.behavior.randomPause()
      await composeButton.click()
      await this.behavior.waitRandom(2000)

      // Fill in recipient
      const toInput = await this.page.waitForSelector('input[aria-label*="To"]')
      if (!toInput) throw new Error("To input not found")

      await this.behavior.typeWithHumanSpeed(to, toInput)
      await this.behavior.waitRandom(1000)

      // Fill in subject
      const subjectInput = await this.page.waitForSelector('input[name="subjectbox"]')
      if (!subjectInput) throw new Error("Subject input not found")

      await subjectInput.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(subject, subjectInput)
      await this.behavior.waitRandom(1000)

      // Fill in body
      const bodyInput = await this.page.waitForSelector('[role="textbox"][aria-label*="Message"]')
      if (!bodyInput) throw new Error("Body input not found")

      await bodyInput.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(body, bodyInput)
      await this.behavior.waitRandom(2000)

      // Random pause before sending
      await this.behavior.randomPause()

      // Click send button
      const sendButton = await this.page.waitForSelector('[role="button"][aria-label*="Send"]')
      if (!sendButton) throw new Error("Send button not found")

      await sendButton.click()
      await this.behavior.waitRandom(2000)

      console.log("[v0] Email sent successfully")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] Send email failed:", error)
      return { success: false, error: error.message }
    }
  }
}

import type { Page, ElementHandle } from "puppeteer-core"
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
    console.log(`[v0] Email: ${email}`)

    try {
      // Navigate to Gmail
      console.log("[v0] Navigating to Gmail login page...")
      await this.page.goto("https://accounts.google.com/signin/v2/identifier?service=mail", {
        waitUntil: "networkidle2",
      })
      console.log("[v0] ✓ Page loaded")

      await this.behavior.waitRandom(2000)

      // Enter email
      console.log("[v0] Looking for email input...")
      const emailInput = await this.page.waitForSelector('input[type="email"]', { timeout: 10000 })
      if (!emailInput) throw new Error("Email input not found")
      console.log("[v0] ✓ Email input found")

      await this.behavior.randomPause()
      console.log("[v0] Typing email...")
      await this.behavior.typeWithHumanSpeed(email, emailInput)
      await this.behavior.waitRandom(1000)

      // Click next
      console.log("[v0] Clicking next button...")
      const nextButton = await this.page.$("#identifierNext button")
      if (nextButton) {
        await nextButton.click()
        console.log("[v0] ✓ Next button clicked")
      } else {
        throw new Error("Next button not found")
      }

      await this.behavior.waitRandom(3000)

      // Enter password
      console.log("[v0] Looking for password input...")
      const passwordInput = await this.page.waitForSelector('input[type="password"]', { timeout: 10000 })
      if (!passwordInput) throw new Error("Password input not found")
      console.log("[v0] ✓ Password input found")

      await this.behavior.randomPause()
      console.log("[v0] Typing password...")
      await this.behavior.typeWithHumanSpeed(password, passwordInput)
      await this.behavior.waitRandom(1000)

      // Click next
      console.log("[v0] Clicking password next button...")
      const passwordNextButton = await this.page.$("#passwordNext button")
      if (passwordNextButton) {
        await passwordNextButton.click()
        console.log("[v0] ✓ Password next button clicked")
      } else {
        throw new Error("Password next button not found")
      }

      // Wait for Gmail to load
      console.log("[v0] Waiting for Gmail to load...")
      await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 })
      await this.behavior.waitRandom(2000)

      console.log("[v0] ✓✓✓ Gmail login successful ✓✓✓")
      return { success: true }
    } catch (error: any) {
      console.error("[v0] ❌ Gmail login failed")
      console.error("[v0] Error type:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)

      // Take screenshot for debugging
      try {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured (base64 length):", screenshot.length)
      } catch (screenshotError) {
        console.error("[v0] Could not capture screenshot:", screenshotError)
      }

      return { success: false, error: error.message }
    }
  }

  async checkInbox() {
    console.log("[v0] Checking inbox with human behavior")

    try {
      // Ensure we're on inbox
      console.log("[v0] Navigating to inbox...")
      await this.page.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
      })
      console.log("[v0] ✓ Inbox loaded")

      await this.behavior.waitRandom(2000)

      // Scroll naturally to see emails
      console.log("[v0] Scrolling to view emails...")
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

      console.log(`[v0] ✓ Found ${emails.length} emails, ${unreadCount} unread`)

      return { success: true, unreadCount, emails }
    } catch (error: any) {
      console.error("[v0] ❌ Check inbox failed")
      console.error("[v0] Error:", error.message)
      return { success: false, error: error.message }
    }
  }

  async readEmail(emailIndex: number) {
    console.log(`[v0] Reading email at index ${emailIndex}`)

    try {
      // Get email rows
      console.log("[v0] Finding email rows...")
      const emailRows = await this.page.$$("tr.zA")
      console.log(`[v0] Found ${emailRows.length} email rows`)

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range (only ${emailRows.length} emails found)`)
      }

      // Click on email with human-like behavior
      console.log(`[v0] Clicking on email ${emailIndex}...`)
      await this.behavior.randomPause()
      await emailRows[emailIndex].click()
      await this.behavior.waitRandom(2000)

      // Scroll to read content
      console.log("[v0] Scrolling to read content...")
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

      console.log("[v0] ✓ Email read successfully:", emailContent.subject)

      // Go back to inbox
      await this.behavior.waitRandom(1000)
      await this.page.goBack()
      await this.behavior.waitRandom(1500)

      return { success: true, content: emailContent }
    } catch (error: any) {
      console.error("[v0] ❌ Read email failed")
      console.error("[v0] Error:", error.message)
      return { success: false, error: error.message }
    }
  }

  async starEmail(emailIndex: number) {
    console.log(`[v0] Starring email at index ${emailIndex}`)

    try {
      console.log("[v0] Ensuring we're on inbox page...")
      const currentUrl = this.page.url()
      if (!currentUrl.includes("mail.google.com/mail")) {
        console.log("[v0] Not on Gmail, navigating to inbox...")
        await this.page.goto("https://mail.google.com/mail/u/0/#inbox", {
          waitUntil: "networkidle2",
          timeout: 30000,
        })
        await this.behavior.waitRandom(3000)
      }

      console.log("[v0] Waiting for email rows to load...")
      let emailRows: ElementHandle<Element>[] = []
      let retries = 0
      const maxRetries = 5

      while (emailRows.length === 0 && retries < maxRetries) {
        await this.page.waitForSelector("table.F", { timeout: 10000 }).catch(() => {
          console.log("[v0] Email table not found, retrying...")
        })
        await this.behavior.waitRandom(2000)

        emailRows = await this.page.$$("tr.zA")
        console.log(`[v0] Attempt ${retries + 1}: Found ${emailRows.length} email rows`)

        if (emailRows.length === 0) {
          retries++
          if (retries < maxRetries) {
            console.log("[v0] No emails found, scrolling and waiting...")
            await this.behavior.scrollNaturally(this.page, 200)
            await this.behavior.waitRandom(2000)
          }
        }
      }

      if (emailRows.length === 0) {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        const isInboxEmpty = await this.page.evaluate(() => {
          const emptyMessage = document.querySelector('[aria-label*="No messages"]')
          return emptyMessage !== null
        })

        if (isInboxEmpty) {
          throw new Error("Gmail inbox is empty - no emails to star")
        } else {
          throw new Error(
            "Could not find email rows on page - Gmail may have changed their structure or page did not load properly",
          )
        }
      }

      console.log(`[v0] Found ${emailRows.length} email rows`)

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range (only ${emailRows.length} emails found)`)
      }

      console.log(`[v0] Finding and clicking star button for email ${emailIndex}...`)
      await this.behavior.randomPause()

      // Use page.evaluate to find and click the star button directly
      const result = await this.page.evaluate((index) => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[index]
        if (!row) {
          return { success: false, error: "Row not found in DOM" }
        }

        // Try multiple selectors in order of reliability
        const selectors = [
          'span[role="checkbox"][aria-label*="Not starred"]',
          'span[role="checkbox"][aria-label*="Star"]',
          'span[data-tooltip*="Star"]',
          "span.T-KT", // Gmail's star button class
          'div[data-tooltip*="Star"]',
        ]

        for (const selector of selectors) {
          const starButton = row.querySelector(selector)
          if (starButton) {
            const element = starButton as HTMLElement
            element.click()
            return {
              success: true,
              selector: selector,
              ariaLabel: starButton.getAttribute("aria-label") || "N/A",
            }
          }
        }

        // If no selector worked, log what we found
        const allSpans = row.querySelectorAll("span[role='checkbox']")
        const spanInfo = Array.from(allSpans).map((span) => ({
          role: span.getAttribute("role"),
          ariaLabel: span.getAttribute("aria-label"),
          className: span.className,
        }))

        return {
          success: false,
          error: "Star button not found with any selector",
          foundElements: spanInfo,
        }
      }, emailIndex)

      console.log("[v0] Star button search result:", JSON.stringify(result, null, 2))

      if (!result.success) {
        // Take screenshot for debugging
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error(result.error || "Failed to click star button")
      }

      console.log(`[v0] ✓ Star button clicked using selector: ${result.selector}`)
      await this.behavior.waitRandom(1000)

      console.log("[v0] ✓✓✓ Email starred successfully ✓✓✓")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] ❌ Star email failed")
      console.error("[v0] Error type:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)

      // Take screenshot for debugging
      try {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)
      } catch (screenshotError) {
        console.error("[v0] Could not capture screenshot:", screenshotError)
      }

      return { success: false, error: error.message }
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[v0] Sending email to ${to}`)

    try {
      // Click compose button
      console.log("[v0] Looking for compose button...")
      const composeButton = await this.page.waitForSelector('[role="button"][gh="cm"]', { timeout: 10000 })
      if (!composeButton) throw new Error("Compose button not found")
      console.log("[v0] ✓ Compose button found")

      await this.behavior.randomPause()
      await composeButton.click()
      await this.behavior.waitRandom(2000)

      // Fill in recipient
      console.log("[v0] Filling in recipient...")
      const toInput = await this.page.waitForSelector('input[aria-label*="To"]', { timeout: 10000 })
      if (!toInput) throw new Error("To input not found")

      await this.behavior.typeWithHumanSpeed(to, toInput)
      await this.behavior.waitRandom(1000)
      console.log("[v0] ✓ Recipient filled")

      // Fill in subject
      console.log("[v0] Filling in subject...")
      const subjectInput = await this.page.waitForSelector('input[name="subjectbox"]', { timeout: 10000 })
      if (!subjectInput) throw new Error("Subject input not found")

      await subjectInput.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(subject, subjectInput)
      await this.behavior.waitRandom(1000)
      console.log("[v0] ✓ Subject filled")

      // Fill in body
      console.log("[v0] Filling in body...")
      const bodyInput = await this.page.waitForSelector('[role="textbox"][aria-label*="Message"]', { timeout: 10000 })
      if (!bodyInput) throw new Error("Body input not found")

      await bodyInput.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(body, bodyInput)
      await this.behavior.waitRandom(2000)
      console.log("[v0] ✓ Body filled")

      // Random pause before sending
      await this.behavior.randomPause()

      // Click send button
      console.log("[v0] Clicking send button...")
      const sendButton = await this.page.waitForSelector('[role="button"][aria-label*="Send"]', { timeout: 10000 })
      if (!sendButton) throw new Error("Send button not found")

      await sendButton.click()
      await this.behavior.waitRandom(2000)

      console.log("[v0] ✓✓✓ Email sent successfully ✓✓✓")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] ❌ Send email failed")
      console.error("[v0] Error:", error.message)
      return { success: false, error: error.message }
    }
  }
}

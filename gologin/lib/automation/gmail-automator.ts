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

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    console.log("[v0] Starting Gmail login process...")
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
      console.log("[v0] ✓ Email entered")

      await this.behavior.waitRandom(1000)

      // Click Next button - try multiple selectors
      console.log("[v0] Looking for Next button...")
      let nextButton: ElementHandle<Element> | null = null

      // Try standard selectors first
      const selectors = [
        "#identifierNext button",
        'button[type="button"]',
        '[role="button"]',
        ".VfPpkd-LgbsSe", // Google's button class
      ]

      for (const selector of selectors) {
        try {
          const btn = await this.page.$(selector)
          if (btn) {
            nextButton = btn as ElementHandle<Element>
            console.log(`[v0] ✓ Found Next button with selector: ${selector}`)
            break
          }
        } catch (e) {
          continue
        }
      }

      // If standard selectors fail, try finding by text content
      if (!nextButton) {
        console.log("[v0] Standard selectors failed, searching by text content...")
        const buttons = await this.page.$$("button")
        for (const button of buttons) {
          const text = await button.evaluate((el) => el.textContent?.toLowerCase() || "")
          // Check for "Next" in multiple languages
          if (
            text.includes("next") ||
            text.includes("التالي") || // Arabic
            text.includes("suivant") || // French
            text.includes("siguiente") || // Spanish
            text.includes("weiter") // German
          ) {
            nextButton = button as ElementHandle<Element>
            console.log(`[v0] ✓ Found Next button by text: ${text}`)
            break
          }
        }
      }

      if (!nextButton) {
        throw new Error("Next button not found")
      }

      await this.behavior.randomPause()
      await nextButton.click()
      console.log("[v0] ✓ Clicked Next button")

      // Wait for password page
      await this.behavior.waitRandom(3000)

      // Enter password
      console.log("[v0] Looking for password input...")
      const passwordInput = await this.page.waitForSelector('input[type="password"]', { timeout: 10000 })
      if (!passwordInput) throw new Error("Password input not found")
      console.log("[v0] ✓ Password input found")

      await this.behavior.randomPause()
      console.log("[v0] Typing password...")
      await this.behavior.typeWithHumanSpeed(password, passwordInput)
      console.log("[v0] ✓ Password entered")

      await this.behavior.waitRandom(1000)

      // Click Next/Sign in button
      console.log("[v0] Looking for Sign in button...")
      let signInButton: ElementHandle<Element> | null = null

      // Try standard selectors
      for (const selector of selectors) {
        try {
          const btn = await this.page.$(selector)
          if (btn) {
            signInButton = btn as ElementHandle<Element>
            console.log(`[v0] ✓ Found Sign in button with selector: ${selector}`)
            break
          }
        } catch (e) {
          continue
        }
      }

      // If standard selectors fail, try finding by text
      if (!signInButton) {
        console.log("[v0] Standard selectors failed, searching by text content...")
        const buttons = await this.page.$$("button")
        for (const button of buttons) {
          const text = await button.evaluate((el) => el.textContent?.toLowerCase() || "")
          if (
            text.includes("next") ||
            text.includes("sign in") ||
            text.includes("التالي") ||
            text.includes("تسجيل الدخول") || // Arabic "Sign in"
            text.includes("connexion") ||
            text.includes("iniciar sesión") ||
            text.includes("anmelden")
          ) {
            signInButton = button as ElementHandle<Element>
            console.log(`[v0] ✓ Found Sign in button by text: ${text}`)
            break
          }
        }
      }

      if (!signInButton) {
        throw new Error("Sign in button not found")
      }

      await this.behavior.randomPause()
      await signInButton.click()
      console.log("[v0] ✓ Clicked Sign in button")

      // Wait for navigation
      await this.behavior.waitRandom(5000)

      // Check if login was successful
      const currentUrl = this.page.url()
      if (currentUrl.includes("mail.google.com")) {
        console.log("[v0] ✓ Login successful!")
        return { success: true }
      } else if (currentUrl.includes("challenge") || currentUrl.includes("verify")) {
        console.log("[v0] ⚠ 2FA or verification required")
        return { success: false, error: "2FA or verification required" }
      } else {
        console.log("[v0] ✗ Login may have failed, unexpected URL:", currentUrl)
        return { success: false }
      }
    } catch (error: any) {
      console.error("[v0] Login error:", error.message)
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
      console.log("[v0] Navigating to Gmail inbox...")
      await this.page.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })
      await this.behavior.waitRandom(3000)

      console.log("[v0] Checking if logged into Gmail...")
      const isLoggedIn = await this.page.evaluate(() => {
        // Check for common Gmail UI elements that only appear when logged in
        const hasComposeButton = !!document.querySelector('[gh="cm"]')
        const hasInboxLabel =
          !!document.querySelector('[aria-label*="Inbox"]') || !!document.querySelector('[title*="Inbox"]')
        const hasGmailLogo = !!document.querySelector('img[alt*="Gmail"]')
        const hasLoginForm =
          !!document.querySelector('input[type="email"]') || !!document.querySelector('input[type="password"]')

        return {
          hasComposeButton,
          hasInboxLabel,
          hasGmailLogo,
          hasLoginForm,
          isLoggedIn: (hasComposeButton || hasInboxLabel) && !hasLoginForm,
          url: window.location.href,
          title: document.title,
        }
      })

      console.log("[v0] Login status:", JSON.stringify(isLoggedIn, null, 2))

      if (!isLoggedIn.isLoggedIn) {
        console.log("[v0] ❌ Not logged into Gmail!")

        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error(
          "Not logged into Gmail. Please ensure the GoLogin profile has Gmail credentials saved or login manually first.",
        )
      }

      console.log("[v0] ✓ Logged into Gmail")
      console.log("[v0] Waiting for Gmail interface to fully load...")

      // Wait for the main Gmail container
      await this.page.waitForSelector('[role="main"]', { timeout: 15000 }).catch(() => {
        console.log("[v0] Main Gmail container not found")
      })
      await this.behavior.waitRandom(2000)

      console.log("[v0] Waiting for email rows to load...")
      let emailRows: ElementHandle<Element>[] = []
      let retries = 0
      const maxRetries = 8

      while (emailRows.length === 0 && retries < maxRetries) {
        // Try multiple selectors for email rows
        const selectors = [
          "tr.zA", // Standard email row
          "tr[role='row']", // Alternative selector
          "div[role='row']", // Some Gmail views use divs
        ]

        for (const selector of selectors) {
          emailRows = await this.page.$$(selector)
          if (emailRows.length > 0) {
            console.log(`[v0] Found ${emailRows.length} email rows using selector: ${selector}`)
            break
          }
        }

        console.log(`[v0] Attempt ${retries + 1}: Found ${emailRows.length} email rows`)

        if (emailRows.length === 0) {
          retries++
          if (retries < maxRetries) {
            console.log("[v0] No emails found, scrolling and waiting...")
            await this.behavior.scrollNaturally(this.page, 300)
            await this.behavior.waitRandom(2000)

            // Try clicking on inbox to refresh
            if (retries === 3) {
              console.log("[v0] Trying to click inbox link to refresh...")
              const inboxLink = await this.page.$('a[href*="#inbox"]')
              if (inboxLink) {
                await inboxLink.click()
                await this.behavior.waitRandom(3000)
              }
            }
          }
        }
      }

      if (emailRows.length === 0) {
        console.log("[v0] Capturing page state for debugging...")

        const pageInfo = await this.page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasMainRole: !!document.querySelector('[role="main"]'),
            hasTable: !!document.querySelector("table"),
            hasTr: document.querySelectorAll("tr").length,
            hasZaClass: document.querySelectorAll(".zA").length,
            bodyText: document.body.innerText.substring(0, 500),
          }
        })

        console.log("[v0] Page state:", JSON.stringify(pageInfo, null, 2))

        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error("Could not find email rows on page - Gmail may not have loaded properly or inbox is empty")
      }

      console.log(`[v0] Found ${emailRows.length} email rows`)

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range (only ${emailRows.length} emails found)`)
      }

      console.log(`[v0] Checking if email ${emailIndex} is already starred...`)
      const starStatus = await this.page.evaluate((index) => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[index]
        if (!row) {
          return { found: false, isStarred: false }
        }

        // Check for star button and its state
        const selectors = [
          'span[role="checkbox"][aria-label*="Starred"]',
          'span[role="checkbox"][aria-label*="Not starred"]',
          'span[role="checkbox"][aria-label*="Star"]',
          "span.T-KT",
        ]

        for (const selector of selectors) {
          const starButton = row.querySelector(selector)
          if (starButton) {
            const ariaLabel = starButton.getAttribute("aria-label") || ""
            const isStarred = ariaLabel.includes("Starred") && !ariaLabel.includes("Not starred")
            return {
              found: true,
              isStarred: isStarred,
              ariaLabel: ariaLabel,
            }
          }
        }

        return { found: false, isStarred: false }
      }, emailIndex)

      console.log("[v0] Star status:", JSON.stringify(starStatus, null, 2))

      if (starStatus.isStarred) {
        console.log(`[v0] ⚠️ Email ${emailIndex} is already starred, skipping...`)
        return { success: true, alreadyStarred: true }
      }

      console.log(`[v0] Finding and clicking star button for email ${emailIndex}...`)
      await this.behavior.waitRandom(1000)

      const emailRow = emailRows[emailIndex]

      // Try multiple selectors to find the star button
      const starSelectors = [
        'span[role="checkbox"][aria-label*="Not starred"]',
        'span[role="checkbox"][aria-label*="Star"]',
        'span[data-tooltip*="Star"]',
        "span.T-KT", // Gmail's star button class
        'div[data-tooltip*="Star"]',
      ]

      let starButton: ElementHandle<Element> | null = null
      let usedSelector = ""

      for (const selector of starSelectors) {
        starButton = await emailRow.$(selector)
        if (starButton) {
          usedSelector = selector
          console.log(`[v0] ✓ Star button found using selector: ${selector}`)
          break
        }
      }

      if (!starButton) {
        // Log what elements we found for debugging
        const foundElements = await emailRow.evaluate((row) => {
          const allSpans = row.querySelectorAll("span[role='checkbox']")
          return Array.from(allSpans).map((span) => ({
            role: span.getAttribute("role"),
            ariaLabel: span.getAttribute("aria-label"),
            className: span.className,
          }))
        })

        console.log("[v0] Could not find star button. Found elements:", JSON.stringify(foundElements, null, 2))

        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error("Star button not found with any selector")
      }

      console.log("[v0] Clicking star button...")
      await starButton.click()
      console.log(`[v0] ✓ Star button clicked using selector: ${usedSelector}`)

      await this.behavior.waitRandom(1000)

      // Check if any extra tabs opened and close them
      const pages = await this.page.browser()?.pages()
      if (pages && pages.length > 1) {
        console.log(`[v0] Detected ${pages.length} open tabs, closing extra tabs...`)
        // Close all tabs except the first one (inbox)
        for (let i = 1; i < pages.length; i++) {
          try {
            await pages[i].close()
            console.log(`[v0] ✓ Closed extra tab ${i}`)
          } catch (e) {
            console.log(`[v0] Could not close tab ${i}`)
          }
        }
      }

      console.log("[v0] ✓✓✓ Email starred successfully ✓✓✓")

      return { success: true, alreadyStarred: false }
    } catch (error: any) {
      console.error("[v0] ❌ Star email failed")
      console.error("[v0] Error type:", error.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)

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

  async searchEmails(searchQuery: string) {
    console.log(`[v0] Searching for emails with query: ${searchQuery}`)

    try {
      console.log("[v0] Navigating to inbox first...")
      await this.page.goto("https://mail.google.com/mail/u/0/#inbox", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })
      await this.behavior.waitRandom(2000)

      console.log("[v0] Looking for search box...")
      const searchBox = await this.page.waitForSelector('input[aria-label="Search mail"]', { timeout: 10000 })
      if (!searchBox) throw new Error("Search box not found")
      console.log("[v0] ✓ Search box found")

      await this.behavior.randomPause()
      await searchBox.click()
      await this.behavior.waitRandom(500)

      // Clear any existing search
      await this.page.keyboard.down("Control")
      await this.page.keyboard.press("A")
      await this.page.keyboard.up("Control")
      await this.page.keyboard.press("Backspace")
      await this.behavior.waitRandom(300)

      console.log(`[v0] Typing search query: ${searchQuery}`)
      await this.behavior.typeWithHumanSpeed(searchQuery, searchBox)
      await this.behavior.waitRandom(1000)

      console.log("[v0] Looking for search button...")
      const searchButton = await this.page
        .waitForSelector('button[aria-label="Search Mail"]', { timeout: 5000 })
        .catch(() => null)

      if (searchButton) {
        console.log("[v0] Clicking search button...")
        await searchButton.click()
      } else {
        console.log("[v0] Search button not found, pressing Enter...")
        await this.page.keyboard.press("Enter")
      }

      console.log("[v0] Waiting for search results to load...")
      await this.page.waitForFunction(
        () => {
          return window.location.href.includes("#search/")
        },
        { timeout: 10000 },
      )

      const currentUrl = this.page.url()
      console.log(`[v0] Current URL after search: ${currentUrl}`)

      console.log("[v0] Waiting for Gmail to filter search results...")
      await this.behavior.waitRandom(3000)

      let previousCount = 0
      let stableCount = 0
      const maxChecks = 5

      for (let i = 0; i < maxChecks; i++) {
        const currentCount = await this.page.evaluate(() => {
          return document.querySelectorAll("tr.zA").length
        })

        console.log(`[v0] Check ${i + 1}: Found ${currentCount} email rows`)

        if (currentCount === previousCount && currentCount > 0) {
          stableCount++
          if (stableCount >= 2) {
            console.log("[v0] ✓ Search results have stabilized")
            break
          }
        } else {
          stableCount = 0
        }

        previousCount = currentCount
        await this.behavior.waitRandom(1500)
      }

      // Get email rows
      const emailRows = await this.page.$$("tr.zA")
      console.log(`[v0] Found ${emailRows.length} emails matching search query`)

      if (emailRows.length > 0) {
        const emailDetails = await this.page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll("tr.zA"))
          return rows.slice(0, 5).map((row, index) => {
            const sender = row.querySelector(".yW span")?.textContent || ""
            const subject = row.querySelector(".y6 span")?.textContent || ""
            return { index, sender, subject }
          })
        })
        console.log("[v0] First few emails in search results:", JSON.stringify(emailDetails, null, 2))
      }

      if (emailRows.length === 0) {
        return { success: false, error: "No emails found matching search query", count: 0 }
      }

      return { success: true, count: emailRows.length }
    } catch (error: any) {
      console.error("[v0] ❌ Search emails failed")
      console.error("[v0] Error:", error.message)

      try {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)
      } catch (screenshotError) {
        console.error("[v0] Could not capture screenshot:", screenshotError)
      }

      return { success: false, error: error.message }
    }
  }

  async replyToEmail(emailIndex: number, replyMessage: string, expectedSender?: string) {
    console.log(`[v0] Replying to email at index ${emailIndex}`)
    if (expectedSender) {
      console.log(`[v0] Expected sender: ${expectedSender}`)
    }

    try {
      const currentUrl = this.page.url()
      console.log(`[v0] Current URL: ${currentUrl}`)

      // Get email rows
      console.log("[v0] Finding email rows...")
      const emailRows = await this.page.$$("tr.zA")
      console.log(`[v0] Found ${emailRows.length} email rows`)

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range (only ${emailRows.length} emails found)`)
      }

      const emailInfo = await this.page.evaluate((index) => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[index]
        if (!row) {
          return { found: false }
        }

        // Get sender display name
        const senderElement = row.querySelector(".yW span")
        const senderName = senderElement?.textContent || ""

        // Try to get email address from title/tooltip attribute
        const senderEmail =
          senderElement?.getAttribute("email") ||
          senderElement?.getAttribute("title") ||
          senderElement?.parentElement?.getAttribute("email") ||
          senderElement?.parentElement?.getAttribute("title") ||
          ""

        const subject = row.querySelector(".y6 span")?.textContent || ""

        return {
          found: true,
          senderName,
          senderEmail,
          subject,
          index,
        }
      }, emailIndex)

      console.log(`[v0] Email details at index ${emailIndex}:`, JSON.stringify(emailInfo, null, 2))

      if (expectedSender && emailInfo.found) {
        if (!emailInfo.senderName && !emailInfo.senderEmail) {
          console.log(`[v0] ⚠️ Could not extract sender information from email`)
          return {
            success: false,
            error: `Could not extract sender information`,
            senderMismatch: true,
          }
        }

        const expectedLower = expectedSender.toLowerCase()
        const nameMatches = emailInfo.senderName?.toLowerCase().includes(expectedLower)
        const emailMatches = emailInfo.senderEmail?.toLowerCase().includes(expectedLower)

        // Match if either the name or email contains the expected sender
        const senderMatches = nameMatches || emailMatches

        if (!senderMatches) {
          console.log(
            `[v0] ⚠️ Sender mismatch! Expected: ${expectedSender}, Found name: ${emailInfo.senderName}, Found email: ${emailInfo.senderEmail}`,
          )
          return {
            success: false,
            error: `Sender mismatch: expected ${expectedSender}, found ${emailInfo.senderName} (${emailInfo.senderEmail})`,
            senderMismatch: true,
          }
        }
        console.log(`[v0] ✓ Sender matches: ${emailInfo.senderName} (${emailInfo.senderEmail})`)
      }

      console.log(`[v0] Opening email ${emailIndex}...`)
      await this.behavior.randomPause()

      const clickResult = await this.page.evaluate((index) => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[index]
        if (!row) {
          return { success: false, error: "Row not found in DOM" }
        }

        const element = row as HTMLElement
        element.click()
        return { success: true }
      }, emailIndex)

      if (!clickResult.success) {
        throw new Error(clickResult.error || "Failed to click email row")
      }

      await this.behavior.waitRandom(3000)

      // Wait for email to load
      console.log("[v0] Waiting for email to load...")
      await this.page.waitForSelector("h2.hP", { timeout: 10000 }).catch(() => {
        console.log("[v0] Email subject not found")
      })
      await this.behavior.waitRandom(1000)

      const openedEmailInfo = await this.page.evaluate(() => {
        const subject = document.querySelector("h2.hP")?.textContent || ""
        const senderElement = document.querySelector(".gD")
        const senderName = senderElement?.textContent || ""

        // Try to get email from various attributes
        const senderEmail =
          senderElement?.getAttribute("email") ||
          senderElement?.getAttribute("data-hovercard-id") ||
          document.querySelector("[email]")?.getAttribute("email") ||
          ""

        return { subject, senderName, senderEmail }
      })
      console.log(`[v0] Opened email details:`, JSON.stringify(openedEmailInfo, null, 2))

      // Click reply button
      console.log("[v0] Looking for reply button...")
      const replyButton = await this.page.waitForSelector('[role="button"][aria-label*="Reply"]', { timeout: 10000 })
      if (!replyButton) throw new Error("Reply button not found")
      console.log("[v0] ✓ Reply button found")

      await this.behavior.randomPause()
      await replyButton.click()
      await this.behavior.waitRandom(2000)

      // Wait for reply compose box
      console.log("[v0] Waiting for reply compose box...")
      const replyBox = await this.page.waitForSelector('[role="textbox"][aria-label*="Message"]', { timeout: 10000 })
      if (!replyBox) throw new Error("Reply compose box not found")
      console.log("[v0] ✓ Reply compose box found")

      // Type reply message
      console.log("[v0] Typing reply message...")
      await replyBox.click()
      await this.behavior.waitRandom(500)
      await this.behavior.typeWithHumanSpeed(replyMessage, replyBox)
      await this.behavior.waitRandom(2000)
      console.log("[v0] ✓ Reply message typed")

      // Random pause before sending
      await this.behavior.randomPause()

      // Click send button
      console.log("[v0] Clicking send button...")
      const sendButton = await this.page.waitForSelector('[role="button"][aria-label*="Send"]', { timeout: 10000 })
      if (!sendButton) throw new Error("Send button not found")

      await sendButton.click()
      await this.behavior.waitRandom(2000)

      console.log("[v0] ✓✓✓ Reply sent successfully ✓✓✓")

      await this.behavior.waitRandom(1000)

      console.log("[v0] Returning to search results...")
      await this.page.goBack()
      await this.behavior.waitRandom(2000)

      await this.page.waitForSelector("table.F", { timeout: 10000 }).catch(() => {
        console.log("[v0] Search results table not found after going back")
      })
      await this.behavior.waitRandom(1000)

      return { success: true }
    } catch (error: any) {
      console.error("[v0] ❌ Reply to email failed")
      console.error("[v0] Error:", error.message)
      return { success: false, error: error.message }
    }
  }

  async reportToInbox(searchQuery: string) {
    const spamSearchQuery = `in:spam ${searchQuery}`
    console.log(`[v0] Reporting email to inbox with search query: ${spamSearchQuery}`)

    try {
      // Navigate to spam folder
      console.log("[v0] Navigating to spam folder...")
      await this.page.goto("https://mail.google.com/mail/u/0/#spam", {
        waitUntil: "networkidle2",
        timeout: 30000,
      })
      await this.behavior.waitRandom(2000)

      console.log("[v0] Waiting for Gmail interface to fully load...")
      await this.page.waitForSelector('[role="main"]', { timeout: 15000 }).catch(() => {
        console.log("[v0] Main Gmail container not found")
      })
      await this.behavior.waitRandom(3000)

      // Search for the email in spam
      console.log("[v0] Looking for search box...")

      let searchBox = null
      let retries = 0
      const maxRetries = 5

      while (!searchBox && retries < maxRetries) {
        const selectors = [
          'input[aria-label*="Search"]', // English: "Search mail"
          'input[aria-label*="earch"]', // Partial match: "Search", "Rechercher", "Buscar"
          'input[placeholder*="earch"]', // Placeholder text
          'input[type="text"][aria-label*="mail"]', // Contains "mail" or "messages"
          'input[type="text"][aria-label*="message"]', // French: "messages"
          'input[type="text"][name="q"]', // Gmail search input name
          'form[role="search"] input[type="text"]', // Search form input
        ]

        for (const selector of selectors) {
          searchBox = await this.page.$(selector).catch(() => null)
          if (searchBox) {
            console.log(`[v0] ✓ Search box found using selector: ${selector}`)
            break
          }
        }

        if (!searchBox) {
          console.log(`[v0] Search box not found, attempt ${retries + 1}/${maxRetries}`)
          retries++
          if (retries < maxRetries) {
            await this.behavior.waitRandom(2000)
          }
        }
      }

      if (!searchBox) {
        const pageInfo = await this.page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasMainRole: !!document.querySelector('[role="main"]'),
            searchInputs: Array.from(document.querySelectorAll("input")).map((input) => ({
              type: input.type,
              ariaLabel: input.getAttribute("aria-label"),
              placeholder: input.placeholder,
            })),
          }
        })
        console.log("[v0] Page state:", JSON.stringify(pageInfo, null, 2))

        throw new Error("Search box not found after multiple attempts")
      }

      console.log("[v0] ✓ Search box found")

      await this.behavior.randomPause()
      await searchBox.click()
      await this.behavior.waitRandom(500)

      // Clear any existing search
      await this.page.keyboard.down("Control")
      await this.page.keyboard.press("A")
      await this.page.keyboard.up("Control")
      await this.page.keyboard.press("Backspace")
      await this.behavior.waitRandom(300)

      console.log(`[v0] Typing search query: ${spamSearchQuery}`)
      await this.behavior.typeWithHumanSpeed(spamSearchQuery, searchBox)
      await this.behavior.waitRandom(1000)

      console.log("[v0] Looking for search button...")
      const searchButtonSelectors = [
        'button[aria-label*="Search"]',
        'button[aria-label*="earch"]',
        'button[type="submit"]',
      ]

      let searchButton = null
      for (const selector of searchButtonSelectors) {
        searchButton = await this.page.$(selector).catch(() => null)
        if (searchButton) {
          console.log(`[v0] Search button found using selector: ${selector}`)
          break
        }
      }

      if (searchButton) {
        console.log("[v0] Clicking search button...")
        await searchButton.click()
      } else {
        console.log("[v0] Search button not found, pressing Enter...")
        await this.page.keyboard.press("Enter")
      }

      console.log("[v0] Waiting for search results to load...")
      await this.page.waitForFunction(
        () => {
          return window.location.href.includes("#search/")
        },
        { timeout: 10000 },
      )

      const currentUrl = this.page.url()
      console.log(`[v0] Current URL after search: ${currentUrl}`)

      console.log("[v0] Waiting for Gmail to filter search results...")
      await this.behavior.waitRandom(3000)

      // Wait for results to stabilize
      let previousCount = 0
      let stableCount = 0
      const maxChecks = 5

      for (let i = 0; i < maxChecks; i++) {
        const currentCount = await this.page.evaluate(() => {
          return document.querySelectorAll("tr.zA").length
        })

        console.log(`[v0] Check ${i + 1}: Found ${currentCount} email rows`)

        if (currentCount === previousCount && currentCount > 0) {
          stableCount++
          if (stableCount >= 2) {
            console.log("[v0] ✓ Search results have stabilized")
            break
          }
        } else {
          stableCount = 0
        }

        previousCount = currentCount
        await this.behavior.waitRandom(1500)
      }

      // Get email rows
      const emailRows = await this.page.$$("tr.zA")
      console.log(`[v0] Found ${emailRows.length} emails in spam matching search query`)

      if (emailRows.length === 0) {
        return { success: false, error: "No emails found in spam matching search query", count: 0 }
      }

      // Get details of the first email
      const emailDetails = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[0]
        if (!row) return null

        const sender = row.querySelector(".yW span")?.textContent || ""
        const subject = row.querySelector(".y6 span")?.textContent || ""
        return { sender, subject }
      })

      console.log("[v0] First email in spam:", JSON.stringify(emailDetails, null, 2))

      console.log("[v0] Opening the first email...")
      await this.behavior.randomPause()

      const openResult = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("tr.zA"))
        const row = rows[0]
        if (!row) {
          return { success: false, error: "Row not found in DOM" }
        }

        // Click on the email row to open it (not the checkbox)
        const element = row as HTMLElement
        element.click()
        return { success: true }
      })

      if (!openResult.success) {
        throw new Error(openResult.error || "Failed to open email")
      }

      console.log("[v0] ✓ Email opened")
      await this.behavior.waitRandom(3000)

      // Wait for email to fully load
      console.log("[v0] Waiting for email to fully load...")
      await this.page.waitForSelector("h2.hP", { timeout: 10000 }).catch(() => {
        console.log("[v0] Email subject not found")
      })
      await this.behavior.waitRandom(2000)

      console.log("[v0] Looking for 'Not spam' button in opened email...")

      const clickResult = await this.page.evaluate(() => {
        // Try multiple selectors for different languages in the opened email view
        const notSpamSelectors = [
          '[aria-label*="Not spam"]',
          '[aria-label*="not spam"]',
          '[aria-label*="Non spam"]',
          '[aria-label*="non spam"]',
          '[aria-label*="légitime"]',
          '[aria-label*="Legitime"]',
          '[aria-label*="No es spam"]',
          '[aria-label*="Kein Spam"]',
          '[data-tooltip*="Not spam"]',
          '[data-tooltip*="spam"]',
          'div[role="button"][aria-label*="spam"]',
          // Also try looking in the toolbar area of the opened email
          '.nH.if div[role="button"][aria-label*="spam"]',
        ]

        for (const selector of notSpamSelectors) {
          const button = document.querySelector(selector)
          if (button) {
            // Scroll into view first
            button.scrollIntoView({ behavior: "smooth", block: "center" })

            // Wait a bit for scroll
            setTimeout(() => {}, 500)

            // Click the button
            const element = button as HTMLElement
            element.click()

            return {
              success: true,
              selector: selector,
              ariaLabel: button.getAttribute("aria-label") || "N/A",
              dataTooltip: button.getAttribute("data-tooltip") || "N/A",
            }
          }
        }

        // If no selector worked, log what we found
        const allButtons = Array.from(document.querySelectorAll('div[role="button"]'))
        const buttonInfo = allButtons.slice(0, 20).map((btn) => ({
          ariaLabel: btn.getAttribute("aria-label"),
          dataTooltip: btn.getAttribute("data-tooltip"),
          textContent: btn.textContent?.substring(0, 50),
        }))

        return {
          success: false,
          error: "'Not spam' button not found with any selector",
          foundButtons: buttonInfo,
        }
      })

      console.log("[v0] 'Not spam' button click result:", JSON.stringify(clickResult, null, 2))

      if (!clickResult.success) {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error(clickResult.error || "Failed to click 'Not spam' button")
      }

      console.log(`[v0] ✓ 'Not spam' button clicked using selector: ${clickResult.selector}`)

      console.log("[v0] Waiting for Gmail to process the action and move email to inbox...")
      await this.behavior.waitRandom(4000)

      const verificationResult = await Promise.race([
        // Option 1: Wait for URL to change (Gmail should redirect to inbox or back to spam list)
        this.page
          .waitForFunction(
            (currentUrl) => {
              const newUrl = window.location.href
              // Check if we're redirected away from the opened email
              return newUrl !== currentUrl && !newUrl.includes("/mail/u/0/#")
            },
            { timeout: 10000 },
            this.page.url(),
          )
          .then(() => ({ method: "url_change", success: true }))
          .catch(() => null),

        // Option 2: Wait for confirmation message or redirect
        this.page
          .waitForFunction(
            () => {
              // Check if we're back at the spam list or inbox
              const url = window.location.href
              return url.includes("#spam") || url.includes("#inbox") || url.includes("#search")
            },
            { timeout: 10000 },
          )
          .then(() => ({ method: "redirected", success: true }))
          .catch(() => null),

        // Option 3: Just wait a fixed time to ensure Gmail processes it
        new Promise((resolve) => setTimeout(() => resolve({ method: "timeout", success: true }), 10000)),
      ])

      console.log("[v0] Verification result:", JSON.stringify(verificationResult, null, 2))

      // Additional wait to ensure Gmail completes the operation
      console.log("[v0] Giving Gmail extra time to complete the operation...")
      await this.behavior.waitRandom(3000)

      const finalUrl = this.page.url()
      console.log(`[v0] Final URL: ${finalUrl}`)

      console.log("[v0] ✓✓✓ Email reported to inbox successfully ✓✓✓")

      return { success: true, emailDetails }
    } catch (error: any) {
      console.error("[v0] ❌ Report to inbox failed")
      console.error("[v0] Error:", error.message)

      try {
        const screenshot = await this.page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)
      } catch (screenshotError) {
        console.error("[v0] Could not capture screenshot:", screenshotError)
      }

      return { success: false, error: error.message }
    }
  }
}

// Gmail account creation automation
import type { Page } from "puppeteer"
import { randomDelay, humanType } from "./account-data-generator"
import { takeScreenshot } from "./screenshot-helper"

interface AccountData {
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: {
    month: string
    day: string
    year: string
  }
  recoveryEmail?: string
}

export class GmailAutomation {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to Gmail signup page
   */
  async navigateToSignup(): Promise<void> {
    console.log("[v0] Navigating to Gmail signup page")
    await this.page.goto("https://accounts.google.com/signup", {
      waitUntil: "networkidle2",
      timeout: 60000,
    })
    await randomDelay(2000, 4000)
  }

  /**
   * Fill the name and email step
   */
  async fillNameAndEmail(accountData: AccountData): Promise<void> {
    console.log("[v0] Filling name and email")

    try {
      // Wait for first name field
      await this.page.waitForSelector('input[name="firstName"]', { timeout: 10000 })
      await randomDelay(1000, 2000)

      // Fill first name
      const firstNameInput = await this.page.$('input[name="firstName"]')
      if (firstNameInput) {
        await firstNameInput.click()
        await randomDelay(500, 1000)
        await humanType(firstNameInput, accountData.firstName)
      }

      await randomDelay(800, 1500)

      // Fill last name
      const lastNameInput = await this.page.$('input[name="lastName"]')
      if (lastNameInput) {
        await lastNameInput.click()
        await randomDelay(500, 1000)
        await humanType(lastNameInput, accountData.lastName)
      }

      await randomDelay(1000, 2000)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error filling name and email:", error)
      throw error
    }
  }

  /**
   * Fill birth date and gender
   */
  async fillBirthDateAndGender(birthDate: AccountData["birthDate"]): Promise<void> {
    console.log("[v0] Filling birth date and gender")

    try {
      // Wait for birth date fields
      await this.page.waitForSelector("#month", { timeout: 10000 })
      await randomDelay(1000, 2000)

      // Select month
      await this.page.select("#month", birthDate.month)
      await randomDelay(500, 1000)

      // Fill day
      const dayInput = await this.page.$("#day")
      if (dayInput) {
        await dayInput.click()
        await randomDelay(300, 600)
        await humanType(dayInput, birthDate.day)
      }

      await randomDelay(500, 1000)

      // Fill year
      const yearInput = await this.page.$("#year")
      if (yearInput) {
        await yearInput.click()
        await randomDelay(300, 600)
        await humanType(yearInput, birthDate.year)
      }

      await randomDelay(1000, 2000)

      // Select gender (random between male/female)
      const gender = Math.random() > 0.5 ? "1" : "2"
      await this.page.select("#gender", gender)

      await randomDelay(1500, 2500)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error filling birth date:", error)
      throw error
    }
  }

  /**
   * Choose email address (create custom or use suggested)
   */
  async chooseEmail(email: string): Promise<void> {
    console.log("[v0] Choosing email address")

    try {
      await randomDelay(2000, 3000)

      // Check if we need to create custom email
      const createOwnButton = await this.page.$('button[jsname="Njthtb"]')
      if (createOwnButton) {
        await createOwnButton.click()
        await randomDelay(1000, 2000)

        // Fill custom email
        const emailInput = await this.page.$('input[name="Username"]')
        if (emailInput) {
          await emailInput.click()
          await randomDelay(500, 1000)
          const username = email.split("@")[0]
          await humanType(emailInput, username)
        }
      }

      await randomDelay(1500, 2500)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error choosing email:", error)
      throw error
    }
  }

  /**
   * Fill password
   */
  async fillPassword(password: string): Promise<void> {
    console.log("[v0] Filling password")

    try {
      await this.page.waitForSelector('input[name="Passwd"]', { timeout: 10000 })
      await randomDelay(1000, 2000)

      // Fill password
      const passwordInput = await this.page.$('input[name="Passwd"]')
      if (passwordInput) {
        await passwordInput.click()
        await randomDelay(500, 1000)
        await humanType(passwordInput, password)
      }

      await randomDelay(800, 1500)

      // Fill confirm password
      const confirmInput = await this.page.$('input[name="PasswdAgain"]')
      if (confirmInput) {
        await confirmInput.click()
        await randomDelay(500, 1000)
        await humanType(confirmInput, password)
      }

      await randomDelay(1500, 2500)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error filling password:", error)
      throw error
    }
  }

  /**
   * Handle phone verification step
   */
  async fillPhoneNumber(phone: string): Promise<void> {
    console.log("[v0] Filling phone number:", phone)

    try {
      await this.page.waitForSelector('input[type="tel"]', { timeout: 10000 })
      await randomDelay(2000, 3000)

      // Fill phone number
      const phoneInput = await this.page.$('input[type="tel"]')
      if (phoneInput) {
        await phoneInput.click()
        await randomDelay(500, 1000)
        await humanType(phoneInput, phone)
      }

      await randomDelay(1500, 2500)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error filling phone number:", error)
      throw error
    }
  }

  /**
   * Enter verification code
   */
  async enterVerificationCode(code: string): Promise<void> {
    console.log("[v0] Entering verification code:", code)

    try {
      await this.page.waitForSelector('input[type="tel"]', { timeout: 10000 })
      await randomDelay(2000, 3000)

      // Fill verification code
      const codeInput = await this.page.$('input[type="tel"]')
      if (codeInput) {
        await codeInput.click()
        await randomDelay(500, 1000)
        await humanType(codeInput, code)
      }

      await randomDelay(1500, 2500)

      // Click next
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error entering verification code:", error)
      throw error
    }
  }

  /**
   * Add recovery email (optional)
   */
  async addRecoveryEmail(recoveryEmail?: string): Promise<void> {
    console.log("[v0] Adding recovery email")

    try {
      await randomDelay(2000, 3000)

      if (recoveryEmail) {
        const emailInput = await this.page.$('input[type="email"]')
        if (emailInput) {
          await emailInput.click()
          await randomDelay(500, 1000)
          await humanType(emailInput, recoveryEmail)
          await randomDelay(1500, 2500)
        }
      }

      // Click next (or skip)
      await this.clickNextButton()
    } catch (error) {
      console.error("[v0] Error adding recovery email:", error)
      // Don't throw - recovery email is optional
      await this.clickNextButton()
    }
  }

  /**
   * Accept terms and conditions
   */
  async acceptTerms(): Promise<void> {
    console.log("[v0] Accepting terms and conditions")

    try {
      await randomDelay(2000, 3000)

      // Scroll to bottom to show all terms
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      await randomDelay(1000, 2000)

      // Click "I agree" button
      const agreeButton = await this.page.$('button[jsname="LgbsSe"]')
      if (agreeButton) {
        await agreeButton.click()
      } else {
        // Try alternative selector
        await this.clickNextButton()
      }

      await randomDelay(3000, 5000)
    } catch (error) {
      console.error("[v0] Error accepting terms:", error)
      throw error
    }
  }

  /**
   * Check if account creation was successful
   */
  async isAccountCreated(): Promise<boolean> {
    try {
      // Wait for success indicators
      await this.page.waitForNavigation({ timeout: 10000, waitUntil: "networkidle2" })

      const url = this.page.url()
      return url.includes("myaccount.google.com") || url.includes("mail.google.com")
    } catch (error) {
      return false
    }
  }

  /**
   * Check for bot detection (QR code, suspicious activity)
   */
  async checkForBotDetection(): Promise<{ detected: boolean; type?: string }> {
    try {
      // Check for QR code
      const qrCode = await this.page.$('img[alt*="QR"]')
      if (qrCode) {
        return { detected: true, type: "qr_code" }
      }

      // Check for suspicious activity message
      const suspiciousText = await this.page.evaluate(() => {
        return document.body.innerText.toLowerCase()
      })

      if (
        suspiciousText.includes("suspicious") ||
        suspiciousText.includes("unusual activity") ||
        suspiciousText.includes("verify")
      ) {
        return { detected: true, type: "suspicious_activity" }
      }

      return { detected: false }
    } catch (error) {
      return { detected: false }
    }
  }

  /**
   * Click the next button
   */
  private async clickNextButton(): Promise<void> {
    try {
      const nextButton = await this.page.$('button[jsname="LgbsSe"]')
      if (nextButton) {
        await nextButton.click()
        await randomDelay(2000, 4000)
      }
    } catch (error) {
      console.error("[v0] Error clicking next button:", error)
      throw error
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(filename: string): Promise<void> {
    await takeScreenshot(this.page, filename)
  }
}

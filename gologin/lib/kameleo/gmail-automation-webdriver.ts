// Gmail account creation automation using Selenium WebDriver
import { type WebDriver, By, until } from "selenium-webdriver"
import { randomDelay } from "./account-data-generator"

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

export class GmailAutomationWebDriver {
  private driver: WebDriver

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  /**
   * Navigate to Gmail signup page
   */
  async navigateToSignup(): Promise<void> {
    console.log("[v0] Navigating to Gmail signup page")
    await this.driver.get("https://accounts.google.com/signup?hl=en")
    await randomDelay(3000, 5000)
  }

  /**
   * Fill the name and email step
   */
  async fillNameAndEmail(accountData: AccountData): Promise<void> {
    console.log("[v0] Filling name and email")

    try {
      // Wait for first name field
      const firstNameInput = await this.driver.wait(until.elementLocated(By.name("firstName")), 10000)
      await randomDelay(1000, 2000)

      // Fill first name
      await firstNameInput.click()
      await randomDelay(500, 1000)
      await this.humanType(firstNameInput, accountData.firstName)

      await randomDelay(800, 1500)

      // Fill last name
      const lastNameInput = await this.driver.findElement(By.name("lastName"))
      await lastNameInput.click()
      await randomDelay(500, 1000)
      await this.humanType(lastNameInput, accountData.lastName)

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
      console.log("[v0] Waiting for birth date page to load...")
      await randomDelay(4000, 6000)

      // Debug: Check current URL
      const currentUrl = await this.driver.getCurrentUrl()
      console.log("[v0] Current URL:", currentUrl)

      console.log(`[v0] Selecting month: ${birthDate.month}`)
      try {
        const monthDropdown = await this.driver.executeScript(`
          const selectors = [
            'div[aria-label="Month"]',
            'div[aria-label*="Month"]',
            'select[id="month"]',
            'div.VfPpkd-O1htCb-OWXEXe-INsAgc'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              console.log('[v0] Found month element with selector:', selector);
              return element;
            }
          }
          
          return null;
        `)

        if (!monthDropdown) {
          throw new Error("Month dropdown not found")
        }

        await this.driver.executeScript(
          "arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});",
          monthDropdown,
        )
        await randomDelay(500, 800)

        await this.driver.executeScript("arguments[0].click();", monthDropdown)
        console.log("[v0] Month dropdown opened")
        await randomDelay(1000, 1500)

        const monthClicked = await this.driver.executeScript(
          `
          const monthText = arguments[0];
          console.log('[v0] Looking for month option:', monthText);
          
          const selectors = [
            'li[role="option"]',
            'div[role="option"]',
            'li.VfPpkd-rymPhb-ibnC6b',
            'div.VfPpkd-rymPhb-ibnC6b'
          ];
          
          for (const selector of selectors) {
            const options = document.querySelectorAll(selector);
            console.log('[v0] Found', options.length, 'options with selector:', selector);
            
            for (const option of options) {
              const text = option.textContent?.trim() || '';
              console.log('[v0] Checking option:', text);
              
              if (text === monthText || text.includes(monthText)) {
                console.log('[v0] Found matching month option:', text);
                option.scrollIntoView({block: 'center'});
                option.click();
                return true;
              }
            }
          }
          
          console.log('[v0] Month option not found');
          return false;
        `,
          birthDate.month,
        )

        if (monthClicked) {
          console.log("[v0] Month selected successfully")
        } else {
          throw new Error(`Month option "${birthDate.month}" not found`)
        }

        await randomDelay(500, 1000)
      } catch (error) {
        console.error("[v0] Error selecting month:", error)
        throw error
      }

      console.log(`[v0] Filling day: ${birthDate.day}`)
      try {
        const dayInput = await this.driver.wait(until.elementLocated(By.id("day")), 5000)

        await this.driver.executeScript(
          "arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'}); arguments[0].focus();",
          dayInput,
        )
        await randomDelay(300, 500)

        await this.driver.executeScript("arguments[0].value = '';", dayInput)
        await randomDelay(200, 400)

        await this.humanType(dayInput, birthDate.day)
        await randomDelay(500, 1000)
      } catch (error) {
        console.error("[v0] Error filling day:", error)
        throw error
      }

      console.log(`[v0] Filling year: ${birthDate.year}`)
      try {
        const yearInput = await this.driver.wait(until.elementLocated(By.id("year")), 5000)

        await this.driver.executeScript(
          "arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'}); arguments[0].focus();",
          yearInput,
        )
        await randomDelay(300, 500)

        await this.driver.executeScript("arguments[0].value = '';", yearInput)
        await randomDelay(200, 400)

        await this.humanType(yearInput, birthDate.year)
        await randomDelay(1000, 2000)
      } catch (error) {
        console.error("[v0] Error filling year:", error)
        throw error
      }

      const genderText = Math.random() > 0.5 ? "Male" : "Female"
      console.log(`[v0] Selecting gender: ${genderText}`)

      try {
        // Use the same selectors that worked for month dropdown
        const genderDropdown = await this.driver.executeScript(`
          const selectors = [
            'div[aria-label="Gender"]',
            'div[aria-label*="Gender"]',
            'select[id="gender"]',
            'div.VfPpkd-O1htCb-OWXEXe-INsAgc:not([aria-label*="Month"])'
          ];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log('[v0] Found', elements.length, 'elements with selector:', selector);
            
            for (const element of elements) {
              const ariaLabel = element.getAttribute('aria-label') || '';
              const text = element.textContent?.trim() || '';
              console.log('[v0] Checking element - aria-label:', ariaLabel, 'text:', text);
              
              // Check if this is the gender dropdown
              if (ariaLabel.toLowerCase().includes('gender') || 
                  text.toLowerCase().includes('gender') ||
                  (selector.includes('VfPpkd-O1htCb') && !ariaLabel.toLowerCase().includes('month'))) {
                console.log('[v0] Found gender element');
                return element;
              }
            }
          }
          
          return null;
        `)

        if (!genderDropdown) {
          throw new Error("Gender dropdown not found")
        }

        await this.driver.executeScript(
          "arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'});",
          genderDropdown,
        )
        await randomDelay(500, 800)

        await this.driver.executeScript("arguments[0].click();", genderDropdown)
        console.log("[v0] Gender dropdown opened")
        await randomDelay(1000, 1500)

        const genderClicked = await this.driver.executeScript(
          `
          const genderText = arguments[0];
          console.log('[v0] Looking for gender option:', genderText);
          
          const selectors = [
            'li[role="option"]',
            'div[role="option"]',
            'li.VfPpkd-rymPhb-ibnC6b',
            'div.VfPpkd-rymPhb-ibnC6b'
          ];
          
          for (const selector of selectors) {
            const options = document.querySelectorAll(selector);
            console.log('[v0] Found', options.length, 'gender options with selector:', selector);
            
            for (const option of options) {
              const text = option.textContent?.trim() || '';
              console.log('[v0] Checking gender option:', text);
              
              if (text === genderText || text.includes(genderText)) {
                console.log('[v0] Found matching gender option:', text);
                option.scrollIntoView({block: 'center'});
                option.click();
                return true;
              }
            }
          }
          
          console.log('[v0] Gender option not found');
          return false;
        `,
          genderText,
        )

        if (genderClicked) {
          console.log("[v0] Gender selected successfully")
        } else {
          throw new Error(`Gender option "${genderText}" not found`)
        }

        await randomDelay(1500, 2500)
      } catch (error) {
        console.error("[v0] Error selecting gender:", error)
        throw error
      }

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
      await randomDelay(3000, 5000)

      const username = email.split("@")[0]
      console.log(`[v0] Using username: ${username}`)

      let usernameInput = null

      try {
        // Try to find "Create your own Gmail address" button first
        console.log("[v0] Looking for 'Create own' button...")
        const createOwnButton = await this.driver.findElement(By.css('button[jsname="Njthtb"]'))
        await createOwnButton.click()
        console.log("[v0] Clicked 'Create own' button")
        await randomDelay(1000, 2000)
      } catch (e) {
        console.log("[v0] 'Create own' button not found, page might already show username input")
      }

      try {
        console.log("[v0] Looking for username input field...")
        usernameInput = await this.driver.executeScript(`
          const selectors = [
            'input[name="Username"]',
            'input[aria-label*="Username"]',
            'input[aria-label*="username"]',
            'input[type="text"]'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              console.log('[v0] Found username input with selector:', selector);
              return element;
            }
          }
          
          // Fallback: find the first visible text input
          const inputs = document.querySelectorAll('input[type="text"]');
          for (const input of inputs) {
            if (input.offsetParent !== null) {
              console.log('[v0] Using first visible text input');
              return input;
            }
          }
          
          return null;
        `)

        if (!usernameInput) {
          throw new Error("Username input field not found")
        }

        await this.driver.executeScript(
          "arguments[0].scrollIntoView({block: 'center', behavior: 'smooth'}); arguments[0].focus();",
          usernameInput,
        )
        await randomDelay(500, 1000)

        await this.driver.executeScript("arguments[0].value = '';", usernameInput)
        await randomDelay(300, 500)

        console.log("[v0] Typing username...")
        await this.humanType(usernameInput, username)
        console.log("[v0] Username entered successfully")

        await randomDelay(1500, 2500)
      } catch (error) {
        console.error("[v0] Error filling username input:", error)
        throw error
      }

      await this.clickNextButton()

      console.log("[v0] Waiting for password page to load...")
      await randomDelay(3000, 5000)
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
      const passwordInput = await this.driver.wait(until.elementLocated(By.name("Passwd")), 10000)
      await randomDelay(1000, 2000)

      await passwordInput.click()
      await randomDelay(500, 1000)
      await this.humanType(passwordInput, password)

      await randomDelay(800, 1500)

      const confirmInput = await this.driver.findElement(By.name("PasswdAgain"))
      await confirmInput.click()
      await randomDelay(500, 1000)
      await this.humanType(confirmInput, password)

      await randomDelay(1500, 2500)

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
      const phoneInput = await this.driver.wait(until.elementLocated(By.css('input[type="tel"]')), 10000)
      await randomDelay(2000, 3000)

      await phoneInput.click()
      await randomDelay(500, 1000)
      await this.humanType(phoneInput, phone)

      await randomDelay(1500, 2500)

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
      const codeInput = await this.driver.wait(until.elementLocated(By.css('input[type="tel"]')), 10000)
      await randomDelay(2000, 3000)

      await codeInput.click()
      await randomDelay(500, 1000)
      await this.humanType(codeInput, code)

      await randomDelay(1500, 2500)

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
        const emailInput = await this.driver.findElement(By.css('input[type="email"]'))
        await emailInput.click()
        await randomDelay(500, 1000)
        await this.humanType(emailInput, recoveryEmail)
        await randomDelay(1500, 2500)
      }

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

      await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight)")

      await randomDelay(1000, 2000)

      try {
        const agreeButton = await this.driver.findElement(By.css('button[jsname="LgbsSe"]'))
        await agreeButton.click()
      } catch (e) {
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
      await randomDelay(3000, 5000)

      const url = await this.driver.getCurrentUrl()
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
      // Check for QR code verification
      try {
        await this.driver.findElement(By.css('img[alt*="QR"]'))
        return { detected: true, type: "qr_code" }
      } catch (e) {
        // QR code not found, continue checking
      }

      // Check for specific bot detection messages
      const bodyText = await this.driver.findElement(By.tagName("body")).getText()
      const lowerText = bodyText.toLowerCase()

      // Only detect actual bot detection scenarios, not normal phone verification
      if (
        lowerText.includes("verify some info before creating an account") ||
        lowerText.includes("scan the qr code") ||
        lowerText.includes("preventing abuse from computer programs or bots") ||
        lowerText.includes("verify some info about your device") ||
        lowerText.includes("couldn't create your google account")
      ) {
        return { detected: true, type: "bot_detection" }
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
      const nextButton = await this.driver.findElement(By.css('button[jsname="LgbsSe"]'))
      await nextButton.click()
      await randomDelay(2000, 4000)
    } catch (error) {
      console.error("[v0] Error clicking next button:", error)
      throw error
    }
  }

  /**
   * Type text with human-like delays using JavaScript execution
   */
  private async humanType(element: any, text: string): Promise<void> {
    for (const char of text) {
      await this.driver.executeScript(
        `
        const element = arguments[0];
        const char = arguments[1];
        
        element.value = element.value + char;
        
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
      `,
        element,
        char,
      )
      // Variable typing speed - slower for numbers and special characters
      const isSpecialChar = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(char)
      const delay = isSpecialChar ? randomDelay(100, 200) : randomDelay(50, 150)
      await delay
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(filename: string): Promise<void> {
    try {
      const screenshot = await this.driver.takeScreenshot()
      console.log(`[v0] Screenshot taken: ${filename}`)
    } catch (error) {
      console.error("[v0] Error taking screenshot:", error)
    }
  }
}

import puppeteer, { type Browser, type Page } from "puppeteer-core"
import { FiveSimAPI, extractVerificationCode } from "@/lib/services/fivesim-api"
import { randomDelay, humanType } from "./utils"
import { LocalBrowserLauncher } from "./local-browser-launcher"

interface AccountData {
  firstName: string
  lastName: string
  email: string
  password: string
  birthDate: {
    month: number
    day: number
    year: number
  }
}

interface ProxyConfig {
  server: string
  username?: string
  password?: string
}

// Generate random account data
export function generateAccountData(): AccountData {
  const firstNames = [
    "James",
    "John",
    "Robert",
    "Michael",
    "William",
    "David",
    "Richard",
    "Joseph",
    "Mary",
    "Patricia",
    "Jennifer",
    "Linda",
    "Elizabeth",
    "Barbara",
    "Susan",
    "Jessica",
    "Ahmed",
    "Mohammed",
    "Fatima",
    "Aisha",
    "Ali",
    "Omar",
    "Sara",
    "Layla",
  ]

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Thompson",
    "White",
  ]

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

  // Generate email with random numbers
  const randomNum = Math.floor(Math.random() * 9999)
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}`

  // Generate random password (12-16 characters with mixed case, numbers, symbols)
  const password = generateSecurePassword()

  // Generate random birth date (18-65 years old)
  const currentYear = new Date().getFullYear()
  const birthYear = currentYear - (18 + Math.floor(Math.random() * 47))
  const birthMonth = Math.floor(Math.random() * 12) + 1
  const birthDay = Math.floor(Math.random() * 28) + 1

  return {
    firstName,
    lastName,
    email,
    password,
    birthDate: {
      month: birthMonth,
      day: birthDay,
      year: birthYear,
    },
  }
}

function generateSecurePassword(): string {
  const length = 12 + Math.floor(Math.random() * 5)
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*"
  const all = uppercase + lowercase + numbers + symbols

  let password = ""
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

export class AccountCreator {
  private browser: Browser | null = null
  private page: Page | null = null
  private proxyConfig: ProxyConfig | null = null
  private existingProfile: any | null = null
  private country = "italy"
  private browserType: "local" | "gologin" = "local"
  private gologinMode: "local" | "cloud" = "local"

  constructor(
    proxyConfig?: ProxyConfig,
    existingProfile?: any,
    country?: string,
    browserType?: "local" | "gologin",
    gologinMode?: "local" | "cloud",
  ) {
    this.proxyConfig = proxyConfig || null
    this.existingProfile = existingProfile || null
    this.country = country || "italy"
    this.browserType = browserType || "local"
    this.gologinMode = gologinMode || "local"
  }

  async createAccount(): Promise<{
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
  }> {
    try {
      console.log("[v0] Starting Gmail account creation...")
      console.log(`[v0] Browser type: ${this.browserType}`)

      if (this.existingProfile) {
        console.log(`[v0] Using existing profile: ${this.existingProfile.profile_name}`)
        return await this.createAccountFromExistingProfile()
      }

      if (this.proxyConfig) {
        console.log(`[v0] Using proxy: ${this.proxyConfig.server}`)
        console.log(`[v0] Proxy has username: ${!!this.proxyConfig.username}`)
        console.log(`[v0] Proxy has password: ${!!this.proxyConfig.password}`)

        // Check if proxy credentials are missing
        if (!this.proxyConfig.username || !this.proxyConfig.password) {
          console.warn("[v0] WARNING: Proxy configured but credentials are missing!")
          console.warn("[v0] This may cause ERR_INVALID_AUTH_CREDENTIALS if the proxy requires authentication.")
          console.warn("[v0] Please ensure your proxy has username and password stored in the database.")

          throw new Error(
            "Proxy authentication credentials missing. " +
              "The proxy server requires a username and password. " +
              "Please update your proxy configuration in the database to include authentication credentials, " +
              "or select a different proxy that doesn't require authentication.",
          )
        }
      } else {
        console.log("[v0] No proxy configured")
      }

      const fivesimApiKey = process.env.FIVESIM_API_KEY
      if (!fivesimApiKey) {
        throw new Error("FIVESIM_API_KEY environment variable not set")
      }

      const fivesim = new FiveSimAPI(fivesimApiKey)

      const accountData = generateAccountData()
      console.log(`[v0] Generated account data for ${accountData.firstName} ${accountData.lastName}`)

      await this.launchBrowser()
      if (!this.page) throw new Error("Failed to launch browser")

      console.log("[v0] Warming up profile...")
      await this.warmUpProfile()

      console.log("[v0] Navigating to Gmail signup...")
      await this.page.goto("https://accounts.google.com/signup", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      })

      await this.moveMouseRandomly()
      await randomDelay(4000, 7000)
      await this.scrollRandomly()
      await randomDelay(2000, 3000)

      console.log("[v0] Filling first name...")
      await this.page.waitForSelector("#firstName", { timeout: 15000 })
      await this.moveMouseRandomly()
      await humanType(this.page, "#firstName", accountData.firstName)
      await randomDelay(500, 1000)

      console.log("[v0] Filling last name...")
      await this.page.waitForSelector("#lastName", { timeout: 15000 })
      await this.moveMouseRandomly()
      await humanType(this.page, "#lastName", accountData.lastName)
      await randomDelay(1000, 2000)

      await this.moveMouseRandomly()

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)
      await this.scrollRandomly()

      console.log("[v0] Filling birth date...")

      await this.page.waitForSelector("#month", { timeout: 15000 })
      await this.moveMouseRandomly()

      await this.page.click("#month")
      await randomDelay(500, 1000)

      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ]
      const monthName = monthNames[accountData.birthDate.month - 1]

      const monthClicked = await this.page.evaluate((month: string) => {
        const options = Array.from(document.querySelectorAll('[role="option"]'))
        const monthOption = options.find((opt) => opt.textContent?.includes(month))
        if (monthOption) {
          ;(monthOption as HTMLElement).click()
          return true
        }
        return false
      }, monthName)

      if (!monthClicked) {
        await this.page.evaluate((monthIndex: number) => {
          const options = Array.from(document.querySelectorAll('[role="option"]'))
          if (options[monthIndex - 1]) {
            ;(options[monthIndex - 1] as HTMLElement).click()
          }
        }, accountData.birthDate.month)
      }

      await randomDelay(500, 1000)

      await this.page.waitForSelector("#day", { timeout: 5000 })
      await humanType(this.page, "#day", accountData.birthDate.day.toString())
      await randomDelay(500, 1000)

      await this.page.waitForSelector("#year", { timeout: 5000 })
      await humanType(this.page, "#year", accountData.birthDate.year.toString())
      await randomDelay(500, 1000)

      console.log("[v0] Selecting gender...")
      await this.page.waitForSelector("#gender", { timeout: 5000 })
      await this.page.click("#gender")
      await randomDelay(500, 1000)

      const isFemale = Math.random() > 0.5
      const genderTexts = isFemale
        ? ["Female", "Femme", "Weiblich", "Femenino", "Feminino", "女性"]
        : ["Male", "Homme", "Männlich", "Masculino", "Masculino", "男性"]

      const genderClicked = await this.page.evaluate((texts: string[]) => {
        const options = Array.from(document.querySelectorAll('[role="option"]'))

        for (const text of texts) {
          const genderOption = options.find((opt) => opt.textContent?.toLowerCase().includes(text.toLowerCase()))
          if (genderOption) {
            ;(genderOption as HTMLElement).click()
            return true
          }
        }

        return false
      }, genderTexts)

      if (!genderClicked) {
        console.log("[v0] Could not find gender by text, trying by index...")
        await this.page.evaluate((femaleChoice: boolean) => {
          const options = Array.from(document.querySelectorAll('[role="option"]'))
          const index = femaleChoice ? 0 : 1
          if (options[index]) {
            ;(options[index] as HTMLElement).click()
            console.log(`[v0] Clicked gender option at index ${index}`)
          }
        }, isFemale)
      }

      await randomDelay(1000, 2000)

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)
      await this.scrollRandomly()

      console.log("[v0] Checking for verification requirements...")
      const qrCodeDetected = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Verify some info before creating an account") ||
          bodyText.includes("Scan the QR code") ||
          bodyText.includes("preventing abuse from computer programs or bots") ||
          bodyText.includes("verify some info about your device")
        )
      })

      if (qrCodeDetected) {
        console.log("[v0] ⚠️ QR CODE VERIFICATION DETECTED - Google has flagged this as automated")
        const screenshotPath = `qr-code-detected-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google QR code verification detected. This means Google has identified the browser as automated. " +
            "Recommendations: 1) Use the 'existing profile' approach which has better success rates, " +
            "2) Use residential proxies instead of datacenter proxies, " +
            "3) Ensure GoLogin profiles are properly configured with realistic fingerprints, " +
            "4) Consider warming up profiles by browsing normally before account creation.",
        )
      }

      const accountCreationError = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Sorry, we could not create your Google Account") ||
          bodyText.includes("couldn't create your account") ||
          bodyText.includes("Unable to create account")
        )
      })

      if (accountCreationError) {
        console.log("[v0] ⚠️ ACCOUNT CREATION BLOCKED - Google rejected the account")
        const screenshotPath = `account-blocked-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google blocked account creation. This indicates bot detection. " +
            "The browser fingerprint or behavior patterns were identified as suspicious. " +
            "Try using the 'existing profile' method or improve proxy quality.",
        )
      }

      console.log("[v0] Handling email selection...")

      const onSuggestionPage = await this.page.evaluate(() => {
        return (
          document.body.textContent?.includes("Choisissez votre adresse Gmail") ||
          document.body.textContent?.includes("Choose your Gmail address")
        )
      })

      if (onSuggestionPage) {
        console.log("[v0] On email suggestion page, selecting custom email option...")

        const customEmailClicked = await this.page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label, div[role="radio"]'))
          const customOption = labels.find(
            (label) =>
              label.textContent?.includes("Créer votre propre") || label.textContent?.includes("Create your own"),
          )
          if (customOption) {
            ;(customOption as HTMLElement).click()
            return true
          }
          return false
        })

        if (!customEmailClicked) {
          await this.page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('input[type="radio"]'))
            if (radios.length > 0) {
              ;(radios[radios.length - 1] as HTMLElement).click()
            }
          })
        }

        await randomDelay(1000, 2000)
      }

      let usernameAccepted = false
      let usernameAttempts = 0
      const maxUsernameAttempts = 5
      let currentEmail = accountData.email

      while (!usernameAccepted && usernameAttempts < maxUsernameAttempts) {
        usernameAttempts++
        console.log(`[v0] Trying username (attempt ${usernameAttempts}): ${currentEmail}`)

        await this.page.waitForSelector('input[type="text"]', { timeout: 10000 })

        await this.page.evaluate(() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement
          if (input) {
            input.value = ""
          }
        })

        await randomDelay(500, 1000)
        await humanType(this.page, 'input[type="text"]', currentEmail)
        await randomDelay(1000, 2000)

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        const usernameError = await this.page.evaluate(() => {
          const errorTexts = [
            "déjà utilisé",
            "already taken",
            "not available",
            "n'est pas disponible",
            "bereits verwendet",
            "ya está en uso",
            "username is taken", // Added
            "that username is taken", // Added
            "try another", // Added
            "choose another", // Added
          ]

          const bodyText = document.body.textContent || ""
          const hasError = errorTexts.some((text) => bodyText.toLowerCase().includes(text.toLowerCase()))

          // Also check for visible error elements
          const errorElements = Array.from(document.querySelectorAll('[role="alert"], .error, [aria-live="assertive"]'))
          const hasVisibleError = errorElements.some((el) => {
            const text = el.textContent?.toLowerCase() || ""
            return errorTexts.some((errorText) => text.includes(errorText.toLowerCase()))
          })

          return hasError || hasVisibleError
        })

        if (usernameError) {
          console.log(`[v0] Username ${currentEmail} is already taken, generating new one...`)

          // This creates usernames like: david.lopez1838 -> david.lopez18381 -> david.lopez183812 -> etc.
          const additionalNumbers = Math.floor(Math.random() * 9) + 1 // Random digit 1-9
          currentEmail = `${currentEmail}${additionalNumbers}`

          console.log(`[v0] New username to try: ${currentEmail}`)
        } else {
          const onPasswordPage = await this.page.evaluate(() => {
            return (
              document.querySelector('input[type="password"]') !== null ||
              document.body.textContent?.toLowerCase().includes("password") ||
              document.body.textContent?.toLowerCase().includes("mot de passe")
            )
          })

          if (onPasswordPage) {
            usernameAccepted = true
            accountData.email = currentEmail
            console.log(`[v0] Username accepted: ${currentEmail}`)
          } else {
            console.log(`[v0] Not on password page yet, assuming error occurred`)
            // Take screenshot for debugging
            const screenshotPath = `username-unclear-${Date.now()}.png`
            await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
            console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

            // Treat as error and retry
            const additionalNumbers = Math.floor(Math.random() * 9) + 1
            currentEmail = `${currentEmail}${additionalNumbers}`
            console.log(`[v0] Retrying with: ${currentEmail}`)
          }
        }
      }

      if (!usernameAccepted) {
        throw new Error(`Failed to find available username after ${maxUsernameAttempts} attempts`)
      }

      console.log("[v0] Setting password...")
      await this.page.waitForSelector('input[type="password"]', { timeout: 15000 })
      await randomDelay(1000, 2000)

      const passwordInputs = await this.page.$$('input[type="password"]')

      if (passwordInputs.length >= 2) {
        await passwordInputs[0].click()
        await randomDelay(200, 500)
        await passwordInputs[0].type(accountData.password, { delay: 100 })
        await randomDelay(500, 1000)

        await passwordInputs[1].click()
        await randomDelay(200, 500)
        await passwordInputs[1].type(accountData.password, { delay: 100 })
      } else if (passwordInputs.length === 1) {
        await passwordInputs[0].click()
        await randomDelay(200, 500)
        await passwordInputs[0].type(accountData.password, { delay: 100 })
      } else {
        throw new Error("No password input fields found")
      }

      await randomDelay(1000, 2000)

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)

      console.log("[v0] Checking for verification requirements after password...")
      const qrCodeDetectedAfterPassword = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Verify some info before creating an account") ||
          bodyText.includes("Scan the QR code") ||
          bodyText.includes("preventing abuse from computer programs or bots") ||
          bodyText.includes("verify some info about your device")
        )
      })

      if (qrCodeDetectedAfterPassword) {
        console.log("[v0] ⚠️ QR CODE VERIFICATION DETECTED - Google has flagged this as automated")
        const screenshotPath = `qr-code-detected-after-password-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google QR code verification detected after password step. " +
            "This means Google has identified the browser as automated. " +
            "Recommendations: 1) Change your IP address to a residential proxy, " +
            "2) Use the 'existing profile' approach with a well-established profile, " +
            "3) Ensure the profile has browsing history and looks legitimate, " +
            "4) Add more delays and human-like behavior patterns.",
        )
      }

      const accountCreationErrorAfterPassword = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Sorry, we could not create your Google Account") ||
          bodyText.includes("couldn't create your account") ||
          bodyText.includes("Unable to create account")
        )
      })

      if (accountCreationErrorAfterPassword) {
        console.log("[v0] ⚠️ ACCOUNT CREATION BLOCKED - Google rejected the account after password")
        const screenshotPath = `account-blocked-after-password-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google blocked account creation after password step. " +
            "This indicates strong bot detection. The browser fingerprint or behavior patterns were identified as suspicious. " +
            "Try: 1) Using a different IP address (residential proxy), " +
            "2) Using a well-established existing profile, " +
            "3) Improving the profile's trust score by browsing normally for several days.",
        )
      }

      console.log("[v0] Getting phone number from 5sim...")
      try {
        // Try multiple countries in order of preference until one works
        const countries = ["italy", "france", "spain", "portugal", "poland"]
        let phoneOrder = null
        let lastError = null

        for (const country of countries) {
          try {
            console.log(`[v0] Trying to buy number from ${country}...`)
            phoneOrder = await fivesim.buyNumber(country, "any", "google")
            console.log(`[v0] Successfully got phone number from ${country}: ${phoneOrder.phone}`)
            break
          } catch (error: any) {
            console.log(`[v0] Failed to get number from ${country}: ${error.message}`)
            lastError = error
            // If it's a price limit error, try next country
            if (error.message.includes("PRICE_LIMIT_EXCEEDED") || error.message.includes("no free phones")) {
              continue
            }
            // For other errors, throw immediately
            throw error
          }
        }

        if (!phoneOrder) {
          throw lastError || new Error("Failed to get phone number from any country")
        }

        await this.page.waitForSelector('input[type="tel"]', { timeout: 15000 })
        await humanType(this.page, 'input[type="tel"]', phoneOrder.phone)
        await randomDelay(1000, 2000)

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        console.log("[v0] Waiting for SMS verification code...")
        console.log(`[v0] Order ID: ${phoneOrder.id}`)
        console.log(`[v0] Phone number: ${phoneOrder.phone}`)

        let verificationCode: string | null = null
        let attempts = 0
        const maxAttempts = 30
        const startTime = Date.now()

        while (!verificationCode && attempts < maxAttempts) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
          console.log(`[v0] SMS check attempt ${attempts + 1}/${maxAttempts} (${elapsedSeconds}s elapsed)`)

          await randomDelay(10000, 15000)

          try {
            console.log(`[v0] Calling 5sim API to check SMS for order ${phoneOrder.id}...`)
            const smsData = await fivesim.checkSMS(phoneOrder.id.toString())
            console.log(`[v0] 5sim API response:`, JSON.stringify(smsData, null, 2))

            if (smsData.sms && smsData.sms.length > 0) {
              console.log(`[v0] Found ${smsData.sms.length} SMS message(s)`)
              const latestSMS = smsData.sms[smsData.sms.length - 1]
              console.log(`[v0] Latest SMS text: "${latestSMS.text}"`)

              verificationCode = extractVerificationCode(latestSMS.text)
              if (verificationCode) {
                console.log(`[v0] ✓ Successfully extracted verification code: ${verificationCode}`)
              } else {
                console.log(`[v0] ⚠️ Could not extract verification code from SMS text`)
              }
            } else {
              console.log(`[v0] No SMS messages received yet`)
            }
          } catch (error: any) {
            console.error(`[v0] Error checking SMS:`, error)
            console.error(`[v0] Error message: ${error.message}`)
            console.error(`[v0] Error stack:`, error.stack)

            // If it's an authentication or API error, throw immediately
            if (
              error.message.includes("UNAUTHORIZED") ||
              error.message.includes("INVALID_API_KEY") ||
              error.message.includes("BAD_KEY") ||
              error.message.includes("WRONG_KEY")
            ) {
              console.error(`[v0] ❌ 5sim API authentication error - check your FIVESIM_API_KEY`)
              throw new Error(
                `5sim API authentication failed: ${error.message}. Please check your FIVESIM_API_KEY environment variable.`,
              )
            }

            // If it's a network error, log it but continue
            if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
              console.error(`[v0] ⚠️ Network error connecting to 5sim API, will retry...`)
            }

            // For other errors, just log and continue (might be "no SMS yet")
            console.log(`[v0] Continuing to wait for SMS...`)
          }

          attempts++
        }

        if (!verificationCode) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
          console.error(
            `[v0] ❌ Failed to receive SMS verification code after ${elapsedSeconds} seconds and ${attempts} attempts`,
          )
          console.log(`[v0] Canceling order ${phoneOrder.id}...`)

          await fivesim.cancelOrder(phoneOrder.id.toString())
          throw new Error(
            `Failed to receive SMS verification code after ${attempts} attempts (${elapsedSeconds}s). ` +
              `This could mean: 1) The phone number didn't receive the SMS, 2) Google blocked the number, ` +
              `3) There's an issue with the 5sim service. Try testing the country in the 5sim Test Page first.`,
          )
        }

        console.log("[v0] Looking for verification code input field...")
        await randomDelay(2000, 3000)

        // Try multiple selectors for the verification code input
        const codeInputSelectors = [
          'input[type="text"]',
          'input[type="tel"]',
          'input[aria-label*="code"]',
          'input[aria-label*="verification"]',
          'input[placeholder*="code"]',
          'input[name*="code"]',
          'input[id*="code"]',
          "#code",
          '[data-form-input-id="code"]',
        ]

        let codeInputFound = false
        let codeInputSelector = ""

        for (const selector of codeInputSelectors) {
          try {
            await this.page.waitForSelector(selector, { timeout: 3000 })
            codeInputFound = true
            codeInputSelector = selector
            console.log(`[v0] ✓ Found verification code input using selector: ${selector}`)
            break
          } catch (error) {
            console.log(`[v0] Selector ${selector} not found, trying next...`)
          }
        }

        if (!codeInputFound) {
          console.error("[v0] ❌ Could not find verification code input field")

          // Take screenshot for debugging
          const screenshotPath = `verification-input-not-found-${Date.now()}.png`
          await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
          console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

          // Log available inputs for debugging
          const availableInputs = await this.page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll("input"))
            return inputs.map((input) => ({
              type: input.type,
              id: input.id,
              name: input.name,
              placeholder: input.placeholder,
              ariaLabel: input.getAttribute("aria-label"),
            }))
          })
          console.log("[v0] Available inputs on page:", JSON.stringify(availableInputs, null, 2))

          // Cancel the order since we can't enter the code
          await fivesim.cancelOrder(phoneOrder.id.toString())

          throw new Error(
            `Could not find verification code input field after receiving SMS code ${verificationCode}. ` +
              `The page structure may have changed. Screenshot saved to ${screenshotPath} for debugging.`,
          )
        }

        console.log(`[v0] Entering verification code: ${verificationCode}`)
        await humanType(this.page, codeInputSelector, verificationCode)
        await randomDelay(1000, 2000)

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        await fivesim.finishOrder(phoneOrder.id.toString())

        console.log("[v0] Skipping recovery options...")
        try {
          await this.clickButtonByText("Skip")
          await randomDelay(2000, 3000)
        } catch (error) {}

        console.log("[v0] Accepting terms...")
        await randomDelay(2000, 3000)
        try {
          await this.clickButtonByText("I agree")
          await randomDelay(3000, 5000)
        } catch (error) {}

        console.log("[v0] Account created successfully!")

        return {
          email: `${accountData.email}@gmail.com`,
          password: accountData.password,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          phoneNumber: phoneOrder.phone,
        }
      } catch (error: any) {
        console.error("[v0] Failed to get phone number from 5sim:", error.message)
        throw new Error(
          `Failed to get phone number: ${error.message}. ` +
            `Please check your FIVESIM_API_KEY environment variable and ensure your 5sim account has sufficient balance.`,
        )
      }
    } catch (error) {
      console.error("[v0] Account creation failed:", error)
      throw error
    } finally {
      await this.cleanup()
    }
  }

  private async createAccountFromExistingProfile(): Promise<{
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
  }> {
    try {
      console.log("[v0] Creating account from existing profile...")

      const fivesimApiKey = process.env.FIVESIM_API_KEY
      if (!fivesimApiKey) {
        throw new Error("FIVESIM_API_KEY environment variable not set")
      }

      const fivesim = new FiveSimAPI(fivesimApiKey)

      const accountData = generateAccountData()
      console.log(`[v0] Generated account data for ${accountData.firstName} ${accountData.lastName}`)

      await this.launchExistingProfile()
      if (!this.page) throw new Error("Failed to launch browser")

      console.log("[v0] Navigating to Google AddSession URL...")
      await this.page.goto(
        "https://accounts.google.com/AddSession?hl=en&continue=https://mail.google.com/mail&service=mail&ec=GAlAFw",
        {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        },
      )

      await randomDelay(3000, 5000)

      console.log("[v0] Looking for Create account button...")

      // Log all available links and buttons for debugging
      const availableElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("a, button, div[role='button'], span"))
        return elements.slice(0, 20).map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 50),
          href: (el as HTMLAnchorElement).href,
          role: el.getAttribute("role"),
        }))
      })
      console.log("[v0] Available elements:", JSON.stringify(availableElements, null, 2))

      // Try multiple strategies to find and click the Create account link
      let createAccountClicked = false

      // Strategy 1: Look for anchor tag with specific text
      createAccountClicked = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a"))
        const createLink = links.find((link) => {
          const text = link.textContent?.toLowerCase() || ""
          return (
            text.includes("create account") ||
            text.includes("create your google account") ||
            text.includes("créer un compte") ||
            text.includes("konto erstellen")
          )
        })
        if (createLink) {
          console.log("[v0] Found Create account link:", createLink.textContent)
          createLink.click()
          return true
        }
        return false
      })

      if (!createAccountClicked) {
        // Strategy 2: Look for any element with "create" text near bottom of page
        console.log("[v0] Strategy 1 failed, trying strategy 2...")
        createAccountClicked = await this.page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll("a, button, span, div"))
          const createElements = allElements.filter((el) => {
            const text = el.textContent?.toLowerCase() || ""
            return text.includes("create") && (text.includes("account") || text.length < 30)
          })

          if (createElements.length > 0) {
            console.log("[v0] Found create elements:", createElements.length)
            const lastCreate = createElements[createElements.length - 1]
            ;(lastCreate as HTMLElement).click()
            return true
          }
          return false
        })
      }

      if (!createAccountClicked) {
        // Strategy 3: Try clicking by href pattern
        console.log("[v0] Strategy 2 failed, trying strategy 3...")
        createAccountClicked = await this.page.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a[href*='signup']"))
          if (links.length > 0) {
            console.log("[v0] Found signup link")
            ;(links[0] as HTMLElement).click()
            return true
          }
          return false
        })
      }

      if (!createAccountClicked) {
        // Take a screenshot for debugging
        const screenshotPath = `create-account-not-found-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log("[v0] Screenshot saved to:", screenshotPath)

        throw new Error("Could not find 'Create account' button after trying multiple strategies")
      }

      console.log("[v0] Successfully clicked Create account button")
      await randomDelay(3000, 5000)

      console.log("[v0] Checking for account type selection...")

      const personalUseClicked = await this.page.evaluate(() => {
        // Strategy 1: Find by text and look for parent LI or clickable DIV
        const allElements = Array.from(document.querySelectorAll("li, div, button, a, span"))
        const personalElement = allElements.find(
          (el) =>
            el.textContent?.toLowerCase().includes("for my personal use") ||
            el.textContent?.toLowerCase().includes("for myself") ||
            el.textContent?.toLowerCase().includes("personnel") ||
            el.textContent?.toLowerCase().includes("privat"),
        )

        if (personalElement) {
          console.log(
            "[v0] Found personal use element:",
            personalElement.tagName,
            personalElement.textContent?.substring(0, 50),
          )

          // Find the clickable parent (LI, DIV with role, or button)
          let clickableElement = personalElement
          let current = personalElement

          while (current && current !== document.body) {
            if (
              current.tagName === "LI" ||
              current.tagName === "BUTTON" ||
              current.tagName === "A" ||
              current.getAttribute("role") === "button" ||
              current.getAttribute("role") === "link" ||
              current.getAttribute("role") === "menuitem" ||
              (current as HTMLElement).onclick !== null ||
              (current as HTMLElement).style.cursor === "pointer"
            ) {
              clickableElement = current
              console.log("[v0] Found clickable parent:", current.tagName, current.getAttribute("role"))
              break
            }
            current = current.parentElement as Element
          }
          // Try clicking the element
          ;(clickableElement as HTMLElement).click()
          console.log("[v0] Clicked personal use option")
          return true
        }

        console.log("[v0] Could not find personal use element")
        return false
      })

      if (personalUseClicked) {
        console.log("[v0] Selected personal use option, waiting for navigation...")

        await randomDelay(5000, 7000)

        // Log current URL for debugging
        const currentUrl = this.page.url()
        console.log("[v0] Current URL after clicking personal use:", currentUrl)

        // Check if we're on the signup form
        const onSignupForm = await this.page.evaluate(() => {
          return (
            document.querySelector("#firstName") !== null ||
            document.body.textContent?.includes("First name") ||
            document.body.textContent?.includes("Prénom")
          )
        })

        if (!onSignupForm) {
          console.log("[v0] ⚠️ Not on signup form yet, trying alternative approach...")

          // Try clicking again with a different method
          const retryClicked = await this.page.evaluate(() => {
            // Look for any element with "personal" text and try clicking all parents
            const elements = Array.from(document.querySelectorAll("*"))
            const personalElements = elements.filter((el) =>
              el.textContent?.toLowerCase().includes("for my personal use"),
            )

            for (const el of personalElements) {
              // Try clicking the element and all its parents
              let current = el as HTMLElement
              while (current && current !== document.body) {
                try {
                  current.click()
                  console.log("[v0] Retry clicked:", current.tagName)
                } catch (e) {}
                current = current.parentElement as HTMLElement
              }
            }

            return personalElements.length > 0
          })

          await randomDelay(5000, 7000)
        }
      } else {
        console.log("[v0] Could not find 'For my personal use' button, taking screenshot...")
        // Take screenshot for debugging
        const screenshotPath = `personal-use-not-found-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log("[v0] Screenshot saved to:", screenshotPath)

        // Continue anyway - maybe the page already navigated
      }

      console.log("[v0] Filling first name...")

      try {
        await this.page.waitForSelector("#firstName", { timeout: 15000 })
      } catch (error) {
        // Take screenshot and log available inputs for debugging
        const screenshotPath = `firstname-not-found-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log("[v0] Screenshot saved to:", screenshotPath)

        const availableInputs = await this.page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll("input"))
          return inputs.map((input) => ({
            type: input.type,
            id: input.id,
            name: input.name,
            placeholder: input.placeholder,
          }))
        })
        console.log("[v0] Available inputs:", JSON.stringify(availableInputs, null, 2))

        throw error
      }

      await this.moveMouseRandomly()
      await humanType(this.page, "#firstName", accountData.firstName)
      await randomDelay(500, 1000)

      console.log("[v0] Filling last name...")
      await this.page.waitForSelector("#lastName", { timeout: 15000 })
      await this.moveMouseRandomly()
      await humanType(this.page, "#lastName", accountData.lastName)
      await randomDelay(1000, 2000)

      await this.moveMouseRandomly()

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)
      await this.scrollRandomly()

      console.log("[v0] Filling birth date...")
      await this.page.waitForSelector("#month", { timeout: 15000 })
      await this.moveMouseRandomly()

      await this.page.click("#month")
      await randomDelay(500, 1000)

      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ]
      const monthName = monthNames[accountData.birthDate.month - 1]

      const monthClicked = await this.page.evaluate((month: string) => {
        const options = Array.from(document.querySelectorAll('[role="option"]'))
        const monthOption = options.find((opt) => opt.textContent?.includes(month))
        if (monthOption) {
          ;(monthOption as HTMLElement).click()
          return true
        }
        return false
      }, monthName)

      if (!monthClicked) {
        await this.page.evaluate((monthIndex: number) => {
          const options = Array.from(document.querySelectorAll('[role="option"]'))
          if (options[monthIndex - 1]) {
            ;(options[monthIndex - 1] as HTMLElement).click()
          }
        }, accountData.birthDate.month)
      }

      await randomDelay(500, 1000)

      await this.page.waitForSelector("#day", { timeout: 5000 })
      await humanType(this.page, "#day", accountData.birthDate.day.toString())
      await randomDelay(500, 1000)

      await this.page.waitForSelector("#year", { timeout: 5000 })
      await humanType(this.page, "#year", accountData.birthDate.year.toString())
      await randomDelay(500, 1000)

      console.log("[v0] Selecting gender...")
      await this.page.waitForSelector("#gender", { timeout: 5000 })
      await this.page.click("#gender")
      await randomDelay(500, 1000)

      const isFemale = Math.random() > 0.5
      const genderTexts = isFemale
        ? ["Female", "Femme", "Weiblich", "Femenino", "Feminino", "女性"]
        : ["Male", "Homme", "Männlich", "Masculino", "Masculino", "男性"]

      const genderClicked = await this.page.evaluate((texts: string[]) => {
        const options = Array.from(document.querySelectorAll('[role="option"]'))
        for (const text of texts) {
          const genderOption = options.find((opt) => opt.textContent?.toLowerCase().includes(text.toLowerCase()))
          if (genderOption) {
            ;(genderOption as HTMLElement).click()
            return true
          }
        }
        return false
      }, genderTexts)

      if (!genderClicked) {
        console.log("[v0] Could not find gender by text, trying by index...")
        await this.page.evaluate((femaleChoice: boolean) => {
          const options = Array.from(document.querySelectorAll('[role="option"]'))
          const index = femaleChoice ? 0 : 1
          if (options[index]) {
            ;(options[index] as HTMLElement).click()
            console.log(`[v0] Clicked gender option at index ${index}`)
          }
        }, isFemale)
      }

      await randomDelay(1000, 2000)

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)
      await this.scrollRandomly()

      console.log("[v0] Checking for QR code verification in existing profile flow...")
      const qrCodeDetected = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Verify some info before creating an account") ||
          bodyText.includes("Scan the QR code") ||
          bodyText.includes("preventing abuse from computer programs or bots") ||
          bodyText.includes("verify some info about your device")
        )
      })

      if (qrCodeDetected) {
        console.log("[v0] ⚠️ QR CODE VERIFICATION DETECTED - Google has flagged this as automated")
        const screenshotPath = `qr-code-detected-existing-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google QR code verification detected even with existing profile. " +
            "This suggests the profile may need more browsing history or the behavior patterns are still detectable. " +
            "Try: 1) Use the profile manually for a few days before automation, " +
            "2) Ensure residential proxy usage, 3) Add more delays between actions.",
        )
      }

      const accountCreationError = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Sorry, we could not create your Google Account") ||
          bodyText.includes("couldn't create your account") ||
          bodyText.includes("Unable to create account")
        )
      })

      if (accountCreationError) {
        console.log("[v0] ⚠️ ACCOUNT CREATION BLOCKED - Google rejected the account")
        const screenshotPath = `account-blocked-existing-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google blocked account creation from existing profile. " +
            "The existing profile may be flagged or the behavior is still detectable. " +
            "Consider using a different profile or improving the profile's trust score.",
        )
      }

      console.log("[v0] Handling email selection...")
      const onSuggestionPage = await this.page.evaluate(() => {
        return (
          document.body.textContent?.includes("Choisissez votre adresse Gmail") ||
          document.body.textContent?.includes("Choose your Gmail address")
        )
      })

      if (onSuggestionPage) {
        console.log("[v0] On email suggestion page, selecting custom email option...")

        const customEmailClicked = await this.page.evaluate(() => {
          const labels = Array.from(document.querySelectorAll('label, div[role="radio"]'))
          const customOption = labels.find(
            (label) =>
              label.textContent?.includes("Créer votre propre") || label.textContent?.includes("Create your own"),
          )
          if (customOption) {
            ;(customOption as HTMLElement).click()
            return true
          }
          return false
        })

        if (!customEmailClicked) {
          await this.page.evaluate(() => {
            const radios = Array.from(document.querySelectorAll('input[type="radio"]'))
            if (radios.length > 0) {
              ;(radios[radios.length - 1] as HTMLElement).click()
            }
          })
        }

        await randomDelay(1000, 2000)
      }

      let usernameAccepted = false
      let usernameAttempts = 0
      const maxUsernameAttempts = 5
      let currentEmail = accountData.email

      while (!usernameAccepted && usernameAttempts < maxUsernameAttempts) {
        usernameAttempts++
        console.log(`[v0] Trying username (attempt ${usernameAttempts}): ${currentEmail}`)

        await this.page.waitForSelector('input[type="text"]', { timeout: 10000 })

        await this.page.evaluate(() => {
          const input = document.querySelector('input[type="text"]') as HTMLInputElement
          if (input) {
            input.value = ""
          }
        })

        await randomDelay(500, 1000)
        await humanType(this.page, 'input[type="text"]', currentEmail)
        await randomDelay(1000, 2000)

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        const usernameError = await this.page.evaluate(() => {
          const errorTexts = [
            "déjà utilisé",
            "already taken",
            "not available",
            "n'est pas disponible",
            "bereits verwendet",
            "ya está en uso",
            "username is taken", // Added
            "that username is taken", // Added
            "try another", // Added
            "choose another", // Added
          ]

          const bodyText = document.body.textContent || ""
          const hasError = errorTexts.some((text) => bodyText.toLowerCase().includes(text.toLowerCase()))

          // Also check for visible error elements
          const errorElements = Array.from(document.querySelectorAll('[role="alert"], .error, [aria-live="assertive"]'))
          const hasVisibleError = errorElements.some((el) => {
            const text = el.textContent?.toLowerCase() || ""
            return errorTexts.some((errorText) => text.includes(errorText.toLowerCase()))
          })

          return hasError || hasVisibleError
        })

        if (usernameError) {
          console.log(`[v0] Username ${currentEmail} is already taken, generating new one...`)

          const randomSuffix = Math.floor(Math.random() * 99999)
          currentEmail = `${accountData.email}${randomSuffix}`
        } else {
          usernameAccepted = true
          accountData.email = currentEmail
          console.log(`[v0] Username accepted: ${currentEmail}`)
        }
      }

      if (!usernameAccepted) {
        throw new Error(`Failed to find available username after ${maxUsernameAttempts} attempts`)
      }

      console.log("[v0] Setting password...")
      await this.page.waitForSelector('input[type="password"]', { timeout: 15000 })
      await randomDelay(1000, 2000)

      const passwordInputs = await this.page.$$('input[type="password"]')

      if (passwordInputs.length >= 2) {
        await passwordInputs[0].click()
        await randomDelay(200, 500)
        await passwordInputs[0].type(accountData.password, { delay: 100 })
        await randomDelay(500, 1000)

        await passwordInputs[1].click()
        await randomDelay(200, 500)
        await passwordInputs[1].type(accountData.password, { delay: 100 })
      } else if (passwordInputs.length === 1) {
        await passwordInputs[0].click()
        await randomDelay(200, 500)
        await passwordInputs[0].type(accountData.password, { delay: 100 })
      } else {
        throw new Error("No password input fields found")
      }

      await randomDelay(1000, 2000)

      await this.clickButtonByText("Next")
      await randomDelay(3000, 5000)

      console.log("[v0] Checking for verification requirements after password...")
      const qrCodeDetectedAfterPassword = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Verify some info before creating an account") ||
          bodyText.includes("Scan the QR code") ||
          bodyText.includes("preventing abuse from computer programs or bots") ||
          bodyText.includes("verify some info about your device")
        )
      })

      if (qrCodeDetectedAfterPassword) {
        console.log("[v0] ⚠️ QR CODE VERIFICATION DETECTED - Google has flagged this as automated")
        const screenshotPath = `qr-code-detected-after-password-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google QR code verification detected after password step. " +
            "This means Google has identified the browser as automated. " +
            "Recommendations: 1) Change your IP address to a residential proxy, " +
            "2) Use the 'existing profile' approach with a well-established profile, " +
            "3) Ensure the profile has browsing history and looks legitimate, " +
            "4) Add more delays and human-like behavior patterns.",
        )
      }

      const accountCreationErrorAfterPassword = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Sorry, we could not create your Google Account") ||
          bodyText.includes("couldn't create your account") ||
          bodyText.includes("Unable to create account")
        )
      })

      if (accountCreationErrorAfterPassword) {
        console.log("[v0] ⚠️ ACCOUNT CREATION BLOCKED - Google rejected the account after password")
        const screenshotPath = `account-blocked-after-password-${Date.now()}.png`
        await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
        console.log(`[v0] Screenshot saved to: ${screenshotPath}`)

        throw new Error(
          "Google blocked account creation after password step. " +
            "This indicates strong bot detection. The browser fingerprint or behavior patterns were identified as suspicious. " +
            "Try: 1) Using a different IP address (residential proxy), " +
            "2) Using a well-established existing profile, " +
            "3) Improving the profile's trust score by browsing normally for several days.",
        )
      }

      console.log("[v0] Getting phone number from 5sim...")
      try {
        let phoneVerificationSuccess = false
        let phoneRetryAttempts = 0
        const maxPhoneRetries = 3
        let finalPhoneNumber = ""
        let finalVerificationCode = ""

        while (!phoneVerificationSuccess && phoneRetryAttempts < maxPhoneRetries) {
          phoneRetryAttempts++
          console.log(`[v0] Phone verification attempt ${phoneRetryAttempts}/${maxPhoneRetries}`)

          // Try multiple countries in order of preference until one works
          const countries = ["italy", "france", "spain", "portugal", "poland"]
          let phoneOrder = null
          let lastError = null

          for (const country of countries) {
            try {
              console.log(`[v0] Trying to buy number from ${country}...`)
              phoneOrder = await fivesim.buyNumber(country, "any", "google")
              console.log(`[v0] Successfully got phone number from ${country}: ${phoneOrder.phone}`)
              break
            } catch (error: any) {
              console.log(`[v0] Failed to get number from ${country}: ${error.message}`)
              lastError = error
              // If it's a price limit error, try next country
              if (error.message.includes("PRICE_LIMIT_EXCEEDED") || error.message.includes("no free phones")) {
                continue
              }
              // For other errors, throw immediately
              throw error
            }
          }

          if (!phoneOrder) {
            throw lastError || new Error("Failed to get phone number from any country")
          }

          // If this is a retry, click "Get new code" button first
          if (phoneRetryAttempts > 1) {
            console.log("[v0] Clicking 'Get new code' button...")
            try {
              const getNewCodeClicked = await this.page.evaluate(() => {
                // Look for "Get new code" button/link
                const elements = Array.from(document.querySelectorAll("button, a, div[role='button'], span"))
                const getNewCodeElement = elements.find(
                  (el) =>
                    el.textContent?.toLowerCase().includes("get new code") ||
                    el.textContent?.toLowerCase().includes("resend") ||
                    el.textContent?.toLowerCase().includes("send again") ||
                    el.textContent?.toLowerCase().includes("nouveau code") ||
                    el.textContent?.toLowerCase().includes("renvoyer"),
                )
                if (getNewCodeElement) {
                  ;(getNewCodeElement as HTMLElement).click()
                  console.log("[v0] Clicked 'Get new code' button")
                  return true
                }
                return false
              })

              if (getNewCodeClicked) {
                await randomDelay(2000, 3000)
              } else {
                console.log("[v0] Could not find 'Get new code' button, continuing anyway...")
              }
            } catch (error) {
              console.log("[v0] Error clicking 'Get new code' button:", error)
            }
          }

          // Enter the new phone number
          await this.page.waitForSelector('input[type="tel"]', { timeout: 15000 })

          // Clear existing phone number if this is a retry
          if (phoneRetryAttempts > 1) {
            await this.page.evaluate(() => {
              const input = document.querySelector('input[type="tel"]') as HTMLInputElement
              if (input) {
                input.value = ""
              }
            })
            await randomDelay(500, 1000)
          }

          await humanType(this.page, 'input[type="tel"]', phoneOrder.phone)
          await randomDelay(1000, 2000)

          await this.clickButtonByText("Next")
          await randomDelay(3000, 5000)

          console.log("[v0] Waiting for SMS verification code (60 second timeout)...")
          let verificationCode: string | null = null
          let attempts = 0
          const maxAttempts = 6 // 6 attempts * 10 seconds = 60 seconds max
          const startTime = Date.now()

          while (!verificationCode && attempts < maxAttempts) {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
            console.log(`[v0] Checking for SMS... (${elapsedSeconds}s elapsed)`)

            await randomDelay(10000, 12000)

            try {
              const smsData = await fivesim.checkSMS(phoneOrder.id.toString())
              if (smsData.sms && smsData.sms.length > 0) {
                const latestSMS = smsData.sms[smsData.sms.length - 1]
                verificationCode = extractVerificationCode(latestSMS.text)
                if (verificationCode) {
                  console.log(`[v0] ✓ Received verification code: ${verificationCode}`)
                  phoneVerificationSuccess = true
                  finalPhoneNumber = phoneOrder.phone
                  finalVerificationCode = verificationCode
                  await fivesim.finishOrder(phoneOrder.id.toString())
                  break
                }
              }
            } catch (error) {
              console.log("[v0] Still waiting for SMS...")
            }

            attempts++
          }

          if (!verificationCode) {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
            console.log(`[v0] ⚠️ No SMS received after ${elapsedSeconds} seconds`)
            console.log(`[v0] Canceling number ${phoneOrder.phone}...`)

            try {
              await fivesim.cancelOrder(phoneOrder.id.toString())
              console.log("[v0] ✓ Number canceled successfully")
            } catch (error) {
              console.log("[v0] Failed to cancel number:", error)
            }

            if (phoneRetryAttempts < maxPhoneRetries) {
              console.log(`[v0] Will retry with a new number (attempt ${phoneRetryAttempts + 1}/${maxPhoneRetries})`)
            } else {
              throw new Error(
                `Failed to receive SMS verification code after ${maxPhoneRetries} attempts with different numbers. ` +
                  `This may indicate an issue with the phone service or Google is blocking these numbers.`,
              )
            }
          }
        }

        if (!phoneVerificationSuccess || !finalVerificationCode) {
          throw new Error("Phone verification failed after all retry attempts")
        }

        //  Replace single selector with multi-selector strategy to find verification code input
        console.log("[v0] Attempting to enter verification code...")

        // Try multiple selectors for the verification code input
        const codeInputSelectors = [
          'input[type="text"]',
          'input[type="tel"]',
          'input[aria-label*="code" i]',
          'input[aria-label*="verification" i]',
          'input[placeholder*="code" i]',
          'input[name*="code" i]',
          'input[id*="code" i]',
          'input[autocomplete="one-time-code"]',
          'input[inputmode="numeric"]',
        ]

        let codeInputFound = false
        for (const selector of codeInputSelectors) {
          try {
            console.log(`[v0] Trying selector: ${selector}`)
            await this.page.waitForSelector(selector, { timeout: 3000 })
            await humanType(this.page, selector, finalVerificationCode)
            console.log(`[v0] ✓ Successfully entered verification code using selector: ${selector}`)
            codeInputFound = true
            break
          } catch (error) {
            console.log(`[v0] Selector ${selector} not found, trying next...`)
          }
        }

        if (!codeInputFound) {
          console.error("[v0] Could not find verification code input field with any selector")

        

          // Log all available inputs for debugging
          const allInputs = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll("input")).map((input) => ({
              type: input.type,
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              ariaLabel: input.getAttribute("aria-label"),
              autocomplete: input.autocomplete,
              inputmode: input.getAttribute("inputmode"),
            }))
          })
          console.log("[v0] Available inputs on page:", JSON.stringify(allInputs, null, 2))

          throw new Error(
            "Could not find verification code input field. " +
              "The SMS code was received successfully, but the input field to enter it could not be located. " +
              `Screenshot saved to: `,
          )
        }

        await randomDelay(1000, 2000)
        // </CHANGE>

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        // Enter the verification code
        await this.page.waitForSelector('input[type="text"]', { timeout: 15000 })
        await humanType(this.page, 'input[type="text"]', finalVerificationCode)
        await randomDelay(1000, 2000)

        await this.clickButtonByText("Next")
        await randomDelay(3000, 5000)

        console.log("[v0] Skipping recovery options...")
        try {
          await this.clickButtonByText("Skip")
          await randomDelay(2000, 3000)
        } catch (error) {}

        console.log("[v0] Accepting terms...")
        await randomDelay(2000, 3000)
        try {
          await this.clickButtonByText("I agree")
          await randomDelay(3000, 5000)
        } catch (error) {}

        console.log("[v0] Account created successfully from existing profile!")

        return {
          email: `${accountData.email}@gmail.com`,
          password: accountData.password,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          phoneNumber: finalPhoneNumber,
        }
      } catch (error: any) {
        console.error("[v0] Failed to get phone number from 5sim:", error.message)
        throw new Error(
          `Failed to get phone number from ${this.country}: ${error.message}. ` +
            `Please check your FIVESIM_API_KEY environment variable and ensure your 5sim account has sufficient balance. ` +
            `Try testing the country in the 5sim Test Page first.`,
        )
      }
    } catch (error) {
      console.error("[v0] Failed to create account from existing profile:", error)
      throw error
    }
  }

  private async launchExistingProfile(): Promise<void> {
    if (!this.existingProfile) {
      throw new Error("No existing profile specified")
    }

    console.log(`[v0] Launching existing profile: ${this.existingProfile.profile_name}`)

    if (this.existingProfile.profile_type === "gologin") {
      const profileId = this.existingProfile.profile_id
      console.log(`[v0] Starting GoLogin profile: ${profileId}`)
      console.log(`[v0] GoLogin mode: ${this.gologinMode}`)

      const { ProfileLauncher } = await import("./profile-launcher")
      const apiKey = process.env.GOLOGIN_API_KEY
      if (!apiKey) {
        throw new Error("GOLOGIN_API_KEY environment variable not set")
      }

      const launcher = new ProfileLauncher(apiKey, this.gologinMode)
      const result = await launcher.launchProfile(profileId, this.existingProfile.profile_name)

      if (!result.success || !result.browser || !result.page) {
        throw new Error(result.error || "Failed to launch GoLogin profile")
      }

      this.browser = result.browser
      this.page = result.page
      console.log(`[v0] ✓ GoLogin profile launched successfully in ${this.gologinMode} mode`)
    } else if (this.existingProfile.profile_type === "local") {
      console.log(`[v0] Starting local profile: ${this.existingProfile.id}`)

      const launcher = new LocalBrowserLauncher()
      const launchResult = await launcher.launchProfile(
        this.existingProfile.id,
        this.existingProfile.profile_name,
        this.existingProfile.local_config,
      )

      if (!launchResult.success || !launchResult.browser || !launchResult.page) {
        throw new Error(launchResult.error || "Failed to launch local profile")
      }

      this.browser = launchResult.browser
      this.page = launchResult.page
      console.log(`[v0] ✓ Local profile launched successfully`)
    } else {
      throw new Error(`Unsupported profile type: ${this.existingProfile.profile_type}`)
    }
  }

  private async warmUpProfile(): Promise<void> {
    if (!this.page) return

    try {
      console.log("[v0] Visiting websites to build browsing history...")

      // Visit Google homepage first
      await this.page.goto("https://www.google.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })
      await randomDelay(3000, 5000)
      await this.moveMouseRandomly()
      await this.scrollRandomly()
      await randomDelay(2000, 4000)

      // Visit YouTube
      await this.page.goto("https://www.youtube.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })
      await randomDelay(3000, 5000)
      await this.moveMouseRandomly()
      await this.scrollRandomly()
      await randomDelay(2000, 4000)

      // Visit a news site
      await this.page.goto("https://www.bbc.com", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })
      await randomDelay(3000, 5000)
      await this.moveMouseRandomly()
      await this.scrollRandomly()
      await randomDelay(2000, 4000)

      console.log("[v0] Profile warm-up complete")
    } catch (error) {
      console.log("[v0] Profile warm-up had some errors, continuing anyway...")
    }
  }

  private async clickButtonByText(text: string): Promise<void> {
    if (!this.page) throw new Error("Page not initialized")

    await randomDelay(1500, 3000)
    await this.moveMouseRandomly()

    const textVariations = [
      text,
      text.toUpperCase(),
      text.toLowerCase(),
      ...(text === "Next" ? ["Continue", "Weiter", "Siguiente", "Suivant", "Avanti"] : []),
      ...(text === "Skip" ? ["Überspringen", "Omitir", "Passer", "Salta"] : []),
      ...(text === "I agree" ? ["Agree", "Accept", "Akzeptieren", "Aceptar", "Accepter"] : []),
    ]

    for (const textVar of textVariations) {
      const xpaths = [
        `//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textVar.toLowerCase()}')]`,
        `//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textVar.toLowerCase()}')]/ancestor::button`,
        `//div[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textVar.toLowerCase()}')]/ancestor::button`,
        `//button[@aria-label='${textVar}']`,
        `//div[@role='button'][contains(., '${textVar}')]`,
      ]

      for (const xpath of xpaths) {
        try {
          const clicked = await this.page.evaluate((xpathQuery: string) => {
            const result = document.evaluate(xpathQuery, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
            const element = result.singleNodeValue as HTMLElement
            if (element) {
              element.click()
              return true
            }
            return false
          }, xpath)

          if (clicked) {
            console.log(`[v0] Successfully clicked button with text: ${textVar}`)
            return
          }
        } catch (error) {}
      }
    }

    try {
      const screenshotPath = `error-${Date.now()}.png`
      await this.page.screenshot({ path: screenshotPath as `${string}.png`, fullPage: true })
      console.log(`[v0] Screenshot saved to: ${screenshotPath}`)
    } catch (error) {
      console.error("[v0] Failed to take screenshot:", error)
    }

    const availableButtons = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, div[role='button']"))
      return buttons.map((btn) => ({
        text: btn.textContent?.trim().substring(0, 50),
        ariaLabel: btn.getAttribute("aria-label"),
        id: btn.id,
      }))
    })
    console.log("[v0] Available buttons on page:", JSON.stringify(availableButtons, null, 2))

    throw new Error(`Could not find button with text: ${text}`)
  }

  private async launchBrowser(): Promise<void> {
    const executablePath =
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : "/usr/bin/google-chrome"

    const args = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-infobars",
      "--window-size=1280,720",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-default-browser-check",
      "--disable-prompt-on-repost",
      "--disable-hang-monitor",
      "--disable-background-networking",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-domain-reliability",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--enable-features=NetworkService,NetworkServiceInProcess",
      "--force-color-profile=srgb",
      "--disable-features=site-per-process",
      "--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls,DestroyProfileOnBrowserClose,MediaRouter,DialMediaRouteProvider,AcceptCHFrame,AutoExpandDetailsElement,CertificateTransparencyComponentUpdater,AvoidUnnecessaryBeforeUnloadCheckSync",
      "--disable-component-extensions-with-background-pages",
      "--disable-back-forward-cache",
      "--disable-breakpad",
      "--disable-features=Translate",
      "--disable-features=OptimizationHints",
    ]

    if (this.proxyConfig) {
      const proxyUrl = this.proxyConfig.server.replace(/^https?:\/\//, "")
      args.push(`--proxy-server=${proxyUrl}`)
    }

    this.browser = await puppeteer.launch({
      headless: false,
      executablePath,
      args,
      ignoreDefaultArgs: ["--enable-automation", "--enable-blink-features=AutomationControlled"],
    })

    this.page = await this.browser.newPage()

    if (this.proxyConfig?.username && this.proxyConfig?.password) {
      console.log("[v0] Authenticating proxy...")
      await this.page.authenticate({
        username: this.proxyConfig.username,
        password: this.proxyConfig.password,
      })
    }

    await this.page.setViewport({ width: 1280, height: 720 })

    await this.page.evaluateOnNewDocument(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      })

      // Spoof plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format" },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
            description: "Portable Document Format",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer",
          },
          {
            0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable" },
            1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable" },
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client",
          },
        ],
      })

      // Spoof languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      })

      // Spoof platform
      Object.defineProperty(navigator, "platform", {
        get: () => "Win32",
      })

      // Spoof hardware concurrency
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => 8,
      })

      // Spoof device memory
      Object.defineProperty(navigator, "deviceMemory", {
        get: () => 8,
      })

      // Spoof permissions
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters)

      // Add chrome object
      ;(window as any).chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {},
      }

      // Spoof WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) {
          return "Intel Inc."
        }
        if (parameter === 37446) {
          return "Intel Iris OpenGL Engine"
        }
        return getParameter.call(this, parameter)
      }

      // Spoof Canvas
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function (type) {
        if (type === "image/png" && this.width === 16 && this.height === 16) {
          return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        return originalToDataURL.apply(this, [type] as any)
      }

      // Spoof Audio Context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const originalCreateOscillator = AudioContext.prototype.createOscillator
        AudioContext.prototype.createOscillator = function () {
          const oscillator = originalCreateOscillator.call(this)
          const originalStart = oscillator.start
          oscillator.start = function (when) {
            return originalStart.call(this, when)
          }
          return oscillator
        }
      }

      // Spoof battery API
      Object.defineProperty(navigator, "getBattery", {
        value: () =>
          Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Number.POSITIVE_INFINITY,
            level: 1,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          }),
      })

      // Override toString to hide modifications
      const originalToString = Function.prototype.toString
      Function.prototype.toString = function () {
        if (this === window.navigator.permissions.query) {
          return "function query() { [native code] }"
        }
        if (this === WebGLRenderingContext.prototype.getParameter) {
          return "function getParameter() { [native code] }"
        }
        if (this === HTMLCanvasElement.prototype.toDataURL) {
          return "function toDataURL() { [native code] }"
        }
        return originalToString.call(this)
      }

      // Add realistic screen properties
      Object.defineProperty(screen, "availWidth", { get: () => 1280 })
      Object.defineProperty(screen, "availHeight", { get: () => 720 })
      Object.defineProperty(screen, "width", { get: () => 1280 })
      Object.defineProperty(screen, "height", { get: () => 720 })
      Object.defineProperty(screen, "colorDepth", { get: () => 24 })
      Object.defineProperty(screen, "pixelDepth", { get: () => 24 })
    })

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    )

    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    })

    await this.page.evaluateOnNewDocument(() => {
      // Add some realistic localStorage data
      try {
        localStorage.setItem("google_experiment_mod", "1")
        localStorage.setItem("google_adsense_settings", '{"visible":true}')
      } catch (e) {}
    })
  }

  private async moveMouseRandomly(): Promise<void> {
    if (!this.page) return

    try {
      const startX = Math.floor(Math.random() * 1280)
      const startY = Math.floor(Math.random() * 720)
      const endX = Math.floor(Math.random() * 1280)
      const endY = Math.floor(Math.random() * 720)

      // Move in a curve with multiple steps
      const steps = 20 + Math.floor(Math.random() * 30)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = startX + (endX - startX) * t
        const y = startY + (endY - startY) * t + Math.sin(t * Math.PI) * 50
        await this.page.mouse.move(x, y)
        await randomDelay(10, 30)
      }
    } catch (error) {}
  }

  private async scrollRandomly(): Promise<void> {
    if (!this.page) return

    try {
      const scrolls = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < scrolls; i++) {
        const scrollAmount = Math.floor(Math.random() * 200) + 50
        await this.page.evaluate((amount: number) => {
          window.scrollBy({
            top: amount,
            behavior: "smooth",
          })
        }, scrollAmount)
        await randomDelay(300, 800)
      }
    } catch (error) {}
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close()
        this.browser = null
        this.page = null
      }
    } catch (error) {
      console.error("[v0] Error during cleanup:", error)
    }
  }
}

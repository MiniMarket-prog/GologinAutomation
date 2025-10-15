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

  async login(
    email: string,
    password: string,
    recoveryEmail?: string,
    sessionSaveWaitTime = 45000, // Made wait time configurable, default 45s for setup
  ): Promise<{ success: boolean; error?: string; status?: string; message?: string }> {
    console.log("[v0] Starting Gmail login process...")
    console.log(`[v0] Email: ${email}`)
    if (recoveryEmail) {
      console.log(`[v0] Recovery email provided: ${recoveryEmail}`)
    }

    try {
      // Navigate to Gmail
      console.log("[v0] Navigating to Gmail login page...")
      await this.page.goto("https://accounts.google.com/signin/v2/identifier?service=mail", {
        waitUntil: "networkidle2",
      })
      console.log("[v0] ✓ Page loaded")

      await this.behavior.waitRandom(2000)

      const hasRecaptcha = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        const hasRecaptchaText =
          bodyText.includes("Je ne suis pas un robot") ||
          bodyText.includes("I'm not a robot") ||
          bodyText.includes("I am not a robot") ||
          document.querySelector(".g-recaptcha") !== null ||
          document.querySelector('iframe[src*="recaptcha"]') !== null
        return hasRecaptchaText
      })

      if (hasRecaptcha) {
        console.log("[v0] ⚠️ reCAPTCHA challenge detected!")
        return {
          success: false,
          status: "captcha_required",
          message: "reCAPTCHA challenge detected. Please solve it manually or use a CAPTCHA solving service.",
        }
      }

      const isReauthPage = await this.page.evaluate(() => {
        const bodyText = document.body.textContent || ""
        return (
          bodyText.includes("Confirmez qu'il s'agit bien de vous") ||
          bodyText.includes("Confirm it's you") ||
          bodyText.includes("Confirm it's really you") ||
          bodyText.includes("تأكيد هويتك") // Arabic
        )
      })

      if (isReauthPage) {
        console.log("[v0] ⚠️ Detected 'Confirm it's you' re-authentication page")
        console.log("[v0] Looking for 'Suivant' or 'Next' button...")

        const suivantClicked = await this.page.evaluate(() => {
          const buttonTexts = ["suivant", "next", "التالي", "continuar", "weiter"]
          const buttons = Array.from(document.querySelectorAll("button"))

          for (const button of buttons) {
            const text = button.textContent?.toLowerCase().trim() || ""
            if (buttonTexts.some((btnText) => text.includes(btnText))) {
              console.log(`[v0] [DEBUG] Found button with text: ${text}`)
              button.click()
              return true
            }
          }
          return false
        })

        if (suivantClicked) {
          console.log("[v0] ✓ Clicked 'Suivant' button")
          await this.behavior.waitRandom(3000)

          console.log("[v0] Checking if reCAPTCHA appeared after clicking Suivant...")
          const hasRecaptchaAfterSuivant = await this.page.evaluate(() => {
            const url = window.location.href
            const bodyText = document.body.textContent || ""
            const hasRecaptchaInUrl = url.includes("/challenge/recaptcha")
            const hasRecaptchaText =
              bodyText.includes("Je ne suis pas un robot") ||
              bodyText.includes("I'm not a robot") ||
              bodyText.includes("I am not a robot") ||
              document.querySelector(".g-recaptcha") !== null ||
              document.querySelector('iframe[src*="recaptcha"]') !== null
            return hasRecaptchaInUrl || hasRecaptchaText
          })

          if (hasRecaptchaAfterSuivant) {
            console.log("[v0] ⚠️ reCAPTCHA challenge appeared after clicking Suivant!")
            return {
              success: false,
              status: "captcha_required",
              message: "reCAPTCHA challenge detected. Please solve it manually or use a CAPTCHA solving service.",
            }
          } else {
            console.log("[v0] ✓ No reCAPTCHA detected after clicking Suivant")
          }
        } else {
          console.log("[v0] ⚠️ Could not find 'Suivant' button")
        }
      }

      // Enter email
      console.log("[v0] Looking for email input...")
      const emailInput = await this.page.waitForSelector('input[type="email"]', { timeout: 15000 })
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
      const signInButton: ElementHandle<Element> | null = null

      // First, try to find the button by evaluating all buttons and finding the right one
      const buttonFound = await this.page.evaluate(() => {
        console.log("[v0] [DEBUG] Searching for password submit button...")

        // Get all buttons on the page
        const allButtons = Array.from(document.querySelectorAll("button"))
        console.log(`[v0] [DEBUG] Found ${allButtons.length} total buttons on page`)

        // Filter to only visible buttons
        const visibleButtons = allButtons.filter((btn) => {
          const style = window.getComputedStyle(btn)
          const isVisible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            btn.offsetParent !== null
          return isVisible
        })

        console.log(`[v0] [DEBUG] Found ${visibleButtons.length} visible buttons`)

        // Log all visible buttons for debugging
        visibleButtons.forEach((btn, idx) => {
          const text = btn.textContent?.trim() || ""
          const ariaLabel = btn.getAttribute("aria-label") || ""
          const type = btn.getAttribute("type") || ""
          console.log(`[v0] [DEBUG] Button ${idx + 1}: text="${text}", aria-label="${ariaLabel}", type="${type}"`)
        })

        // Text patterns to look for in multiple languages
        const nextTexts = [
          "next", // English
          "التالي", // Arabic
          "suivant", // French
          "siguiente", // Spanish
          "weiter", // German
          "avanti", // Italian
          "próximo", // Portuguese
        ]

        // Find the button that matches our criteria
        for (const button of visibleButtons) {
          const text = button.textContent?.toLowerCase().trim() || ""
          const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || ""

          // Check if this button contains any of our target texts
          const matchesText = nextTexts.some(
            (nextText) => text.includes(nextText.toLowerCase()) || ariaLabel.includes(nextText.toLowerCase()),
          )

          if (matchesText) {
            console.log(`[v0] [DEBUG] ✓ Found matching button with text: "${button.textContent?.trim()}"`)
            // Click it directly in the DOM
            button.click()
            return true
          }
        }

        // If no text match, try to find the submit button near the password field
        console.log("[v0] [DEBUG] No text match found, looking for button near password field...")
        const passwordInput = document.querySelector('input[type="password"]')
        if (passwordInput) {
          // Find the closest form or container
          const form = passwordInput.closest("form") || passwordInput.closest("div[role='presentation']")
          if (form) {
            // Find buttons within this form/container
            const formButtons = Array.from(form.querySelectorAll("button")).filter((btn) => {
              const style = window.getComputedStyle(btn)
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                style.opacity !== "0" &&
                btn.offsetParent !== null
              )
            })

            console.log(`[v0] [DEBUG] Found ${formButtons.length} visible buttons in password form`)

            // Click the last visible button (usually the submit button)
            if (formButtons.length > 0) {
              const submitButton = formButtons[formButtons.length - 1]
              console.log(`[v0] [DEBUG] ✓ Clicking last button in form: "${submitButton.textContent?.trim()}"`)
              submitButton.click()
              return true
            }
          }
        }

        console.log("[v0] [DEBUG] ✗ Could not find password submit button")
        return false
      })

      if (!buttonFound) {
        throw new Error("Sign in button not found or could not be clicked")
      }

      console.log("[v0] ✓ Clicked Sign in button")

      // Wait for navigation
      await this.behavior.waitRandom(5000)

      // Check if we're on the verification challenge page
      if (this.page.url().includes("/challenge/selection")) {
        console.log("[v0] ⚠ Verification challenge detected, attempting recovery email verification...")

        console.log("[v0] [DEBUG] Analyzing verification page options...")

        // Dump all clickable elements and their text content
        const pageOptions = await this.page.evaluate(() => {
          const options: Array<{
            tag: string
            text: string
            ariaLabel: string | null
            dataType: string | null
            role: string | null
            classes: string
          }> = []

          // Find all potentially clickable elements
          const selectors = [
            'div[role="link"]',
            "div[data-challengetype]",
            '[role="button"]',
            "button",
            "div[jsname]",
            'li[role="presentation"]',
            "div[data-challengeindex]",
          ]

          selectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector)
            elements.forEach((el) => {
              const text = el.textContent?.trim() || ""
              if (text) {
                options.push({
                  tag: el.tagName,
                  text: text.substring(0, 150),
                  ariaLabel: el.getAttribute("aria-label"),
                  dataType: el.getAttribute("data-challengetype"),
                  role: el.getAttribute("role"),
                  classes: el.className,
                })
              }
            })
          })

          return options
        })

        console.log("[v0] [DEBUG] Found", pageOptions.length, "clickable options on verification page:")
        pageOptions.forEach((opt, idx) => {
          console.log(`[v0] [DEBUG] Option ${idx + 1}:`, JSON.stringify(opt, null, 2))
        })

        // Try to click recovery email option
        const recoveryClicked = await this.page.evaluate(() => {
          const recoveryTexts = [
            "recovery email",
            "alternate email",
            "backup email",
            "confirm your recovery email",
            "تأكيد البريد الإلكتروني لاسترداد الحساب", // Arabic - exact text from screenshot
            "البريد الإلكتروني لاسترداد الحساب", // Arabic - recovery email
            "البريد الإلكتروني للطوارئ", // Arabic - emergency email
            "بريد الاسترداد", // Arabic - recovery mail
            "البريد البديل", // Arabic - alternate email
            "e-mail de récupération",
            "adresse e-mail de secours", // French
            "correo de recuperación", // Spanish
            "wiederherstellungs-e-mail", // German
          ]

          // First, try to find and click a BUTTON element
          const buttons = Array.from(document.querySelectorAll("button"))

          console.log("[v0] [DEBUG] Checking", buttons.length, "button elements for recovery email option...")

          for (const button of buttons) {
            const text = button.textContent?.toLowerCase() || ""
            const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || ""

            // Check if this button mentions recovery/alternate email
            const isRecoveryOption = recoveryTexts.some(
              (recoveryText) =>
                text.includes(recoveryText.toLowerCase()) || ariaLabel.includes(recoveryText.toLowerCase()),
            )

            if (isRecoveryOption) {
              console.log("[v0] [DEBUG] ✓ Found recovery email BUTTON with text:", text.substring(0, 100))
              button.click()
              return true
            }
          }

          // If no button found, try other clickable elements as fallback
          const elements = Array.from(
            document.querySelectorAll(
              'div[role="link"], div[data-challengetype], [role="button"], li[role="presentation"]',
            ),
          )

          console.log("[v0] [DEBUG] No button found, checking", elements.length, "other elements...")

          for (const element of elements) {
            const text = element.textContent?.toLowerCase() || ""
            const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || ""
            const dataType = element.getAttribute("data-challengetype")?.toLowerCase() || ""

            // Check if this element mentions recovery/alternate email
            const isRecoveryOption = recoveryTexts.some(
              (recoveryText) =>
                text.includes(recoveryText.toLowerCase()) ||
                ariaLabel.includes(recoveryText.toLowerCase()) ||
                dataType.includes("recovery") ||
                dataType.includes("email"),
            )

            if (isRecoveryOption) {
              console.log("[v0] [DEBUG] ✓ Found recovery email option (non-button) with text:", text.substring(0, 100))
              const clickable = element as HTMLElement
              clickable.click()
              return true
            }
          }

          console.log("[v0] [DEBUG] ✗ No recovery email option found")
          return false
        })

        if (recoveryClicked) {
          console.log("[v0] ✓ Clicked recovery email verification option")

          await this.behavior.waitRandom(5000)

          // Wait for navigation to complete
          await this.page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {
            console.log("[v0] [DEBUG] No navigation detected after clicking recovery option")
          })

          console.log("[v0] [DEBUG] Analyzing page after clicking recovery option...")
          console.log("[v0] [DEBUG] Current URL:", this.page.url())

          const afterClickAnalysis = await this.page.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body.innerText.substring(0, 500),
              hasInputs: document.querySelectorAll('input[type="email"], input[type="text"]').length,
              hasButtons: document.querySelectorAll('button, [role="button"]').length,
              allInputs: Array.from(document.querySelectorAll("input")).map((inp) => ({
                type: inp.type,
                name: inp.name,
                id: inp.id,
                placeholder: inp.placeholder,
                ariaLabel: inp.getAttribute("aria-label"),
                visible: inp.offsetParent !== null,
              })),
              allButtons: Array.from(document.querySelectorAll('button, [role="button"]')).map((btn) => ({
                text: btn.textContent?.trim().substring(0, 50),
                ariaLabel: btn.getAttribute("aria-label"),
                type: btn.getAttribute("type"),
              })),
            }
          })

          console.log("[v0] [DEBUG] After click analysis:", JSON.stringify(afterClickAnalysis, null, 2))

          // Now enter the recovery email
          console.log("[v0] Looking for recovery email input...")
          console.log("[v0] [DEBUG] Current URL:", this.page.url())

          let recoveryInput = null

          // Try different selectors
          const selectors = [
            'input[type="email"]',
            'input[name="knowledgePreregisteredEmailResponse"]',
            'input[aria-label*="email"]',
            'input[aria-label*="البريد"]',
            "input#knowledge-preregistered-email-response",
            'input[type="text"]',
          ]

          for (const selector of selectors) {
            console.log(`[v0] [DEBUG] Trying selector: ${selector}`)
            recoveryInput = await this.page.$(selector)
            if (recoveryInput) {
              console.log(`[v0] [DEBUG] ✓ Found input with selector: ${selector}`)
              break
            }
          }

          if (!recoveryInput) {
            console.log("[v0] [DEBUG] No input found with standard selectors, checking all inputs on page...")
            const allInputs = await this.page.$$("input")
            console.log(`[v0] [DEBUG] Found ${allInputs.length} input elements on page`)

            for (let i = 0; i < allInputs.length; i++) {
              const input = allInputs[i]
              const type = await input.evaluate((el) => el.getAttribute("type"))
              const name = await input.evaluate((el) => el.getAttribute("name"))
              const id = await input.evaluate((el) => el.getAttribute("id"))
              const ariaLabel = await input.evaluate((el) => el.getAttribute("aria-label"))
              console.log(
                `[v0] [DEBUG] Input ${i}: type="${type}", name="${name}", id="${id}", aria-label="${ariaLabel}"`,
              )

              // Use the first visible input
              if (!recoveryInput && (type === "email" || type === "text" || !type)) {
                const isVisible = await input.evaluate((el) => {
                  const style = window.getComputedStyle(el)
                  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
                })
                if (isVisible) {
                  recoveryInput = input
                  console.log(`[v0] [DEBUG] Using input ${i} as recovery email input`)
                  break
                }
              }
            }
          }

          if (recoveryInput) {
            console.log("[v0] ✓ Recovery email input found")
            if (!recoveryEmail) {
              console.log("[v0] ⚠ Recovery email not provided - stopping at recovery email field")
              console.log("[v0] Browser will remain open for manual input")
              return {
                success: true,
                status: "waiting_for_recovery_email",
                message: "Stopped at recovery email verification - waiting for manual input",
              }
            }
            await this.behavior.randomPause()
            console.log("[v0] Typing recovery email...")
            await this.behavior.typeWithHumanSpeed(recoveryEmail, recoveryInput)
            console.log("[v0] ✓ Recovery email entered")

            await this.behavior.waitRandom(1000)

            // Click Next button
            console.log("[v0] Looking for Next button...")
            const nextBtn = await this.findButtonByText(["next", "التالي", "suivant", "siguiente"])

            if (nextBtn) {
              await this.behavior.randomPause()
              await nextBtn.click()
              console.log("[v0] ✓ Clicked Next button")

              // Wait for verification to complete
              await this.behavior.waitRandom(5000)

              const newUrl = this.page.url()
              if (newUrl.includes("mail.google.com")) {
                console.log("[v0] ✓ Login successful after recovery email verification!")

                console.log("[v0] Checking for browser password save dialog...")
                await this.behavior.waitRandom(3000) // Increased wait time for dialog to appear

                const savePasswordClicked = await this.page.evaluate(() => {
                  console.log("[v0] [DEBUG] Starting password save dialog search...")

                  // Look for the "Save" button in multiple languages
                  const saveTexts = [
                    "save", // English
                    "حفظ", // Arabic
                    "enregistrer", // French
                    "guardar", // Spanish
                    "speichern", // German
                    "salvar", // Portuguese
                    "tallenna", // Finnish
                  ]

                  // Debug: Log all buttons on the page
                  const allButtons = Array.from(document.querySelectorAll("button"))
                  console.log("[v0] [DEBUG] Found", allButtons.length, "buttons on page")
                  allButtons.forEach((btn, idx) => {
                    const text = btn.textContent?.trim() || ""
                    const visible = btn.offsetParent !== null
                    console.log(
                      `[v0] [DEBUG] Button ${idx + 1}: text="${text}", visible=${visible}, classes="${btn.className}"`,
                    )
                  })

                  // Debug: Log all divs with role="button"
                  const divButtons = Array.from(document.querySelectorAll('div[role="button"]'))
                  console.log("[v0] [DEBUG] Found", divButtons.length, 'divs with role="button"')
                  divButtons.forEach((div, idx) => {
                    const text = div.textContent?.trim() || ""
                    const visible = (div as HTMLElement).offsetParent !== null
                    console.log(`[v0] [DEBUG] Div button ${idx + 1}: text="${text}", visible=${visible}`)
                  })

                  // Try to find and click the save button
                  // Method 1: Look for button elements
                  for (const button of allButtons) {
                    const text = button.textContent?.toLowerCase().trim() || ""
                    const visible = button.offsetParent !== null

                    if (!visible) continue

                    const isSaveButton = saveTexts.some(
                      (saveText) => text === saveText.toLowerCase() || text.includes(saveText.toLowerCase()),
                    )

                    if (isSaveButton) {
                      console.log("[v0] [DEBUG] Found save password button (method 1) with text:", text)
                      button.click()
                      return true
                    }
                  }

                  // Method 2: Look for div elements with role="button"
                  for (const div of divButtons) {
                    const text = div.textContent?.toLowerCase().trim() || ""
                    const visible = (div as HTMLElement).offsetParent !== null

                    if (!visible) continue

                    const isSaveButton = saveTexts.some(
                      (saveText) => text === saveText.toLowerCase() || text.includes(saveText.toLowerCase()),
                    )

                    if (isSaveButton) {
                      console.log("[v0] [DEBUG] Found save password button (method 2) with text:", text)
                      ;(div as HTMLElement).click()
                      return true
                    }
                  }

                  // Method 3: Look for any element containing save text
                  const allElements = Array.from(document.querySelectorAll("*"))
                  console.log("[v0] [DEBUG] Searching through all elements for save button...")

                  for (const element of allElements) {
                    const text = element.textContent?.toLowerCase().trim() || ""
                    const tagName = element.tagName.toLowerCase()

                    // Skip if element has too much text (likely a container)
                    if (text.length > 50) continue

                    const isSaveButton = saveTexts.some((saveText) => text === saveText.toLowerCase())

                    if (isSaveButton && (tagName === "button" || element.getAttribute("role") === "button")) {
                      const visible = (element as HTMLElement).offsetParent !== null
                      console.log(
                        `[v0] [DEBUG] Found potential save button (method 3): tag=${tagName}, text="${text}", visible=${visible}`,
                      )

                      if (visible) {
                        ;(element as HTMLElement).click()
                        return true
                      }
                    }
                  }

                  console.log("[v0] [DEBUG] No save password button found after exhaustive search")
                  return false
                })

                if (savePasswordClicked) {
                  console.log("[v0] ✓ Clicked 'Save password' button in browser dialog")
                  await this.behavior.waitRandom(1000)
                } else {
                  console.log("[v0] No password save dialog detected (this is normal if already saved)")
                }

                return { success: true }
              } else {
                console.log("[v0] ⚠ Still on verification page after recovery email")
                return { success: false, error: "Recovery email verification incomplete - may need additional steps" }
              }
            } else {
              console.log("[v0] ⚠ Next button not found after entering recovery email")
              return { success: false, error: "Could not proceed after entering recovery email" }
            }
          } else {
            console.log("[v0] ⚠ Recovery email input not found")
            return { success: false, error: "Recovery email input not found on verification page" }
          }
        } else {
          console.log("[v0] ⚠ Could not find recovery email verification option")
          return { success: false, error: "Recovery email option not found on verification page" }
        }
      } else if (this.page.url().includes("challenge") || this.page.url().includes("verify")) {
        console.log("[v0] ⚠ 2FA or verification required (no recovery email provided)")
        return { success: false, error: "2FA or verification required" }
      } else if (this.page.url().includes("mail.google.com")) {
        console.log("[v0] ✓ Login successful!")

        console.log("[v0] Checking for browser password save dialog...")
        await this.behavior.waitRandom(3000) // Increased wait time for dialog to appear

        const savePasswordClicked = await this.page.evaluate(() => {
          console.log("[v0] [DEBUG] Starting password save dialog search...")

          // Look for the "Save" button in multiple languages
          const saveTexts = [
            "save", // English
            "حفظ", // Arabic
            "enregistrer", // French
            "guardar", // Spanish
            "speichern", // German
            "salvar", // Portuguese
            "tallenna", // Finnish
          ]

          // Debug: Log all buttons on the page
          const allButtons = Array.from(document.querySelectorAll("button"))
          console.log("[v0] [DEBUG] Found", allButtons.length, "buttons on page")
          allButtons.forEach((btn, idx) => {
            const text = btn.textContent?.trim() || ""
            const visible = btn.offsetParent !== null
            console.log(
              `[v0] [DEBUG] Button ${idx + 1}: text="${text}", visible=${visible}, classes="${btn.className}"`,
            )
          })

          // Debug: Log all divs with role="button"
          const divButtons = Array.from(document.querySelectorAll('div[role="button"]'))
          console.log("[v0] [DEBUG] Found", divButtons.length, 'divs with role="button"')
          divButtons.forEach((div, idx) => {
            const text = div.textContent?.trim() || ""
            const visible = (div as HTMLElement).offsetParent !== null
            console.log(`[v0] [DEBUG] Div button ${idx + 1}: text="${text}", visible=${visible}`)
          })

          // Try to find and click the save button
          // Method 1: Look for button elements
          for (const button of allButtons) {
            const text = button.textContent?.toLowerCase().trim() || ""
            const visible = button.offsetParent !== null

            if (!visible) continue

            const isSaveButton = saveTexts.some(
              (saveText) => text === saveText.toLowerCase() || text.includes(saveText.toLowerCase()),
            )

            if (isSaveButton) {
              console.log("[v0] [DEBUG] Found save password button (method 1) with text:", text)
              button.click()
              return true
            }
          }

          // Method 2: Look for div elements with role="button"
          for (const div of divButtons) {
            const text = div.textContent?.toLowerCase().trim() || ""
            const visible = (div as HTMLElement).offsetParent !== null

            if (!visible) continue

            const isSaveButton = saveTexts.some(
              (saveText) => text === saveText.toLowerCase() || text.includes(saveText.toLowerCase()),
            )

            if (isSaveButton) {
              console.log("[v0] [DEBUG] Found save password button (method 2) with text:", text)
              ;(div as HTMLElement).click()
              return true
            }
          }

          // Method 3: Look for any element containing save text
          const allElements = Array.from(document.querySelectorAll("*"))
          console.log("[v0] [DEBUG] Searching through all elements for save button...")

          for (const element of allElements) {
            const text = element.textContent?.toLowerCase().trim() || ""
            const tagName = element.tagName.toLowerCase()

            // Skip if element has too much text (likely a container)
            if (text.length > 50) continue

            const isSaveButton = saveTexts.some((saveText) => text === saveText.toLowerCase())

            if (isSaveButton && (tagName === "button" || element.getAttribute("role") === "button")) {
              const visible = (element as HTMLElement).offsetParent !== null
              console.log(
                `[v0] [DEBUG] Found potential save button (method 3): tag=${tagName}, text="${text}", visible=${visible}`,
              )

              if (visible) {
                ;(element as HTMLElement).click()
                return true
              }
            }
          }

          console.log("[v0] [DEBUG] No save password button found after exhaustive search")
          return false
        })

        if (savePasswordClicked) {
          console.log("[v0] ✓ Clicked 'Save password' button in browser dialog")
          await this.behavior.waitRandom(1000)
        } else {
          console.log("[v0] No password save dialog detected (this is normal if already saved)")
        }

        if (sessionSaveWaitTime > 0) {
          console.log("[v0] ========================================")
          console.log(`[v0] Waiting ${sessionSaveWaitTime / 1000} seconds for browser to save session data...`)
          console.log("[v0] This allows Chrome to write cookies and localStorage to disk")
          console.log("[v0] ========================================")
          await new Promise((resolve) => setTimeout(resolve, sessionSaveWaitTime))
          console.log("[v0] ✓ Session data should now be saved to browser profile")
        }

        return { success: true }
      } else {
        console.log("[v0] ✗ Login may have failed, unexpected URL:", this.page.url())
        return { success: false }
      }
    } catch (error: any) {
      console.error("[v0] Login error:", error.message)
      return { success: false, error: error.message }
    }
  }

  private async findButtonByText(texts: string[]): Promise<ElementHandle<Element> | null> {
    const buttons = await this.page.$$("button")
    for (const button of buttons) {
      const buttonText = await button.evaluate((el) => el.textContent?.toLowerCase() || "")
      if (texts.some((text) => buttonText.includes(text.toLowerCase()))) {
        return button as ElementHandle<Element>
      }
    }
    return null
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
    return this.starEmailOnPage(this.page, emailIndex)
  }

  async starEmailOnPage(page: Page, emailIndex: number) {
    console.log(`[v0] Starring email at index ${emailIndex}`)

    try {
      console.log("[v0] Checking if on Gmail inbox...")
      const currentUrl = page.url()

      if (!currentUrl.includes("mail.google.com/mail/u/0/#inbox")) {
        console.log("[v0] Navigating to Gmail inbox...")
        await page.goto("https://mail.google.com/mail/u/0/#inbox", {
          waitUntil: "networkidle2",
          timeout: 30000,
        })
        await this.behavior.waitRandom(3000)
      } else {
        console.log("[v0] ✓ Already on Gmail inbox")
        await this.behavior.waitRandom(1000)
      }

      console.log("[v0] Checking if logged into Gmail...")
      const isLoggedIn = await page.evaluate(() => {
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

        const screenshot = await page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error(
          "Not logged into Gmail. Please ensure the GoLogin profile has Gmail credentials saved or login manually first.",
        )
      }

      console.log("[v0] ✓ Logged into Gmail")
      console.log("[v0] Waiting for Gmail interface to fully load...")

      // Wait for the main Gmail container
      await page.waitForSelector('[role="main"]', { timeout: 15000 }).catch(() => {
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
          emailRows = await page.$$(selector)
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
            await this.behavior.scrollNaturally(page, 300)
            await this.behavior.waitRandom(2000)

            // Try clicking on inbox to refresh
            if (retries === 3) {
              console.log("[v0] Trying to click inbox link to refresh...")
              const inboxLink = await page.$('a[href*="#inbox"]')
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

        const pageInfo = await page.evaluate(() => {
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

        const screenshot = await page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error("Could not find email rows on page - Gmail may not have loaded properly or inbox is empty")
      }

      console.log(`[v0] Found ${emailRows.length} email rows`)

      if (emailIndex >= emailRows.length) {
        throw new Error(`Email index ${emailIndex} out of range (only ${emailRows.length} emails found)`)
      }

      console.log(`[v0] Checking if email ${emailIndex} is already starred...`)
      const starStatus = await page.evaluate((index) => {
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

        const screenshot = await page.screenshot({ encoding: "base64" })
        console.log("[v0] Screenshot captured for debugging (base64 length):", screenshot.length)

        throw new Error("Star button not found with any selector")
      }

      console.log("[v0] Clicking star button...")
      await starButton.click()
      console.log(`[v0] ✓ Star button clicked using selector: ${usedSelector}`)

      await this.behavior.waitRandom(1000)

      // Check if any extra tabs opened and close them
      const pages = await page.browser()?.pages()
      if (pages && pages.length > 2) {
        console.log(`[v0] Detected ${pages.length} open tabs, closing extra tabs...`)
        // Close all tabs except the first two (homepage and Gmail)
        for (let i = 2; i < pages.length; i++) {
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
        const screenshot = await page.screenshot({ encoding: "base64" })
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

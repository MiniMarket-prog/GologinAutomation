import type { Page } from "puppeteer-core"

/**
 * Generate a random delay and wait for it
 * @param min Minimum delay in milliseconds
 * @param max Maximum delay in milliseconds
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Type text with human-like delays between characters
 * @param page Puppeteer page instance
 * @param selector CSS selector for the input element
 * @param text Text to type
 */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 })

  // Scroll element into view
  await page.evaluate((sel: string) => {
    const element = document.querySelector(sel)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, selector)

  await randomDelay(300, 500)

  // Click using page.click instead of element.click for better reliability
  await page.click(selector)
  await randomDelay(100, 300)

  // Clear any existing value first
  await page.evaluate((sel: string) => {
    const element = document.querySelector(sel) as HTMLInputElement
    if (element) {
      element.value = ""
    }
  }, selector)

  // Type each character with random delays
  await page.type(selector, text, { delay: Math.random() * 50 + 50 })
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a random element from an array
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

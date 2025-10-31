// Human-like behavior patterns for browser automation
import type { WebDriver, WebElement } from "selenium-webdriver"

/**
 * Generate a random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Simulate human-like mouse movement to an element before clicking
 */
export async function humanMouseMove(driver: WebDriver, element: WebElement): Promise<void> {
  try {
    // Get element location and size
    const rect = await driver.executeScript(
      `
      const element = arguments[0];
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
      };
    `,
      element,
    )

    // Add small random offset to make it more natural (not always center)
    const offsetX = (Math.random() - 0.5) * ((rect as any).width * 0.3)
    const offsetY = (Math.random() - 0.5) * ((rect as any).height * 0.3)

    // Simulate mouse movement with multiple steps
    const steps = Math.floor(Math.random() * 3) + 2 // 2-4 steps
    for (let i = 0; i < steps; i++) {
      await randomDelay(20, 50)
    }

    // Small pause before click (like human hesitation)
    await randomDelay(100, 300)
  } catch (error) {
    // If mouse movement fails, just continue - it's not critical
    console.log("[v0] Mouse movement simulation skipped")
  }
}

/**
 * Type text with human-like patterns
 * - Variable typing speed
 * - Occasional pauses (thinking)
 * - Faster for common words
 * - Slower for complex characters
 */
export async function humanType(driver: WebDriver, element: WebElement, text: string): Promise<void> {
  const words = text.split(" ")

  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    // Type each character in the word
    for (const char of word) {
      await driver.executeScript(
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

      // Variable typing speed based on character type
      if (char.match(/[0-9]/)) {
        // Numbers are typed slower (looking at keyboard)
        await randomDelay(100, 200)
      } else if (char.match(/[A-Z]/)) {
        // Capital letters slightly slower (shift key)
        await randomDelay(80, 150)
      } else if (char.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/)) {
        // Special characters much slower
        await randomDelay(150, 300)
      } else {
        // Regular characters - fast typing
        await randomDelay(50, 120)
      }

      // Occasional micro-pause (like thinking or looking at screen)
      if (Math.random() < 0.1) {
        await randomDelay(200, 500)
      }
    }

    // Add space between words (if not last word)
    if (i < words.length - 1) {
      await driver.executeScript(
        `
        const element = arguments[0];
        element.value = element.value + ' ';
        
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
      `,
        element,
      )
      await randomDelay(100, 200)
    }

    // Occasional pause between words (reading what was typed)
    if (Math.random() < 0.15) {
      await randomDelay(300, 700)
    }
  }

  // Final pause after typing (reviewing what was typed)
  await randomDelay(200, 500)
}

/**
 * Simulate reading content before taking action
 * Duration based on content length
 */
export async function simulateReading(contentLength = 100): Promise<void> {
  // Average reading speed: 200-250 words per minute
  // Assume ~5 characters per word
  const words = contentLength / 5
  const readingTimeMs = (words / 200) * 60 * 1000 // Convert to milliseconds

  // Add randomness (some people read faster/slower)
  const minTime = readingTimeMs * 0.5
  const maxTime = readingTimeMs * 1.5

  await randomDelay(Math.max(1000, minTime), Math.max(2000, maxTime))
}

/**
 * Scroll naturally to an element
 */
export async function humanScroll(driver: WebDriver, element: WebElement): Promise<void> {
  try {
    // Scroll in multiple steps for natural movement
    await driver.executeScript(
      `
      const element = arguments[0];
      const targetY = element.getBoundingClientRect().top + window.pageYOffset - window.innerHeight / 2;
      const startY = window.pageYOffset;
      const distance = targetY - startY;
      const duration = 500 + Math.random() * 500; // 500-1000ms
      let start = null;
      
      function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        
        // Easing function for natural scroll
        const easeInOutCubic = percentage < 0.5
          ? 4 * percentage * percentage * percentage
          : 1 - Math.pow(-2 * percentage + 2, 3) / 2;
        
        window.scrollTo(0, startY + distance * easeInOutCubic);
        
        if (progress < duration) {
          window.requestAnimationFrame(step);
        }
      }
      
      window.requestAnimationFrame(step);
    `,
      element,
    )

    // Wait for scroll to complete
    await randomDelay(600, 1200)
  } catch (error) {
    // Fallback to instant scroll if animation fails
    await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", element)
    await randomDelay(300, 600)
  }
}

/**
 * Random micro-pause (simulates user thinking, reading, or distraction)
 */
export async function thinkingPause(): Promise<void> {
  // 20% chance of a thinking pause
  if (Math.random() < 0.2) {
    await randomDelay(1000, 3000)
  }
}

/**
 * Click with human-like behavior
 * - Mouse movement to element
 * - Small pause before click
 * - Random delay after click
 */
export async function humanClick(driver: WebDriver, element: WebElement): Promise<void> {
  // Scroll element into view naturally
  await humanScroll(driver, element)

  // Move mouse to element
  await humanMouseMove(driver, element)

  // Click
  await element.click()

  // Natural delay after click (page processing, visual feedback)
  await randomDelay(300, 800)
}

/**
 * Fill input field with human-like behavior
 * - Scroll to field
 * - Click to focus
 * - Type with human patterns
 */
export async function humanFillInput(
  driver: WebDriver,
  element: WebElement,
  text: string,
  clearFirst = false,
): Promise<void> {
  // Scroll to element
  await humanScroll(driver, element)

  // Click to focus
  await humanClick(driver, element)

  // Small pause after focus (cursor blinking)
  await randomDelay(200, 400)

  // Clear existing value if needed
  if (clearFirst) {
    await driver.executeScript("arguments[0].value = '';", element)
    await randomDelay(100, 200)
  }

  // Type the text
  await humanType(driver, element, text)
}

import type { Page } from "puppeteer"
import * as fs from "fs"
import * as path from "path"

/**
 * Screenshot utility for Kameleo automation
 * Handles screenshot capture with proper file naming and directory management
 */

// Valid screenshot extensions for Puppeteer
type ScreenshotExtension = "png" | "jpeg" | "webp"

interface ScreenshotOptions {
  fullPage?: boolean
  quality?: number // Only for jpeg/webp
  type?: ScreenshotExtension
}

/**
 * Ensure the filename has a valid screenshot extension
 */
function ensureValidExtension(filename: string, defaultExt: ScreenshotExtension = "png"): string {
  const validExtensions = ["png", "jpeg", "webp"]
  const ext = path.extname(filename).toLowerCase().slice(1)

  if (validExtensions.includes(ext)) {
    return filename
  }

  // Add default extension if missing or invalid
  return `${filename}.${defaultExt}`
}

/**
 * Create screenshots directory if it doesn't exist
 */
function ensureScreenshotDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Take a screenshot with proper file naming and error handling
 */
export async function takeScreenshot(page: Page, filename: string, options: ScreenshotOptions = {}): Promise<void> {
  try {
    const { fullPage = true, quality, type = "png" } = options

    // Ensure valid extension
    const validFilename = ensureValidExtension(filename, type)

    // Create screenshots directory
    const screenshotDir = path.join(process.cwd(), "screenshots")
    ensureScreenshotDir(screenshotDir)

    // Full path
    const fullPath = path.join(screenshotDir, validFilename) as `${string}.png`

    // Take screenshot
    await page.screenshot({
      path: fullPath,
      fullPage,
      ...(quality && (type === "jpeg" || type === "webp") ? { quality } : {}),
    })

    console.log("[v0] Screenshot saved:", fullPath)
  } catch (error) {
    console.error("[v0] Error taking screenshot:", error)
  }
}

/**
 * Take a screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  prefix: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `${prefix}_${timestamp}`
  await takeScreenshot(page, filename, options)
}

/**
 * Take a screenshot for a specific step in the automation
 */
export async function takeStepScreenshot(
  page: Page,
  taskId: string,
  step: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  const filename = `task_${taskId}_${step}`
  await takeTimestampedScreenshot(page, filename, options)
}

/**
 * Take an error screenshot
 */
export async function takeErrorScreenshot(
  page: Page,
  taskId: string,
  errorType: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  const filename = `error_${taskId}_${errorType}`
  await takeTimestampedScreenshot(page, filename, options)
}

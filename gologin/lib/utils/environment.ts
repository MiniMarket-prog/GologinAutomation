/**
 * Utility functions for environment detection
 */

/**
 * Check if the app is running on Vercel (production/preview)
 */
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === "1" || !!process.env.VERCEL_ENV
}

/**
 * Get the appropriate GoLogin mode based on environment
 * - Vercel (production): Always use cloud mode
 * - Local development: Use user's preference from settings
 */
export function getEnvironmentMode(userPreference: "cloud" | "local"): "cloud" | "local" {
  if (isVercelEnvironment()) {
    console.log("[v0] Running on Vercel - forcing cloud mode")
    return "cloud"
  }

  console.log(`[v0] Running locally - using user preference: ${userPreference}`)
  return userPreference
}

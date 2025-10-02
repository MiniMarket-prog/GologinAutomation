import type { BehaviorPattern } from "@/lib/types"

export class HumanBehavior {
  private pattern: BehaviorPattern["config"]

  constructor(pattern: BehaviorPattern["config"]) {
    this.pattern = pattern
  }

  // Generate random delay within range
  randomDelay(min?: number, max?: number): number {
    const minDelay = min ?? this.pattern.action_delay.min
    const maxDelay = max ?? this.pattern.action_delay.max
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }

  // Simulate human typing with variable speed
  async typeWithHumanSpeed(text: string, element: any) {
    for (const char of text) {
      await element.type(char)
      const delay = this.randomDelay(this.pattern.typing_speed.min, this.pattern.typing_speed.max)
      await this.sleep(delay)
    }
  }

  // Random pause simulation
  async randomPause() {
    if (this.pattern.random_pauses.enabled && Math.random() < this.pattern.random_pauses.probability) {
      const duration = this.randomDelay(
        this.pattern.random_pauses.duration.min,
        this.pattern.random_pauses.duration.max,
      )
      console.log(`[v0] Random pause: ${duration}ms`)
      await this.sleep(duration)
    }
  }

  // Simulate natural mouse movement
  async moveMouseNaturally(page: any, x: number, y: number) {
    if (!this.pattern.mouse_movement.enabled) {
      await page.mouse.move(x, y)
      return
    }

    // Start from center of viewport as default position
    const currentPos = { x: 0, y: 0 }

    // Calculate steps for smooth movement
    const steps = Math.floor(Math.random() * 10) + 20
    const deltaX = (x - currentPos.x) / steps
    const deltaY = (y - currentPos.y) / steps

    for (let i = 0; i < steps; i++) {
      const newX = currentPos.x + deltaX * i
      const newY = currentPos.y + deltaY * i
      await page.mouse.move(newX, newY)
      await this.sleep(Math.random() * 10 + 5)
    }

    await page.mouse.move(x, y)
  }

  // Simulate natural scrolling
  async scrollNaturally(page: any, distance: number) {
    if (!this.pattern.scroll_behavior.enabled) {
      await page.evaluate((dist: number) => window.scrollBy(0, dist), distance)
      return
    }

    const steps = Math.floor(Math.abs(distance) / 100)
    const stepSize = distance / steps

    for (let i = 0; i < steps; i++) {
      await page.evaluate((step: number) => window.scrollBy(0, step), stepSize)
      await this.sleep(this.randomDelay(50, 150))

      // Random pause while scrolling
      if (Math.random() < this.pattern.scroll_behavior.pause_probability) {
        await this.sleep(this.randomDelay(500, 1500))
      }
    }
  }

  // Helper sleep function
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Wait with random variation
  async waitRandom(baseMs: number, variationPercent = 20) {
    const variation = baseMs * (variationPercent / 100)
    const actualDelay = baseMs + (Math.random() * variation * 2 - variation)
    await this.sleep(actualDelay)
  }
}

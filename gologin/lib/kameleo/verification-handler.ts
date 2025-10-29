// Phone verification handler using 5sim API
import { FiveSimAPI } from "../services/fivesim-api"

interface VerificationResult {
  success: boolean
  phone?: string
  code?: string
  error?: string
}

export class VerificationHandler {
  private fiveSimAPI: FiveSimAPI

  constructor(apiKey: string) {
    this.fiveSimAPI = new FiveSimAPI(apiKey)
  }

  /**
   * Get a phone number for verification
   */
  async getPhoneNumber(country: string): Promise<{ phone: string; orderId: string }> {
    try {
      console.log("[v0] Requesting phone number for country:", country)

      const order = await this.fiveSimAPI.buyNumber(country, "google")

      if (!order.phone) {
        throw new Error("Failed to get phone number from 5sim")
      }

      console.log("[v0] Phone number acquired:", order.phone)

      return {
        phone: order.phone,
        orderId: order.id.toString(),
      }
    } catch (error) {
      console.error("[v0] Failed to get phone number:", error)
      throw error
    }
  }

  /**
   * Wait for and retrieve verification code
   */
  async getVerificationCode(orderId: string, maxAttempts = 40): Promise<string> {
    console.log("[v0] Waiting for verification code, order ID:", orderId)

    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const order = await this.fiveSimAPI.checkSMS(orderId)

        if (order && order.sms && order.sms.length > 0) {
          // Extract verification code from SMS
          const code = this.extractCode(order.sms[0].text)

          if (code) {
            console.log("[v0] Verification code received:", code)
            return code
          }
        }

        // Wait 5 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++

        console.log(`[v0] Waiting for code... (${attempts}/${maxAttempts})`)
      } catch (error) {
        console.error("[v0] Error checking SMS:", error)
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    throw new Error("Timeout waiting for verification code")
  }

  /**
   * Extract verification code from SMS text
   */
  private extractCode(text: string): string | null {
    // Google verification codes are typically 6 digits
    const match = text.match(/\b\d{6}\b/)
    return match ? match[0] : null
  }

  /**
   * Cancel a phone number order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.fiveSimAPI.cancelOrder(orderId)
      console.log("[v0] Order cancelled:", orderId)
    } catch (error) {
      console.error("[v0] Failed to cancel order:", error)
      // Don't throw - cancellation failure is not critical
    }
  }

  /**
   * Finish an order (mark as completed)
   */
  async finishOrder(orderId: string): Promise<void> {
    try {
      await this.fiveSimAPI.finishOrder(orderId)
      console.log("[v0] Order finished:", orderId)
    } catch (error) {
      console.error("[v0] Failed to finish order:", error)
      // Don't throw - finishing failure is not critical
    }
  }
}

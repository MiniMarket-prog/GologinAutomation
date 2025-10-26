// 5sim.net API integration for phone verification

interface FiveSimCountry {
  name: string
  code: string
  price: number
}

interface FiveSimNumber {
  id: number
  phone: string
  operator: string
  product: string
  price: number
  status: string
  expires: string
  sms: Array<{
    id: number
    date: string
    sender: string
    text: string
    code: string
  }>
}

interface FiveSimProfile {
  id: number
  email: string
  balance: number
  rating: number
  default_country: string
  default_operator: string
  default_forwarding: string
}

export class FiveSimAPI {
  private apiKey: string
  private baseUrl = "https://5sim.net/v1"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request(endpoint: string, method = "GET") {
    const url = `${this.baseUrl}${endpoint}`
    console.log(`[v0] 5sim API Request: ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    })

    console.log(`[v0] 5sim API Response Status: ${response.status} ${response.statusText}`)
    console.log(`[v0] 5sim API Response Headers:`, Object.fromEntries(response.headers.entries()))

    // Clone the response so we can read it multiple times
    const responseClone = response.clone()
    const responseText = await responseClone.text()
    console.log(`[v0] 5sim API Response Body:`, responseText)

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `5sim API error: ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) {
          errorMessage = `5sim API error: ${errorJson.message}`
        }
      } catch {
        // If not JSON, use the text directly
        if (errorText) {
          errorMessage = `5sim API error: ${errorText}`
        }
      }

      if (errorText.toLowerCase().includes("no free phone")) {
        throw new Error(
          "NO_PHONES_AVAILABLE: No phone numbers currently available from 5sim for the selected country/operator/service combination. This is normal and means 5sim is temporarily out of stock. Try: 1) Different country (e.g., 'any'), 2) Different operator (e.g., 'any'), 3) Wait a few minutes and try again, 4) Check your 5sim account balance and pricing limits.",
        )
      }

      // Add helpful context for common errors
      if (response.status === 403) {
        errorMessage += " (Check your API key and account balance)"
      } else if (response.status === 401) {
        errorMessage += " (Invalid API key)"
      } else if (response.status === 400) {
        errorMessage += " (Invalid request parameters)"
      }

      throw new Error(errorMessage)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return response.json()
    } else {
      const text = await response.text()

      if (text.toLowerCase().includes("no free phone")) {
        // Check if it mentions "max price" which indicates a price limit issue
        if (text.toLowerCase().includes("max price")) {
          throw new Error(
            "PRICE_LIMIT_EXCEEDED: Phone numbers are available, but they exceed your account's maximum price limit. Please: 1) Log into your 5sim account at https://5sim.net and increase your 'Max Price' setting, 2) Try a different country/operator that may have cheaper rates, 3) Check your account balance is sufficient.",
          )
        }
        throw new Error(
          "NO_PHONES_AVAILABLE: No phone numbers currently available from 5sim for the selected country/operator/service combination. This is normal and means 5sim is temporarily out of stock. Try: 1) Different country (e.g., 'any'), 2) Different operator (e.g., 'any'), 3) Wait a few minutes and try again.",
        )
      }

      // If not a known message, throw generic error
      throw new Error(`Unexpected response format: ${text}`)
    }
  }

  async getProfile(): Promise<FiveSimProfile> {
    return await this.request("/user/profile")
  }

  async getPrices(service = "google"): Promise<any> {
    return await this.request(`/guest/prices?product=${service}`)
  }

  // Get available countries for a service
  async getCountries(service = "google"): Promise<FiveSimCountry[]> {
    const data = await this.request(`/guest/prices?country=any&product=${service}`)
    return Object.entries(data).map(([code, info]: [string, any]) => ({
      code,
      name: info.name || code,
      price: info[service]?.cost || 0,
    }))
  }

  // Buy a phone number
  async buyNumber(country = "any", operator = "any", product = "google"): Promise<FiveSimNumber> {
    // 5sim API format: /user/buy/activation/{country}/{operator}/{product}
    console.log(`[v0] Buying number: country=${country}, operator=${operator}, product=${product}`)

    try {
      const result = await this.request(`/user/buy/activation/${country}/${operator}/${product}`, "GET")
      console.log(`[v0] Buy number success:`, result)
      return result
    } catch (error: any) {
      console.log(`[v0] Buy number error:`, error.message)
      throw error
    }
  }

  // Check for SMS codes
  async checkSMS(orderId: string): Promise<FiveSimNumber> {
    return await this.request(`/user/check/${orderId}`)
  }

  // Cancel order if no SMS received
  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/user/cancel/${orderId}`)
  }

  // Finish order after successful verification
  async finishOrder(orderId: string): Promise<void> {
    await this.request(`/user/finish/${orderId}`)
  }

  // Get account balance
  async getBalance(): Promise<{ balance: number; currency: string }> {
    const data = await this.request("/user/profile")
    return {
      balance: data.balance,
      currency: data.currency || "RUB",
    }
  }
}

// Helper to extract verification code from SMS
export function extractVerificationCode(smsText: string): string | null {
  // Google verification codes are typically 6 digits
  const match = smsText.match(/\b(\d{6})\b/)
  return match ? match[1] : null
}

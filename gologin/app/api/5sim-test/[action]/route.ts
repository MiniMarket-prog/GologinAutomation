import { type NextRequest, NextResponse } from "next/server"
import { FiveSimAPI } from "@/lib/services/fivesim-api"

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params
    const body = await request.json()
    const { country, operator, product, orderId } = body

    const apiKey = process.env.FIVESIM_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "FIVESIM_API_KEY not configured" }, { status: 500 })
    }

    const fivesim = new FiveSimAPI(apiKey)

    let result: any

    switch (action) {
      case "balance":
        result = await fivesim.getBalance()
        break

      case "profile":
        result = await fivesim.getProfile()
        break

      case "prices":
        result = await fivesim.getPrices()
        break

      case "buy":
        console.log(`[5sim-test] Buy request: country=${country}, operator=${operator}, product=${product}`)
        console.log(`[5sim-test] API Key configured: ${apiKey ? "Yes" : "No"}`)
        try {
          result = await fivesim.buyNumber(country, operator, product)
          console.log(`[5sim-test] Buy success:`, result)
        } catch (error: any) {
          console.log(`[5sim-test] Buy error:`, error.message)
          throw error
        }
        break

      case "check":
        if (!orderId) {
          return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
        }
        result = await fivesim.checkSMS(orderId)
        break

      case "cancel":
        if (!orderId) {
          return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
        }
        result = await fivesim.cancelOrder(orderId)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[5sim-test] Error:", error)
    return NextResponse.json(
      {
        error: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

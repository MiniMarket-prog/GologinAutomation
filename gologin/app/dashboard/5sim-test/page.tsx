"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function FiveSimTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [country, setCountry] = useState("any")
  const [operator, setOperator] = useState("any")
  const [product, setProduct] = useState("google")
  const [orderId, setOrderId] = useState("")

  const testApiCall = async (endpoint: string, method = "GET") => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/5sim-test/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, operator, product, orderId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "API call failed")
      } else {
        setResult(data)
        if (endpoint === "buy" && data.id) {
          setOrderId(data.id.toString())
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">5sim API Test</h1>
        <p className="text-muted-foreground">Test and debug 5sim API integration</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Check your 5sim account balance and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => testApiCall("balance")} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Balance"}
            </Button>
            <Button onClick={() => testApiCall("profile")} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Pricing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
            <CardDescription>Check available countries and prices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product/Service</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google/Gmail</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="microsoft">Microsoft</SelectItem>
                  <SelectItem value="yahoo">Yahoo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => testApiCall("prices")} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Prices"}
            </Button>
          </CardContent>
        </Card>

        {/* Buy Number */}
        <Card>
          <CardHeader>
            <CardTitle>Buy Phone Number</CardTitle>
            <CardDescription>Purchase a phone number for verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (Recommended)</SelectItem>
                  <SelectItem value="russia">🇷🇺 Russia</SelectItem>
                  <SelectItem value="ukraine">🇺🇦 Ukraine</SelectItem>
                  <SelectItem value="kazakhstan">🇰🇿 Kazakhstan</SelectItem>
                  <SelectItem value="china">🇨🇳 China</SelectItem>
                  <SelectItem value="philippines">🇵🇭 Philippines</SelectItem>
                  <SelectItem value="indonesia">🇮🇩 Indonesia</SelectItem>
                  <SelectItem value="vietnam">🇻🇳 Vietnam</SelectItem>
                  <SelectItem value="india">🇮🇳 India</SelectItem>
                  <SelectItem value="usa">🇺🇸 USA</SelectItem>
                  <SelectItem value="england">🇬🇧 England</SelectItem>
                  <SelectItem value="canada">🇨🇦 Canada</SelectItem>
                  <SelectItem value="germany">🇩🇪 Germany</SelectItem>
                  <SelectItem value="france">🇫🇷 France</SelectItem>
                  <SelectItem value="spain">🇪🇸 Spain</SelectItem>
                  <SelectItem value="italy">🇮🇹 Italy</SelectItem>
                  <SelectItem value="poland">🇵🇱 Poland</SelectItem>
                  <SelectItem value="romania">🇷🇴 Romania</SelectItem>
                  <SelectItem value="netherlands">🇳🇱 Netherlands</SelectItem>
                  <SelectItem value="belgium">🇧🇪 Belgium</SelectItem>
                  <SelectItem value="czech">🇨🇿 Czech Republic</SelectItem>
                  <SelectItem value="portugal">🇵🇹 Portugal</SelectItem>
                  <SelectItem value="sweden">🇸🇪 Sweden</SelectItem>
                  <SelectItem value="latvia">🇱🇻 Latvia</SelectItem>
                  <SelectItem value="lithuania">🇱🇹 Lithuania</SelectItem>
                  <SelectItem value="estonia">��🇪 Estonia</SelectItem>
                  <SelectItem value="mexico">🇲🇽 Mexico</SelectItem>
                  <SelectItem value="brazil">🇧🇷 Brazil</SelectItem>
                  <SelectItem value="argentina">🇦🇷 Argentina</SelectItem>
                  <SelectItem value="colombia">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="turkey">🇹🇷 Turkey</SelectItem>
                  <SelectItem value="egypt">🇪🇬 Egypt</SelectItem>
                  <SelectItem value="nigeria">🇳🇬 Nigeria</SelectItem>
                  <SelectItem value="kenya">🇰🇪 Kenya</SelectItem>
                  <SelectItem value="southafrica">🇿🇦 South Africa</SelectItem>
                  <SelectItem value="israel">🇮🇱 Israel</SelectItem>
                  <SelectItem value="thailand">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="malaysia">🇲🇾 Malaysia</SelectItem>
                  <SelectItem value="singapore">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="hongkong">🇭🇰 Hong Kong</SelectItem>
                  <SelectItem value="japan">🇯🇵 Japan</SelectItem>
                  <SelectItem value="southkorea">🇰🇷 South Korea</SelectItem>
                  <SelectItem value="australia">🇦🇺 Australia</SelectItem>
                  <SelectItem value="newzealand">🇳🇿 New Zealand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (Recommended)</SelectItem>
                  <SelectItem value="mts">MTS (Russia)</SelectItem>
                  <SelectItem value="beeline">Beeline (Russia)</SelectItem>
                  <SelectItem value="megafon">Megafon (Russia)</SelectItem>
                  <SelectItem value="tele2">Tele2 (Russia)</SelectItem>
                  <SelectItem value="yota">Yota (Russia)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use "Any" for most countries. Specific operators are mainly for Russia.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Product/Service</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google/Gmail</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="microsoft">Microsoft</SelectItem>
                  <SelectItem value="yahoo">Yahoo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => testApiCall("buy")} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy Number"}
            </Button>
          </CardContent>
        </Card>

        {/* Check SMS */}
        <Card>
          <CardHeader>
            <CardTitle>Check SMS</CardTitle>
            <CardDescription>Get SMS code for an order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Order ID</Label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID from buy response"
              />
            </div>
            <Button onClick={() => testApiCall("check")} disabled={loading || !orderId} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check SMS"}
            </Button>
            <Button
              onClick={() => testApiCall("cancel")}
              disabled={loading || !orderId}
              variant="destructive"
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Order"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.startsWith("NO_PHONES_AVAILABLE:") ? (
              <div className="space-y-2">
                <p className="font-semibold">No Phone Numbers Available</p>
                <p className="text-sm">{error.replace("NO_PHONES_AVAILABLE: ", "")}</p>
              </div>
            ) : (
              error
            )}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface FingerprintSettings {
  mode?: "auto" | "custom"
  os?: "win" | "mac" | "lin" | "Windows" | "macOS" | "Linux"
  osSpec?: string
  resolution?: string
  screen?: {
    width: number
    height: number
  }
  language?: string
  hardwareConcurrency?: number
  cpuCores?: number // Alias for hardwareConcurrency
  deviceMemory?: number
  memory?: number // Alias for deviceMemory
  timezone?: string
  webglVendor?: string
  webglRenderer?: string
  audioContextNoise?: number
  webglNoise?: number
  canvasMode?: "off" | "noise" | "block"
  webrtcMode?: "disabled" | "alerted" | "real"
  // Nested object formats for account-creator
  webgl?: {
    vendor?: string
    renderer?: string
    noise?: boolean
  }
  canvas?: {
    mode: string
  }
  audio?: {
    noise: boolean
  }
  webrtc?: {
    mode: string
  }
}

interface AdvancedFingerprintSettingsProps {
  settings: FingerprintSettings
  onChange: (settings: FingerprintSettings) => void
}

export function AdvancedFingerprintSettings({ settings, onChange }: AdvancedFingerprintSettingsProps) {
  const [useCustom, setUseCustom] = useState(settings.mode === "custom")

  const resolutions = ["1920x1080", "1366x768", "1440x900", "1536x864", "1600x900", "2560x1440", "3840x2160"]

  const languages = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "pt-BR", "it-IT", "ru-RU", "ja-JP", "zh-CN", "ar-SA"]

  const timezones = [
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Dubai",
    "Australia/Sydney",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Fingerprinting</CardTitle>
        <CardDescription>
          Customize browser fingerprint parameters to avoid detection. Leave on "Auto" for random values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="use-custom">Use Custom Settings</Label>
          <Switch
            id="use-custom"
            checked={useCustom}
            onCheckedChange={(checked) => {
              setUseCustom(checked)
              onChange({ ...settings, mode: checked ? "custom" : "auto" })
            }}
          />
        </div>

        {useCustom && (
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
              <TabsTrigger value="graphics">Graphics</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="space-y-4">
              <div className="space-y-2">
                <Label>Operating System</Label>
                <Select
                  value={settings.os || "auto"}
                  onValueChange={(value) => onChange({ ...settings, os: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Random)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Random)</SelectItem>
                    <SelectItem value="win">Windows</SelectItem>
                    <SelectItem value="mac">macOS</SelectItem>
                    <SelectItem value="lin">Linux</SelectItem>
                    <SelectItem value="Windows">Windows</SelectItem>
                    <SelectItem value="macOS">macOS</SelectItem>
                    <SelectItem value="Linux">Linux</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.os === "win" ||
                (settings.os === "Windows" && (
                  <div className="space-y-2">
                    <Label>Windows Version</Label>
                    <Select
                      value={settings.osSpec || "win11"}
                      onValueChange={(value) => onChange({ ...settings, osSpec: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="win11">Windows 11</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}

              {settings.os === "mac" ||
                (settings.os === "macOS" && (
                  <div className="space-y-2">
                    <Label>Mac Chip</Label>
                    <Select
                      value={settings.osSpec || "M1"}
                      onValueChange={(value) => onChange({ ...settings, osSpec: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M1">Apple M1</SelectItem>
                        <SelectItem value="M2">Apple M2</SelectItem>
                        <SelectItem value="M3">Apple M3</SelectItem>
                        <SelectItem value="M4">Apple M4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}

              <div className="space-y-2">
                <Label>Screen Resolution</Label>
                <Select
                  value={settings.resolution || "auto"}
                  onValueChange={(value) => onChange({ ...settings, resolution: value === "auto" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Random)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Random)</SelectItem>
                    {resolutions.map((res) => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={settings.language || "auto"}
                  onValueChange={(value) => onChange({ ...settings, language: value === "auto" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Random)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Random)</SelectItem>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={settings.timezone || "auto"}
                  onValueChange={(value) => onChange({ ...settings, timezone: value === "auto" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Based on IP)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Based on IP)</SelectItem>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="hardware" className="space-y-4">
              <div className="space-y-2">
                <Label>CPU Cores (Hardware Concurrency)</Label>
                <Select
                  value={settings.hardwareConcurrency?.toString() || settings.cpuCores?.toString() || "auto"}
                  onValueChange={(value) =>
                    onChange({
                      ...settings,
                      hardwareConcurrency: value === "auto" ? undefined : Number.parseInt(value),
                      cpuCores: value === "auto" ? undefined : Number.parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Random)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Random)</SelectItem>
                    <SelectItem value="4">4 cores</SelectItem>
                    <SelectItem value="8">8 cores</SelectItem>
                    <SelectItem value="12">12 cores</SelectItem>
                    <SelectItem value="16">16 cores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>RAM (Device Memory)</Label>
                <Select
                  value={settings.deviceMemory?.toString() || settings.memory?.toString() || "auto"}
                  onValueChange={(value) =>
                    onChange({
                      ...settings,
                      deviceMemory: value === "auto" ? undefined : Number.parseInt(value),
                      memory: value === "auto" ? undefined : Number.parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (Random)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Random)</SelectItem>
                    <SelectItem value="4">4 GB</SelectItem>
                    <SelectItem value="8">8 GB</SelectItem>
                    <SelectItem value="16">16 GB</SelectItem>
                    <SelectItem value="32">32 GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="graphics" className="space-y-4">
              <div className="space-y-2">
                <Label>WebGL Vendor</Label>
                <Input
                  placeholder="Auto (e.g., Google Inc. (NVIDIA))"
                  value={settings.webglVendor || settings.webgl?.vendor || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      webglVendor: e.target.value || undefined,
                      webgl: { ...settings.webgl, vendor: e.target.value || undefined },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>WebGL Renderer</Label>
                <Input
                  placeholder="Auto (e.g., ANGLE (NVIDIA GeForce GTX 1660 Ti))"
                  value={settings.webglRenderer || settings.webgl?.renderer || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      webglRenderer: e.target.value || undefined,
                      webgl: { ...settings.webgl, renderer: e.target.value || undefined },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>WebGL Noise Level (0-1)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.5"
                  value={settings.webglNoise || (settings.webgl?.noise ? "1" : "0") || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      webglNoise: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                      webgl: {
                        ...settings.webgl,
                        noise: e.target.value ? Number.parseFloat(e.target.value) === 1 : undefined,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Canvas Mode</Label>
                <Select
                  value={settings.canvasMode || settings.canvas?.mode || "off"}
                  onValueChange={(value) =>
                    onChange({
                      ...settings,
                      canvasMode: value as any,
                      canvas: { ...settings.canvas, mode: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off (Recommended)</SelectItem>
                    <SelectItem value="noise">Noise</SelectItem>
                    <SelectItem value="block">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <div className="space-y-2">
                <Label>Audio Context Noise (0-1)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  placeholder="0.1"
                  value={settings.audioContextNoise || (settings.audio?.noise ? "1" : "0") || ""}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      audioContextNoise: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                      audio: {
                        ...settings.audio,
                        noise: e.target.value ? Number.parseFloat(e.target.value) === 1 : false,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>WebRTC Mode</Label>
                <Select
                  value={settings.webrtcMode || settings.webrtc?.mode || "alerted"}
                  onValueChange={(value) =>
                    onChange({
                      ...settings,
                      webrtcMode: value as any,
                      webrtc: { ...settings.webrtc, mode: value as any },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="alerted">Alerted (Recommended)</SelectItem>
                    <SelectItem value="real">Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">💡 Tip:</p>
                <p className="mt-1 text-muted-foreground">
                  For best results, use "Auto" settings to randomize fingerprints. Custom settings are useful when you
                  need specific configurations for testing or matching a particular device profile.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!useCustom && (
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium">✨ Auto Mode Enabled</p>
            <p className="mt-1 text-muted-foreground">
              Profiles will be created with randomized fingerprints including OS, resolution, language, CPU cores, RAM,
              fonts, WebGL, audio context, and more. This provides the best protection against detection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export class GoLoginAPI {
  private apiKey: string
  private baseUrl = "https://api.gologin.com"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getProfiles() {
    const response = await fetch(`${this.baseUrl}/browser`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    return response.json()
  }

  async startProfile(profileId: string) {
    const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    return response.json()
  }

  async stopProfile(profileId: string) {
    const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    return response.json()
  }

  async getProfileStatus(profileId: string) {
    const response = await fetch(`${this.baseUrl}/browser/${profileId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    return response.json()
  }
}

"use client"

import useSWR from "swr"
import type { GoLoginProfile } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProfiles(
  page = 1,
  limit = 50,
  status?: string,
  search?: string,
  gmailStatus?: string,
  folder?: string,
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status }),
    ...(search && { search }),
    ...(gmailStatus && { gmailStatus }),
    ...(folder && { folder }),
  })

  const { data, error, isLoading, mutate } = useSWR(`/api/profiles?${params}`, fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  })

  return {
    profiles: data?.profiles as GoLoginProfile[] | undefined,
    total: data?.total as number | undefined,
    totalPages: data?.totalPages as number | undefined,
    isLoading,
    error,
    mutate,
  }
}

export function useProfile(id: string) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/profiles/${id}` : null, fetcher)

  return {
    profile: data as GoLoginProfile | undefined,
    isLoading,
    error,
    mutate,
  }
}

export function useProfileStats() {
  const { data, error, isLoading, mutate } = useSWR("/api/profiles/stats", fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
  })

  return {
    stats: data,
    isLoading,
    error,
    mutate,
  }
}

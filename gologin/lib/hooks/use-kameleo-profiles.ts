import useSWR from "swr"
import type { KameleoProfile } from "@/lib/types"

interface UseKameleoProfilesResult {
  profiles: KameleoProfile[] | undefined
  total: number | undefined
  totalPages: number | undefined
  isLoading: boolean
  error: any
  mutate: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useKameleoProfiles(
  page = 1,
  limit = 50,
  statusFilter?: string,
  search?: string,
): UseKameleoProfilesResult {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (statusFilter) params.append("status", statusFilter)
  if (search) params.append("search", search)

  const { data, error, mutate } = useSWR(`/api/kameleo-profiles/list?${params.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  return {
    profiles: data?.profiles,
    total: data?.total,
    totalPages: data?.totalPages,
    isLoading: !error && !data,
    error,
    mutate,
  }
}

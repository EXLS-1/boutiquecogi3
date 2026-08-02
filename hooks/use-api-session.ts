// hooks/use-api-session.ts
import { useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

export function useApiSession() {
  const { data, error, isLoading } = useSWR("/api/auth/get-session", fetcher, {
    refreshInterval: 30000, // revalide toutes les 30s
    dedupingInterval: 5000,
  });

  return {
    session: data?.success ? data : null,
    isLoading,
    isError: !!error || data?.success === false,
  };
}

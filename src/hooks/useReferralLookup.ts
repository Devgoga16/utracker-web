import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { lookupReferral } from '@/api/referrals'

/**
 * Busca quién invita con un código, esperando a que se deje de escribir.
 *
 * `invalid` solo es verdadero cuando la API respondió que no existe: mientras
 * se escribe o se consulta no se marca error, para no regañar a medio código.
 */
export function useReferralLookup(code: string) {
  const [debounced, setDebounced] = useState(code)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(code), 400)
    return () => clearTimeout(t)
  }, [code])

  const enabled = debounced.length >= 2
  const query = useQuery({
    queryKey: ['referral-lookup', debounced],
    queryFn: () => lookupReferral(debounced),
    enabled,
    retry: false,
    staleTime: Infinity,
  })

  const settled = enabled && debounced === code && !query.isFetching
  return {
    referrer: settled ? (query.data ?? null) : null,
    checking: code.length >= 2 && !settled,
    invalid: settled && query.isError,
  }
}

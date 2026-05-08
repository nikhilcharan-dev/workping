import { useEffect, useRef, useState } from 'react'
import axiosClient from '@/helpers/httpClient'

const POLL_INTERVAL_MS = 60_000 // refresh every 60 seconds

export default function usePendingLeaveCount() {
  const [count, setCount] = useState(0)
  const timerRef = useRef(null)

  const fetchCount = async () => {
    try {
      const res = await axiosClient.get('/api/admin/leaves/pending-count', { silent: true })
      setCount(res.data?.data?.count ?? 0)
    } catch {
      // silently ignore — badge just won't update
    }
  }

  useEffect(() => {
    fetchCount()
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  return { count }
}

"use client"

import { useEffect, useMemo, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type RealtimeRow = Record<string, any>

type UseRealtimeTableOptions = {
  table: string
  schema?: string
  enabled?: boolean
  onInsert?: (row: RealtimeRow) => void
  onUpdate?: (row: RealtimeRow) => void
  onDelete?: (row: RealtimeRow) => void
}

let channelCounter = 0

export function useRealtimeTable({
  table,
  schema = 'public',
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeTableOptions) {
  const supabase = getSupabaseBrowserClient()
  const channelRef = useRef<any>(null)
  const insertRef = useRef(onInsert)
  const updateRef = useRef(onUpdate)
  const deleteRef = useRef(onDelete)

  useEffect(() => {
    insertRef.current = onInsert
  }, [onInsert])

  useEffect(() => {
    updateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    deleteRef.current = onDelete
  }, [onDelete])

  const channelName = useMemo(() => {
    return `realtime:${schema}:${table}`
  }, [schema, table])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema, table },
        (payload: any) => {
          if (insertRef.current && payload?.new) insertRef.current(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema, table },
        (payload: any) => {
          if (updateRef.current && payload?.new) updateRef.current(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema, table },
        (payload: any) => {
          if (deleteRef.current && payload?.old) deleteRef.current(payload.old)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, schema, supabase, table, channelName])
}

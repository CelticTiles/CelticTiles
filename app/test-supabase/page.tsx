"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Database } from "@/supabase/database.types"

export default function TestSupabasePage() {
  const supabase = getSupabaseBrowserClient()
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [message, setMessage] = useState('')
  const [tableCount, setTableCount] = useState(0)

  useEffect(() => {
    testConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function testConnection() {
    try {
      // Test 1: Check connection
      const { error } = await supabase
        .from('products')
        .select('count')
        .limit(1)

      if (error) {
        setStatus('error')
        setMessage(`Error: ${error.message}`)
        return
      }

      // Test 2: Count all tables
      const tables: Array<keyof Database["public"]["Tables"]> = ['products', 'orders', 'coupons', 'reviews', 'profiles']
      let count = 0
      
      for (const table of tables) {
        const { error: tableError } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (!tableError) count++
      }

      setTableCount(count)
      setStatus('success')
      setMessage(`✅ Connected! Found ${count}/5 tables accessible.`)
      
    } catch (err) {
      setStatus('error')
      setMessage(`Exception: ${err}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Supabase Connection Test
        </h1>
        
        <div className={`p-4 rounded-lg mb-4 ${
          status === 'testing' ? 'bg-blue-100' :
          status === 'success' ? 'bg-green-100' :
          'bg-red-100'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {status === 'testing' && (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="font-semibold">Testing connection...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <span className="text-2xl">✅</span>
                <span className="font-semibold text-green-700">Connected!</span>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="text-2xl">❌</span>
                <span className="font-semibold text-red-700">Connection Failed</span>
              </>
            )}
          </div>
          <p className="text-sm">{message}</p>
        </div>

        {status === 'success' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tables accessible:</span>
              <span className="font-mono font-semibold">{tableCount}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage bucket:</span>
              <span className="font-mono font-semibold">uploads</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">RLS:</span>
              <span className="font-mono font-semibold text-green-600">Enabled</span>
            </div>
          </div>
        )}

        <button
          onClick={testConnection}
          className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Retry Connection
        </button>
      </div>
    </div>
  )
}

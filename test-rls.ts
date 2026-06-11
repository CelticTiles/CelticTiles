import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gtzkxrsbygandkycckhe.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emt4cnNieWdhbmRreWNja2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTQwMjIsImV4cCI6MjA4NDQ5MDAyMn0.EE_NN5i0rmm-fA6cX1TEs4MQV9ghCmXSaSqHdZhwGFw'
)

async function test() {
  const { data, error } = await supabase.from('site_settings').select('*')
  console.log('Select:', data, error)
}
test()

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify caller identity
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Missing auth' })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { userId } = req.body
  if (userId !== user.id) return res.status(403).json({ error: 'Can only update own profile' })

  // Update must_change_password flag using service role (bypasses RLS)
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}

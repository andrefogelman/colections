import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the caller is admin
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !caller) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // POST: Create user
  if (req.method === 'POST') {
    const { email, password, name, role = 'viewer' } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing email, password, or name' })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, must_change_password: false },
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(201).json({ user: { id: data.user.id, email, name, role } })
  }

  // DELETE: Delete user
  if (req.method === 'DELETE') {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    if (userId === caller.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  // PATCH: Reset password
  if (req.method === 'PATCH') {
    const { userId, password } = req.body

    if (!userId || !password) {
      return res.status(400).json({ error: 'Missing userId or password' })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  // GET: List users
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ users: data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

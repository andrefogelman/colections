import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Shield, Eye, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase'

interface UserProfile {
  id: string
  name: string
  email: string
  role: 'admin' | 'viewer'
  must_change_password: boolean
  created_at: string
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }
}

export function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserProfile | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin-users', { headers })
      if (!res.ok) throw new Error('Erro ao carregar usuários')
      const data = await res.json()
      setUsers(data.users)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return

    setCreating(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar usuário')
      }
      toast.success('Usuário criado com sucesso')
      setCreateOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('viewer')
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser || !resetPassword.trim()) return

    setResetting(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin-users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId: resetUser.id, password: resetPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao resetar senha')
      }
      toast.success(`Senha de ${resetUser.name} alterada`)
      setResetOpen(false)
      setResetUser(null)
      setResetPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar senha')
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async (u: UserProfile) => {
    if (u.id === user?.id) {
      toast.error('Você não pode excluir sua própria conta')
      return
    }
    if (!confirm(`Excluir o usuário "${u.name}" (${u.email})?`)) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin-users', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ userId: u.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao excluir')
      }
      toast.success('Usuário excluído')
      setUsers((prev) => prev.filter((p) => p.id !== u.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg sm:text-xl font-bold flex-1">Gerenciar Usuários</h1>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="sm:h-9 sm:px-4">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Novo Usuário</span>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{u.name}</span>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {u.role === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" />Admin</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" />Viewer</>
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
                <Button size="icon" variant="ghost" title="Resetar senha" onClick={() => { setResetUser(u); setResetPassword(''); setResetOpen(true) }}>
                  <KeyRound className="h-4 w-4" />
                </Button>
                {u.id !== user?.id && (
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(u)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newName">Nome</Label>
                <Input
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Senha provisória</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newRole">Papel</Label>
                <select
                  id="newRole"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'viewer')}
                >
                  <option value="viewer">Viewer (somente leitura)</option>
                  <option value="admin">Admin (acesso total)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !newName.trim() || !newEmail.trim() || !newPassword.trim()}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Resetar Senha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Definir nova senha para <strong>{resetUser?.name}</strong> ({resetUser?.email})
              </p>
              <div className="space-y-2">
                <Label htmlFor="resetPassword">Nova Senha</Label>
                <Input
                  id="resetPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={resetting || !resetPassword.trim()}>
                {resetting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordPage() {
  const { user, refreshProfile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      // Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Clear the must_change_password flag via server API
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (!res.ok) {
        // Fallback: try direct update
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user!.id)
        if (profileError) console.error('Profile update fallback failed:', profileError)
      }

      await refreshProfile()
      toast.success('Senha alterada com sucesso')
    } catch (err) {
      console.error('Change password error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Alterar Senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Você precisa definir uma nova senha para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar Senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              'Salvar Nova Senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

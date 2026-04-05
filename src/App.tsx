import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { HomePage } from '@/pages/HomePage'
import { CollectionPage } from '@/pages/CollectionPage'
import { ItemPage } from '@/pages/ItemPage'
import { TagsPage } from '@/pages/TagsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { Skeleton } from '@/components/ui/skeleton'

function AppRoutes() {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (profile?.must_change_password) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tags" element={<TagsPage />} />
      <Route path="/c/:collectionId" element={<CollectionPage />} />
      <Route path="/c/:collectionId/i/:itemId" element={<ItemPage />} />
      {isAdmin && <Route path="/admin/users" element={<AdminUsersPage />} />}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { HomePage } from '@/pages/HomePage'
import { CollectionPage } from '@/pages/CollectionPage'
import { ItemPage } from '@/pages/ItemPage'
import { TagsPage } from '@/pages/TagsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/c/:collectionId" element={<CollectionPage />} />
        <Route path="/c/:collectionId/i/:itemId" element={<ItemPage />} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </BrowserRouter>
  )
}

export default App

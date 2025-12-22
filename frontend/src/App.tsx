import { Route, Routes } from 'react-router-dom'
import GuestPage from './pages/GuestPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="branding">
          <div className="badge">R & I</div>
          <div>
            <p className="app-title">Wedding Guestbook</p>
            <p className="app-subtitle">Share a note with Ranesh and Isabel</p>
          </div>
        </div>
        <nav className="app-nav">
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<GuestPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        Keep this tab open while the QR code is active.{' '}
        <span role="img" aria-label="sparkles">
        </span>
      </footer>
    </div>
  )
}

export default App

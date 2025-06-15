import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlayerPage from './pages/PlayerPage' 
import AdminPage from './pages/AdminPage'
import DiagnosticPage from './pages/DiagnosticPage'
import BroadcastManagePage from './pages/BroadcastManagePage'
import TestPage from './pages/TestPage'
import LoginModal from './components/LoginModal'
import { useUserStore } from './stores/userStore'

function App() {
  const { isAuthenticated, user } = useUserStore()

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <HomePage />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoginModal />
                </div>
              )
            } 
          />
          <Route 
            path="/player" 
            element={
              isAuthenticated ? (
                <PlayerPage />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated && user?.user_level === 3 ? (
                <AdminPage />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/diagnostic" 
            element={<DiagnosticPage />} 
          />
          <Route 
            path="/broadcast" 
            element={
              isAuthenticated && user?.user_level === 3 ? (
                <BroadcastManagePage />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/test" 
            element={<TestPage />} 
          />
        </Routes>
      </Router>
    </div>
  )
}

export default App 
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import { AuthProvider } from '@/context/useAuthContext'
import { LockProvider } from '@/context/useLockContext'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { HelmetProvider } from 'react-helmet-async'
import LockScreenOverlay from '@/components/LockScreenOverlay'

const handleChangeTitle = () => {
  document.title = document.visibilityState === 'hidden' ? 'Please come back 🥺' : DEFAULT_PAGE_TITLE
}

const AppProvidersWrapper = ({ children }) => {
  useEffect(() => {
    document.addEventListener('visibilitychange', handleChangeTitle)
    return () => document.removeEventListener('visibilitychange', handleChangeTitle)
  }, [])

  return (
    <HelmetProvider>
      <AuthProvider>
        <LockProvider>
          <LayoutProvider>
            <NotificationProvider>
              {children}

              {/* Global lock-screen overlay — renders on top of everything when locked */}
              <LockScreenOverlay />

              {/* react-hot-toast — used by httpClient auto-toast */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: { borderRadius: '8px', fontSize: '14px' },
                }}
              />
            </NotificationProvider>
          </LayoutProvider>
        </LockProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default AppProvidersWrapper

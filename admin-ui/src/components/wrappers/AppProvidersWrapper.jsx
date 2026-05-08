import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import { AuthProvider } from '@/context/useAuthContext'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { HelmetProvider } from 'react-helmet-async'
import { TwoFAProvider } from '@/context/TwoFAContext'
import TwoFactorAuthentication from '@/pages/TwoFactorAuthentication/TwoFactorAuthentication'
import ErrorBoundary from '@/components/ErrorBoundary'
import { LockProvider } from '@/context/useLockContext'

const handleChangeTitle = () => {
  if (document.visibilityState == 'hidden') document.title = 'Please come back 🥺'
  else document.title = DEFAULT_PAGE_TITLE
}
const AppProvidersWrapper = ({ children }) => {
  useEffect(() => {
    document.addEventListener('visibilitychange', handleChangeTitle)
    return () => {
      document.removeEventListener('visibilitychange', handleChangeTitle)
    }
  }, [])
  return (
    <HelmetProvider>
      <AuthProvider>
        <LockProvider>
          <TwoFAProvider>
            <LayoutProvider>
              <NotificationProvider>
                <ErrorBoundary>{children}</ErrorBoundary>
                <TwoFactorAuthentication />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    style: {
                      borderRadius: '8px',
                      fontSize: '14px',
                    },
                  }}
                />
              </NotificationProvider>
            </LayoutProvider>
          </TwoFAProvider>
        </LockProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}
export default AppProvidersWrapper

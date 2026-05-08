import { createContext, useContext, useState } from 'react'

const TwoFAContext = createContext(undefined)

export const TwoFAProvider = ({ children }) => {
  const [showModal, setShowModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const require2FA = (action) => {
    setPendingAction(() => action)
    setShowModal(true)
  }

  const executeAction = async () => {
    try {
      if (pendingAction) {
        await pendingAction()
      }
    } catch (err) {
      // Re-throw so the caller (TwoFactorAuthModal) can handle it
      throw err
    } finally {
      setPendingAction(null)
      setShowModal(false)
    }
  }

  const cancel = () => {
    setPendingAction(null)
    setShowModal(false)
  }

  return (
    <TwoFAContext.Provider
      value={{
        showModal,
        require2FA,
        executeAction,
        cancel,
      }}>
      {children}
    </TwoFAContext.Provider>
  )
}

export const use2FA = () => {
  const context = useContext(TwoFAContext)
  if (context === undefined) {
    throw new Error('use2FA must be used within a TwoFAProvider')
  }
  return context
}

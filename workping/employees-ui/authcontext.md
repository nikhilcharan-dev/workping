# 🔐 Auth Context — WorkPing (work-ping)

> **Full working-nature documentation** of the entire authentication system used across the project.

---

## Table of Contents

1. [Provider Tree Overview](#1-provider-tree-overview)
2. [Entry Points](#2-entry-points)
3. [AuthProvider (`useAuthContext`)](#3-authprovider-useauthcontext)
4. [LockProvider (`useLockContext`)](#4-lockprovider-uselockcontext)
5. [TwoFAProvider (`use2FA` / `TwoFAContext`)](#5-twofaprovider-use2fa--twofacontext)
6. [Route Protection (`PrivateRoute`)](#6-route-protection-privateroute)
7. [HTTP Client (`axiosClient`)](#7-http-client-axiosclient)
8. [Login Flow (Step-by-Step)](#8-login-flow-step-by-step)
9. [2FA Setup & Verification Flow](#9-2fa-setup--verification-flow)
10. [Lock Screen Flow](#10-lock-screen-flow)
11. [Context API Reference](#11-context-api-reference)
12. [File Reference Map](#12-file-reference-map)

---

## 1. Provider Tree Overview

The entire auth system is wrapped in a nested provider hierarchy inside **`AppProvidersWrapper`**:

```
<BrowserRouter>               ← main.jsx
  <App>
    <AppProvidersWrapper>
      <HelmetProvider>          ← SEO / page title
        <AuthProvider>          ← Session state (user, isAuthenticated)
          <LockProvider>        ← Idle auto-lock (15 min timeout)
            <TwoFAProvider>     ← 2FA modal trigger/gate
              <LayoutProvider>  ← UI theme / sidebar state
                <NotificationProvider>  ← Toast notifications
                  <ErrorBoundary>
                    <AppRouter />      ← All routes rendered here
                  </ErrorBoundary>
                  <TwoFactorAuthModal />  ← Global floating 2FA modal
                  <Toaster />            ← react-hot-toast
                </NotificationProvider>
              </LayoutProvider>
            </TwoFAProvider>
          </LockProvider>
        </AuthProvider>
      </HelmetProvider>
    </AppProvidersWrapper>
  </App>
</BrowserRouter>
```

**File:** `src/components/wrappers/AppProvidersWrapper.jsx`

---

## 2. Entry Points

| File | Role |
|------|------|
| `src/main.jsx` | App root. Wraps `<App>` in `<BrowserRouter>` with `basePath` from constants |
| `src/App.jsx` | Renders `<AppProvidersWrapper>` → `<AppRouter>` |
| `src/context/constants.js` | Exports `basePath`, `DEFAULT_PAGE_TITLE`, `developedBy`, etc. |
| `.env` | Contains `VITE_BASE_URL` — the backend API base used by `axiosClient` |

---

## 3. AuthProvider (`useAuthContext`)

**File:** `src/context/useAuthContext.jsx`

### State

| State variable | Type | Default | Meaning |
|---|---|---|---|
| `isAuthenticated` | `boolean` | `false` | Whether the user has an active server session |
| `authLoading` | `boolean` | `true` | `true` while the initial `/verify-cookie` call is in-flight |
| `user` | `object \| null` | `null` | Full user object returned by the backend |
| `is2FAAuthnticator` | `boolean` | `true` | `false` = user has 2FA enabled and has **not** yet completed TOTP enrollment |

> Note: `is2FAAuthnticator` naming is a typo (should be `is2FAAuthenticator`) — this is a known project quirk.

### Core Function — `verifySession()`

```js
const verifySession = async () => {
  const res = await axiosClient.get('/verify-cookie', { silent: true });
  const data = res.data?.data ?? {};

  if (data.twoFactorEnabled) {
    setIs2FAAuthnticator(false);       // 2FA is ON for this account
  }

  setUser(data);
  setIsAuthenticated(true);
};
```

- Called **once on mount** (via `useEffect`) to rehydrate auth state from the server-side cookie.
- Called again after `login()` and `signUp()` to refresh user state.
- Uses `{ silent: true }` config so no error toast fires if the cookie is missing.

### Exposed Context Value

```js
{
  isAuthenticated,       // boolean
  authLoading,           // boolean — use to show a spinner before deciding to redirect
  user,                  // full user object  { _id, name, email, role, profileImage, twoFactorEnabled, ... }
  userId: user?._id,     // shortcut
  role: user?.role,      // shortcut — used for role-based UI gating
  login,                 // async () => verifySession() — call after a successful POST /login
  signUp,                // async () => verifySession() — call after account creation
  logout,                // () => clears user + sets isAuthenticated=false (does NOT call backend)
  is2FAAuthnticator,     // boolean — true means 2FA not yet verified
  setIs2FAAuthnticator,  // setter — used by QR auth flow to mark 2FA as done
}
```

### How Components Consume It

```jsx
import { useAuthContext } from '@/context/useAuthContext';

const { user, isAuthenticated, login, logout } = useAuthContext();
```

Calling `useAuthContext()` outside of `<AuthProvider>` throws:
> `"useAuthContext must be used within an AuthProvider"`

---

## 4. LockProvider (`useLockContext`)

**File:** `src/context/useLockContext.jsx`

### Purpose

Automatically locks the screen and redirects to `/auth/lock-screen` after **15 minutes of inactivity** — without logging the user out.

### Constants

```js
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes
const STORAGE_KEY     = 'wp_locked';      // sessionStorage key for lock state
const RETURN_KEY      = 'wp_lock_return'; // sessionStorage key — saves URL to return to
const IDLE_EVENTS     = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
```

### State

| State | Type | Source | Meaning |
|---|---|---|---|
| `isLocked` | `boolean` | `sessionStorage.getItem('wp_locked') === 'true'` | Initialised from sessionStorage so lock persists across page refreshes |

### Functions

| Function | Behaviour |
|---|---|
| `lock()` | Saves current URL to `wp_lock_return`, sets `wp_locked=true`, sets `isLocked=true`, navigates to `/auth/lock-screen` |
| `unlock()` | Removes `wp_locked`, sets `isLocked=false`, navigates to saved `wp_lock_return` URL (defaults to `/dashboard/analytics`) |
| `resetTimer()` | Clears and resets the 15-minute idle timeout |

### Idle Detection Logic

```js
useEffect(() => {
  if (isLocked) {
    clearTimeout(timerRef.current);
    IDLE_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer));
    return;
  }
  resetTimer();
  IDLE_EVENTS.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
  return () => {
    clearTimeout(timerRef.current);
    IDLE_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer));
  };
}, [isLocked, resetTimer]);
```

### Lock Screen Overlay

**File:** `src/components/LockScreenOverlay.jsx`

- Reads `{ isLocked, unlock }` from `useLockContext()`
- Reads `{ user, logout }` from `useAuthContext()`
- Shows user's **name, email, and profile image**
- On password submit: `POST /api/admin/auth/verify-password` then calls `unlock()`
- "Sign in as different user": calls logout API → `logout()` → `unlock()` → redirects to `/auth/sign-in`

---

## 5. TwoFAProvider (`use2FA` / `TwoFAContext`)

**File:** `src/context/TwoFAContext.jsx`

### Purpose

Acts as a **global gate** for any action that requires 2FA re-verification before execution. Instead of each component managing its own OTP modal, they call `require2FA(action)` and let the context handle showing the modal and running the action after successful verification.

### State

| State | Type | Meaning |
|---|---|---|
| `showModal` | `boolean` | Controls visibility of the global `<TwoFactorAuthModal>` |
| `pendingAction` | `function \| null` | The callback to invoke after 2FA is verified |

### Functions

```js
// Call this from any component to gate an action behind 2FA
require2FA(async () => {
  await axiosClient.delete('/api/resource/...');
});

// Called internally by TwoFactorAuthModal after OTP verification succeeds
executeAction(); // runs pendingAction(), then resets modal state

// Called when user clicks Cancel in the modal
cancel(); // clears pendingAction, hides modal
```

### How Components Use It

```jsx
import { use2FA } from '@/context/TwoFAContext';

const { require2FA } = use2FA();

const handleDelete = () => {
  require2FA(async () => {
    await axiosClient.delete(`/api/employee/${id}`);
    toast.success('Deleted!');
  });
};
```

### `TwoFactorAuthModal` — Global 2FA Verification UI

**File:** `src/pages/TwoFactorAuthentication/TwoFactorAuthentication.jsx`

- Mounted **once** in `AppProvidersWrapper` (not per-page)
- Reads `{ showModal, executeAction, cancel }` from `use2FA()`
- Only renders when `showModal === true`
- Verifies the TOTP code via: `POST /api/auth/2fa/verify { code }`
- On success: calls `executeAction()` to run the pending gated action
- On `code.length === 6` — auto-submits (no button press needed)

---

## 6. Route Protection (`PrivateRoute`)

**File:** `src/routes/router.jsx`

```jsx
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuthContext();

  if (authLoading) return null;  // Wait for session verification to complete

  return isAuthenticated
    ? children
    : <Navigate to="/auth/sign-in" replace />;
};
```

### Route Categories

| Category | Layout | Auth Required | Example paths |
|---|---|---|---|
| `authRoutes` | `AuthLayout` | No | `/auth/sign-in`, `/auth/sign-up`, `/auth/lock-screen` |
| `publicRoutes` | `PublicLayout` | No | `/privacy-policy`, `/terms-and-conditions` |
| `appRoutes` | `AdminLayout` wrapped in `PrivateRoute` | Yes | `/dashboard/analytics`, `/employees/*`, `/teams/*` |

> **Important:** `authRoutes` are also included inside `appRoutes` at the bottom of the export (routes/index.jsx line 795). This means lock-screen and error pages exist in both route groups.

### `authLoading` Guard

While the initial `/verify-cookie` call is pending, `PrivateRoute` returns `null`. This prevents a flash-redirect to `/auth/sign-in` for authenticated users on page refresh.

---

## 7. HTTP Client (`axiosClient`)

**File:** `src/helpers/httpClient.js`

```js
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,      // sends HttpOnly cookies on every request
  headers: { 'Content-Type': 'application/json' },
});
```

### Key Behaviours

| Feature | Detail |
|---|---|
| **Cookie-based Auth** | `withCredentials: true` — no localStorage token storage; session managed server-side via `Set-Cookie` |
| **Loader events** | Request interceptor dispatches `SHOW_LOADER` / `HIDE_LOADER` window events for the global loading bar |
| **Auto toast** | Response interceptor reads `{ type, message }` from backend JSON and fires `toast.success()` / `toast.error()` unless `{ silent: true }` |
| **Silent mode** | Pass `{ silent: true }` in Axios config to suppress all toasts — used for session checks and auth calls |
| **Active request counter** | `activeRequests` counter ensures `HIDE_LOADER` only fires when ALL concurrent requests finish |

---

## 8. Login Flow (Step-by-Step)

```
User fills in email + password
        ↓
LoginForm validates with yup schema
  - Email format
  - Password: 8+ chars, uppercase, lowercase, number, special char
        ↓
POST /api/admin/auth/login  { email, password }  { silent: true }
        ↓
  200 OK → backend sets HttpOnly session cookie
        ↓
login() called → verifySession() → GET /verify-cookie
        ↓
  200 OK → user object returned
      if (data.twoFactorEnabled) → setIs2FAAuthnticator(false)
      setUser(data)
      setIsAuthenticated(true)
        ↓
toast.success('Login successful!')
        ↓
navigate('/dashboard/analytics')  (after 500ms)
```

**Files involved:**
- `src/pages/auth/signIn/LoginForm.jsx` — form + submit handler
- `src/pages/auth/signIn/page.jsx` — page layout + Google auth option
- `src/context/useAuthContext.jsx` — `login()` and `verifySession()`
- `src/helpers/httpClient.js` — API calls

---

## 9. 2FA Setup & Verification Flow

### 9a. First-Time 2FA Setup (QR Code)

**File:** `src/pages/TwoFactorAuthentication/QrcodeAuthentication.jsx`

```
Navigate to /2fa-authnticator  (with optional navigation state)
        ↓
POST /api/auth/2fa/setup  {}   → receives { qrCode: "<data-url>" }
        ↓
Display QR Code image
        ↓
User scans with Google/Microsoft Authenticator
        ↓
User enters 6-digit TOTP code
        ↓
POST /api/auth/2fa/verify  { code }   { silent: true }
        ↓
  verifyResponse.data.verified === true
        ↓
GET /verify-cookie → if twoFactorEnabled → setIs2FAAuthnticator(false)
        ↓
Navigate based on navigationState:
  - action === 'ORG' or 'SIGN-UP' → navigate to navigationState.path
  - else → navigate('/')
```

**Skip option:** Sets `setIs2FAAuthnticator(true)` and navigates away without completing 2FA.

### 9b. Ongoing 2FA for Protected Actions

```
Component calls require2FA(myAction)
        ↓
TwoFAContext stores myAction as pendingAction
setShowModal(true)
        ↓
<TwoFactorAuthModal> appears globally
        ↓
User enters 6-digit code
        ↓
POST /api/auth/2fa/verify  { code }   { silent: true }
        ↓
  verified === true
        ↓
executeAction() → runs pendingAction()
cleanup: setPendingAction(null), setShowModal(false)
        ↓
[or on error] → show error message, re-throw to caller
```

---

## 10. Lock Screen Flow

```
User is active → resetTimer() resets 15-min countdown on every interaction
        ↓
15 minutes of NO activity (no mouse/key/scroll/touch events)
        ↓
lock() fires automatically
  sessionStorage.set('wp_lock_return', currentPath)
  sessionStorage.set('wp_locked', 'true')
  setIsLocked(true)
  navigate('/auth/lock-screen')
        ↓
<LockScreenOverlay> renders  (isLocked === true)
  Shows user name, email, profile image
        ↓
User enters password
        ↓
POST /api/admin/auth/verify-password  { password }   { silent: true }
        ↓
  200 OK → unlock()
    sessionStorage.remove('wp_locked')
    setIsLocked(false)
    navigate(wp_lock_return || '/dashboard/analytics')
        ↓
[forgot password] → prompt to sign in again
        ↓
[switch user]  → POST /api/admin/auth/logout → logout() + unlock() + /auth/sign-in
```

**Note:** Lock is session-scoped (`sessionStorage`) — closing the tab clears it automatically.

---

## 11. Context API Reference

### `useAuthContext()`

```ts
{
  isAuthenticated: boolean;
  authLoading: boolean;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    profileImage?: string;
    twoFactorEnabled: boolean;
  } | null;
  userId: string | null;
  role: string | null;
  login: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => void;
  is2FAAuthnticator: boolean;
  setIs2FAAuthnticator: (val: boolean) => void;
}
```

### `useLockContext()`

```ts
{
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
}
```

### `use2FA()`

```ts
{
  showModal: boolean;
  require2FA: (action: () => Promise<void>) => void;
  executeAction: () => Promise<void>;
  cancel: () => void;
}
```

---

## 12. File Reference Map

| File | Purpose |
|---|---|
| `src/main.jsx` | App entry — `BrowserRouter` wrapper |
| `src/App.jsx` | Mounts `AppProvidersWrapper` + `AppRouter` |
| `src/components/wrappers/AppProvidersWrapper.jsx` | Provider nesting, tab blur title change |
| `src/context/useAuthContext.jsx` | Session state, login/logout/signUp |
| `src/context/useLockContext.jsx` | Idle auto-lock (15 min), lock/unlock |
| `src/context/TwoFAContext.jsx` | 2FA modal gate context |
| `src/context/constants.js` | `basePath`, `DEFAULT_PAGE_TITLE`, `developedBy`, etc. |
| `src/helpers/httpClient.js` | Axios client — cookie auth, loader events, auto-toast |
| `src/routes/router.jsx` | `PrivateRoute`, route categories, `AppRouter` |
| `src/routes/index.jsx` | Route definitions (authRoutes, publicRoutes, appRoutes) |
| `src/layouts/AuthLayout.jsx` | Wrapper for unauthenticated pages |
| `src/layouts/AdminLayout.jsx` | Wrapper for authenticated admin pages |
| `src/layouts/PublicLayout.jsx` | Wrapper for public marketing pages |
| `src/pages/auth/signIn/LoginForm.jsx` | Login form with yup validation |
| `src/pages/auth/signIn/page.jsx` | Sign-in page layout + Google auth |
| `src/pages/TwoFactorAuthentication/TwoFactorAuthentication.jsx` | Global 2FA OTP modal |
| `src/pages/TwoFactorAuthentication/QrcodeAuthentication.jsx` | QR code 2FA setup page |
| `src/components/LockScreenOverlay.jsx` | Lock screen UI + password verify |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Cookie-based session** (no localStorage tokens) | More secure — HttpOnly cookies are not accessible to JS/XSS attacks |
| **`authLoading` guard** | Prevents flash-redirect for authenticated users on page refresh |
| **`{ silent: true }` on session/auth calls** | Avoids showing error toasts to unauthenticated users just visiting the app |
| **Global `TwoFAProvider`** | Single modal for all 2FA-gated actions instead of per-component modals |
| **`sessionStorage` for lock state** | Lock is tab-scoped; closing the browser auto-clears the lock |
| **Passive idle event listeners** | `{ passive: true }` on scroll/touch listeners avoids blocking the main thread |

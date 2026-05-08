# 2FA Audit — TwoFactorAuthentication & QrcodeAuthentication

---

## 🔴 Critical

### 1. `QrcodeAuthentication.jsx` — Runtime crash when `location.state` is null
**Line 18:** `const data = location.state` — if a user navigates to `/2fa-authnticator` directly (no state), `data` is `null`. Lines 57–60 and 162 access `data.action` and `data.path` which will crash.
```js
// Crashes with: TypeError: Cannot read properties of null (reading 'action')
if (data.action === "ORG")
  navigate(data.path)
```

### 2. `QrcodeAuthentication.jsx` — `console.log` in production (Lines 33, 49)
```js
console.log(error)    // Line 33
console.log(res)      // Line 49
```
Leaks sensitive 2FA responses to the browser dev console.

### 3. `QrcodeAuthentication.jsx` — Variable shadowing bug (Line 52)
Inside `handleVerify`, `res` is already declared on line 48. Line 52 redeclares `const res = await axiosClient.get('/verify-cookie')` — this shadows the outer `res` and can cause confusion.

### 4. `TwoFAContext.jsx` — `use2FA()` returns `undefined` outside provider
**Line 45:** `useContext(TwoFAContext)` returns `undefined` if called outside `<TwoFAProvider>`. No guard/throw.

---

## 🟠 Medium

### 5. `TwoFactorAuthentication.jsx` — `handleVerify` called from stale closure in useEffect
**Line 25–29:** `useEffect` calls `handleVerify()` when `code.length === 6`, but `handleVerify` is **not** in the dependency array. This creates a stale closure that captures old `code`, `loading`, and `error` values.
```js
useEffect(() => {
  if (code.length === 6) {
    handleVerify()  // stale closure — not in deps
  }
}, [code])
```

### 6. `QrcodeAuthentication.jsx` — Same stale closure issue (Lines 72–76)
Same pattern as #5 above — `handleVerify` not in deps of `useEffect`.

### 7. `QrcodeAuthentication.jsx` — No error toast on QR load failure
**Line 32–34:** `qrPage` catches errors but only does `console.log` and sets a status string. No toast notification to the user.

### 8. `QrcodeAuthentication.jsx` — No recovery from QR load failure
If the QR setup API fails, the user sees "Failed to load QR" text but has no guided way to retry except clicking "Refresh QR". Should show a clearer error with a visible retry button.

### 9. `TwoFactorAuthentication.jsx` — `executeAction` error not surfaced via toast
**Lines 56–63:** The caught `actionError` only updates the inline `error` state. Should also fire `toast.error()` for consistency with the rest of the app.

### 10. `QrcodeAuthentication.jsx` — No input `autoFocus` on code field
**Line 133:** Unlike `TwoFactorAuthentication.jsx` (which uses `autoFocus`), the QR page does not auto-focus the code input.

### 11. `QrcodeAuthentication.jsx` — No `onKeyDown` handler for Enter key
Unlike `TwoFactorAuthentication.jsx`, pressing Enter does not trigger verification.

### 12. `QrcodeAuthentication.jsx` — "Skip" button navigates without warning
**Line 160–164:** The "Skip" button does `navigate(data.path)` immediately, bypassing 2FA entirely. No confirmation dialog.

---

## 🟡 Low

### 13. `TwoFactorAuthentication.jsx` — Wrapped in `ComponentContainerCard` unnecessarily
**Line 102:** The modal overlay is wrapped in `<ComponentContainerCard>` which adds an extra card container around the full-screen overlay. The overlay should be a standalone portal or fragment.

### 14. `TwoFAContext.jsx` — `executeAction` sets `pendingAction(null)` even on failure
**Line 19:** If `pendingAction()` throws, the error is re-thrown, but `setPendingAction(null)` on line 19 is **not reached** (it's after the await, caught by try-catch). This is actually fine behavior-wise, but the intent should be clarified with a comment or by placing cleanup in `finally`.

### 15. `QrcodeAuthentication.jsx` — Missing `alt` attribute sizing on QR image
**Line 126:** `<img src={qrCode} alt="QR Code" />` has no explicit `width`/`height`, which can cause layout shifts.

### 16. `TwoFactorAuthentication.jsx` — Hardcoded z-index values (99999, 100000)
**Lines 107, 114:** Magic numbers should be centralized or use CSS variables.

### 17. `QrcodeAuthentication.jsx` — Same hardcoded z-index values (99999, 100000)
**Lines 91, 97:** Duplicated magic numbers.

---

## Summary (2FA)

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟠 Medium | 8 |
| 🟡 Low | 5 |
| **Total** | **17** |


---
---

# Reset Password Audit (`reset-pass`)

---

## 🔴 Critical

### 1. Inconsistent API Endpoints for OTP Resend vs Send
**Lines 88-91 vs Lines 180-183:**
The initial send OTP uses `/api/admin/forgot-password/send-otp`, but the "Resend OTP" button uses `/api/admin/auth/forgot-password/send-otp` (includes `/auth/`). One of these is incorrect and will return a 404.

### 2. Invalid Error Handling State (Cross-Field Errors)
**Lines 125-130:**
The global `catch` block for forms sets all backend errors on the `email` field (`setError("email", ...)`), regardless of the current step.
- If Step 2 (Verify OTP) fails due to a wrong code, the error message appears under the Email input instead of the OTP input.
- If Step 3 (Change Password) fails, the error also appears under the Email input.

---

## 🟠 Medium

### 3. Fields Are Editable in Subsequent Steps
**Lines 140-157:**
When the user progresses to Step 2 (OTP) or Step 3 (Password), the previously filled fields (like `Email` and `OTP`) remain fully editable.
- **Bug:** A user can receive an OTP for `user1@example.com`, change the email field to `user2@example.com`, and submit in Step 2, which could cause bad server logic or discrepancies.
- **Fix:** Fields from previous steps should be marked `disabled={step > 1}` or `readOnly`.

### 4. InputGroup Feedback Rendering Issue
**Lines 197-199 and 237-239:**
In Bootstrap, placing `<Form.Control.Feedback type="invalid">` inside an `<InputGroup>` alongside a `<Button>` or `<InputGroup.Text>` without proper placement can sometimes cause layout issues or not display the error text correctly relative to the input if the `<Form.Control>` doesn't have the `isInvalid` class positioned optimally.

### 5. Lack of Explicit Error Boundary / Fallback
There is no local scope `<ErrorBoundary>` around the `ResetPassForm` component. If any UI rendering bug occurs (for example, if `fieldState` or `control` somehow become corrupted), it will crash the whole page rather than showing a localized form fallback error. *Note: We do have a global ErrorBoundary around App Providers, but missing a localized one.*

---

## 🟡 Low

### 6. No `isSubmitting` Loading State
**Lines 288-296:**
The submit button does not show a loading spinner or disable itself during API calls (e.g., waiting for the email or OTP verification). Users might click multiple times, triggering duplicate API requests.

### 7. Form Accessibility (ARIA)
Password visibility toggles (Lines 226 and 266) use `<i className="...">` inside `InputGroup.Text` but lack `aria-label` or role attributes for screen readers to announce "Toggle password visibility".

## Summary (Reset Password)

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 Medium | 3 |
| 🟡 Low | 2 |
| **Total** | **7** |

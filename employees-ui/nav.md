# 🧭 Navbar & Footer — Public Pages Guide

> How the **Navbar** and **Footer** are structured and maintained across the four public-facing pages:
> **About** | **Contact** | **Privacy Policy** | **Terms & Conditions**

---

## Table of Contents

1. [How It Works — The Big Picture](#1-how-it-works--the-big-picture)
2. [PublicLayout — The Single Source](#2-publiclayout--the-single-source)
3. [Navbar (Header) Anatomy](#3-navbar-header-anatomy)
4. [Footer Anatomy](#4-footer-anatomy)
5. [Route Registration (how pages plug in)](#5-route-registration-how-pages-plug-in)
6. [Page Structure — Each Public Page](#6-page-structure--each-public-page)
7. [How to Maintain / Modify](#7-how-to-maintain--modify)
8. [File Reference Map](#8-file-reference-map)

---

## 1. How It Works — The Big Picture

All four public pages share **one layout file** — `PublicLayout.jsx`. Every page is rendered **inside** this layout, so:

- You **never** add a navbar or footer to the individual page files.
- Changing the navbar or footer in `PublicLayout.jsx` / `Footer.jsx` updates it **everywhere** at once.

```
PublicLayout
├── <header>  ← Navbar (logo + dark-mode toggle + Sign In / Dashboard button)
├── <main>    ← {children}  (About / Contact / Privacy Policy / Terms page content)
└── <Footer>  ← About | Contact | Privacy Policy | Terms & Conditions links
```

---

## 2. PublicLayout — The Single Source

**File:** `src/layouts/PublicLayout.jsx`

```jsx
const PublicLayout = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  return (
    <div className="wrapper">

      {/* ─── NAVBAR ─── */}
      <header className="topbar" style={{ paddingLeft: 0 }}>
        <div className="container-xxl">
          <div className="navbar-header">
            <LogoBox containerClassName="logo-box" />
            <div className="d-flex align-items-center gap-1">
              <ThemeModeToggle />
              {isAuthenticated ? (
                <Link to="/" className="topbar-button btn btn-sm btn-primary px-3">
                  Dashboard
                </Link>
              ) : (
                <Button size="sm" className="px-3" onClick={() => navigate('/auth/sign-in')}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── PAGE CONTENT ─── */}
      <div className="page-content" style={{ marginLeft: 0, paddingLeft: 0, paddingRight: 0 }}>
        <div className="container-xxl py-4">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        {/* ─── FOOTER ─── */}
        <Footer />
      </div>

    </div>
  );
};
```

> **Key rule:** `{children}` is the only place page content goes. The Navbar and Footer are **outside** `{children}`.

---

## 3. Navbar (Header) Anatomy

The public navbar has **3 elements**, all inside the single `<header className="topbar">`:

| Element | Component / Tag | What it does |
|---|---|---|
| **Logo** | `<LogoBox>` | Renders the `logo-sm.png` image + "WorkPing" brand name as a link to `/` |
| **Dark Mode Toggle** | `<ThemeModeToggle>` | Toggles between `light` / `dark` theme using `useLayoutContext()` |
| **Auth Button** | conditional `<Link>` or `<Button>` | Shows **"Dashboard"** if the user is logged in, or **"Sign In"** if not |

### LogoBox

**File:** `src/components/LogoBox.jsx`

- Renders two `<Link to="/">` elements — one with class `logo-dark`, one with `logo-light` (CSS controls which is shown based on theme).
- The brand name comes from `developedBy` in `src/context/constants.js`.
- Props accepted: `containerClassName`, `squareLogo` (for size overrides), `textLogo`.

### ThemeModeToggle

**File:** `src/components/layout/TopNavigationBar/components/ThemeModeToggle.jsx`

- Reads `theme` and `changeTheme` from `useLayoutContext()`.
- Clicking toggles between `light` ↔ `dark` and shows the matching Iconify icon.
- **No changes needed here** to maintain public pages.

### Auth-Aware Button

```jsx
{isAuthenticated ? (
  <Link to="/" className="topbar-button btn btn-sm btn-primary px-3">
    Dashboard
  </Link>
) : (
  <Button size="sm" className="px-3" onClick={() => navigate('/auth/sign-in')}>
    Sign In
  </Button>
)}
```

- `isAuthenticated` comes from `useAuthContext()` — automatically reflects the current session.
- **No manual state management** is needed on individual pages.

---

## 4. Footer Anatomy

**File:** `src/components/layout/Footer.jsx`

```jsx
const footerLinks = [
  { label: 'About',               to: '/about' },
  { label: 'Contact',             to: '/contact' },
  { label: 'Privacy Policy',      to: '/privacy-policy' },
  { label: 'Terms & Conditions',  to: '/terms-and-conditions' },
];

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">

      {/* Left: copyright */}
      <span className="footer-copy">
        <IconifyIcon icon="iconamoon:heart-duotone" className="fs-16 align-middle text-danger me-1" />
        {currentYear} © <a href={developedByLink} target="_blank">{developedBy}</a>
      </span>

      {/* Right: nav links */}
      <nav className="footer-nav">
        {footerLinks.map((link, i) => (
          <span key={link.to} className="footer-nav-item">
            <Link to={link.to} className="footer-link">{link.label}</Link>
            {i < footerLinks.length - 1 && <span className="footer-sep" />}
          </span>
        ))}
      </nav>

    </div>
  </footer>
);
```

### What each part uses

| Value | Source | File |
|---|---|---|
| `currentYear` | `new Date().getFullYear()` | `src/context/constants.js` |
| `developedBy` | `'WorkPing'` | `src/context/constants.js` |
| `developedByLink` | `'https://workping.live'` | `src/context/constants.js` |
| Navigation links | `footerLinks` array (hardcoded in Footer.jsx) | `src/components/layout/Footer.jsx` |
| Separator `|` | `<span className="footer-sep" />` | styled in SCSS |

> The footer is **shared by both the public pages (PublicLayout) AND the admin pages (AdminLayout)**. Any change to `Footer.jsx` affects all pages.

---

## 5. Route Registration (how pages plug in)

**File:** `src/routes/index.jsx`

```jsx
// Public page components
const PrivacyPolicy      = lazy(() => import('@/pages/public/PrivacyPolicy/page'));
const TermsAndConditions = lazy(() => import('@/pages/public/TermsAndConditions/page'));
const AboutPublic        = lazy(() => import('@/pages/public/About/page'));
const ContactPublic      = lazy(() => import('@/pages/public/Contact/page'));

export const publicRoutes = [
  { path: '/privacy-policy',       name: 'Privacy Policy',       element: <PrivacyPolicy /> },
  { path: '/terms-and-conditions', name: 'Terms and Conditions',  element: <TermsAndConditions /> },
  { path: '/about',                name: 'About',                 element: <AboutPublic /> },
  { path: '/contact',              name: 'Contact',               element: <ContactPublic /> },
];
```

**File:** `src/routes/router.jsx`

```jsx
{/* Public pages — accessible with or without login */}
{publicRoutes.map((route, idx) => (
  <Route
    key={idx + route.name}
    path={route.path}
    element={<PublicLayout>{route.element}</PublicLayout>}   // ← PublicLayout wraps each page
  />
))}
```

> Every route in `publicRoutes` is automatically wrapped with `<PublicLayout>` — which injects the Navbar and Footer. **No route needs to declare them individually.**

---

## 6. Page Structure — Each Public Page

Each page file is **content only** — no navbar, no footer, no layout wrapper.

### Pattern every page follows:

```jsx
import PageMetaData from '@/components/PageTitle';

const SomePage = () => {
  return (
    <>
      <PageMetaData title="Page Title" />   {/* sets <title> via react-helmet-async */}

      {/* ── Hero ── */}
      <div className="text-center mb-5">
        <h1 className="fw-bold">Page Heading</h1>
        <p className="text-muted fs-5">Subtitle text here.</p>
      </div>

      {/* ── Content Cards ── */}
      <Card className="shadow-sm">
        <CardBody className="p-4 p-lg-5">
          {/* ... */}
        </CardBody>
      </Card>
    </>
  );
};
export default SomePage;
```

### Page-by-page summary

| Page | Path | File | Special behaviour |
|---|---|---|---|
| **About** | `/about` | `src/pages/public/About/page.jsx` | Fetches live stats from `GET /api/public/stats` (employee count, org count). Animated count-up numbers. |
| **Contact** | `/contact` | `src/pages/public/Contact/page.jsx` | Contact info sidebar + form. Form submit currently sets `submitted=true` (no API call — placeholder). |
| **Privacy Policy** | `/privacy-policy` | `src/pages/public/PrivacyPolicy/page.jsx` | Static legal content. Uses `currentYear` and `developedBy` from constants. |
| **Terms & Conditions** | `/terms-and-conditions` | `src/pages/public/TermsAndConditions/page.jsx` | Static legal content. Cross-links to `/privacy-policy` and `/contact`. |

---

## 7. How to Maintain / Modify

### ✅ Add a new link to the footer

Edit the `footerLinks` array in **`src/components/layout/Footer.jsx`**:

```js
const footerLinks = [
  { label: 'About',               to: '/about' },
  { label: 'Contact',             to: '/contact' },
  { label: 'Privacy Policy',      to: '/privacy-policy' },
  { label: 'Terms & Conditions',  to: '/terms-and-conditions' },
  { label: 'Blog',                to: '/blog' },   // ← add here
];
```

---

### ✅ Add a new public page (with shared navbar + footer)

**Step 1** — Create the page file:
```
src/pages/public/YourPage/page.jsx
```

**Step 2** — Register a lazy import in `src/routes/index.jsx`:
```jsx
const YourPage = lazy(() => import('@/pages/public/YourPage/page'));
```

**Step 3** — Add to the `publicRoutes` array in the same file:
```jsx
export const publicRoutes = [
  ...
  { path: '/your-page', name: 'Your Page', element: <YourPage /> },
];
```

**Step 4** — Optionally add the link to the footer (see above).

> The navbar and footer appear automatically — `publicRoutes` are always wrapped with `PublicLayout`.

---

### ✅ Change the navbar brand name / logo

Edit **`src/context/constants.js`**:
```js
export const developedBy     = 'WorkPing';          // brand name text
export const developedByLink = 'https://workping.live'; // footer copyright link
```

To change the logo image, replace the file at:
```
src/assets/images/logo-sm.png   ← used in LogoBox (public navbar)
src/assets/images/logo-dark.png ← lock screen overlay
src/assets/images/logo-light.png ← lock screen overlay (light mode)
```

---

### ✅ Change the "Sign In" button destination

In **`src/layouts/PublicLayout.jsx`**, find:
```jsx
onClick={() => navigate('/auth/sign-in')}
```
Change `/auth/sign-in` to whatever route you want.

---

### ✅ Add more items to the public navbar (e.g. nav links)

In **`src/layouts/PublicLayout.jsx`**, add inside the `navbar-header` div, alongside `ThemeModeToggle`:

```jsx
<div className="d-flex align-items-center gap-1">
  <ThemeModeToggle />

  {/* New nav links */}
  <Link to="/about" className="topbar-button btn btn-sm btn-link">About</Link>
  <Link to="/contact" className="topbar-button btn btn-sm btn-link">Contact</Link>

  {isAuthenticated ? (
    <Link to="/" className="topbar-button btn btn-sm btn-primary px-3">Dashboard</Link>
  ) : (
    <Button size="sm" className="px-3" onClick={() => navigate('/auth/sign-in')}>Sign In</Button>
  )}
</div>
```

---

### ✅ Update the current year in the footer

The footer copyright year is **automatic**:
```js
// src/context/constants.js
export const currentYear = new Date().getFullYear();
```
No manual change required — it updates every year automatically.

---

### ✅ Wire up the Contact form to a backend

In **`src/pages/public/Contact/page.jsx`**, replace the placeholder `handleSubmit`:

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await axiosClient.post('/api/public/contact', form);
    setSubmitted(true);
  } catch (err) {
    // error toast fires automatically via httpClient interceptor
  }
};
```

---

## 8. File Reference Map

| File | Role |
|---|---|
| `src/layouts/PublicLayout.jsx` | **The layout** — contains the public Navbar + renders `<Footer>` + wraps `{children}` |
| `src/components/layout/Footer.jsx` | **Footer component** — `footerLinks` array, copyright, nav links |
| `src/components/LogoBox.jsx` | Logo image + brand name link (`logo-dark` / `logo-light` variants) |
| `src/components/layout/TopNavigationBar/components/ThemeModeToggle.jsx` | Dark/light mode toggle button |
| `src/context/constants.js` | `developedBy`, `developedByLink`, `currentYear` — used in both nav and footer |
| `src/context/useAuthContext.jsx` | Provides `isAuthenticated` — controls Dashboard vs Sign In button |
| `src/routes/index.jsx` | `publicRoutes` array — defines all 4 public page routes |
| `src/routes/router.jsx` | Wraps `publicRoutes` with `<PublicLayout>` automatically |
| `src/pages/public/About/page.jsx` | About page content only |
| `src/pages/public/Contact/page.jsx` | Contact page content only |
| `src/pages/public/PrivacyPolicy/page.jsx` | Privacy Policy content only |
| `src/pages/public/TermsAndConditions/page.jsx` | Terms & Conditions content only |
| `src/components/PageTitle.jsx` | `<PageMetaData>` — sets `<title>` per page via react-helmet-async |

---

## Quick Visual Summary

```
URL: /about  (or /contact, /privacy-policy, /terms-and-conditions)
                         ↓
              [router.jsx: publicRoutes]
                         ↓
     <PublicLayout>          ← injects Navbar + Footer
       ├── <header>
       │     ├── <LogoBox />           → brand logo → /
       │     ├── <ThemeModeToggle />   → light/dark
       │     └── isAuthenticated
       │           ├── true  → "Dashboard" → /
       │           └── false → "Sign In" → /auth/sign-in
       │
       ├── <div.page-content>
       │     └── <Suspense>{children}</Suspense>   ← About/Contact/etc. page
       │
       └── <Footer />
             ├── © 2025 WorkPing
             └── About | Contact | Privacy Policy | Terms & Conditions
     </PublicLayout>
```

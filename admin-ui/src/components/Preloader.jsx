import { useEffect, useState } from 'react'

const Preloader = () => {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!showLoader) return null

  return (
    <>
      <div className="wp-page-loader-overlay" role="status" aria-live="polite" aria-label="Loading page">
        <div className="wp-page-loader-aurora wp-page-loader-aurora-left" />
        <div className="wp-page-loader-aurora wp-page-loader-aurora-right" />

        <div className="wp-page-loader-stage" aria-hidden="true">
          <span className="wp-page-loader-ring wp-page-loader-ring-a" />
          <span className="wp-page-loader-ring wp-page-loader-ring-b" />
          <span className="wp-page-loader-ring wp-page-loader-ring-c" />
        </div>

        <span className="visually-hidden">Loading...</span>
      </div>

      <style>{`
      .wp-page-loader-overlay {
        position: fixed;
        inset: 0;
        z-index: 1900;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: linear-gradient(130deg, #020617 0%, #0b1e47 45%, #12346e 100%);
      }

      .wp-page-loader-aurora {
        position: absolute;
        border-radius: 50%;
        filter: blur(2px);
      }

      .wp-page-loader-aurora-left {
        width: 55vw;
        height: 55vw;
        min-width: 380px;
        min-height: 380px;
        left: -8vw;
        top: -10vw;
        background: radial-gradient(circle, rgba(34, 211, 238, 0.22), rgba(34, 211, 238, 0));
        animation: wp-page-aurora-left 6.2s ease-in-out infinite;
      }

      .wp-page-loader-aurora-right {
        width: 58vw;
        height: 58vw;
        min-width: 420px;
        min-height: 420px;
        right: -12vw;
        bottom: -14vw;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0));
        animation: wp-page-aurora-right 6.8s ease-in-out infinite;
      }

      .wp-page-loader-stage {
        position: relative;
        width: 120px;
        height: 120px;
        display: grid;
        place-items: center;
        filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.32));
      }

      .wp-page-loader-ring {
        position: absolute;
        border-radius: 50%;
        border: 2px solid transparent;
      }

      .wp-page-loader-ring-a {
        width: 110px;
        height: 110px;
        border-top-color: rgba(56, 189, 248, 0.95);
        border-right-color: rgba(56, 189, 248, 0.32);
        animation: wp-page-spin 1.35s linear infinite;
      }

      .wp-page-loader-ring-b {
        width: 80px;
        height: 80px;
        border-left-color: rgba(139, 92, 246, 0.85);
        border-bottom-color: rgba(139, 92, 246, 0.28);
        animation: wp-page-spin-rev 1.05s linear infinite;
      }

      .wp-page-loader-ring-c {
        width: 50px;
        height: 50px;
        border-top-color: rgba(125, 211, 252, 0.95);
        animation: wp-page-spin 0.8s linear infinite;
      }


      @keyframes wp-page-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes wp-page-spin-rev {
        to { transform: rotate(-360deg); }
      }

      @keyframes wp-page-aurora-left {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
        50% { transform: translate(20px, 14px) scale(1.08); opacity: 1; }
      }

      @keyframes wp-page-aurora-right {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.82; }
        50% { transform: translate(-24px, -18px) scale(1.07); opacity: 1; }
      }
    `}</style>
    </>
  )
}
export default Preloader

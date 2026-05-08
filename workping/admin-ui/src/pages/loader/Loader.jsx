import { useEffect, useState } from 'react'

const Loader = () => {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleShow = () => setIsLoading(true)
    const handleHide = () => setIsLoading(false)

    window.addEventListener('SHOW_LOADER', handleShow)
    window.addEventListener('HIDE_LOADER', handleHide)

    return () => {
      window.removeEventListener('SHOW_LOADER', handleShow)
      window.removeEventListener('HIDE_LOADER', handleHide)
    }
  }, [])

  if (!isLoading) return null

  return (
    <>
      <div className="workping-axios-loader" role="status" aria-live="polite" aria-label="Loading data">
        <div className="workping-axios-loader-bar" />
        <span className="visually-hidden">Loading...</span>
      </div>
      <style>{`
                .workping-axios-loader {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    z-index: 1500;
                    overflow: hidden;
                    background: rgba(148, 163, 184, 0.22);
                }

                .workping-axios-loader-bar {
                    position: absolute;
                    left: -35%;
                    width: 35%;
                    height: 100%;
                    background: linear-gradient(90deg, #22d3ee, #3b82f6, #6366f1);
                    box-shadow: 0 0 12px rgba(59, 130, 246, 0.65);
                    animation: wp-axios-slide 850ms ease-in-out infinite;
                }

                @keyframes wp-axios-slide {
                    0% {
                        left: -35%;
                    }
                    100% {
                        left: 100%;
                    }
                }
            `}</style>
    </>
  )
}

export default Loader

import { lazy, Suspense } from 'react'
import FallbackLoading from '@/components/FallbackLoading'
import Footer from '@/components/layout/Footer'
import Preloader from '@/components/Preloader'
import Loader from '@/pages/loader/Loader'
const TopNavigationBar = lazy(() => import('@/components/layout/TopNavigationBar'))
const VerticalNavigationBar = lazy(() => import('@/components/layout/VerticalNavigationBar'))
const AdminLayout = ({ children }) => {
  return (
    <div className="wrapper">
      <Suspense fallback={<FallbackLoading />}>
        <TopNavigationBar />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <VerticalNavigationBar />
      </Suspense>

      <div className="page-content" style={{ position: 'relative' }}>
        <Loader />
        <div className="container-xxl">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        <Footer />
      </div>
    </div>
  )
}
export default AdminLayout

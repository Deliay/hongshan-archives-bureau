import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'
import Footer from './Footer'

export default function ArchiveLayout() {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/archive/map')
  return (
    <div className="min-h-screen bg-archive-ink text-archive-ivory flex">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 md:ml-60 ${
          fullBleed ? 'h-screen overflow-hidden' : 'min-h-screen'
        }`}
      >
        <main
          className={
            fullBleed
              ? 'flex-1 min-h-0 flex flex-col pt-14 md:pt-0'
              : 'flex-1 pt-14 md:pt-6 pb-8 px-4 max-w-7xl w-full mx-auto'
          }
        >
          {!fullBleed && <Breadcrumb />}
          <Outlet />
        </main>
        {!fullBleed && <Footer />}
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'
import Footer from './Footer'

export default function ArchiveLayout() {
  return (
    <div className="min-h-screen bg-archive-ink text-archive-ivory flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen md:ml-60">
        <main className="flex-1 pt-14 md:pt-6 pb-8 px-4 max-w-7xl w-full mx-auto">
          <Breadcrumb />
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}

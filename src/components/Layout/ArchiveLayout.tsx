import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Breadcrumb from './Breadcrumb'
import Footer from './Footer'

export default function ArchiveLayout() {
  return (
    <div className="min-h-screen bg-[#0F0F12] text-[#E8E6E3]">
      <TopNav />
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
        <Breadcrumb />
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

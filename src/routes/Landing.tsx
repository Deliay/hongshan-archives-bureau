import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveSeal } from '../components/ui/ArchiveSeal'

export default function LandingPage() {
  const navigate = useNavigate()
  const [entered, setEntered] = useState(false)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const spaRedirect = params.get('__spa')
    if (spaRedirect) {
      navigate(spaRedirect, { replace: true })
      return
    }
    if (localStorage.getItem('hs_visited')) {
      navigate('/archive', { replace: true })
    }
  }, [navigate])

  function handleEnter() {
    localStorage.setItem('hs_visited', 'true')
    setEntered(true)
    setTimeout(() => {
      setShow(false)
      navigate('/archive', { replace: true })
    }, 600)
  }

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-archive-ink transition-opacity duration-600 ease-out ${
        entered ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <ArchiveSeal size={80} className="mb-6" />

      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-[0.2em] text-archive-gold mb-3">
        宏山档案局
      </h1>
      <p className="text-sm md:text-base text-archive-dust tracking-widest mb-12">
        塔卫二官方档案管理与调阅系统
      </p>

      <button
        onClick={handleEnter}
        className="px-10 py-3 border border-archive-gold/50 text-archive-gold tracking-widest text-sm
                   hover:bg-archive-gold hover:text-archive-ink transition-all duration-300"
      >
        进入档案局
      </button>

      <p className="absolute bottom-8 text-xs text-archive-lead tracking-wider">
        — 管理员记录 —
      </p>
    </div>
  )
}

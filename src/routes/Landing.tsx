import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F0F12] transition-opacity duration-600 ${
        entered ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-2 border-[#C9A96E]/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-[#C9A96E]/60" />
        </div>
      </div>

      <h1 className="text-3xl md:text-5xl font-bold tracking-[0.3em] text-[#C9A96E] mb-3">
        宏山档案馆
      </h1>
      <p className="text-sm md:text-base text-[#8B8982] tracking-widest mb-12">
        塔卫二资料集
      </p>

      <button
        onClick={handleEnter}
        className="px-10 py-3 border border-[#C9A96E]/50 text-[#C9A96E] tracking-widest text-sm
                   hover:bg-[#C9A96E] hover:text-[#0F0F12] transition-all duration-300"
      >
        阅览资料
      </button>

      <p className="absolute bottom-8 text-xs text-[#5A5A62] tracking-wider">
        — 管理员记录 —
      </p>
    </div>
  )
}

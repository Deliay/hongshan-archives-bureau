import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LocaleProvider } from './lib/locale'
import ArchiveLayout from './components/Layout/ArchiveLayout'
import LandingPage from './routes/Landing'
import OperatorList from './pages/operators/OperatorList'
import OperatorDetail from './pages/operators/OperatorDetail'
import WeaponList from './pages/weapons/WeaponList'
import WeaponDetail from './pages/weapons/WeaponDetail'
import ProfessionOverview from './pages/professions/ProfessionOverview'
import RaceList from './pages/races/RaceList'
import RaceDetail from './pages/races/RaceDetail'
import FactionList from './pages/factions/FactionList'
import FactionDetail from './pages/factions/FactionDetail'
import GeographyList from './pages/geography/GeographyList'
import EnemyList from './pages/enemies/EnemyList'
import EnemyDetail from './pages/enemies/EnemyDetail'
import EquipmentOverview from './pages/equipment/EquipmentOverview'
import ItemList from './pages/items/ItemList'
import FactoryOverview from './pages/factory/FactoryOverview'
import StoryOverview from './pages/story/StoryOverview'
import UpdateHome from './pages/updates/UpdateHome'
import UpdateSummary from './pages/updates/UpdateSummary'
import UpdateTableDiff from './pages/updates/UpdateTableDiff'
import './components/DiffViewer/register'

function RedirectHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const redirect = sessionStorage.getItem('__spa_redirect')
    if (redirect) {
      sessionStorage.removeItem('__spa_redirect')
      navigate(redirect, { replace: true })
    }
  }, [navigate])
  return null
}

export default function App() {
  return (
    <LocaleProvider>
    <BrowserRouter>
      <RedirectHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/archive" element={<ArchiveLayout />}>
          <Route index element={<Navigate to="operators" replace />} />
          <Route path="operators" element={<OperatorList />} />
          <Route path="operators/:id" element={<OperatorDetail />} />
          <Route path="weapons" element={<WeaponList />} />
          <Route path="weapons/:id" element={<WeaponDetail />} />
          <Route path="professions" element={<ProfessionOverview />} />
          <Route path="races" element={<RaceList />} />
          <Route path="races/:raceId" element={<RaceDetail />} />
          <Route path="factions" element={<FactionList />} />
          <Route path="factions/:factionId" element={<FactionDetail />} />
          <Route path="geography" element={<GeographyList />} />
          <Route path="enemies" element={<EnemyList />} />
          <Route path="enemies/:id" element={<EnemyDetail />} />
          <Route path="equipment" element={<EquipmentOverview />} />
          <Route path="items" element={<ItemList />} />
          <Route path="factory" element={<FactoryOverview />} />
          <Route path="story" element={<StoryOverview />} />
          <Route path="updates" element={<UpdateHome />} />
          <Route path="updates/:versionName" element={<UpdateSummary />} />
          <Route path="updates/:versionName/:tableFile" element={<UpdateTableDiff />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LocaleProvider>
  )
}

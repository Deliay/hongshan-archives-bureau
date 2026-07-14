import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LocaleProvider } from './lib/locale'
import ArchiveLayout from './components/Layout/ArchiveLayout'
import LandingPage from './routes/Landing'
import ArchiveHome from './routes/ArchiveHome'
import OperatorList from './pages/operators/OperatorList'
import OperatorDetail from './pages/operators/OperatorDetail'
import WeaponList from './pages/weapons/WeaponList'
import ProfessionOverview from './pages/professions/ProfessionOverview'
import RaceList from './pages/races/RaceList'
import FactionOverview from './pages/factions/FactionOverview'
import GeographyList from './pages/geography/GeographyList'
import EnemyList from './pages/enemies/EnemyList'
import EquipmentOverview from './pages/equipment/EquipmentOverview'
import ItemList from './pages/items/ItemList'
import FactoryOverview from './pages/factory/FactoryOverview'
import StoryOverview from './pages/story/StoryOverview'

export default function App() {
  return (
    <LocaleProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/archive" element={<ArchiveLayout />}>
          <Route index element={<ArchiveHome />} />
          <Route path="operators" element={<OperatorList />} />
          <Route path="operators/:id" element={<OperatorDetail />} />
          <Route path="weapons" element={<WeaponList />} />
          <Route path="professions" element={<ProfessionOverview />} />
          <Route path="races" element={<RaceList />} />
          <Route path="factions" element={<FactionOverview />} />
          <Route path="geography" element={<GeographyList />} />
          <Route path="enemies" element={<EnemyList />} />
          <Route path="equipment" element={<EquipmentOverview />} />
          <Route path="items" element={<ItemList />} />
          <Route path="factory" element={<FactoryOverview />} />
          <Route path="story" element={<StoryOverview />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LocaleProvider>
  )
}

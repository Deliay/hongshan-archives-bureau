import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider, useLocale } from './lib/locale'
import { I18nProvider } from './i18n'
import { LoadingProvider } from './components/Loading/LoadingProvider'
import { LoadingToast } from './components/Loading/LoadingToast'
import ArchiveLayout from './components/Layout/ArchiveLayout'
import LandingPage from './routes/Landing'
import ArchiveHome from './routes/ArchiveHome'
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
import EquipmentList from './pages/equipment/EquipmentList'
import EquipmentDetail from './pages/equipment/EquipmentDetail'
import ItemList from './pages/items/ItemList'
import MusicPlaylistPage from './pages/music/MusicPlaylistPage'
import FactoryLayout from './pages/factory/FactoryLayout'
import { ListSkeleton } from './components/ui/ListSkeleton'
// 工厂子页面懒加载：将 @xyflow/react + @dagrejs/dagre 隔离出主 bundle
const FactoryRecipes = lazy(() => import('./pages/factory/FactoryRecipes'))
const FactoryChains = lazy(() => import('./pages/factory/FactoryChains'))
import StoryOverview from './pages/story/StoryOverview'
import StoryRecap from './pages/story/StoryRecap'
import StoryLibrary from './pages/story/StoryLibrary'
import StoryDocumentDetail from './pages/story/StoryDocumentDetail'
import StoryMissionDetail from './pages/story/StoryMissionDetail'
import BakerTerminal from './pages/baker/BakerTerminal'
import ActivityArchive from './pages/activities/ActivityArchive'
import ArchiveSearch from './pages/search/ArchiveSearch'
import UpdateHome from './pages/updates/UpdateHome'
import UpdateSummary from './pages/updates/UpdateSummary'
import UpdateTableDiff from './pages/updates/UpdateTableDiff'
import './components/DiffViewer/register'

function AppRoutes() {
  const { locale } = useLocale()
  return (
    <I18nProvider locale={locale}>
      <BrowserRouter>
        <LoadingToast />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/archive" element={<ArchiveLayout />}>
            <Route index element={<ArchiveHome />} />
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
            <Route path="equipment" element={<EquipmentList />} />
            <Route path="equipment/:id" element={<EquipmentDetail />} />
            <Route path="items" element={<ItemList />} />
            <Route path="music" element={<MusicPlaylistPage />} />
            <Route path="factory" element={<FactoryLayout />}>
              <Route index element={<Navigate to="recipes" replace />} />
              <Route path="recipes" element={<Suspense fallback={<ListSkeleton />}><FactoryRecipes /></Suspense>} />
              <Route path="chains" element={<Suspense fallback={<ListSkeleton />}><FactoryChains /></Suspense>} />
            </Route>
            <Route path="story" element={<StoryOverview />} />
            <Route path="story/recap" element={<StoryRecap />} />
            <Route path="story/library" element={<StoryLibrary />} />
            <Route path="story/library/:itemId" element={<StoryDocumentDetail />} />
            <Route path="story/mission/:missionId" element={<StoryMissionDetail />} />
            <Route path="baker" element={<BakerTerminal />} />
            <Route path="activities" element={<ActivityArchive />} />
            <Route path="search" element={<ArchiveSearch />} />
            <Route path="updates" element={<UpdateHome />} />
            <Route path="updates/:versionName" element={<UpdateSummary />} />
            <Route path="updates/:versionName/:tableFile" element={<UpdateTableDiff />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default function App() {
  return (
    <LoadingProvider>
      <LocaleProvider>
        <AppRoutes />
      </LocaleProvider>
    </LoadingProvider>
  )
}

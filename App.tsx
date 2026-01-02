
import React from 'react';
import { Routes, Route, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { BottomNav } from './components';
import { 
    HomeScreen, NewGameSetupScreen, AssignPlayersScreen, LiveMatchScreen, 
    StatisticsScreen, HistoryScreen, SessionReportScreen, SettingsScreen, 
    PlayerHubScreen, PlayerDatabaseScreen, PlayerProfileScreen,
    NewsFeedScreen, VoiceSettingsScreen, AnnouncementScreen, PublicProfileScreen,
    PromoScreen, PromoAdminScreen, LedgerScreen, PublicHubScreen,
    HubAnalyticsScreen
} from './screens';
import { useApp } from './context';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSession, setPlayerDbSort, setPlayerDbSearch } = useApp();

  // Глобальная защита от случайной перезагрузки во время активной сессии
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = ''; 
    };
    if (activeSession) {
        window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeSession]);

  // Сброс фильтров базы игроков при выходе из раздела управления
  React.useEffect(() => {
      const isPlayerSection = location.pathname.includes('/player-database') || location.pathname.includes('/player/'); 
      if (!isPlayerSection) {
          setPlayerDbSort('date');
          setPlayerDbSearch('');
      }
  }, [location.pathname, setPlayerDbSort, setPlayerDbSearch]);

  const pathsWithoutNav = [
    '/public-profile/:id',
    '/promo',
    '/hub'
  ];

  const showNav = !pathsWithoutNav.some(path => matchPath(path, location.pathname));
  const isHub = !!matchPath('/hub', location.pathname);

  return (
    <div className={`min-h-screen ${isHub ? 'bg-[#0a0c10]' : 'bg-dark-bg'} text-dark-text font-sans selection:bg-dark-accent-start selection:text-dark-bg`}>
      <div className={`${isHub ? 'w-full bg-[#0a0c10]' : 'max-w-md mx-auto bg-dark-bg'} min-h-screen relative shadow-2xl shadow-black/50 ${showNav ? 'pb-24' : ''}`}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/setup" element={<NewGameSetupScreen />} />
          <Route path="/assign" element={<AssignPlayersScreen />} />
          <Route path="/match" element={<LiveMatchScreen />} />
          <Route path="/statistics" element={<StatisticsScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/report/:id" element={<SessionReportScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/settings/voice" element={<VoiceSettingsScreen />} />
          <Route path="/settings/promo-admin" element={<PromoAdminScreen />} />
          <Route path="/settings/analytics" element={<HubAnalyticsScreen />} />
          <Route path="/ledger" element={<LedgerScreen />} />
          <Route path="/player-hub" element={<PlayerHubScreen />} />
          <Route path="/player-database" element={<PlayerDatabaseScreen />} />
          <Route path="/player/:id" element={<PlayerProfileScreen />} />
          <Route path="/public-profile/:id" element={<PublicProfileScreen />} />
          <Route path="/news-feed" element={<NewsFeedScreen />} />
          <Route path="/announcement" element={<AnnouncementScreen />} />
          <Route path="/promo" element={<PromoScreen />} />
          <Route path="/hub" element={<PublicHubScreen />} />
        </Routes>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};

export default App;

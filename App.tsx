
import React from 'react';
import { Routes, Route, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { BottomNav } from './components';
import { 
    HomeScreen, NewGameSetupScreen, AssignPlayersScreen, LiveMatchScreen, 
    StatisticsScreen, HistoryScreen, SessionReportScreen, SettingsScreen, 
    PlayerHubScreen, PlayerDatabaseScreen, PlayerProfileScreen,
    NewsFeedScreen, VoiceSettingsScreen, AnnouncementScreen, PublicProfileScreen,
    PromoScreen, PromoAdminScreen, PublicHubScreen
} from './screens';
import { useApp } from './context';

const App: React.FC = () => {
  const location = useLocation();
  const { activeSession } = useApp();

  // Защита от случайной перезагрузки страницы во время активной сессии
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

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession]);

  // Скрываем нижнюю навигацию на публичных страницах
  const pathsWithoutNav = [
    '/public-profile/:id',
    '/promo',
    '/hub' 
  ];

  // СПИСОК СТРАНИЦ, КОТОРЫЕ ДОЛЖНЫ БЫТЬ НА ВЕСЬ ЭКРАН (WEB MODE)
  const fullScreenPaths = [
    '/promo',
    '/hub'
  ];

  const showNav = !pathsWithoutNav.some(path => matchPath(path, location.pathname));
  
  // Проверяем, находимся ли мы на "Веб-странице"
  const isFullScreen = fullScreenPaths.some(path => matchPath(path, location.pathname));

  // ЛОГИКА КОНТЕЙНЕРА (Самое важное место):
  // Если FullScreen -> ширина 100%, фон темный.
  // Если Admin App -> ширина мобильника (max-w-md), по центру, с тенью телефона.
  const containerClasses = isFullScreen 
    ? "w-full min-h-screen relative bg-dark-bg" 
    : "max-w-md mx-auto min-h-screen relative shadow-2xl shadow-black/50 bg-dark-bg border-x border-white/5";

  return (
    <div className="min-h-screen bg-[#121418] text-dark-text font-sans selection:bg-dark-accent-start selection:text-dark-bg overflow-x-hidden">
      <div className={`${containerClasses} ${showNav ? 'pb-24' : ''}`}>
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

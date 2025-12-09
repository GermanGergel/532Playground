
import React from 'react';
import { Routes, Route, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { BottomNav } from './components';
import { 
    HomeScreen, NewGameSetupScreen, AssignPlayersScreen, LiveMatchScreen, 
    StatisticsScreen, HistoryScreen, SessionReportScreen, SettingsScreen, 
    PlayerHubScreen, PlayerDatabaseScreen, PlayerProfileScreen,
    NewsFeedScreen, VoiceSettingsScreen, AnnouncementScreen, PublicProfileScreen
} from './screens';
import { useApp } from './context';

const App: React.FC = () => {
  const location = useLocation();
  const { activeSession } = useApp();

  // Add global protection against accidental page reloads during an entire session.
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = ''; // Required for some browsers to trigger the prompt
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

  const pathsWithoutNav = [
    '/public-profile/:id',
  ];

  const showNav = !pathsWithoutNav.some(path => matchPath(path, location.pathname));

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans selection:bg-dark-accent-start selection:text-dark-bg">
      <div className={`max-w-md mx-auto min-h-screen relative shadow-2xl shadow-black/50 bg-dark-bg ${showNav ? 'pb-24' : ''}`}>
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
          <Route path="/player-hub" element={<PlayerHubScreen />} />
          <Route path="/player-database" element={<PlayerDatabaseScreen />} />
          <Route path="/player/:id" element={<PlayerProfileScreen />} />
          <Route path="/public-profile/:id" element={<PublicProfileScreen />} />
          <Route path="/news-feed" element={<NewsFeedScreen />} />
          <Route path="/announcement" element={<AnnouncementScreen />} />
        </Routes>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};

export default App;
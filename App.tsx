
import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components';
import { 
    HomeScreen, NewGameSetupScreen, AssignPlayersScreen, LiveMatchScreen, 
    StatisticsScreen, HistoryScreen, SessionReportScreen, SettingsScreen, 
    PlayerHubScreen, PlayerDatabaseScreen, PlayerProfileScreen,
    NewsFeedScreen, VoiceSettingsScreen
} from './screens';
import { useApp } from './context';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSession } = useApp();

  // This effect runs only once when the app component mounts for the first time.
  // It forces the app to start at the home screen on any reload.
  React.useEffect(() => {
    // Only reset if we are not already at the root path on initial load
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, []); // Empty dependency array ensures this runs only once.

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

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans selection:bg-dark-accent-start selection:text-dark-bg">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl shadow-black/50 bg-dark-bg pb-24">
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
          <Route path="/news-feed" element={<NewsFeedScreen />} />
        </Routes>
        <BottomNav />
      </div>
    </div>
  );
};

export default App;

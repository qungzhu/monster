import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { WelcomePage } from './pages/WelcomePage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { MoodPage } from './pages/MoodPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAppStore } from './store/useStore';

function AppContent() {
  const store = useAppStore();

  return (
    <div className={`h-full relative ${store.selectedCharacter ? `theme-${store.selectedCharacter.theme}` : ''}`}>
      <Routes>
        <Route
          path="/"
          element={
            <WelcomePage
              userName={store.userName}
              setUserName={store.setUserName}
              selectCharacter={store.selectCharacter}
              selectedCharacterId={store.selectedCharacterId}
              isCheckedIn={store.isCheckedIn}
              checkIn={() => {
                store.checkIn();
                if (store.selectedCharacterId) {
                  store.addIntimacy(store.selectedCharacterId, 5);
                }
              }}
              intimacyLevels={store.intimacyLevels}
            />
          }
        />
        <Route
          path="/chat"
          element={
            <ChatPage
              character={store.selectedCharacter}
              chatHistory={store.selectedCharacterId ? (store.chatHistories[store.selectedCharacterId] || []) : []}
              addMessage={store.addMessage}
              getCharacterResponse={store.getCharacterResponse}
              intimacyLevel={store.selectedCharacterId ? (store.intimacyLevels[store.selectedCharacterId] || 0) : 0}
              addIntimacy={store.addIntimacy}
              userName={store.userName}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              character={store.selectedCharacter}
              intimacyLevel={store.selectedCharacterId ? (store.intimacyLevels[store.selectedCharacterId] || 0) : 0}
              chatCount={store.selectedCharacterId ? (store.chatHistories[store.selectedCharacterId]?.length || 0) : 0}
            />
          }
        />
        <Route
          path="/mood"
          element={
            <MoodPage
              character={store.selectedCharacter}
              moodEntries={store.moodEntries}
              addMoodEntry={store.addMoodEntry}
              getCharacterResponse={store.getCharacterResponse}
              addIntimacy={store.addIntimacy}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              userName={store.userName}
              setUserName={store.setUserName}
              clearAllData={store.clearAllData}
            />
          }
        />
      </Routes>
      <Navigation />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

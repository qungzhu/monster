import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { GameHomePage } from './pages/GameHomePage';
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
            <GameHomePage
              character={store.selectedCharacter}
              characters={store.characters}
              selectCharacter={store.selectCharacter}
              selectedCharacterId={store.selectedCharacterId}
              userName={store.userName}
              setUserName={store.setUserName}
              coins={store.coins}
              addCoins={store.addCoins}
              xp={store.xp}
              addXP={store.addXP}
              levelInfo={store.levelInfo}
              getPetStats={store.getPetStats}
              updatePetStat={store.updatePetStat}
              getQuestProgress={store.getQuestProgress}
              updateQuestProgress={store.updateQuestProgress}
              inventory={store.inventory}
              buyItem={store.buyItem}
              useItem={store.useItem}
              getReaction={store.getReaction}
              addIntimacy={store.addIntimacy}
              intimacyLevels={store.intimacyLevels}
              isCheckedIn={store.isCheckedIn}
              checkIn={() => {
                const streak = store.checkIn();
                if (store.selectedCharacterId) {
                  store.addIntimacy(store.selectedCharacterId, store.getCheckInReward());
                }
                return streak;
              }}
              checkInStreak={store.checkInStreak}
              getCheckInReward={store.getCheckInReward}
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
              apiKey={store.apiKey}
              addXP={store.addXP}
              addCoins={store.addCoins}
              updateQuestProgress={store.updateQuestProgress}
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
              apiKey={store.apiKey}
              setApiKey={store.setApiKey}
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

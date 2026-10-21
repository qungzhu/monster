import { LivingWorld } from './pages/LivingWorld';
import { Plaza } from './pages/Plaza';
import { useAppStore } from './store/useStore';

/**
 * AI-native paradigm: the whole app is one living scene.
 * No tab bar, no page routing — natural language and direct touch
 * are the interface; feature panels are summoned into the scene.
 */
export default function App() {
  const store = useAppStore();

  // Shared multiplayer snow plaza lives at /plaza; everything else is the
  // single-player living scene.
  if (location.pathname.startsWith('/plaza')) {
    return (
      <div className="h-full relative">
        <Plaza userName={store.userName} adoptedBreedId={store.adoptedBreedId} />
      </div>
    );
  }

  return (
    <div className={`h-full relative ${store.selectedCharacter ? `theme-${store.selectedCharacter.theme}` : ''}`}>
      <LivingWorld
        character={store.selectedCharacter}
        userName={store.userName}
        setUserName={store.setUserName}
        chatHistory={store.selectedCharacterId ? (store.chatHistories[store.selectedCharacterId] || []) : []}
        addMessage={store.addMessage}
        getCharacterResponse={store.getCharacterResponse}
        intimacyLevel={store.selectedCharacterId ? (store.intimacyLevels[store.selectedCharacterId] || 0) : 0}
        addIntimacy={store.addIntimacy}
        apiKey={store.apiKey}
        setApiKey={store.setApiKey}
        clearAllData={store.clearAllData}
        moodEntries={store.moodEntries}
        addMoodEntry={store.addMoodEntry}
        coins={store.coins}
        addCoins={store.addCoins}
        addXP={store.addXP}
        levelInfo={store.levelInfo}
        getPetStats={store.getPetStats}
        getQuestProgress={store.getQuestProgress}
        updateQuestProgress={store.updateQuestProgress}
        inventory={store.inventory}
        buyItem={store.buyItem}
        useItem={store.useItem}
        getReaction={store.getReaction}
        isCheckedIn={store.isCheckedIn}
        checkIn={store.checkIn}
        checkInStreak={store.checkInStreak}
        getCheckInReward={store.getCheckInReward}
        chatCount={store.selectedCharacterId ? (store.chatHistories[store.selectedCharacterId]?.length || 0) : 0}
        adoptedBreedId={store.adoptedBreedId}
        adoptBreed={store.adoptBreed}
        petName={store.petName}
        customPet={store.customPet}
        saveCustomPet={store.saveCustomPet}
        selectedGeneratedPetKey={store.selectedGeneratedPetKey}
        hubName={store.hubName}
        setHubName={store.setHubName}
        agentRuns={store.agentRuns}
        recordAgentRun={store.recordAgentRun}
        companionRole={store.companionRole}
        setCompanionRole={store.setCompanionRole}
        lifeItems={store.lifeItems}
        addLifeItem={store.addLifeItem}
        toggleLifeItem={store.toggleLifeItem}
        removeLifeItem={store.removeLifeItem}
      />
    </div>
  );
}

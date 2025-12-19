// src/test-firebase.ts

import {
  createGame,
  getGameOnce,
  subscribeToGame,
  deleteGame,
} from "./services/gameRepository";

export async function runFirebaseTest() {
  console.log("🚀 Testing Firebase connection...");

  console.log("📝 Creating test game...");

  const testConfig: any = {
    level: "primary",
    language: "es",
    className: "Test Game",
    numberOfTeams: 2,
    studentsPerTeam: 3,
    subject: "Test Subject",
    csvFileName: "test.csv",
    timers: {
      stage1Rating: 30,
      stage2Hint: 60,
      stage2Answer: 45,
      stage2Help: 30,
    },
    createdAt: Date.now(),
    createdBy: "test@teacher.com",
  };

  const gameId = await createGame(testConfig);
  console.log("✅ Game created with ID:", gameId);

  console.log("📖 Reading game once...");
  const game = await getGameOnce(gameId);
  console.log("✅ Game data:", game);

  console.log("👂 Subscribing to game updates...");
  const unsubscribe = subscribeToGame(gameId, (data: any) => {
    console.log("🔔 Game updated:", data?.config?.className);
  });

  setTimeout(async () => {
    console.log("🧹 Cleaning up subscription...");
    unsubscribe();

    console.log("🗑 Deleting test game...");
    await deleteGame(gameId);
    console.log("✅ All tests passed!");
  }, 4000);
}

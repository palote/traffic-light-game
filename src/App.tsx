// src/App.tsx

import { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { GameController } from './components/GameController';
import './App.css';

type AppView = 'setup' | 'game';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [gameId, setGameId] = useState<string | null>(null);

  // ✅ Por ahora fijo para testing (después lo harás seleccionable en Setup o por room/team join)
  const [teamId] = useState('teamA');

  const handleGameCreated = (newGameId: string) => {
    console.log('Game created with ID:', newGameId);
    setGameId(newGameId);
  };

  const handleStartGame = () => {
    if (gameId) setCurrentView('game');
  };

  if (currentView === 'setup') {
    return (
      <div className="App">
        <SetupScreen onGameCreated={handleGameCreated} />

        {/* Botón temporal para testing */}
        {gameId && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              background: '#27ae60',
              padding: '15px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            }}
            onClick={handleStartGame}
          >
            🎮 IR AL JUEGO (Testing)
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'game' && gameId) {
    return (
      <div className="App">
        <GameController gameId={gameId} teamId={teamId} />

        {/* Botón volver */}
        <button
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: '#95a5a6',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
          onClick={() => setCurrentView('setup')}
        >
          ← Volver a Setup
        </button>
      </div>
    );
  }

  return null;
}

export default App;

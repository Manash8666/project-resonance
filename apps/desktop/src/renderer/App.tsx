// apps/desktop/src/renderer/App.tsx
import React from 'react';

export default function App() {
  return (
    <div className="app-shell">
      <div className="title-bar">
        <span className="app-name">⚡ Project Resonance</span>
      </div>
      <main className="content-area">
        <p className="boot-msg">Library Core — online. Visual Engine — standby.</p>
      </main>
    </div>
  );
}

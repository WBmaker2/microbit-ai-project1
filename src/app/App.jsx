import { useCallback, useState } from 'react';
import { AppHeader } from '../components/AppHeader.jsx';
import { UpdateHistoryDialog } from '../components/UpdateHistoryDialog.jsx';
import { useSerialConnection } from '../features/serial/useSerialConnection.js';
import { AiFanPage } from '../pages/AiFanPage.jsx';
import { HomePage } from '../pages/HomePage.jsx';

export function App() {
  const serial = useSerialConnection();
  const [activeTab, setActiveTab] = useState('home');
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const closeUpdates = useCallback(() => setIsUpdatesOpen(false), []);

  return (
    <div className="app-shell">
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenUpdates={() => setIsUpdatesOpen(true)}
      />

      <main>
        {activeTab === 'home' ? <HomePage serial={serial} /> : <AiFanPage serial={serial} />}
      </main>

      <UpdateHistoryDialog isOpen={isUpdatesOpen} onClose={closeUpdates} />
    </div>
  );
}

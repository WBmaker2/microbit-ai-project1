import { Fan, History, Home, Usb } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'fan', label: '인공지능 선풍기', icon: Fan },
];

export function AppHeader({ activeTab, onOpenUpdates, onTabChange }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => onTabChange('home')}>
        <span className="brand-mark">
          <Usb size={22} strokeWidth={2.2} />
        </span>
        <span>마이크로비트 AI 선풍기</span>
      </button>

      <div className="header-actions">
        <nav className="tabs" aria-label="주요 메뉴" role="tablist">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                className={`tab-button ${isActive ? 'is-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="updates-button" type="button" onClick={onOpenUpdates}>
          <History size={17} strokeWidth={2.2} />
          <span>업데이트 내역</span>
        </button>
      </div>
    </header>
  );
}

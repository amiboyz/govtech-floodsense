import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { MonitoringDashboard } from "./MonitoringDashboard";
import { HistoricalReplay } from "./HistoricalReplay";

function RootApp() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'lab'>('monitoring');

  return (
    <>
      {activeTab === 'monitoring' ? (
        <MonitoringDashboard onSwitchToLab={() => setActiveTab('lab')} />
      ) : (
        <div>
          <div
            style={{
              position: 'fixed',
              top: '14px',
              right: '24px',
              zIndex: 9999,
              display: 'flex',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setActiveTab('monitoring')}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '8px',
                border: '1px solid #2563eb',
                background: '#2563eb',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ← Kembali ke Pemantauan Terpadu
            </button>
          </div>
          <HistoricalReplay />
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);

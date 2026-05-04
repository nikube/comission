import { useState } from "react";
import ApportSimulator from "./ApportSimulator.jsx";
import ValuationSimulator from "./ValuationSimulator.jsx";

const TABS = [
  { id: "apport", label: "Apport" },
  { id: "valuation", label: "Valorisation" },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState("apport");

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0f1a", color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: "20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type=range] {
          -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
          border-radius: 3px; background: #1e293b; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #f59e0b; cursor: pointer; box-shadow: 0 0 10px rgba(245,158,11,0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%; background: #f59e0b;
          cursor: pointer; border: none; box-shadow: 0 0 10px rgba(245,158,11,0.4);
        }
        input[type=number] {
          background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
          border-radius: 6px; padding: 5px 8px; font-family: inherit; font-size: 14px;
          width: 100px; text-align: center;
        }
        input[type=number]:focus { outline: none; border-color: #f59e0b; }
        input[type=text] {
          background: transparent; color: #e2e8f0; border: none;
          border-bottom: 1px solid #f59e0b; padding: 2px 4px;
          font-family: inherit; font-size: 12px; width: 80px;
        }
        input[type=text]:focus { outline: none; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, margin: 0,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Anatole — Apport d'affaires
          </h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {TABS.map(t => {
            const active = currentPage === t.id;
            return (
              <button key={t.id} onClick={() => setCurrentPage(t.id)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontFamily: "inherit",
                fontWeight: 600, cursor: "pointer",
                border: active ? "1px solid #f59e0b" : "1px solid #1e293b",
                background: active ? "#f59e0b20" : "#0a0f1a",
                color: active ? "#f59e0b" : "#64748b",
              }}>{t.label}</button>
            );
          })}
        </div>

        {currentPage === "apport" && <ApportSimulator />}
        {currentPage === "valuation" && <ValuationSimulator />}
      </div>
    </div>
  );
}

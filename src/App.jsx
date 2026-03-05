import { useState, useRef, useCallback } from "react";

const DEFAULT_TRANCHES = [
  { min: 0, max: 10000, rate: 0.10 },
  { min: 10000, max: 50000, rate: 0.05 },
  { min: 50000, max: 100000, rate: 0.02 },
  { min: 100000, max: Infinity, rate: 0.01 },
];

function trancheLabel(t) {
  const fmtK = (v) => v >= 1000 ? (v / 1000) + "k" : v.toString();
  if (t.max === Infinity) return fmtK(t.min) + "+";
  return fmtK(t.min) + " → " + fmtK(t.max);
}

const YEAR_COEFFICIENTS = [
  { year: 1, coeff: 1.0, label: "An 1" },
  { year: 2, coeff: 0.8, label: "An 2" },
  { year: 3, coeff: 0.6, label: "An 3" },
  { year: 4, coeff: 0.4, label: "An 4" },
  { year: 5, coeff: 0, label: "An 5+" },
];

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

function calcCommission(ca, tranches, useTranches, flatRate) {
  if (!useTranches) {
    const total = ca * flatRate;
    return { total, details: [{ label: "Taux unique", base: ca, rate: flatRate, commission: total }] };
  }
  let remaining = ca;
  let total = 0;
  const details = [];
  for (const t of tranches) {
    if (remaining <= 0) break;
    const trancheSize = t.max === Infinity ? remaining : t.max - t.min;
    const applicable = Math.min(remaining, trancheSize);
    const comm = applicable * t.rate;
    if (applicable > 0) {
      details.push({ label: trancheLabel(t), base: applicable, rate: t.rate, commission: comm });
    }
    total += comm;
    remaining -= applicable;
  }
  return { total, details };
}

function fmt(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPct(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const LOG_MIN = Math.log10(1000);
const LOG_MAX = Math.log10(1000000);
function sliderToCA(v) {
  const log = LOG_MIN + v * (LOG_MAX - LOG_MIN);
  const raw = Math.pow(10, log);
  if (raw < 5000) return Math.round(raw / 100) * 100;
  if (raw < 50000) return Math.round(raw / 500) * 500;
  if (raw < 200000) return Math.round(raw / 1000) * 1000;
  return Math.round(raw / 5000) * 5000;
}
function caToSlider(ca) {
  if (ca <= 1000) return 0;
  if (ca >= 1000000) return 1;
  return (Math.log10(ca) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}
function formatCA(v) {
  if (v >= 1000000) return "1M";
  if (v >= 1000) return (v / 1000) + "k";
  return v.toString();
}

function SpiderChart({ people, onChange, envelope }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 105;

  const n = people.length;
  const angles = people.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);

  const pointForAxis = (axis, value) => {
    const r = (value / 100) * maxR;
    return { x: cx + r * Math.cos(angles[axis]), y: cy + r * Math.sin(angles[axis]) };
  };

  const valueFromMouse = useCallback((e, axis) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX || e.touches?.[0]?.clientX) - rect.left) * (size / rect.width);
    const my = ((e.clientY || e.touches?.[0]?.clientY) - rect.top) * (size / rect.height);
    const dx = mx - cx;
    const dy = my - cy;
    const proj = dx * Math.cos(angles[axis]) + dy * Math.sin(angles[axis]);
    const raw = Math.max(0, Math.min(100, (proj / maxR) * 100));
    return Math.round(raw / 10) * 10;
  }, [angles]);

  const handlePointerDown = (idx, e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setDragging(idx);
  };

  const handlePointerMove = useCallback((e) => {
    if (dragging === null) return;
    const val = valueFromMouse(e, dragging);
    if (val !== null && val !== people[dragging].pct) {
      onChange(dragging, val);
    }
  }, [dragging, valueFromMouse, people, onChange]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const rings = [20, 40, 60, 80, 100];
  const total = people.reduce((s, p) => s + p.pct, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: "100%", maxWidth: 340, touchAction: "none", cursor: dragging !== null ? "grabbing" : "default" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {rings.map((r) => (
          <polygon key={r}
            points={angles.map(a => {
              const rad = (r / 100) * maxR;
              return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
            }).join(" ")}
            fill="none" stroke="#1e293b" strokeWidth={r === 100 ? 1.5 : 0.5}
          />
        ))}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
            stroke="#1e293b" strokeWidth={0.5}
          />
        ))}
        <polygon
          points={people.map((p, i) => { const pt = pointForAxis(i, p.pct); return `${pt.x},${pt.y}`; }).join(" ")}
          fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" strokeWidth={1.5}
        />
        {people.map((p, i) => {
          const labelR = maxR + 30;
          const x = cx + labelR * Math.cos(angles[i]);
          const y = cy + labelR * Math.sin(angles[i]);
          const amount = Math.round((envelope * p.pct) / 100);
          return (
            <g key={i}>
              <text x={x} y={y - 8} textAnchor="middle" fill={COLORS[i]} fontSize={10.5}
                fontFamily="'Outfit', sans-serif" fontWeight={600}>{p.name}</text>
              <text x={x} y={y + 5} textAnchor="middle" fill="#e2e8f0" fontSize={11}
                fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{p.pct}%</text>
              <text x={x} y={y + 17} textAnchor="middle" fill="#64748b" fontSize={9.5}
                fontFamily="'JetBrains Mono', monospace">{fmt(amount)}€</text>
            </g>
          );
        })}
        {people.map((p, i) => {
          const pt = pointForAxis(i, p.pct);
          return (
            <circle key={i} cx={pt.x} cy={pt.y} r={dragging === i ? 11 : 9}
              fill={COLORS[i]} stroke="#0a0f1a" strokeWidth={2.5}
              style={{ cursor: "grab", filter: `drop-shadow(0 0 6px ${COLORS[i]}60)` }}
              onPointerDown={(e) => handlePointerDown(i, e)}
            />
          );
        })}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={16} fontWeight={700}
          fontFamily="'Outfit', sans-serif" fill={total === 100 ? "#22c55e" : "#ef4444"}>
          {total}%
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9}
          fontFamily="'JetBrains Mono', monospace" fill={total === 100 ? "#16a34a80" : "#ef444480"}>
          total
        </text>
      </svg>
    </div>
  );
}

export default function Simulator() {
  const [sliderVal, setSliderVal] = useState(caToSlider(25000));
  const [yearIdx, setYearIdx] = useState(0);
  const [useTranches, setUseTranches] = useState(true);
  const [tranches, setTranches] = useState(DEFAULT_TRANCHES);
  const [flatRate, setFlatRate] = useState(0.05);
  const [nbPeople, setNbPeople] = useState(3);
  const [people, setPeople] = useState([
    { name: "Intro", pct: 30 },
    { name: "Quali", pct: 50 },
    { name: "Closer", pct: 20 },
  ]);
  const [editingName, setEditingName] = useState(null);

  const ca = sliderToCA(sliderVal);
  const { total: baseCommission, details } = calcCommission(ca, tranches, useTranches, flatRate);
  const yearCoeff = YEAR_COEFFICIENTS[yearIdx].coeff;
  const finalCommission = baseCommission * yearCoeff;
  const effectiveRate = ca > 0 ? (finalCommission / ca) * 100 : 0;
  const totalPct = people.reduce((s, p) => s + p.pct, 0);

  const NAMES = ["Intro", "Quali", "Closer", "Associé 4", "Associé 5", "Associé 6"];
  const handleNbChange = (nb) => {
    const newNb = Math.max(1, Math.min(6, nb));
    setNbPeople(newNb);
    const current = people.length;
    let newPeople;
    if (newNb > current) {
      const added = [];
      for (let i = current; i < newNb; i++) {
        added.push({ name: NAMES[i] || `P${i + 1}`, pct: 0 });
      }
      newPeople = [...people, ...added];
    } else {
      newPeople = people.slice(0, newNb);
    }
    // Redistribute evenly so total is always 100%
    const base = Math.floor(100 / newNb / 10) * 10;
    const remainder = 100 - base * newNb;
    newPeople = newPeople.map((p, i) => ({
      ...p,
      pct: base + (i < remainder / 10 ? 10 : 0),
    }));
    setPeople(newPeople);
  };

  const updatePct = useCallback((idx, val) => {
    setPeople(prev => prev.map((p, i) => (i === idx ? { ...p, pct: val } : p)));
  }, []);

  const updateName = (idx, name) => {
    setPeople(prev => prev.map((p, i) => (i === idx ? { ...p, name } : p)));
  };

  const updateTrancheRate = (idx, rate) => {
    setTranches(prev => prev.map((t, i) => i === idx ? { ...t, rate } : t));
  };
  const updateTrancheMax = (idx, max) => {
    setTranches(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], max };
      if (idx + 1 < next.length) {
        next[idx + 1] = { ...next[idx + 1], min: max };
      }
      return next;
    });
  };
  const addTranche = () => {
    setTranches(prev => {
      const last = prev[prev.length - 1];
      const newMin = last.min;
      const newBoundary = newMin + 50000;
      return [
        ...prev.slice(0, -1),
        { min: newMin, max: newBoundary, rate: last.rate },
        { min: newBoundary, max: Infinity, rate: Math.max(0.005, last.rate / 2) },
      ];
    });
  };
  const removeTranche = (idx) => {
    if (tranches.length <= 1) return;
    setTranches(prev => {
      const next = [...prev];
      next.splice(idx, 1);
      if (idx === 0 && next.length > 0) {
        next[0] = { ...next[0], min: 0 };
      } else if (idx === next.length) {
        next[next.length - 1] = { ...next[next.length - 1], max: Infinity };
      } else {
        next[idx] = { ...next[idx], min: prev[idx - 1]?.max ?? next[idx].min };
      }
      return next;
    });
  };
  const resetTranches = () => setTranches(DEFAULT_TRANCHES);

  const ticks = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

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
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, margin: 0,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Anatole — Apport d'affaires
          </h1>
          <p style={{ color: "#64748b", fontSize: 11, margin: "4px 0 0" }}>
            {useTranches
              ? "Tranches : " + tranches.map(t => `${(t.rate * 100).toFixed(0)}% → ${trancheLabel(t)}`).join(" · ")
              : `Taux unique : ${(flatRate * 100).toFixed(1)}%`}
          </p>
        </div>

        {/* CA */}
        <div style={{ background: "#111827", borderRadius: 12, padding: 18, marginBottom: 12, border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>CA HT facturé</label>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input type="number" value={ca}
                onChange={(e) => { const v = Math.max(1000, Math.min(1000000, +e.target.value || 1000)); setSliderVal(caToSlider(v)); }}
                style={{ width: 110, fontSize: 15, fontWeight: 600 }}
              />
              <span style={{ color: "#64748b", fontSize: 13 }}>€</span>
            </div>
          </div>
          <input type="range" min={0} max={1} step={0.002} value={sliderVal}
            onChange={(e) => setSliderVal(+e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", marginTop: 4, position: "relative", height: 14 }}>
            {ticks.map(t => (
              <span key={t} style={{ position: "absolute", left: `${caToSlider(t) * 100}%`, transform: "translateX(-50%)" }}>
                {formatCA(t)}
              </span>
            ))}
          </div>
        </div>

        {/* Tranches config */}
        <div style={{ background: "#111827", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Mode de calcul</label>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setUseTranches(true)} style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
                border: useTranches ? "1px solid #f59e0b" : "1px solid #1e293b",
                background: useTranches ? "#f59e0b20" : "#0a0f1a",
                color: useTranches ? "#f59e0b" : "#64748b",
              }}>Tranches</button>
              <button onClick={() => setUseTranches(false)} style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
                border: !useTranches ? "1px solid #f59e0b" : "1px solid #1e293b",
                background: !useTranches ? "#f59e0b20" : "#0a0f1a",
                color: !useTranches ? "#f59e0b" : "#64748b",
              }}>Taux unique</button>
            </div>
          </div>

          {!useTranches && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
              <label style={{ fontSize: 11, color: "#64748b" }}>Taux :</label>
              <input type="number" min={0} max={100} step={0.5}
                value={+(flatRate * 100).toFixed(1)}
                onChange={(e) => setFlatRate(Math.max(0, Math.min(1, (+e.target.value || 0) / 100)))}
                style={{ width: 75, fontSize: 13, fontWeight: 600 }}
              />
              <span style={{ fontSize: 12, color: "#64748b" }}>%</span>
            </div>
          )}

          {useTranches && (
            <div>
              <div style={{ display: "grid", gap: 4 }}>
                {tranches.map((t, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
                    background: "#0a0f1a", borderRadius: 6, border: "1px solid #1e293b",
                  }}>
                    <span style={{ fontSize: 10, color: "#64748b", minWidth: 60, flexShrink: 0 }}>
                      {(t.min / 1000).toFixed(0)}k →
                    </span>
                    {t.max === Infinity ? (
                      <span style={{ fontSize: 10, color: "#64748b", minWidth: 45 }}>∞</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 45 }}>
                        <input type="number" min={t.min + 1000} step={1000}
                          value={t.max}
                          onChange={(e) => updateTrancheMax(i, Math.max(t.min + 1000, +e.target.value || 0))}
                          style={{ width: 70, fontSize: 11, padding: "3px 5px" }}
                        />
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto" }}>
                      <input type="number" min={0} max={100} step={0.5}
                        value={+(t.rate * 100).toFixed(1)}
                        onChange={(e) => updateTrancheRate(i, Math.max(0, Math.min(1, (+e.target.value || 0) / 100)))}
                        style={{ width: 60, fontSize: 11, padding: "3px 5px" }}
                      />
                      <span style={{ fontSize: 10, color: "#64748b" }}>%</span>
                    </div>
                    {tranches.length > 1 && (
                      <button onClick={() => removeTranche(i)} style={{
                        width: 22, height: 22, borderRadius: 4, border: "1px solid #1e293b",
                        background: "#0a0f1a", color: "#ef4444", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 13, lineHeight: 1, display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={addTranche} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "inherit",
                  border: "1px solid #1e293b", background: "#0a0f1a", color: "#94a3b8",
                  cursor: "pointer", fontWeight: 500,
                }}>+ Ajouter tranche</button>
                <button onClick={resetTranches} style={{
                  padding: "4px 10px", borderRadius: 5, fontSize: 10, fontFamily: "inherit",
                  border: "1px solid #1e293b", background: "#0a0f1a", color: "#64748b",
                  cursor: "pointer", fontWeight: 400,
                }}>Réinitialiser</button>
              </div>
            </div>
          )}
        </div>

        {/* Year */}
        <div style={{ background: "#111827", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #1e293b" }}>
          <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 8 }}>Ancienneté client</label>
          <div style={{ display: "flex", gap: 5 }}>
            {YEAR_COEFFICIENTS.map((y, i) => (
              <button key={y.year} onClick={() => setYearIdx(i)} style={{
                flex: 1, padding: "7px 2px", borderRadius: 8,
                border: i === yearIdx ? "1px solid #f59e0b" : "1px solid #1e293b",
                background: i === yearIdx ? "#f59e0b15" : "#0a0f1a",
                color: i === yearIdx ? "#f59e0b" : "#64748b",
                cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: i === yearIdx ? 600 : 400,
              }}>
                <div>{y.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>×{y.coeff}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div style={{
          background: "linear-gradient(135deg, #1a1207, #170d07)", borderRadius: 12,
          padding: 20, marginBottom: 12, border: "1px solid #78350f",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "#92702a", marginBottom: 2 }}>Enveloppe d'apport</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>
                {fmt(Math.round(finalCommission))} €
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#fbbf24" }}>{fmtPct(effectiveRate)}%</div>
              <div style={{ fontSize: 9, color: "#92702a" }}>taux effectif</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {details.map((d, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", fontSize: 11,
                padding: "4px 9px", background: "#0a0f1a40", borderRadius: 5,
              }}>
                <span style={{ color: "#92702a" }}>{d.label} → {(d.rate * 100).toFixed(0)}%</span>
                <span style={{ color: "#d4a843" }}>
                  {fmt(d.base)}€ × {(d.rate * 100)}% = <strong>{fmt(Math.round(d.commission))}€</strong>
                </span>
              </div>
            ))}
            {yearCoeff < 1 && yearCoeff > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", fontSize: 11,
                padding: "4px 9px", background: "#0a0f1a40", borderRadius: 5,
              }}>
                <span style={{ color: "#92702a" }}>Coeff. {YEAR_COEFFICIENTS[yearIdx].label}</span>
                <span style={{ color: "#d4a843" }}>
                  {fmt(Math.round(baseCommission))}€ × {yearCoeff} = <strong>{fmt(Math.round(finalCommission))}€</strong>
                </span>
              </div>
            )}
            {yearCoeff === 0 && (
              <div style={{ fontSize: 11, padding: "7px", background: "#0a0f1a40", borderRadius: 5, color: "#78350f", textAlign: "center" }}>
                Client collectif — plus de commission individuelle
              </div>
            )}
          </div>
        </div>

        {/* Commission curve chart */}
        {(() => {
          const chartW = 600, chartH = 200, padL = 55, padR = 15, padT = 15, padB = 30;
          const w = chartW - padL - padR, h = chartH - padT - padB;
          const caSteps = [];
          for (let c = 1000; c <= 1000000; c += 1000) caSteps.push(c);
          const maxCA = 1000000;
          const points = caSteps.map(c => {
            const comm = calcCommission(c, tranches, useTranches, flatRate).total * yearCoeff;
            return { ca: c, comm };
          });
          const maxComm = Math.max(...points.map(p => p.comm), 1);
          const toX = (c) => padL + (c / maxCA) * w;
          const toY = (v) => padT + h - (v / maxComm) * h;
          const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.ca).toFixed(1)},${toY(p.comm).toFixed(1)}`).join(" ");
          const areaD = pathD + ` L${toX(maxCA).toFixed(1)},${toY(0).toFixed(1)} L${toX(1000).toFixed(1)},${toY(0).toFixed(1)} Z`;
          const currentComm = finalCommission;
          const gridCAs = [0, 200000, 400000, 600000, 800000, 1000000];
          const gridComms = [];
          const commStep = Math.pow(10, Math.floor(Math.log10(maxComm || 1)));
          for (let g = 0; g <= maxComm; g += commStep) gridComms.push(g);
          if (gridComms.length < 3) {
            const half = commStep / 2;
            for (let g = half; g <= maxComm; g += commStep) gridComms.push(g);
            gridComms.sort((a, b) => a - b);
          }

          return (
            <div style={{ background: "#111827", borderRadius: 12, padding: "14px 10px", marginBottom: 12, border: "1px solid #1e293b" }}>
              <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 8, paddingLeft: 8 }}>
                Courbe d'apport selon CA
              </label>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", display: "block" }}>
                {gridComms.map((g, i) => (
                  <g key={"gy" + i}>
                    <line x1={padL} x2={chartW - padR} y1={toY(g)} y2={toY(g)} stroke="#1e293b" strokeWidth={0.5} />
                    <text x={padL - 5} y={toY(g) + 3} textAnchor="end" fill="#475569" fontSize={8}
                      fontFamily="'JetBrains Mono', monospace">{fmt(Math.round(g))}€</text>
                  </g>
                ))}
                {gridCAs.map((g, i) => (
                  <g key={"gx" + i}>
                    <line x1={toX(g)} x2={toX(g)} y1={padT} y2={padT + h} stroke="#1e293b" strokeWidth={0.5} />
                    <text x={toX(g)} y={chartH - 5} textAnchor="middle" fill="#475569" fontSize={8}
                      fontFamily="'JetBrains Mono', monospace">{formatCA(g || 0)}</text>
                  </g>
                ))}
                <path d={areaD} fill="rgba(245, 158, 11, 0.08)" />
                <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={2} />
                {ca >= 1000 && ca <= 1000000 && (
                  <g>
                    <line x1={toX(ca)} x2={toX(ca)} y1={padT} y2={toY(0)} stroke="#f59e0b" strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5} />
                    <line x1={padL} x2={toX(ca)} y1={toY(currentComm)} y2={toY(currentComm)} stroke="#f59e0b" strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5} />
                    <circle cx={toX(ca)} cy={toY(currentComm)} r={5} fill="#f59e0b" stroke="#0a0f1a" strokeWidth={2} />
                    <text x={toX(ca)} y={toY(currentComm) - 10} textAnchor="middle" fill="#fbbf24" fontSize={9.5}
                      fontFamily="'JetBrains Mono', monospace" fontWeight={700}>{fmt(Math.round(currentComm))}€</text>
                  </g>
                )}
              </svg>
            </div>
          );
        })()}

        {/* Distribution */}
        <div style={{ background: "#111827", borderRadius: 12, padding: 20, border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Répartition</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Pers.</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button key={n} onClick={() => handleNbChange(n)} style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: nbPeople === n ? "1px solid #f59e0b" : "1px solid #1e293b",
                    background: nbPeople === n ? "#f59e0b20" : "#0a0f1a",
                    color: nbPeople === n ? "#f59e0b" : "#64748b",
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Editable names */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {people.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                background: "#0a0f1a", borderRadius: 5, border: "1px solid #1e293b",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i], flexShrink: 0 }} />
                {editingName === i ? (
                  <input type="text" value={p.name}
                    onChange={(e) => updateName(i, e.target.value)}
                    onBlur={() => setEditingName(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingName(null)}
                    autoFocus style={{ width: 80 }}
                  />
                ) : (
                  <span onClick={() => setEditingName(i)}
                    style={{ fontSize: 11, color: "#cbd5e1", cursor: "pointer" }}>{p.name}</span>
                )}
              </div>
            ))}
          </div>

          {/* 1 person */}
          {nbPeople === 1 && (
            <div style={{ textAlign: "center", padding: 16, color: "#64748b", fontSize: 12 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: "#f59e0b", marginBottom: 3 }}>
                {fmt(Math.round(finalCommission))} €
              </div>
              100% → {people[0].name}
            </div>
          )}

          {/* 2 people */}
          {nbPeople === 2 && (
            <div style={{ padding: "6px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>
                  <span style={{ color: COLORS[0], fontWeight: 600 }}>{people[0].name}: {people[0].pct}%</span>
                  <span style={{ color: "#64748b", marginLeft: 5, fontSize: 11 }}>{fmt(Math.round(finalCommission * people[0].pct / 100))}€</span>
                </span>
                <span style={{ fontSize: 12 }}>
                  <span style={{ color: COLORS[1], fontWeight: 600 }}>{people[1].name}: {100 - people[0].pct}%</span>
                  <span style={{ color: "#64748b", marginLeft: 5, fontSize: 11 }}>{fmt(Math.round(finalCommission * (100 - people[0].pct) / 100))}€</span>
                </span>
              </div>
              <input type="range" min={0} max={100} step={10} value={people[0].pct}
                onChange={(e) => {
                  const v = +e.target.value;
                  setPeople([{ ...people[0], pct: v }, { ...people[1], pct: 100 - v }]);
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", marginTop: 2 }}>
                <span>0%</span><span>50/50</span><span>100%</span>
              </div>
            </div>
          )}

          {/* 3+ people: spider */}
          {nbPeople >= 3 && (
            <SpiderChart people={people} onChange={updatePct} envelope={finalCommission} />
          )}

          {nbPeople >= 2 && totalPct !== 100 && (
            <div style={{
              marginTop: 8, fontSize: 11, color: "#ef4444", textAlign: "center",
              padding: "5px", background: "#ef444410", borderRadius: 5,
            }}>
              ⚠ Total = {totalPct}% — ajuster à 100%
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14, padding: "8px 12px", background: "#111827", borderRadius: 8,
          border: "1px solid #1e293b", fontSize: 10, color: "#475569", lineHeight: 1.5,
        }}>
          <strong style={{ color: "#64748b" }}>Règles :</strong> Lead froid = 0% · Déclaration avant signature ·
          Leads collectifs = pas de com individuelle · Versement à la facturation · Clic sur les noms pour modifier
        </div>
      </div>
    </div>
  );
}

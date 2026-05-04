import { useState } from "react";

function fmt(n) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const CARD_BG = "#111827";
const CARD_BORDER = "#1e293b";
const ORANGE = "#f59e0b";

function Help({ children }) {
  return (
    <div style={{
      fontSize: 11, color: "#64748b", fontStyle: "italic", lineHeight: 1.5,
      padding: "8px 10px", background: "#0a0f1a", borderLeft: `2px solid ${ORANGE}80`,
      borderRadius: 4, marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, unit, suffix }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value || 0)))}
            style={{ width: 90, fontSize: 13, fontWeight: 600 }}
          />
          <span style={{ color: "#64748b", fontSize: 12 }}>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      {suffix && <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{suffix}</div>}
    </div>
  );
}

export default function ValuationSimulator() {
  const [expert, setExpert] = useState(false);
  const [showProj, setShowProj] = useState(false);

  const [ca, setCa] = useState(150000);
  const [margePct, setMargePct] = useState(10);
  const [charges, setCharges] = useState(8000);
  const [multiple, setMultiple] = useState(4);
  const [coeffCA, setCoeffCA] = useState(0.4);
  const [ponderation, setPonderation] = useState({ anc: 30, ebitda: 40, ca: 30 });
  const [nbAssocies, setNbAssocies] = useState(6);
  const [anc, setAnc] = useState(7500);

  const [coeffGood, setCoeffGood] = useState(100);
  const [coeffInter, setCoeffInter] = useState(75);
  const [coeffBad, setCoeffBad] = useState(40);
  const [boundIB, setBoundIB] = useState(2);
  const [boundIG, setBoundIG] = useState(4);

  const [caGrowth, setCaGrowth] = useState(25);
  const [recurrentPct, setRecurrentPct] = useState(30);
  const [multipleRec, setMultipleRec] = useState(5);
  const [chargesGrowth, setChargesGrowth] = useState(10);

  const adjustPonderation = (key, newVal) => {
    const others = Object.keys(ponderation).filter(k => k !== key);
    const currentOthersSum = others.reduce((s, k) => s + ponderation[k], 0);
    const remaining = 100 - newVal;
    const ratios = others.map(k =>
      currentOthersSum > 0 ? ponderation[k] / currentOthersSum : 0.5
    );
    setPonderation({
      [key]: newVal,
      [others[0]]: Math.round(remaining * ratios[0]),
      [others[1]]: Math.round(remaining * ratios[1]),
    });
  };

  const margeTheorique = ca * (margePct / 100);
  const ebitdaNormatif = Math.max(0, margeTheorique - charges);
  const valeurANC = anc;
  const valeurEBITDA = ebitdaNormatif * multiple;
  const valeurCA = ca * coeffCA;
  const valeurSAS =
      valeurANC    * (ponderation.anc / 100)
    + valeurEBITDA * (ponderation.ebitda / 100)
    + valeurCA     * (ponderation.ca / 100);
  const prixPart = nbAssocies > 0 ? valeurSAS / nbAssocies : 0;

  const prix = {
    good: prixPart * (coeffGood / 100),
    intermediate: prixPart * (coeffInter / 100),
    bad: prixPart * (coeffBad / 100),
  };

  const projectAt = (years) => {
    const caP = ca * Math.pow(1 + caGrowth / 100, years);
    const chargesP = charges * Math.pow(1 + chargesGrowth / 100, years);
    const ebitdaP = Math.max(0, caP * (margePct / 100) - chargesP);
    const recurrent = caP * (recurrentPct / 100) * multipleRec;
    const ebitdaValueP = ebitdaP * multiple + recurrent;
    const caValueP = caP * coeffCA;
    const sasP =
        anc * (ponderation.anc / 100)
      + ebitdaValueP * (ponderation.ebitda / 100)
      + caValueP * (ponderation.ca / 100);
    const partP = nbAssocies > 0 ? sasP / nbAssocies : 0;
    return {
      ca: caP, charges: chargesP, ebitda: ebitdaP,
      recurrent, ebitdaValue: ebitdaValueP, caValue: caValueP,
      sas: sasP, part: partP,
      goodPrice: partP * (coeffGood / 100),
      deltaGoodVsToday: (partP - prixPart) * (coeffGood / 100),
      deltaSasVsToday: sasP - valeurSAS,
      multiplierVsToday: prixPart > 0 ? partP / prixPart : 0,
    };
  };
  const projN3 = projectAt(3);
  const projN5 = projectAt(5);

  const cardStyle = {
    background: CARD_BG, borderRadius: 12, padding: 18,
    marginBottom: 12, border: `1px solid ${CARD_BORDER}`,
  };

  return (
    <>
      {/* Card 1 — Hypothèses */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>Hypothèses</span>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => setExpert(false)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
              border: !expert ? `1px solid ${ORANGE}` : `1px solid ${CARD_BORDER}`,
              background: !expert ? "#f59e0b20" : "#0a0f1a",
              color: !expert ? ORANGE : "#64748b",
            }}>Simple</button>
            <button onClick={() => setExpert(true)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
              border: expert ? `1px solid ${ORANGE}` : `1px solid ${CARD_BORDER}`,
              background: expert ? "#f59e0b20" : "#0a0f1a",
              color: expert ? ORANGE : "#64748b",
            }}>Expert</button>
          </div>
        </div>

        <Help>
          Les paramètres économiques de la SAS pour aujourd'hui. Le <strong>CA</strong> est le chiffre
          d'affaires qui transite par la holding. La <strong>marge laissée</strong> est ce qui n'est
          pas redistribué en commissions (devient l'EBITDA après charges). En mode <strong>Expert</strong>,
          tu débloques le multiple, le coefficient %CA, l'ANC et la pondération des trois méthodes.
        </Help>

        <Slider label="CA total annuel SAS" min={50000} max={1000000} step={5000}
          value={ca} onChange={setCa} unit="€" />
        <Slider label="% de marge laissée dans la SAS" min={0} max={30} step={1}
          value={margePct} onChange={setMargePct} unit="%" />
        <Slider label="Charges fixes annuelles" min={0} max={50000} step={500}
          value={charges} onChange={setCharges} unit="€" />
        <Slider label="Nombre d'associés" min={2} max={8} step={1}
          value={nbAssocies} onChange={setNbAssocies} unit="pers." />

        {expert && (
          <>
            <div style={{ height: 1, background: CARD_BORDER, margin: "14px 0" }} />
            <Slider label="Multiple EBITDA appliqué" min={2} max={8} step={0.5}
              value={multiple} onChange={setMultiple} unit="×" />
            <Slider label="Coefficient % du CA" min={0.1} max={1.5} step={0.05}
              value={coeffCA} onChange={setCoeffCA} unit="× CA" />
            <Slider label="ANC (capitaux propres + tréso)" min={0} max={100000} step={500}
              value={anc} onChange={setAnc} unit="€" />

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, display: "block", marginBottom: 8 }}>
                Pondération ANC / EBITDA / %CA
              </label>
              {[
                { key: "anc", label: "ANC" },
                { key: "ebitda", label: "EBITDA × multiple" },
                { key: "ca", label: "% CA" },
              ].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 3 }}>
                    <span>{label}</span><span>{ponderation[key]}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5}
                    value={ponderation[key]}
                    onChange={(e) => adjustPonderation(key, +e.target.value)}
                  />
                </div>
              ))}
              <div style={{
                fontSize: 10, color: ponderation.anc + ponderation.ebitda + ponderation.ca === 100 ? "#22c55e" : "#ef4444",
                textAlign: "center", marginTop: 4,
              }}>
                Total : {ponderation.anc + ponderation.ebitda + ponderation.ca}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card 2 — Valorisation SAS */}
      <div style={{
        background: "linear-gradient(135deg, #1a1207, #170d07)", borderRadius: 12,
        padding: 20, marginBottom: 12, border: "1px solid #78350f",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: "#92702a", marginBottom: 2 }}>Valorisation Anatole</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: ORANGE, lineHeight: 1 }}>
              {fmt(Math.round(valeurSAS))} €
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#fbbf24" }}>{multiple}×</div>
            <div style={{ fontSize: 9, color: "#92702a" }}>EBITDA mult</div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          {[
            { label: "ANC pondéré", value: valeurANC, weight: ponderation.anc },
            { label: "EBITDA × multiple", value: valeurEBITDA, weight: ponderation.ebitda },
            { label: "CA × coefficient", value: valeurCA, weight: ponderation.ca },
          ].map((d, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", fontSize: 11,
              padding: "4px 9px", background: "#0a0f1a40", borderRadius: 5,
            }}>
              <span style={{ color: "#92702a" }}>{d.label}</span>
              <span style={{ color: "#d4a843" }}>
                {fmt(Math.round(d.value))}€ × {d.weight}%
              </span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", fontSize: 11,
            padding: "6px 9px", background: "#0a0f1a60", borderRadius: 5, marginTop: 4,
          }}>
            <span style={{ color: "#92702a" }}>Total pondéré</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>{fmt(Math.round(valeurSAS))} €</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", fontSize: 11,
            padding: "6px 9px", background: "#0a0f1a60", borderRadius: 5,
          }}>
            <span style={{ color: "#92702a" }}>Par part (1/{nbAssocies})</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>{fmt(Math.round(prixPart))} €</span>
          </div>
        </div>
      </div>

      <Help>
        <strong>Comment lire :</strong> on calcule trois valeurs en parallèle puis on en fait
        une moyenne pondérée. <strong>ANC</strong> = capitaux propres + tréso (plancher patrimonial).
        <strong> EBITDA × multiple</strong> = capacité à générer du résultat × prime de marché (3-6× pour
        un cabinet de conseil). <strong>CA × coefficient</strong> = proxy de la base clients
        (40-50 % du CA récurrent typiquement). La pondération reflète ce qui compte le plus dans
        ton modèle. Le résultat divisé par le nombre d'associés donne le prix de référence d'une part.
      </Help>

      {/* Card 3 — Prix par part selon départ */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 14 }}>
          Prix par part selon le motif de départ
        </div>
        <Help>
          Trois conditions de départ d'un associé. <strong style={{ color: "#22c55e" }}>Good leaver</strong> :
          départ négocié (retraite, maladie, accord mutuel) → 100 % du prix.
          <strong style={{ color: "#f59e0b" }}> Intermediate</strong> : départ volontaire dans des
          conditions normales → décote modérée. <strong style={{ color: "#ef4444" }}>Bad leaver</strong> :
          faute, concurrence déloyale, départ avant ancienneté minimale → forte décote.
          Les coefficients et les seuils d'ancienneté sont éditables — ce sont les paramètres
          principaux à figer dans le pacte.
        </Help>
        <div style={{ display: "grid", gap: 6 }}>
          {[
            { key: "good", label: "Good leaver", coeff: coeffGood, set: setCoeffGood, color: "#22c55e", price: prix.good },
            { key: "inter", label: "Intermediate", coeff: coeffInter, set: setCoeffInter, color: "#f59e0b", price: prix.intermediate },
            { key: "bad", label: "Bad leaver", coeff: coeffBad, set: setCoeffBad, color: "#ef4444", price: prix.bad },
          ].map(row => (
            <div key={row.key} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: "#0a0f1a", borderRadius: 6, border: `1px solid ${CARD_BORDER}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{row.label}</span>
              <input type="number" min={0} max={100} step={5}
                value={row.coeff}
                onChange={(e) => row.set(Math.max(0, Math.min(100, +e.target.value || 0)))}
                style={{ width: 60, fontSize: 11, padding: "3px 5px" }}
              />
              <span style={{ fontSize: 10, color: "#64748b" }}>%</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: row.color, minWidth: 90, textAlign: "right" }}>
                {fmt(Math.round(row.price))} €
              </span>
            </div>
          ))}
        </div>

        {/* Time frieze */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Ancienneté requise</div>
          <svg viewBox="0 0 600 80" style={{ width: "100%", display: "block" }}>
            {(() => {
              const maxYears = Math.max(boundIG + 2, 6);
              const toX = (y) => 20 + (y / maxYears) * 560;
              return (
                <>
                  <rect x={toX(0)} y={30} width={toX(boundIB) - toX(0)} height={20}
                    fill="#ef444430" stroke="#ef4444" strokeWidth={1} />
                  <rect x={toX(boundIB)} y={30} width={toX(boundIG) - toX(boundIB)} height={20}
                    fill="#f59e0b30" stroke="#f59e0b" strokeWidth={1} />
                  <rect x={toX(boundIG)} y={30} width={toX(maxYears) - toX(boundIG)} height={20}
                    fill="#22c55e30" stroke="#22c55e" strokeWidth={1} />
                  <text x={(toX(0) + toX(boundIB)) / 2} y={45} textAnchor="middle"
                    fill="#ef4444" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>Bad</text>
                  <text x={(toX(boundIB) + toX(boundIG)) / 2} y={45} textAnchor="middle"
                    fill="#f59e0b" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>Intermediate</text>
                  <text x={(toX(boundIG) + toX(maxYears)) / 2} y={45} textAnchor="middle"
                    fill="#22c55e" fontSize={10} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>Good</text>
                  {[0, boundIB, boundIG, maxYears].map((y, i) => (
                    <g key={i}>
                      <line x1={toX(y)} x2={toX(y)} y1={25} y2={55} stroke="#475569" strokeWidth={0.5} />
                      <text x={toX(y)} y={70} textAnchor="middle" fill="#64748b" fontSize={9}
                        fontFamily="'JetBrains Mono', monospace">{y} an{y > 1 ? "s" : ""}</text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
          <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>Bad → Inter :</span>
              <input type="number" min={0} max={boundIG - 0.5} step={0.5}
                value={boundIB}
                onChange={(e) => setBoundIB(Math.max(0, Math.min(boundIG - 0.5, +e.target.value || 0)))}
                style={{ width: 55, fontSize: 11, padding: "3px 5px" }} />
              <span style={{ fontSize: 10, color: "#64748b" }}>ans</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>Inter → Good :</span>
              <input type="number" min={boundIB + 0.5} max={20} step={0.5}
                value={boundIG}
                onChange={(e) => setBoundIG(Math.max(boundIB + 0.5, Math.min(20, +e.target.value || 0)))}
                style={{ width: 55, fontSize: 11, padding: "3px 5px" }} />
              <span style={{ fontSize: 10, color: "#64748b" }}>ans</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 4 — Projection N+3 / N+5 */}
      <div style={cardStyle}>
        <button onClick={() => setShowProj(!showProj)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "transparent", border: "none", color: "#cbd5e1", fontSize: 13,
          fontWeight: 600, fontFamily: "inherit", cursor: "pointer", padding: 0,
        }}>
          <span>Projection à 3 ans et 5 ans</span>
          <span style={{ color: "#64748b", fontSize: 14 }}>{showProj ? "▾" : "▸"}</span>
        </button>

        {showProj && (
          <div style={{ marginTop: 14 }}>
            <Help>
              On projette le CA en croissance composée annuelle, on applique la même structure
              de coûts (avec inflation des charges), et on capitalise une part <strong>récurrente</strong>
              qui mérite un multiple plus élevé qu'un revenu projet ponctuel — c'est le levier
              pour faire monter la valo. Le tableau compare N+3 et N+5 vs aujourd'hui.
            </Help>

            <Slider label="Croissance annuelle du CA" min={0} max={50} step={1}
              value={caGrowth} onChange={setCaGrowth} unit="%/an" />
            <Slider label="Croissance annuelle des charges" min={0} max={30} step={1}
              value={chargesGrowth} onChange={setChargesGrowth} unit="%/an" />
            <Slider label="% de récurrent dans le CA cible" min={0} max={60} step={1}
              value={recurrentPct} onChange={setRecurrentPct} unit="%" />
            <Slider label="Multiple sur part récurrente" min={4} max={8} step={0.5}
              value={multipleRec} onChange={setMultipleRec} unit="×" />

            {/* Comparison table: today | N+3 | N+5 */}
            <div style={{
              background: "#0a0f1a", borderRadius: 8, padding: 14, marginTop: 14,
              border: `1px solid ${CARD_BORDER}`,
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 8,
                fontSize: 11, alignItems: "center",
              }}>
                <div style={{ color: "#64748b", fontWeight: 600 }}></div>
                <div style={{ color: "#92702a", fontWeight: 600, textAlign: "right" }}>Aujourd'hui</div>
                <div style={{ color: "#fbbf24", fontWeight: 600, textAlign: "right" }}>N+3</div>
                <div style={{ color: "#22c55e", fontWeight: 600, textAlign: "right" }}>N+5</div>

                {[
                  { label: "CA", today: ca, n3: projN3.ca, n5: projN5.ca, unit: "€" },
                  { label: "EBITDA normatif", today: ebitdaNormatif, n3: projN3.ebitda, n5: projN5.ebitda, unit: "€" },
                  { label: "Récurrent capitalisé", today: 0, n3: projN3.recurrent, n5: projN5.recurrent, unit: "€" },
                  { label: "Valorisation SAS", today: valeurSAS, n3: projN3.sas, n5: projN5.sas, unit: "€", bold: true },
                  { label: "Prix par part", today: prixPart, n3: projN3.part, n5: projN5.part, unit: "€", bold: true },
                  { label: "Good leaver / part", today: prix.good, n3: projN3.goodPrice, n5: projN5.goodPrice, unit: "€" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "contents" }}>
                    <div style={{ color: row.bold ? "#cbd5e1" : "#94a3b8", fontWeight: row.bold ? 600 : 400 }}>{row.label}</div>
                    <div style={{ textAlign: "right", color: "#64748b", fontWeight: row.bold ? 600 : 400 }}>
                      {fmt(Math.round(row.today))} {row.unit}
                    </div>
                    <div style={{ textAlign: "right", color: "#fbbf24", fontWeight: row.bold ? 700 : 500 }}>
                      {fmt(Math.round(row.n3))} {row.unit}
                    </div>
                    <div style={{ textAlign: "right", color: "#22c55e", fontWeight: row.bold ? 700 : 500 }}>
                      {fmt(Math.round(row.n5))} {row.unit}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: CARD_BORDER, margin: "12px 0" }} />

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              }}>
                <div style={{
                  padding: 10, background: "#0a0f1a", borderRadius: 6,
                  border: "1px solid #92702a40",
                }}>
                  <div style={{ fontSize: 10, color: "#fbbf24", marginBottom: 4 }}>Δ N+3 (good leaver)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>
                    {projN3.deltaGoodVsToday >= 0 ? "+" : ""}{fmt(Math.round(projN3.deltaGoodVsToday))} € / part
                  </div>
                  <div style={{ fontSize: 9, color: "#92702a", marginTop: 3 }}>
                    ×{projN3.multiplierVsToday.toFixed(2)} vs aujourd'hui
                  </div>
                </div>
                <div style={{
                  padding: 10, background: "#0a0f1a", borderRadius: 6,
                  border: "1px solid #22c55e40",
                }}>
                  <div style={{ fontSize: 10, color: "#22c55e", marginBottom: 4 }}>Δ N+5 (good leaver)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                    {projN5.deltaGoodVsToday >= 0 ? "+" : ""}{fmt(Math.round(projN5.deltaGoodVsToday))} € / part
                  </div>
                  <div style={{ fontSize: 9, color: "#16a34a", marginTop: 3 }}>
                    ×{projN5.multiplierVsToday.toFixed(2)} vs aujourd'hui
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 12, padding: "8px 10px", background: "#0a0f1a",
                borderRadius: 5, fontSize: 10, color: "#64748b", lineHeight: 1.5,
                fontStyle: "italic",
              }}>
                <strong style={{ color: "#94a3b8" }}>Lecture :</strong> à {caGrowth}%/an de
                croissance, le CA passe de {fmt(Math.round(ca))}€ à {fmt(Math.round(projN5.ca))}€ en 5 ans.
                Le multiple sur la part récurrente ({multipleRec}×) capitalise les abonnements/contrats
                cadres comme un actif, ce qui amplifie la valo bien plus que le multiple EBITDA seul.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 14, padding: "8px 12px", background: CARD_BG, borderRadius: 8,
        border: `1px solid ${CARD_BORDER}`, fontSize: 10, color: "#475569", lineHeight: 1.5,
      }}>
        <strong style={{ color: "#64748b" }}>Méthode :</strong> EBITDA normatif retraité × multiple, pondéré
        avec ANC et % du CA. Standard de marché pour structures dont le résultat affiché ne reflète pas la
        réalité économique. <strong style={{ color: "#64748b" }}>Avertissement :</strong> ce simulateur est
        un outil de discussion. La rédaction finale du pacte d'associés doit être validée par un avocat en
        droit des sociétés.
      </div>
    </>
  );
}

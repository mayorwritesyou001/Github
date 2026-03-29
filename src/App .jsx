import { useState, useCallback, useEffect, useRef } from 'react'

// ─── Brand tokens ────────────────────────────────────────────────────────────
// Gestalt Similarity: every component pulls from ONE token set
const C = {
  bg:          '#0D0804',
  bgDeep:      '#080502',
  green:       '#284D34',
  greenLight:  '#41965A',
  greenGlow:   'rgba(65,150,90,0.07)',
  gold:        '#C6802C',
  goldLight:   '#E09A3A',
  goldGlow:    'rgba(198,128,44,0.06)',
  cream:       '#F8F4EC',
  muted:       '#7A6455',
  mutedLight:  '#A08070',
  card:        'rgba(255,255,255,0.032)',
  cardHover:   'rgba(255,255,255,0.055)',
  border:      'rgba(198,128,44,0.15)',
  borderGreen: 'rgba(65,150,90,0.22)',
  warn:        '#D4783A',
  warnBg:      'rgba(212,120,58,0.07)',
  warnBorder:  'rgba(212,120,58,0.25)',
}

// Typography scale — Visual Order: size encodes importance
const F = {
  display: "'Georgia', 'Times New Roman', serif",
  body:    "system-ui, -apple-system, 'Segoe UI', sans-serif",
  // sizes
  hero:    'clamp(2.4rem, 5vw, 3.8rem)',
  h1:      '1.75rem',
  h2:      '1.05rem',
  body1:   '0.92rem',
  body2:   '0.84rem',
  caption: '0.72rem',
}

// ─── Sample CSV ───────────────────────────────────────────────────────────────
const SAMPLE_CSV = `Fecha;Artículo;Familia;Uds;Precio Unit;Total;IVA
08/01/2025;Café con leche;Bebidas;24;1,80€;43,20€;10%
08/01/2025;Croissant;Bollería;18;2,20€;39,60€;10%
08/01/2025;ANULACIÓN;Bebidas;-1;1,80€;-1,80€;10%
08/01/2025;Menú mediodía;Cocina;12;11,50€;138,00€;10%
08/01/2025;Propina;;1;;3,50€;
09/01/2025;café con leche;Bebidas;19;1,80€;34,20€;10%
09/01/2025;Tostada con tomate;Desayunos;22;2,50€;55,00€;10%
09/01/2025;Zumo de naranja;Bebidas;8;3,20€;25,60€;10%
09/01/2025;DEVOLUCIÓN;Cocina;-1;11,50€;-11,50€;10%
10/01/2025;Café solo;Bebidas;31;1,50€;46,50€;10%
10/01/2025;Croissant;Bollería;14;2,20€;30,80€;10%
10/01/2025;Bocadillo jamón;Cocina;9;5,80€;52,20€;10%
10/01/2025;Propina;;1;;2,00€;
11/01/2025;Café con leche;Bebidas;28;1,80€;50,40€;10%
11/01/2025;CAFÉ CON LECHE;Bebidas;3;1,80€;5,40€;10%
11/01/2025;Croissant;Bollería;22;2,20€;48,40€;10%
11/01/2025;Menú mediodía;Cocina;15;11,50€;172,50€;10%
11/01/2025;Zumo de naranja;Bebidas;11;3,20€;35,20€;10%
12/01/2025;Café solo;Bebidas;18;1,50€;27,00€;10%
12/01/2025;Tostada con tomate;Desayunos;31;2,50€;77,50€;10%
12/01/2025;Croissant;Bollería;9;2,20€;19,80€;10%
12/01/2025;VOID;Cocina;-1;11,50€;-11,50€;10%
12/01/2025;Bocadillo jamón;Cocina;14;5,80€;81,20€;10%
13/01/2025;Café con leche;Bebidas;42;1,80€;75,60€;10%
13/01/2025;Croissant;Bollería;38;2,20€;83,60€;10%
13/01/2025;Menú mediodía;Cocina;21;11,50€;241,50€;10%
13/01/2025;Tostada con tomate;Desayunos;18;2,50€;45,00€;10%
13/01/2025;Zumo de naranja;Bebidas;14;3,20€;44,80€;10%
14/01/2025;Café con leche;Bebidas;45;1,80€;81,00€;10%
14/01/2025;Croissant;Bollería;41;2,20€;90,20€;10%
14/01/2025;Menú mediodía;Cocina;24;11,50€;276,00€;10%
14/01/2025;Bocadillo jamón;Cocina;19;5,80€;110,20€;10%
14/01/2025;Propina;;1;;4,00€;`

// ─── System prompt (unchanged) ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a business analyst for small independent businesses — cafés, bakeries, restaurants — in Spain and Latin America.

The owner has uploaded a sales CSV exported from their POS system.
The file may be in Spanish, Catalan, or English.

STEP 1 — IDENTIFY COLUMNS
Column names vary by POS system. Identify by meaning not name:
- Date: "Fecha", "Date", "Data", "Día", "Timestamp"
- Product: "Artículo", "Producto", "Item", "Description", "Descripció", "Artículo/Servicio"
- Quantity: "Uds", "Cantidad", "Qty", "Quantity", "Unidades"
- Unit price: "Precio Unit", "Price", "Preu", "Precio"
- Revenue: "Total", "Importe", "Amount", "Vendes", "Subtotal"
- Category: "Familia", "Category", "Categoría" — use if present
- TAX: "IVA", "VAT", "Tax" — IGNORE COMPLETELY, never include in calculations

STEP 2 — CLEAN THE DATA BEFORE ANALYSING
Remove these rows entirely:
- Any row where product name contains: ANULACIÓN, DEVOLUCIÓN, REFUND, VOID, Propina, Tip, Descuento, Discount, CANCELACIÓN
- Any row where Total/revenue is negative or zero
- Any row with no date
- Any row with no product name

Fix these formatting issues:
- Numbers: strip €, $, £ symbols. Replace , with . for decimals
- Dates: parse DD/MM/YYYY or MM/DD/YYYY or YYYY-MM-DD
- Product names: normalise to Title Case for grouping

STEP 3 — ANALYSE
After cleaning, analyse what remains.

STEP 4 — RETURN JSON ONLY
Return ONLY this JSON structure. No markdown. No backticks. No explanation before or after. Pure JSON only.

{
  "businessType": "short description of the business",
  "summary": "2 sentence plain-English overview of performance",
  "totalRevenue": number,
  "totalTransactions": number,
  "dateRange": "e.g. 8 Jan – 14 Jan 2025",
  "topInsights": [
    { "emoji": "emoji", "title": "short title", "detail": "1-2 sentence specific insight with real numbers" }
  ],
  "topItems": [
    { "name": "product name", "revenue": number, "quantity": number, "percentOfTotal": number }
  ],
  "recommendations": [
    { "emoji": "emoji", "action": "short action title", "reason": "specific reason with numbers from the data" }
  ],
  "peakDay": "best performing day with revenue figure",
  "quietestDay": "worst performing day with revenue figure",
  "warning": "one specific concern or null if none"
}

Rules:
- topInsights: exactly 4 items
- topItems: exactly 5 items, sorted by revenue descending
- recommendations: exactly 3 items
- All revenue figures in euros with 2 decimal places
- Speak directly to the owner in plain language
- Be specific — use real numbers from the data
- Never say "it appears" or "it seems" — state facts directly`

// ─── CSV parser (unchanged logic) ────────────────────────────────────────────
const parseCSV = (text) => {
  const firstLine = text.split('\n')[0]
  const separator = firstLine.includes(';') ? ';' : ','
  const lines = text.trim().split('\n')
  const normalized = lines
    .map(line => line.split(separator).map(col => col.trim().replace(/^"|"$/g, '')).join(','))
    .join('\n')
  return normalized.split('\n').slice(0, 300).join('\n')
}

// ─── API call (unchanged logic) ───────────────────────────────────────────────
const analyzeWithClaude = async (csvText) => {
  const response = await fetch('/api/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse this sales CSV from a Barcelona café and return the JSON insights.\n\n${csvText}` }],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  const raw = data.content.map(b => b.type === 'text' ? b.text : '').join('')
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}

// ─── Shared component atoms ──────────────────────────────────────────────────
// Gestalt Similarity: reused across all result sections

function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: F.body,
      fontSize: F.caption,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: C.gold,
      marginBottom: '14px',
      marginTop: 0,
    }}>
      {children}
    </p>
  )
}

// Card — Gestalt Common Region: groups related content visually
function Card({ children, style = {}, accent = null }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '8px',
      padding: '20px 24px',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── UPLOAD SCREEN ───────────────────────────────────────────────────────────
// UCD Structure: one clear path — upload or sample
// Gestalt Closure: dropzone is a clearly bounded region
function UploadScreen({ onFile, onSample, error }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>

      {/* Hero — Visual Order: largest element = most important message */}
      <p style={{
        fontFamily: F.body,
        fontSize: F.caption,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: C.gold,
        marginBottom: '16px',
      }}>
        Análisis de ventas · Barcelona
      </p>

      <h1 style={{
        fontFamily: F.display,
        fontSize: F.hero,
        fontWeight: 'normal',
        lineHeight: 1.1,
        letterSpacing: '-0.025em',
        color: C.cream,
        marginBottom: '20px',
        marginTop: 0,
      }}>
        Sube tu CSV.<br />
        <span style={{ color: C.gold }}>Recibe respuestas.</span>
      </h1>

      {/* Body copy — Typography body level */}
      <p style={{
        fontFamily: F.body,
        fontSize: F.body1,
        color: C.muted,
        lineHeight: 1.75,
        maxWidth: 440,
        margin: '0 auto 48px',
      }}>
        Exporta tu informe de ventas de Revo, SumUp o cualquier TPV.
        En menos de un minuto sabrás qué está pasando en tu negocio —
        en lenguaje normal, sin dashboards.
      </p>

      {/* Error — Gestalt Figure/Ground: red breaks from dark background */}
      {error && (
        <div style={{
          background: 'rgba(200,60,60,0.1)',
          border: '1px solid rgba(200,60,60,0.3)',
          borderRadius: '8px',
          padding: '14px 20px',
          color: '#F09090',
          fontSize: F.body2,
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          {error}
        </div>
      )}

      {/* Drop zone — Gestalt Closure: clearly bounded target */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `2px dashed ${dragging ? C.goldLight : C.border}`,
          borderRadius: '12px',
          padding: '52px 32px',
          cursor: 'pointer',
          background: dragging ? C.greenGlow : C.goldGlow,
          transition: 'all 0.2s',
          marginBottom: '16px',
        }}
      >
        {/* Icon — Scale: large enough to read as CTA anchor */}
        <div style={{ fontSize: '2.6rem', marginBottom: '14px' }}>📂</div>

        {/* CTA — Typography CTA level */}
        <p style={{
          fontFamily: F.display,
          fontSize: '1.1rem',
          color: C.cream,
          marginBottom: '8px',
          marginTop: 0,
        }}>
          Arrastra tu archivo CSV aquí
        </p>
        <p style={{ fontSize: F.caption, color: C.muted, marginBottom: '24px', marginTop: 0 }}>
          o haz clic para seleccionar
        </p>

        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          style={{
            background: C.gold,
            color: '#0D0804',
            border: 'none',
            borderRadius: '6px',
            padding: '11px 28px',
            fontSize: F.body2,
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: F.body,
            letterSpacing: '0.02em',
          }}
        >
          Elegir archivo CSV
        </button>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onFile(f) }} />
      </div>

      {/* Law of Continuity: divider line with text at midpoint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: F.caption, color: C.muted }}>o</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* Secondary action — lower visual weight than primary */}
      <button
        onClick={onSample}
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${C.border}`,
          borderRadius: '6px',
          padding: '11px',
          fontSize: F.body2,
          color: C.mutedLight,
          cursor: 'pointer',
          fontFamily: F.body,
          transition: 'all 0.18s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.cream }}
        onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mutedLight }}
      >
        Probar con datos de muestra de una cafetería →
      </button>

      {/* Caption — lowest visual weight */}
      <p style={{ fontSize: F.caption, color: C.muted, marginTop: '28px', lineHeight: 1.6 }}>
        Compatible con Revo · SumUp · Zettle · Glop · cualquier TPV<br />
        Tu archivo se procesa y se descarta. No almacenamos ningún dato.
      </p>
    </div>
  )
}

// ─── ANALYSING SCREEN ────────────────────────────────────────────────────────
// UX: single focus — one element, no decisions to make
// Law of Continuity: progress bar is a single unbroken line
function AnalyzingScreen({ progress }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: '24px' }}>🔍</div>

      <h2 style={{
        fontFamily: F.display,
        fontSize: F.h1,
        fontWeight: 'normal',
        color: C.cream,
        marginBottom: '10px',
        marginTop: 0,
      }}>
        Analizando tus datos…
      </h2>

      <p style={{ fontSize: F.body2, color: C.muted, marginBottom: '36px' }}>
        Leyendo tus datos de ventas
      </p>

      {/* Progress — Law of Continuity */}
      <div style={{
        height: '3px',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '2px',
        overflow: 'hidden',
        maxWidth: '360px',
        margin: '0 auto 10px',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${C.green}, ${C.gold})`,
          borderRadius: '2px',
          transition: 'width 0.4s ease',
        }} />
      </div>

      <p style={{ fontSize: F.caption, color: C.muted }}>{Math.round(progress)}%</p>
    </div>
  )
}

// ─── RESULTS SCREEN ──────────────────────────────────────────────────────────
// Visual Order: Revenue is the hero — largest element on screen
// Gestalt Proximity: 9 clearly separated zones
// Gestalt Similarity: every insight card identical, every rec card identical
// Typography: full headline → body → CTA → caption hierarchy
function ResultsScreen({ data, onReset }) {
  const {
    businessType, summary, totalRevenue, totalTransactions,
    dateRange, topInsights, topItems, recommendations,
    peakDay, quietestDay, warning,
  } = data

  const fmt = (n) => typeof n === 'number'
    ? `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : n

  const maxRev = topItems ? Math.max(...topItems.map(i => i.revenue)) : 1

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── ZONE 1: Identity strip — Caption level */}
      {/* Gestalt Proximity: file type badge + date sit together at top */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '20px',
        marginBottom: '36px',
        borderBottom: `1px solid ${C.border}`,
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <span style={{
          background: C.green,
          color: C.cream,
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: F.caption,
          letterSpacing: '0.04em',
        }}>
          {businessType}
        </span>
        <span style={{ fontSize: F.caption, color: C.muted }}>{dateRange}</span>
      </div>

      {/* ── ZONE 2: Hero revenue — Visual Order Scale principle */}
      {/* THE most important number. Largest element. Commands attention first. */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{ fontSize: F.caption, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', marginTop: 0 }}>
          Ingresos totales
        </p>
        <div style={{
          fontFamily: F.display,
          fontSize: F.hero,
          color: C.gold,
          lineHeight: 1,
          marginBottom: '12px',
        }}>
          {fmt(totalRevenue)}
        </div>
        <p style={{ fontSize: F.body2, color: C.muted, margin: 0 }}>
          {totalTransactions?.toLocaleString('de-DE')} transacciones
        </p>
      </div>

      {/* ── ZONE 3: Summary — Body level, Common Region card */}
      <Card style={{ marginBottom: '16px', borderColor: C.borderGreen }}>
        <p style={{
          fontFamily: F.body,
          fontSize: F.body1,
          color: C.cream,
          lineHeight: 1.75,
          margin: 0,
        }}>
          {summary}
        </p>
      </Card>

      {/* ── ZONE 4: Peak vs Quiet — Gestalt Similarity: two equal sibling cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '44px',
      }}>
        {[
          { label: 'Mejor día', value: peakDay, icon: '📈', col: C.greenLight },
          { label: 'Día más flojo', value: quietestDay, icon: '📉', col: C.muted },
        ].map(({ label, value, icon, col }) => (
          <Card key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{icon}</div>
            <p style={{ fontSize: F.caption, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', marginTop: 0 }}>
              {label}
            </p>
            <p style={{ fontSize: F.body2, color: col, margin: 0, lineHeight: 1.5 }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* ── ZONE 5: Key Insights — Gestalt Similarity: 4 identical cards */}
      {/* Each card: emoji anchor → h2 title → body detail */}
      <SectionLabel>Lo que encontramos</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '44px',
      }}>
        {topInsights?.map((ins, i) => (
          <Card key={i} style={{ cursor: 'default' }}>
            {/* Gestalt Figure/Ground: emoji as visual anchor against dark card */}
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '10px' }}>{ins.emoji}</span>
            {/* Typography: H2 → body */}
            <p style={{
              fontFamily: F.display,
              fontSize: F.h2,
              color: C.gold,
              marginBottom: '8px',
              marginTop: 0,
            }}>
              {ins.title}
            </p>
            <p style={{ fontSize: F.body2, color: C.cream, lineHeight: 1.6, margin: 0 }}>
              {ins.detail}
            </p>
          </Card>
        ))}
      </div>

      {/* ── ZONE 6: Top items — Value principle: bar encodes revenue visually */}
      {/* Distance + Scale: bar length is proportional to revenue */}
      <SectionLabel>Top 5 productos</SectionLabel>
      <Card style={{ marginBottom: '44px', padding: '8px 24px' }}>
        {topItems?.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 0',
            borderBottom: i < topItems.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            {/* Rank — caption scale, lowest weight */}
            <span style={{ fontSize: F.caption, color: C.muted, width: 18, flexShrink: 0, textAlign: 'right' }}>
              {i + 1}
            </span>
            {/* Name — body level */}
            <span style={{ fontSize: F.body2, color: C.cream, flex: '0 0 155px' }}>
              {item.name}
            </span>
            {/* Bar — visual value encoding */}
            <div style={{
              flex: 1,
              height: '5px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(item.revenue / maxRev) * 100}%`,
                background: `linear-gradient(90deg, ${C.green}, ${C.greenLight})`,
                borderRadius: '3px',
                transition: 'width 0.7s ease',
              }} />
            </div>
            {/* Revenue — gold, mid weight */}
            <span style={{ fontSize: F.body2, color: C.gold, width: 80, textAlign: 'right', flexShrink: 0 }}>
              {fmt(item.revenue)}
            </span>
            {/* Units — caption, lowest weight */}
            <span style={{ fontSize: F.caption, color: C.muted, width: 50, textAlign: 'right', flexShrink: 0 }}>
              {item.quantity} uds
            </span>
          </div>
        ))}
      </Card>

      {/* ── ZONE 7: Recommendations — CTA level, left accent border */}
      {/* Gestalt Similarity: 3 identical action cards */}
      <SectionLabel>Qué hacer esta semana</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '44px' }}>
        {recommendations?.map((rec, i) => (
          <Card key={i} accent={C.gold} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1.3 }}>{rec.emoji}</span>
            <div>
              {/* CTA level — Typography hierarchy */}
              <p style={{
                fontFamily: F.display,
                fontSize: F.h2,
                color: C.cream,
                marginBottom: '6px',
                marginTop: 0,
              }}>
                {rec.action}
              </p>
              <p style={{ fontSize: F.body2, color: C.muted, lineHeight: 1.65, margin: 0 }}>
                {rec.reason}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── ZONE 8: Warning — deliberately breaks colour Similarity */}
      {/* Gestalt Figure/Ground: amber against dark = immediate attention */}
      {warning && warning !== 'null' && (
        <div style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
          background: C.warnBg,
          border: `1px solid ${C.warnBorder}`,
          borderRadius: '8px',
          padding: '18px 22px',
          marginBottom: '44px',
        }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: F.body2, color: C.warn, lineHeight: 1.65, margin: 0 }}>
            {warning}
          </p>
        </div>
      )}

      {/* ── ZONE 9: Reset — Caption level, least visual weight on screen */}
      <div style={{
        textAlign: 'center',
        paddingTop: '28px',
        borderTop: `1px solid ${C.border}`,
      }}>
        <button
          onClick={onReset}
          style={{
            background: 'transparent',
            border: `1px solid rgba(122,100,85,0.4)`,
            borderRadius: '6px',
            padding: '10px 26px',
            fontSize: F.body2,
            color: C.muted,
            cursor: 'pointer',
            fontFamily: F.body,
            transition: 'all 0.18s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.cream }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(122,100,85,0.4)'; e.currentTarget.style.color = C.muted }}
        >
          ↑ Analizar otro archivo
        </button>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState('upload')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (stage !== 'analyzing') return
    setProgress(5)
    const timers = [
      setTimeout(() => setProgress(20), 400),
      setTimeout(() => setProgress(45), 1200),
      setTimeout(() => setProgress(70), 2800),
      setTimeout(() => setProgress(88), 5000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [stage])

  const runAnalysis = async (csvText) => {
    setError(null)
    setStage('analyzing')
    setProgress(5)
    let parsed = null
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try { parsed = await analyzeWithClaude(csvText); break }
      catch (err) { lastErr = err; if (attempt === 0 && err instanceof SyntaxError) continue; break }
    }
    if (parsed) {
      setProgress(100)
      setTimeout(() => { setResults(parsed); setStage('results') }, 300)
    } else {
      setStage('upload')
      setError('Algo salió mal. Inténtalo de nuevo.')
      console.error(lastErr)
    }
  }

  const handleFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) { setError('Por favor sube un archivo .csv'); return }
    if (file.size > 5 * 1024 * 1024) { setError('El archivo es demasiado grande. Exporta solo las últimas 4 semanas.'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      if (!text || !text.trim()) { setError('El archivo está vacío'); return }
      const csv = parseCSV(text)
      if (csv.split('\n').filter(Boolean).length < 2) { setError('No pudimos leer este archivo. ¿Puedes exportarlo de nuevo desde tu TPV?'); return }
      runAnalysis(csv)
    }
    reader.onerror = () => setError('No pudimos leer este archivo.')
    reader.readAsText(file, 'UTF-8')
  }

  const handleSample = () => { setError(null); runAnalysis(parseCSV(SAMPLE_CSV)) }
  const handleReset = () => { setStage('upload'); setResults(null); setError(null); setProgress(0) }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.bg,
      color: C.cream,
      fontFamily: F.body,
      margin: 0,
      padding: 0,
    }}>

      {/* ── NAV — sticky, minimal, caption-level text */}
      {/* Gestalt Common Region: contained strip separates nav from content */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(13,8,4,0.92)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          fontFamily: F.display,
          fontSize: '1.05rem',
          letterSpacing: '-0.01em',
          color: C.cream,
        }}>
          Data <span style={{ color: C.gold }}>Everywhere</span>
        </span>
        <span style={{ fontSize: F.caption, color: C.muted }}>
          Revo · SumUp · Zettle · Glop
        </span>
      </header>

      {/* ── STAGE ROUTER */}
      {stage === 'upload'    && <UploadScreen    onFile={handleFile} onSample={handleSample} error={error} />}
      {stage === 'analyzing' && <AnalyzingScreen progress={progress} />}
      {stage === 'results'   && results && <ResultsScreen data={results} onReset={handleReset} />}
    </div>
  )
}

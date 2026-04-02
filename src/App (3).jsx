import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

// Inject Google Fonts
if (typeof document !== 'undefined' && !document.getElementById('de-fonts')) {
  const link = document.createElement('link')
  link.id = 'de-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap'
  document.head.appendChild(link)
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:          '#0A0602',
  green:       '#1E4D2B',
  greenMid:    '#2D7040',
  greenBright: '#3D9955',
  gold:        '#B8741E',
  goldLight:   '#D4924A',
  goldGlow:    '#E8A85C',
  cream:       '#F5F0E8',
  muted:       '#6B5A48',
  mutedLight:  '#8A7260',
  border:      'rgba(184,116,30,0.14)',
  borderGreen: 'rgba(61,153,85,0.2)',
  cardBg:      'rgba(255,255,255,0.025)',
  warnBg:      'rgba(180,90,30,0.08)',
  warnBorder:  'rgba(180,90,30,0.22)',
  errorBg:     'rgba(160,50,50,0.1)',
  errorBorder: 'rgba(160,50,50,0.25)',
  errorText:   '#C07070',
  fontDisplay: "'Playfair Display', Georgia, serif",
  fontBody:    "'DM Sans', system-ui, -apple-system, sans-serif",
}

// ── Sample CSV (clean, no special characters) ─────────────────────────────────
const SAMPLE_CSV = `Fecha;Articulo;Familia;Uds;Precio Unit;Total;IVA
02/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
02/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
02/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
02/03/2025;Tostada con tomate;Desayunos;1;2.50;2.50;10%
02/03/2025;Cafe solo;Bebidas;1;1.50;1.50;10%
02/03/2025;Zumo de naranja;Bebidas;1;3.20;3.20;10%
02/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
02/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
02/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
02/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
02/03/2025;Refresco lata;Bebidas;1;2.20;2.20;10%
02/03/2025;Agua mineral;Bebidas;1;1.50;1.50;10%
02/03/2025;Pincho de tortilla;Cocina;1;3.50;3.50;10%
02/03/2025;Cortado;Bebidas;1;1.60;1.60;10%
03/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
03/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
03/03/2025;ANULACION;Bebidas;-1;1.80;-1.80;10%
03/03/2025;Tostada con tomate;Desayunos;1;2.50;2.50;10%
03/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
03/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
03/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
03/03/2025;Cortado;Bebidas;1;1.60;1.60;10%
04/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
04/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
04/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
04/03/2025;DEVOLUCION;Cocina;-1;11.50;-11.50;10%
04/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
04/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
04/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
04/03/2025;Bocadillo mixto;Cocina;1;4.50;4.50;10%
05/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
05/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
05/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
05/03/2025;Tostada con tomate;Desayunos;1;2.50;2.50;10%
05/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
05/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
05/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
05/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
05/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
06/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
06/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
06/03/2025;Tostada con tomate;Desayunos;1;2.50;2.50;10%
06/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
06/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
06/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
06/03/2025;Refresco lata;Bebidas;1;2.20;2.20;10%
06/03/2025;Agua mineral;Bebidas;1;1.50;1.50;10%
07/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
07/03/2025;Cafe con leche;Bebidas;1;1.80;1.80;10%
07/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
07/03/2025;Croissant mantequilla;Bolleria;1;2.20;2.20;10%
07/03/2025;Tostada con tomate;Desayunos;1;2.50;2.50;10%
07/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
07/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
07/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
07/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
07/03/2025;Menu mediodia;Cocina;1;11.50;11.50;10%
07/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
07/03/2025;Bocadillo jamon;Cocina;1;5.80;5.80;10%
07/03/2025;Zumo de naranja;Bebidas;1;3.20;3.20;10%
07/03/2025;Refresco lata;Bebidas;1;2.20;2.20;10%`

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a business analyst for small independent businesses in Spain.

The owner has uploaded a sales CSV from their POS system. It may be in Spanish, Catalan, or English.

STEP 1 - IDENTIFY COLUMNS
Find these columns regardless of their exact name:
- Date: Fecha, Date, Data, Dia
- Product: Articulo, Producto, Item, Description
- Quantity: Uds, Cantidad, Qty, Quantity, Unidades
- Revenue: Total, Importe, Amount, Vendes, Subtotal
- TAX: IVA, VAT, Tax - IGNORE COMPLETELY

STEP 2 - CLEAN DATA
Remove rows where product name contains: ANULACION, DEVOLUCION, REFUND, VOID, Propina, Tip, Descuento, CANCELACION
Remove rows where revenue is negative or zero
Remove rows with no date or no product name
Normalise product names to Title Case for grouping

STEP 3 - RETURN JSON ONLY
Return ONLY valid JSON with no markdown and no text before or after.

{
  "businessType": "string",
  "summary": "2 sentence overview in plain language",
  "totalRevenue": number,
  "totalTransactions": number,
  "dateRange": "string",
  "topInsights": [
    { "title": "string", "detail": "string" }
  ],
  "topItems": [
    { "name": "string", "revenue": number, "quantity": number, "percentOfTotal": number }
  ],
  "recommendations": [
    { "action": "string", "reason": "string" }
  ],
  "peakDay": "string",
  "quietestDay": "string",
  "warning": "string or null"
}

Rules:
- topInsights exactly 4 items
- topItems exactly 5 items sorted by revenue descending
- recommendations exactly 3 items
- Revenue in euros 2 decimal places
- Speak directly to the owner using real numbers
- Never use the words appears or seems`

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const firstLine = text.split('\n')[0]
  const sep = firstLine.includes(';') ? ';' : ','
  return text
    .trim()
    .split('\n')
    .slice(0, 300)
    .map(line =>
      line.split(sep).map(col => col.trim().replace(/^"|"$/g, '')).join(',')
    )
    .join('\n')
}

// ── API call ──────────────────────────────────────────────────────────────────
async function analyzeWithClaude(csvText) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Analyse this sales CSV and return the JSON insights.\n\n' + csvText,
        },
      ],
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message || data.error)
  const raw = data.content.map(b => (b.type === 'text' ? b.text : '')).join('')
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}

// ── Shared styles object ──────────────────────────────────────────────────────
const S = {
  card: {
    background: T.cardBg,
    border: '1px solid ' + T.border,
    borderRadius: 6,
    padding: '20px 24px',
  },
  sectionLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: T.gold,
    marginBottom: 14,
    fontFamily: T.fontBody,
  },
  btnPrimary: {
    background: T.gold,
    color: '#0A0602',
    border: 'none',
    borderRadius: 4,
    padding: '13px 28px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: T.fontBody,
    letterSpacing: '0.02em',
    display: 'inline-block',
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid ' + T.border,
    borderRadius: 4,
    padding: '12px 28px',
    fontSize: '0.85rem',
    color: T.mutedLight,
    cursor: 'pointer',
    fontFamily: T.fontBody,
    width: '100%',
    textAlign: 'center',
  },
}

// ── Keyframes injected once ───────────────────────────────────────────────────
function injectKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('de-keyframes')) return
  const style = document.createElement('style')
  style.id = 'de-keyframes'
  style.textContent = `
    @keyframes de-spin { to { transform: rotate(360deg); } }
    @keyframes de-fade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes de-bar  { from { width: 0; } }
    @keyframes de-word-in  { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes de-word-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(40px); } }
    @keyframes de-badge { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
    @keyframes de-glow {
      0%, 100% { box-shadow: 0 0 24px rgba(184,116,30,0.08); }
      50%       { box-shadow: 0 0 48px rgba(184,116,30,0.18); }
    }
    @keyframes de-scan {
      0%   { transform: translateY(0); opacity: 0.6; }
      100% { transform: translateY(120px); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

// ── Animated rotating word ────────────────────────────────────────────────────
function AnimatedWord({ words }) {
  const [index, setIndex] = useState(0)
  const [animState, setAnimState] = useState('in') // 'in' | 'out'

  useEffect(function() {
    const outTimer = setTimeout(function() {
      setAnimState('out')
    }, 2000)
    return function() { clearTimeout(outTimer) }
  }, [index])

  useEffect(function() {
    if (animState !== 'out') return
    const inTimer = setTimeout(function() {
      setIndex(function(i) { return (i + 1) % words.length })
      setAnimState('in')
    }, 350)
    return function() { clearTimeout(inTimer) }
  }, [animState, words.length])

  return (
    <span style={{
      display: 'inline-block',
      position: 'relative',
      height: '1.15em',
      overflow: 'hidden',
      verticalAlign: 'bottom',
      minWidth: '5ch',
    }}>
      <span style={{
        display: 'inline-block',
        color: T.goldGlow,
        fontStyle: 'italic',
        animation: animState === 'in'
          ? 'de-word-in 0.38s cubic-bezier(0.22,1,0.36,1) both'
          : 'de-word-out 0.3s ease-in both',
        willChange: 'transform, opacity',
      }}>
        {words[index]}
      </span>
    </span>
  )
}

// ── Upload screen ─────────────────────────────────────────────────────────────
function UploadScreen({ onFile, onSample, error }) {
  injectKeyframes()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const rotatingWords = useMemo(function() {
    return ['claros', 'rapidos', 'utiles', 'precisos', 'reales']
  }, [])

  const handleDrop = useCallback(function(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div style={{ width: '100%' }}>

      {/* ── HERO SECTION ── */}
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '80px 24px 0',
        textAlign: 'center',
      }}>

        {/* Launch badge — animated-hero style pill button */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(184,116,30,0.1)',
          border: '1px solid ' + T.border,
          borderRadius: 999,
          padding: '6px 16px 6px 6px',
          marginBottom: 36,
          animation: 'de-badge 0.5s ease both',
          cursor: 'default',
        }}>
          <span style={{
            background: T.gold,
            color: '#0A0602',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: T.fontBody,
          }}>
            Nuevo
          </span>
          <span style={{
            fontSize: '0.8rem',
            color: T.mutedLight,
            fontFamily: T.fontBody,
            letterSpacing: '0.02em',
          }}>
            Analisis de ventas para pequenos negocios
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>

        {/* Hero headline with animated word */}
        <h1 style={{
          fontFamily: T.fontDisplay,
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: T.cream,
          marginBottom: 28,
          animation: 'de-fade 0.6s 0.1s ease both',
        }}>
          <span style={{ display: 'block' }}>Tus datos de ventas.</span>
          <span style={{ display: 'block' }}>
            Resultados{' '}
            <AnimatedWord words={rotatingWords} />
            {'.'}
          </span>
        </h1>

        {/* Subheading */}
        <p style={{
          fontFamily: T.fontBody,
          fontSize: '1.05rem',
          color: T.muted,
          lineHeight: 1.78,
          maxWidth: 520,
          margin: '0 auto 44px',
          animation: 'de-fade 0.6s 0.18s ease both',
        }}>
          Exporta el informe de tu TPV, subelo a Data Everywhere,
          y en menos de un minuto sabras que productos te dan mas dinero,
          cuando son tus horas mas flojas, y que cambiar esta semana.
        </p>

        {/* CTA buttons row — hero style */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 56,
          animation: 'de-fade 0.6s 0.26s ease both',
        }}>
          <button
            style={{
              ...S.btnPrimary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              fontSize: '0.95rem',
            }}
            onClick={function() { inputRef.current && inputRef.current.click() }}
          >
            Subir mi CSV
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <button
            style={{
              ...S.btnGhost,
              width: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              fontSize: '0.95rem',
            }}
            onClick={onSample}
          >
            Ver demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={function(e) { const f = e.target.files[0]; if (f) onFile(f) }}
          />
        </div>

        {/* POS logos strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 72,
          animation: 'de-fade 0.6s 0.32s ease both',
        }}>
          <span style={{ fontSize: '0.7rem', color: T.muted, fontFamily: T.fontBody }}>Compatible con</span>
          {['Revo', 'SumUp', 'Zettle', 'Glop', 'Holded'].map(function(name) {
            return (
              <span key={name} style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: T.mutedLight,
                fontFamily: T.fontBody,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid ' + T.border,
                borderRadius: 4,
                padding: '3px 8px',
                letterSpacing: '0.04em',
              }}>
                {name}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── UPLOAD ZONE — below hero fold ── */}
      <div style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '0 24px 80px',
      }}>

        {error && (
          <div style={{
            background: T.errorBg,
            border: '1px solid ' + T.errorBorder,
            borderRadius: 6,
            padding: '14px 18px',
            color: T.errorText,
            fontSize: '0.85rem',
            marginBottom: 20,
            textAlign: 'left',
            fontFamily: T.fontBody,
          }}>
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={function() { inputRef.current && inputRef.current.click() }}
          onDrop={handleDrop}
          onDragOver={function(e) { e.preventDefault(); setDragging(true) }}
          onDragLeave={function() { setDragging(false) }}
          style={{
            border: '2px dashed ' + (dragging ? T.goldLight : T.border),
            borderRadius: 12,
            padding: '44px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(184,116,30,0.05)' : 'rgba(255,255,255,0.015)',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 14,
            animation: 'de-glow 4s ease-in-out infinite',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Scan line effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, ' + T.gold + ', transparent)',
            animation: 'de-scan 3s ease-in-out infinite',
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          {/* Upload icon */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'rgba(184,116,30,0.1)',
            border: '1px solid ' + T.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <p style={{
            fontFamily: T.fontDisplay,
            fontSize: '1.05rem',
            color: T.cream,
            marginBottom: 6,
          }}>
            Arrastra tu archivo CSV aqui
          </p>
          <p style={{ fontSize: '0.78rem', color: T.muted, marginBottom: 22, fontFamily: T.fontBody }}>
            Maximo 4 semanas de datos &middot; Cualquier TPV
          </p>

          <button
            style={{ ...S.btnPrimary, fontSize: '0.88rem', padding: '11px 24px' }}
            onClick={function(e) { e.stopPropagation(); inputRef.current && inputRef.current.click() }}
          >
            Elegir archivo CSV
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: '0.72rem', color: T.muted, fontFamily: T.fontBody }}>o prueba con datos de ejemplo</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <button
          style={{ ...S.btnGhost, display: 'block', width: '100%' }}
          onClick={onSample}
        >
          Ver demo con cafeteria de Barcelona
        </button>

        {/* Trust line */}
        <p style={{
          fontSize: '0.7rem',
          color: T.muted,
          marginTop: 20,
          textAlign: 'center',
          lineHeight: 1.6,
          fontFamily: T.fontBody,
        }}>
          Tu archivo se procesa y se descarta inmediatamente.
          No almacenamos ningun dato.
        </p>
      </div>
    </div>
  )
}

// ── Analysing screen ──────────────────────────────────────────────────────────
function AnalyzingScreen({ progress }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
      <div style={{
        width: 48,
        height: 48,
        border: '2px solid ' + T.border,
        borderTopColor: T.gold,
        borderRadius: '50%',
        margin: '0 auto 28px',
        animation: 'de-spin 0.9s linear infinite',
      }} />

      <h2 style={{
        fontFamily: T.fontDisplay,
        fontSize: '1.7rem',
        fontWeight: 600,
        color: T.cream,
        marginBottom: 10,
      }}>
        Analizando tus datos
      </h2>

      <p style={{ fontSize: '0.85rem', color: T.muted, marginBottom: 36, fontFamily: T.fontBody }}>
        Leyendo tus datos de ventas...
      </p>

      <div style={{
        height: 3,
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 340,
        margin: '0 auto',
      }}>
        <div style={{
          height: '100%',
          width: progress + '%',
          background: 'linear-gradient(90deg, ' + T.greenMid + ', ' + T.gold + ')',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <p style={{ fontSize: '0.7rem', color: T.muted, marginTop: 10, fontFamily: T.fontBody }}>
        {Math.round(progress)}%
      </p>
    </div>
  )
}

// ── Email capture screen ──────────────────────────────────────────────────────
function EmailScreen({ onSubmit }) {
  const [email, setEmail]   = useState('')
  const [err, setErr]       = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!email.trim()) return 'Introduce tu email para continuar'
    if (!email.includes('@') || !email.includes('.')) return 'Introduce un email valido'
    return ''
  }

  function handleSubmit() {
    const e = validate()
    if (e) { setErr(e); return }
    setLoading(true)
    onSubmit(email.trim())
  }

  return (
    <div style={{
      maxWidth: 500,
      margin: '0 auto',
      padding: '80px 24px',
      textAlign: 'center',
      animation: 'de-fade 0.4s ease both',
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '2px solid ' + T.greenBright,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        color: T.greenBright,
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        fontFamily: T.fontBody,
      }}>
        LISTO
      </div>

      <h2 style={{
        fontFamily: T.fontDisplay,
        fontSize: '1.85rem',
        fontWeight: 700,
        color: T.cream,
        marginBottom: 12,
      }}>
        Tu analisis esta listo
      </h2>

      <p style={{
        fontSize: '0.92rem',
        color: T.muted,
        lineHeight: 1.7,
        marginBottom: 36,
        fontFamily: T.fontBody,
      }}>
        Introduce tu email para ver los resultados. Te enviaremos
        una copia para que puedas consultarlos despues.
      </p>

      <input
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); setErr('') }}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        autoFocus
        style={{
          width: '100%',
          padding: '14px 18px',
          fontSize: '0.92rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid ' + (err ? T.errorText : T.border),
          borderRadius: 4,
          color: T.cream,
          fontFamily: T.fontBody,
          marginBottom: 10,
          boxSizing: 'border-box',
          transition: 'border-color 0.18s',
        }}
      />

      {err && (
        <p style={{
          fontSize: '0.78rem',
          color: T.errorText,
          marginBottom: 10,
          textAlign: 'left',
          fontFamily: T.fontBody,
        }}>
          {err}
        </p>
      )}

      <button
        style={{
          ...S.btnPrimary,
          width: '100%',
          padding: '14px',
          marginBottom: 14,
          opacity: loading ? 0.7 : 1,
        }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'Ver mi analisis'}
      </button>

      <p style={{ fontSize: '0.72rem', color: T.muted, lineHeight: 1.6, fontFamily: T.fontBody }}>
        No compartimos tu email con nadie. Sin spam.
      </p>
    </div>
  )
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ data, onReset }) {
  const {
    businessType, summary, totalRevenue, totalTransactions,
    dateRange, topInsights, topItems, recommendations,
    peakDay, quietestDay, warning,
  } = data

  function fmt(n) {
    if (typeof n !== 'number') return n
    return 'EUR ' + n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const maxRev = topItems ? Math.max(...topItems.map(i => i.revenue)) : 1

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '32px 24px 80px',
      animation: 'de-fade 0.4s ease both',
      fontFamily: T.fontBody,
    }}>

      {/* Identity strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 18,
        marginBottom: 32,
        borderBottom: '1px solid ' + T.border,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <span style={{
          background: T.green,
          color: T.cream,
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: '0.72rem',
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}>
          {businessType}
        </span>
        <span style={{ fontSize: '0.72rem', color: T.muted }}>{dateRange}</span>
      </div>

      {/* Hero revenue */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <p style={{ ...S.sectionLabel, textAlign: 'center' }}>Ingresos totales</p>
        <div style={{
          fontFamily: T.fontDisplay,
          fontSize: 'clamp(2.6rem, 6vw, 4rem)',
          fontWeight: 900,
          color: T.goldGlow,
          lineHeight: 1,
          marginBottom: 12,
          letterSpacing: '-0.03em',
        }}>
          {fmt(totalRevenue)}
        </div>
        <p style={{ fontSize: '0.85rem', color: T.muted }}>
          {totalTransactions && totalTransactions.toLocaleString('de-DE')} transacciones
        </p>
      </div>

      {/* Summary */}
      <div style={{ ...S.card, marginBottom: 14, borderColor: T.borderGreen }}>
        <p style={{ fontSize: '0.95rem', color: T.cream, lineHeight: 1.75 }}>{summary}</p>
      </div>

      {/* Peak / quietest */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 44,
      }}>
        {[
          { label: 'Mejor dia', value: peakDay, sign: '+', col: T.greenBright },
          { label: 'Dia mas flojo', value: quietestDay, sign: '-', col: T.muted },
        ].map(function(item) {
          return (
            <div key={item.label} style={{
              ...S.card,
              textAlign: 'center',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid ' + T.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '0.9rem',
                color: item.col,
                fontWeight: 600,
              }}>
                {item.sign}
              </div>
              <p style={{ fontSize: '0.65rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                {item.label}
              </p>
              <p style={{ fontSize: '0.85rem', color: T.cream, lineHeight: 1.5 }}>{item.value}</p>
            </div>
          )
        })}
      </div>

      {/* Key insights */}
      <p style={S.sectionLabel}>Lo que encontramos</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 44,
      }}>
        {topInsights && topInsights.map(function(ins, i) {
          return (
            <div key={i} style={{
              background: T.cardBg,
              border: '1px solid ' + T.border,
              borderRadius: 6,
              padding: 20,
            }}>
              <p style={{
                fontFamily: T.fontDisplay,
                fontSize: '0.95rem',
                color: T.gold,
                marginBottom: 8,
                fontWeight: 600,
              }}>
                {ins.title}
              </p>
              <p style={{ fontSize: '0.82rem', color: T.cream, lineHeight: 1.65 }}>
                {ins.detail}
              </p>
            </div>
          )
        })}
      </div>

      {/* Top items */}
      <p style={S.sectionLabel}>Top 5 productos</p>
      <div style={{ ...S.card, padding: '8px 24px', marginBottom: 44 }}>
        {topItems && topItems.map(function(item, i) {
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderBottom: i < topItems.length - 1 ? '1px solid ' + T.border : 'none',
            }}>
              <span style={{ fontSize: '0.68rem', color: T.muted, width: 18, textAlign: 'right', flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '0.85rem', color: T.cream, flex: '0 0 150px' }}>
                {item.name}
              </span>
              <div style={{
                flex: 1,
                height: 5,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: ((item.revenue / maxRev) * 100) + '%',
                  background: 'linear-gradient(90deg, ' + T.green + ', ' + T.greenBright + ')',
                  borderRadius: 3,
                  animation: 'de-bar 0.7s ease both',
                }} />
              </div>
              <span style={{ fontSize: '0.85rem', color: T.gold, width: 90, textAlign: 'right', flexShrink: 0 }}>
                {fmt(item.revenue)}
              </span>
              <span style={{ fontSize: '0.68rem', color: T.muted, width: 48, textAlign: 'right', flexShrink: 0 }}>
                {item.quantity} uds
              </span>
            </div>
          )
        })}
      </div>

      {/* Recommendations */}
      <p style={S.sectionLabel}>Que hacer esta semana</p>
      <div style={{ marginBottom: 44 }}>
        {recommendations && recommendations.map(function(rec, i) {
          return (
            <div key={i} style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              background: T.cardBg,
              border: '1px solid ' + T.border,
              borderLeft: '3px solid ' + T.gold,
              borderRadius: 6,
              padding: '18px 20px',
              marginBottom: 10,
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: T.green,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: T.greenBright,
                fontWeight: 700,
                marginTop: 2,
              }}>
                {i + 1}
              </div>
              <div>
                <p style={{
                  fontFamily: T.fontDisplay,
                  fontSize: '0.95rem',
                  color: T.cream,
                  marginBottom: 6,
                  fontWeight: 600,
                }}>
                  {rec.action}
                </p>
                <p style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.65 }}>
                  {rec.reason}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Warning */}
      {warning && warning !== 'null' && (
        <div style={{
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          background: T.warnBg,
          border: '1px solid ' + T.warnBorder,
          borderRadius: 6,
          padding: '16px 20px',
          marginBottom: 44,
        }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1px solid ' + T.goldLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '0.65rem',
            color: T.goldLight,
            fontWeight: 700,
            marginTop: 1,
          }}>
            !
          </div>
          <p style={{ fontSize: '0.85rem', color: T.goldLight, lineHeight: 1.65 }}>{warning}</p>
        </div>
      )}

      {/* Reset */}
      <div style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid ' + T.border }}>
        <button
          onClick={onReset}
          style={{
            background: 'transparent',
            border: '1px solid rgba(107,90,72,0.35)',
            borderRadius: 4,
            padding: '10px 24px',
            fontSize: '0.82rem',
            color: T.muted,
            cursor: 'pointer',
            fontFamily: T.fontBody,
          }}
        >
          Analizar otro archivo
        </button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  injectKeyframes()

  const [stage, setStage]             = useState('upload')
  const [progress, setProgress]       = useState(0)
  const [results, setResults]         = useState(null)
  const [pendingResults, setPending]  = useState(null)
  const [error, setError]             = useState(null)

  useEffect(function() {
    if (stage !== 'analyzing') return
    setProgress(5)
    const timers = [
      setTimeout(function() { setProgress(20) }, 400),
      setTimeout(function() { setProgress(45) }, 1200),
      setTimeout(function() { setProgress(70) }, 2800),
      setTimeout(function() { setProgress(88) }, 5000),
    ]
    return function() { timers.forEach(clearTimeout) }
  }, [stage])

  async function runAnalysis(csvText) {
    setError(null)
    setStage('analyzing')
    setProgress(5)
    let parsed = null
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        parsed = await analyzeWithClaude(csvText)
        break
      } catch (err) {
        lastErr = err
        if (attempt === 0 && err instanceof SyntaxError) continue
        break
      }
    }
    if (parsed) {
      setProgress(100)
      setTimeout(function() { setPending(parsed); setStage('email') }, 300)
    } else {
      setStage('upload')
      setError('Algo salio mal. Intentalo de nuevo.')
      console.error(lastErr)
    }
  }

  function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor sube un archivo .csv')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Exporta solo las ultimas 4 semanas.')
      return
    }
    const reader = new FileReader()
    reader.onload = function(e) {
      const text = e.target.result
      if (!text || !text.trim()) { setError('El archivo esta vacio'); return }
      const csv = parseCSV(text)
      if (csv.split('\n').filter(Boolean).length < 2) {
        setError('No pudimos leer este archivo. Exportalo de nuevo desde tu TPV.')
        return
      }
      runAnalysis(csv)
    }
    reader.onerror = function() { setError('No pudimos leer este archivo.') }
    reader.readAsText(file, 'UTF-8')
  }

  function handleSample() {
    setError(null)
    runAnalysis(parseCSV(SAMPLE_CSV))
  }

  function handleEmailSubmit(email) {
    console.log('Email captured:', email)
    setResults(pendingResults)
    setStage('results')
  }

  function handleReset() {
    setStage('upload')
    setResults(null)
    setPending(null)
    setError(null)
    setProgress(0)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.cream, fontFamily: T.fontBody }}>

      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid ' + T.border,
        background: 'rgba(10,6,2,0.92)',
        backdropFilter: 'blur(12px)',
      }}>
        <span
          onClick={handleReset}
          style={{
            fontFamily: T.fontDisplay,
            fontSize: '1.1rem',
            color: T.cream,
            cursor: 'pointer',
            userSelect: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Data <span style={{ color: T.gold }}>Everywhere</span>
        </span>
        <span style={{ fontSize: '0.7rem', color: T.muted, letterSpacing: '0.06em' }}>
          Revo &middot; SumUp &middot; Zettle &middot; Glop
        </span>
      </header>

      {stage === 'upload'    && <UploadScreen    onFile={handleFile} onSample={handleSample} error={error} />}
      {stage === 'analyzing' && <AnalyzingScreen progress={progress} />}
      {stage === 'email'     && <EmailScreen     onSubmit={handleEmailSubmit} />}
      {stage === 'results'   && results && <ResultsScreen data={results} onReset={handleReset} />}
    </div>
  )
}

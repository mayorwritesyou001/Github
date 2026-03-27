import { useState, useCallback, useEffect, useRef } from 'react'

// ─── Brand colours ────────────────────────────────────────────────────────────
const C = {
  bg:        '#1C1006',
  green:     '#284D34',
  greenLight:'#41965A',
  gold:      '#C6802C',
  cream:     '#F8F4EC',
  muted:     '#8A7060',
  card:      'rgba(255,255,255,0.04)',
  border:    'rgba(200,128,44,0.2)',
  warning:   'rgba(198,128,44,0.15)',
}

// ─── Sample CSV (Spanish POS format) ─────────────────────────────────────────
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

// ─── System prompt ────────────────────────────────────────────────────────────
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
- Product names: normalise to Title Case for grouping (so "café con leche" and "CAFÉ CON LECHE" become the same product)

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
    {
      "emoji": "emoji",
      "title": "short title",
      "detail": "1-2 sentence specific insight with real numbers"
    }
  ],
  "topItems": [
    {
      "name": "product name",
      "revenue": number,
      "quantity": number,
      "percentOfTotal": number
    }
  ],
  "recommendations": [
    {
      "emoji": "emoji",
      "action": "short action title",
      "reason": "specific reason with numbers from the data"
    }
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
- Never say "it appears" or "it seems" — state facts directly
- If data covers fewer than 3 days, say so in the summary`

// ─── CSV parser ───────────────────────────────────────────────────────────────
const parseCSV = (text) => {
  const firstLine = text.split('\n')[0]
  const separator = firstLine.includes(';') ? ';' : ','

  const lines = text.trim().split('\n')

  const normalized = lines
    .map(line => {
      const cols = line.split(separator)
      return cols
        .map(col => {
          let clean = col.trim().replace(/^"|"$/g, '')
          return clean
        })
        .join(',')
    })
    .join('\n')

  const capped = normalized.split('\n').slice(0, 300).join('\n')
  return capped
}

// ─── API call ─────────────────────────────────────────────────────────────────
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
      messages: [
        {
          role: 'user',
          content: `Analyse this sales CSV from a Barcelona café and return the JSON insights.\n\n${csvText}`,
        },
      ],
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  const raw = data.content
    .map(block => (block.type === 'text' ? block.text : ''))
    .join('')

  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim()

  const parsed = JSON.parse(clean)
  return parsed
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    backgroundColor: C.bg,
    color: C.cream,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '0',
    margin: '0',
  },
  header: {
    borderBottom: `1px solid ${C.border}`,
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontFamily: 'Georgia, serif',
    fontSize: '20px',
    fontWeight: 'bold',
    color: C.cream,
    letterSpacing: '-0.02em',
  },
  logoDot: {
    color: C.gold,
  },
  main: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '48px 24px',
  },

  // Upload screen
  uploadWrap: {
    textAlign: 'center',
  },
  uploadTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '36px',
    fontWeight: 'normal',
    color: C.cream,
    marginBottom: '12px',
    lineHeight: 1.2,
  },
  uploadSubtitle: {
    color: C.muted,
    fontSize: '16px',
    marginBottom: '40px',
  },
  dropZone: {
    border: `2px dashed ${C.border}`,
    borderRadius: '16px',
    padding: '60px 32px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    marginBottom: '16px',
  },
  dropZoneActive: {
    borderColor: C.greenLight,
    background: 'rgba(65,150,90,0.08)',
  },
  dropIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  dropText: {
    fontSize: '18px',
    color: C.cream,
    marginBottom: '8px',
  },
  dropSub: {
    fontSize: '14px',
    color: C.muted,
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    backgroundColor: C.greenLight,
    color: C.cream,
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color: C.gold,
    border: `1px solid ${C.gold}`,
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  posNote: {
    marginTop: '24px',
    color: C.muted,
    fontSize: '13px',
  },

  // Analyzing screen
  analyzingWrap: {
    textAlign: 'center',
    paddingTop: '80px',
  },
  analyzingTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '28px',
    color: C.cream,
    marginBottom: '8px',
  },
  analyzingSub: {
    color: C.muted,
    fontSize: '15px',
    marginBottom: '40px',
  },
  progressTrack: {
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
    maxWidth: '400px',
    margin: '0 auto',
  },
  progressBar: {
    height: '100%',
    backgroundColor: C.greenLight,
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(200,60,60,0.12)',
    border: '1px solid rgba(200,60,60,0.3)',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    color: '#F8A0A0',
    textAlign: 'center',
  },

  // Results
  badge: {
    display: 'inline-block',
    backgroundColor: C.green,
    color: C.cream,
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '13px',
    marginBottom: '8px',
  },
  dateRange: {
    color: C.muted,
    fontSize: '14px',
    marginBottom: '32px',
  },
  bigNumsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  bigNumCard: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  bigNumLabel: {
    color: C.muted,
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '8px',
  },
  bigNumValue: {
    fontFamily: 'Georgia, serif',
    fontSize: '40px',
    color: C.cream,
    lineHeight: 1,
    marginBottom: '4px',
  },
  summaryText: {
    color: C.cream,
    fontSize: '16px',
    lineHeight: 1.6,
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  daysRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '32px',
  },
  dayCard: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '20px',
  },
  dayLabel: {
    fontSize: '12px',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },
  dayValue: {
    fontSize: '15px',
    color: C.cream,
    lineHeight: 1.4,
  },
  sectionTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '20px',
    color: C.cream,
    marginBottom: '16px',
    fontWeight: 'normal',
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '32px',
  },
  insightCard: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '20px',
  },
  insightEmoji: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  insightTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: C.gold,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  insightDetail: {
    fontSize: '14px',
    color: C.cream,
    lineHeight: 1.5,
  },
  itemsWrap: {
    marginBottom: '32px',
  },
  itemRow: {
    marginBottom: '14px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '6px',
  },
  itemName: {
    fontSize: '15px',
    color: C.cream,
  },
  itemStats: {
    fontSize: '13px',
    color: C.muted,
    textAlign: 'right',
  },
  barTrack: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: C.greenLight,
    borderRadius: '3px',
    transition: 'width 0.6s ease',
  },
  recsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginBottom: '32px',
  },
  recCard: {
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  recEmoji: {
    fontSize: '24px',
    flexShrink: 0,
  },
  recAction: {
    fontSize: '15px',
    fontWeight: '600',
    color: C.cream,
    marginBottom: '4px',
  },
  recReason: {
    fontSize: '14px',
    color: C.muted,
    lineHeight: 1.5,
  },
  warningBox: {
    backgroundColor: C.warning,
    border: `1px solid rgba(198,128,44,0.4)`,
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '32px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  warningText: {
    fontSize: '14px',
    color: C.gold,
    lineHeight: 1.5,
  },
  resetBtn: {
    display: 'block',
    margin: '0 auto 48px',
    backgroundColor: 'transparent',
    color: C.muted,
    border: `1px solid rgba(138,112,96,0.4)`,
    borderRadius: '8px',
    padding: '12px 28px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  divider: {
    height: '1px',
    backgroundColor: C.border,
    margin: '32px 0',
  },
}

// ─── Progress bar component ───────────────────────────────────────────────────
function ProgressBar({ progress }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressBar, width: `${progress}%` }} />
    </div>
  )
}

// ─── Upload screen ────────────────────────────────────────────────────────────
function UploadScreen({ onFile, onSample, error }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div style={styles.uploadWrap}>
      <h1 style={styles.uploadTitle}>
        Analiza tus ventas<br />en segundos
      </h1>
      <p style={styles.uploadSubtitle}>
        Sube tu CSV del TPV y recibe un análisis claro en español.
      </p>

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div style={styles.dropIcon}>📂</div>
        <p style={styles.dropText}>Arrastra tu archivo CSV aquí</p>
        <p style={styles.dropSub}>o haz clic para seleccionar</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>

      <div style={styles.btnRow}>
        <button
          style={styles.btnPrimary}
          onClick={() => inputRef.current?.click()}
        >
          Elegir archivo CSV
        </button>
        <button style={styles.btnSecondary} onClick={onSample}>
          Probar con datos de ejemplo
        </button>
      </div>

      <p style={styles.posNote}>
        Compatible con Revo, SumUp, Zettle, Glop y cualquier TPV
      </p>
    </div>
  )
}

// ─── Analyzing screen ─────────────────────────────────────────────────────────
function AnalyzingScreen({ progress }) {
  return (
    <div style={styles.analyzingWrap}>
      <h2 style={styles.analyzingTitle}>Analizando tus datos...</h2>
      <p style={styles.analyzingSub}>Leyendo tus datos de ventas...</p>
      <ProgressBar progress={progress} />
    </div>
  )
}

// ─── Results screen ───────────────────────────────────────────────────────────
function ResultsScreen({ data, onReset }) {
  const {
    businessType,
    summary,
    totalRevenue,
    totalTransactions,
    dateRange,
    topInsights,
    topItems,
    recommendations,
    peakDay,
    quietestDay,
    warning,
  } = data

  const formatEur = (n) =>
    typeof n === 'number'
      ? `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : n

  return (
    <div>
      {/* Business type + date range */}
      <div style={{ marginBottom: '32px' }}>
        <span style={styles.badge}>{businessType}</span>
        <p style={styles.dateRange}>{dateRange}</p>
      </div>

      {/* Big numbers */}
      <div style={styles.bigNumsRow}>
        <div style={styles.bigNumCard}>
          <div style={styles.bigNumLabel}>Ingresos totales</div>
          <div style={styles.bigNumValue}>{formatEur(totalRevenue)}</div>
        </div>
        <div style={styles.bigNumCard}>
          <div style={styles.bigNumLabel}>Líneas de venta</div>
          <div style={styles.bigNumValue}>{totalTransactions?.toLocaleString('de-DE')}</div>
        </div>
      </div>

      {/* Summary */}
      <p style={styles.summaryText}>{summary}</p>

      {/* Peak / quietest day */}
      <div style={styles.daysRow}>
        <div style={styles.dayCard}>
          <div style={styles.dayLabel}>📈 Mejor día</div>
          <div style={styles.dayValue}>{peakDay}</div>
        </div>
        <div style={styles.dayCard}>
          <div style={styles.dayLabel}>📉 Día más flojo</div>
          <div style={styles.dayValue}>{quietestDay}</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Key insights */}
      <h2 style={styles.sectionTitle}>Puntos clave</h2>
      <div style={styles.insightsGrid}>
        {topInsights?.map((ins, i) => (
          <div key={i} style={styles.insightCard}>
            <div style={styles.insightEmoji}>{ins.emoji}</div>
            <div style={styles.insightTitle}>{ins.title}</div>
            <div style={styles.insightDetail}>{ins.detail}</div>
          </div>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Top items */}
      <h2 style={styles.sectionTitle}>Top 5 productos</h2>
      <div style={styles.itemsWrap}>
        {topItems?.map((item, i) => (
          <div key={i} style={styles.itemRow}>
            <div style={styles.itemHeader}>
              <span style={styles.itemName}>{item.name}</span>
              <span style={styles.itemStats}>
                {formatEur(item.revenue)} · {item.quantity} uds · {item.percentOfTotal?.toFixed(1)}%
              </span>
            </div>
            <div style={styles.barTrack}>
              <div
                style={{
                  ...styles.barFill,
                  width: `${Math.min(item.percentOfTotal ?? 0, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Recommendations */}
      <h2 style={styles.sectionTitle}>Recomendaciones</h2>
      <div style={styles.recsGrid}>
        {recommendations?.map((rec, i) => (
          <div key={i} style={styles.recCard}>
            <span style={styles.recEmoji}>{rec.emoji}</span>
            <div>
              <div style={styles.recAction}>{rec.action}</div>
              <div style={styles.recReason}>{rec.reason}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      {warning && warning !== 'null' && (
        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>⚠️</span>
          <span style={styles.warningText}>{warning}</span>
        </div>
      )}

      <button style={styles.resetBtn} onClick={onReset}>
        Analizar otro archivo
      </button>
    </div>
  )
}

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState('upload') // 'upload' | 'analyzing' | 'results'
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  // Animate progress bar while analyzing
  useEffect(() => {
    if (stage !== 'analyzing') return
    setProgress(5)
    const intervals = [
      setTimeout(() => setProgress(20), 400),
      setTimeout(() => setProgress(45), 1200),
      setTimeout(() => setProgress(70), 2800),
      setTimeout(() => setProgress(88), 5000),
    ]
    return () => intervals.forEach(clearTimeout)
  }, [stage])

  const runAnalysis = async (csvText) => {
    setError(null)
    setStage('analyzing')
    setProgress(5)

    let parsed = null
    let lastErr = null

    // Try up to twice (retry once on JSON parse failure)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        parsed = await analyzeWithClaude(csvText)
        break
      } catch (err) {
        lastErr = err
        if (attempt === 0 && err instanceof SyntaxError) {
          // JSON parse failed — retry once
          continue
        }
        break
      }
    }

    if (parsed) {
      setProgress(100)
      setTimeout(() => {
        setResults(parsed)
        setStage('results')
      }, 300)
    } else {
      setStage('upload')
      setError('Algo salió mal. Inténtalo de nuevo.')
      console.error(lastErr)
    }
  }

  const handleFile = (file) => {
    // Validate extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor sube un archivo .csv')
      return
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Exporta solo las últimas 4 semanas.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result

      if (!text || text.trim().length === 0) {
        setError('El archivo está vacío')
        return
      }

      const csv = parseCSV(text)

      // Basic sanity check — does it look like a CSV with recognisable structure?
      const lines = csv.split('\n').filter(Boolean)
      if (lines.length < 2) {
        setError('No pudimos leer este archivo. ¿Puedes exportarlo de nuevo desde tu TPV?')
        return
      }

      runAnalysis(csv)
    }
    reader.onerror = () => {
      setError('No pudimos leer este archivo. ¿Puedes exportarlo de nuevo desde tu TPV?')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleSample = () => {
    setError(null)
    const csv = parseCSV(SAMPLE_CSV)
    runAnalysis(csv)
  }

  const handleReset = () => {
    setStage('upload')
    setResults(null)
    setError(null)
    setProgress(0)
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <span style={styles.logo}>
          Data<span style={styles.logoDot}> Everywhere</span>
        </span>
      </header>

      <main style={styles.main}>
        {stage === 'upload' && (
          <UploadScreen
            onFile={handleFile}
            onSample={handleSample}
            error={error}
          />
        )}
        {stage === 'analyzing' && (
          <AnalyzingScreen progress={progress} />
        )}
        {stage === 'results' && results && (
          <ResultsScreen data={results} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}

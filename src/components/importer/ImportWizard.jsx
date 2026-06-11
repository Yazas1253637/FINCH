import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { useStore, useSetting, newId } from '../../store/StoreProvider.jsx'
import {
  guessMapping, detectSignConvention, normalizeRow, dedupeKey, existingKeys,
  SIGN_CONVENTIONS,
} from '../../utils/csv.js'
import { formatCents } from '../../utils/money.js'
import { Sheet, Field, inputClass, PrimaryButton, GhostButton } from '../ui/Sheet.jsx'

/**
 * Three-step CSV import: file → column mapping → preview & commit.
 * Mapping is remembered (settings: csvMapping) for the next import.
 */
export function ImportWizard({ onClose }) {
  const { state, actions } = useStore()
  const [savedMapping, setSavedMapping] = useSetting('csvMapping', null)

  const [step, setStep] = useState('file') // file | map | preview | done
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [fields, setFields] = useState([])
  const [mapping, setMapping] = useState(null)
  const [signConvention, setSignConvention] = useState('negative')
  const [skipped, setSkipped] = useState(new Set()) // manual row toggles
  const [importedCount, setImportedCount] = useState(0)

  /* step 1 — file */
  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,text/csv'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      setFileName(file.name)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data, meta }) => {
          const fs = meta.fields ?? []
          setRows(data)
          setFields(fs)
          // Reuse last mapping if its columns still exist in this file.
          const reusable = savedMapping &&
            ['date', 'amount'].every((k) => fs.includes(savedMapping.mapping?.[k]))
          const m = reusable ? savedMapping.mapping : guessMapping(fs)
          setMapping(m)
          setSignConvention(
            reusable ? savedMapping.signConvention
              : m.debitCredit ? 'debitcredit' : detectSignConvention(data, m.amount),
          )
          setStep('map')
        },
      })
    }
    input.click()
  }

  /* step 3 — preview rows */
  const categoryByName = useMemo(() => {
    const idx = new Map(state.categories.map((c) => [c.name.toLowerCase(), c.id]))
    return (name) => idx.get(name.toLowerCase()) ?? 'cat-other'
  }, [state.categories])

  const preview = useMemo(() => {
    if (step !== 'preview') return []
    const known = existingKeys(state.expenses)
    const seenInFile = new Set()
    return rows.map((row, i) => {
      const n = normalizeRow(row, mapping, signConvention)
      if (!n.ok) return { i, status: 'bad', reason: n.reason, raw: row }
      const key = dedupeKey(n.date, n.amountCents, n.description)
      let status = 'ok'
      if (n.isIncome) status = 'income'
      else if (known.has(key) || seenInFile.has(key)) status = 'dup'
      else seenInFile.add(key)
      return { i, status, ...n, key }
    })
  }, [step, rows, mapping, signConvention, state.expenses])

  const importable = preview.filter((p) => p.status === 'ok' && !skipped.has(p.i))
  const counts = useMemo(() => {
    const c = { ok: 0, dup: 0, bad: 0, income: 0 }
    for (const p of preview) c[p.status]++
    return c
  }, [preview])

  const commit = () => {
    const records = importable.map((p) => ({
      id: newId(),
      amountCents: p.amountCents,
      categoryId: categoryByName(p.rawCategory),
      date: p.date,
      note: p.description,
      imported: true,
    }))
    actions.upsertMany('expense', records)
    setSavedMapping({ mapping, signConvention })
    setImportedCount(records.length)
    setStep('done')
  }

  const mapField = (key, label, required = false) => (
    <Field label={`${label}${required ? '' : ' (optional)'}`}>
      <select
        className={inputClass}
        value={mapping[key] ?? ''}
        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
      >
        <option value="">— not in this file —</option>
        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    </Field>
  )

  const STATUS_BADGE = {
    ok: ['import', 'text-ok dark:text-ok-bright'],
    dup: ['duplicate', 'text-ink-faint dark:text-snow-faint'],
    bad: ['unreadable', 'text-over dark:text-over-bright'],
    income: ['income', 'text-warn'],
  }

  return (
    <Sheet open onClose={onClose} title="Import CSV">
      {step === 'file' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink-soft dark:text-snow-soft">
            Export transactions from your bank as CSV, then bring them here. Next you&rsquo;ll match
            their columns to Finch&rsquo;s fields — every bank exports differently, comma decimals
            and all. Duplicates are skipped automatically.
          </p>
          <PrimaryButton onClick={pickFile}>Choose CSV file…</PrimaryButton>
        </div>
      )}

      {step === 'map' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft dark:text-snow-soft">
            <span className="font-medium">{fileName}</span> · {rows.length} rows. Map its columns:
          </p>
          {mapField('date', 'Date', true)}
          {mapField('amount', 'Amount', true)}
          {mapField('description', 'Description')}
          {mapField('category', 'Category')}
          <Field label="Sign convention">
            <select className={inputClass} value={signConvention} onChange={(e) => setSignConvention(e.target.value)}>
              {SIGN_CONVENTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          {signConvention === 'debitcredit' && mapField('debitCredit', 'Debit/credit column', true)}
          <PrimaryButton
            onClick={() => setStep('preview')}
            disabled={!mapping.date || !mapping.amount || (signConvention === 'debitcredit' && !mapping.debitCredit)}
          >
            Preview import →
          </PrimaryButton>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft dark:text-snow-soft">
            <span className="tnum font-medium text-ok dark:text-ok-bright">{importable.length} to import</span>
            {counts.dup > 0 && <> · {counts.dup} duplicates skipped</>}
            {counts.income > 0 && <> · {counts.income} income rows skipped</>}
            {counts.bad > 0 && <> · {counts.bad} unreadable</>}
          </p>

          <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto rounded-xl border border-line/70 dark:divide-night-line/70 dark:border-night-line/70">
            {preview.map((p) => {
              const [label, cls] = STATUS_BADGE[p.status]
              const off = p.status !== 'ok' || skipped.has(p.i)
              return (
                <li key={p.i} className={`flex items-center gap-3 px-3.5 py-2 text-sm ${off ? 'opacity-50' : ''}`}>
                  {p.status === 'ok' ? (
                    <input
                      type="checkbox"
                      checked={!skipped.has(p.i)}
                      onChange={() => {
                        const next = new Set(skipped)
                        next.has(p.i) ? next.delete(p.i) : next.add(p.i)
                        setSkipped(next)
                      }}
                      className="accent-(--color-accent)"
                    />
                  ) : <span className="w-[13px]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.description || p.reason || '—'}</span>
                    <span className="tnum text-xs text-ink-faint dark:text-snow-faint">{p.date ?? ''}</span>
                  </span>
                  {p.amountCents != null && <span className="tnum shrink-0 font-medium">{formatCents(p.amountCents)}</span>}
                  <span className={`w-18 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{label}</span>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col gap-2">
            <PrimaryButton onClick={commit} disabled={importable.length === 0}>
              Import {importable.length} expense{importable.length !== 1 && 's'}
            </PrimaryButton>
            <GhostButton onClick={() => setStep('map')}>← Back to mapping</GhostButton>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-wash dark:bg-accent-wash-dark">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-deep dark:text-accent-bright" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4.5 12.5l5 5 10-11" />
            </svg>
          </div>
          <p className="text-sm text-ink-soft dark:text-snow-soft">
            Imported <span className="tnum font-medium">{importedCount}</span> expenses.
            Your column mapping is saved for next time.
          </p>
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
        </div>
      )}
    </Sheet>
  )
}

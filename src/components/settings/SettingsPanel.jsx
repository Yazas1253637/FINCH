import { useState } from 'react'
import { useStore } from '../../store/StoreProvider.jsx'
import { exportBackup, parseBackup, pickBackupFile } from '../../utils/backup.js'
import { exportExpensesCSV } from '../../utils/csvExport.js'
import { Card, CardLabel } from '../layout/Card.jsx'
import { CategoryManager } from '../categories/CategoryManager.jsx'
import { ImportWizard } from '../importer/ImportWizard.jsx'
import { supabase } from '../../db/supabase.js'

/** Beveled retro button — hard border, offset shadow, depresses on press. */
const retroBtn = `w-full rounded-[6px] border-[1.5px] border-ink px-5 py-2.5 text-sm font-bold
  uppercase tracking-[0.06em] text-ink shadow-card transition-transform
  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`

/**
 * Slide-over settings: backup export/import lives here.
 * This is the user's safety net against browser data clearing.
 */
export function SettingsPanel({ open, onClose }) {
  const { state, actions } = useStore()
  const [message, setMessage] = useState(null)
  const [importing, setImporting] = useState(false)

  if (!open) return null

  const handleExport = () => {
    exportBackup(state)
    setMessage({ tone: 'ok', text: 'Backup downloaded.' })
  }

  const handleExportCSV = () => {
    const n = exportExpensesCSV(state)
    setMessage({ tone: 'ok', text: `Exported ${n} expense${n !== 1 ? 's' : ''} to CSV.` })
  }

  const handleImport = async () => {
    try {
      const text = await pickBackupFile()
      const data = parseBackup(text)
      const counts = `${data.expenses.length} expenses, ${data.recurring.length} recurring, ${data.categories.length} categories`
      if (!window.confirm(`Replace all current data with this backup?\n(${counts})`)) return
      await actions.restoreAll(data)
      setMessage({ tone: 'ok', text: `Restored ${counts}.` })
    } catch (err) {
      setMessage({ tone: 'err', text: err.message })
    }
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-label="Settings">
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-[2px] dark:bg-black/40"
        onClick={onClose}
      />
      <div className="animate-rise absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto
        bg-paper p-5 pt-[max(1.25rem,env(safe-area-inset-top))] dark:bg-night sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-accent-wash
              hover:text-accent-deep dark:text-snow-soft dark:hover:bg-accent-wash-dark"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <Card className="mb-4">
          <CardLabel>Backup</CardLabel>
          <p className="mb-5 text-sm leading-relaxed text-ink-soft dark:text-snow-soft">
            Export a JSON snapshot of your data. Useful if you ever want to migrate or keep
            a local copy.
          </p>
          <div className="flex flex-col gap-2.5">
            <button onClick={handleExport} className={`${retroBtn} bg-accent`}>
              Export all data
            </button>
            <button onClick={handleImport} className={`${retroBtn} bg-paper-raised`}>
              Import from backup…
            </button>
            <button onClick={handleExportCSV} className={`${retroBtn} bg-paper-raised`}>
              Export expenses to CSV
            </button>
          </div>
          {message && (
            <p className={`mt-4 text-sm ${message.tone === 'ok' ? 'text-ok' : 'text-over'}`}>
              {message.text}
            </p>
          )}
        </Card>

        <Card className="mb-4">
          <CardLabel>Import from bank</CardLabel>
          <p className="mb-4 text-sm leading-relaxed text-ink-soft dark:text-snow-soft">
            Bring in a CSV export from your bank. You map the columns once; Finch remembers
            the mapping and skips anything already imported.
          </p>
          <button onClick={() => setImporting(true)} className={`${retroBtn} bg-paper-raised`}>
            Import CSV…
          </button>
        </Card>

        <Card className="mb-4">
          <CardLabel>Categories</CardLabel>
          <CategoryManager />
        </Card>

        <Card className="mb-4">
          <CardLabel>About</CardLabel>
          <p className="text-sm leading-relaxed text-ink-soft dark:text-snow-soft">
            Finch syncs your data to Supabase — accessible from any device.
            Install from your browser&rsquo;s share menu — &ldquo;Add to Home Screen&rdquo; on iOS.
          </p>
        </Card>

        <Card>
          <CardLabel>Account</CardLabel>
          <button
            onClick={() => supabase.auth.signOut()}
            className={`${retroBtn} bg-paper-raised`}
          >
            Sign out
          </button>
        </Card>
      </div>
      {importing && <ImportWizard onClose={() => setImporting(false)} />}
    </div>
  )
}

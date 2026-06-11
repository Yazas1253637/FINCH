import { STORE_NAMES } from '../db/database.js'

const BACKUP_VERSION = 1

/** Serialize the whole dataset and trigger a download. */
export function exportBackup(state) {
  const payload = {
    app: 'finch',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
  }
  for (const name of STORE_NAMES) {
    payload[name] = state[name] ?? []
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finch-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Validate a parsed backup file and return clean data for restoreAll().
 * Throws with a readable message when the file isn't a Finch backup.
 */
export function parseBackup(json) {
  let parsed
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (parsed?.app !== 'finch' || !Array.isArray(parsed.expenses)) {
    throw new Error('That file does not look like a Finch backup.')
  }
  const data = {}
  for (const name of STORE_NAMES) {
    data[name] = Array.isArray(parsed[name]) ? parsed[name] : []
  }
  return data
}

/** Open a file picker and resolve with the file's text content. */
export function pickBackupFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file selected.'))
      file.text().then(resolve, reject)
    }
    input.click()
  })
}

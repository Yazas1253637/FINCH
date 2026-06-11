const { app, BrowserWindow, shell, protocol, net } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

/**
 * The renderer is served from a custom `app://` protocol instead of `file://`.
 *
 * Why: Chromium does not give `file://` pages a stable, persistent storage
 * partition, so IndexedDB/localStorage can be wiped between launches (and
 * every time the app is rebuilt). A registered *standard + secure* scheme
 * behaves like an https origin — the origin `app://local` is constant, so all
 * saved data persists across rebuilds and relaunches.
 */
const APP_ORIGIN = 'app://local'
const DIST = path.join(__dirname, '..', 'dist')

// Must run before app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
])

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1160,
    height: 820,
    minWidth: 420,
    minHeight: 600,
    title: 'Finch',
    backgroundColor: '#f2e8dd', // light-only Poolsuite cream
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadURL(`${APP_ORIGIN}/index.html`)

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[finch] renderer failed to load: ${code} ${desc} ${url}`)
  })
  win.webContents.on('did-finish-load', () => {
    console.log('[finch] renderer loaded from', APP_ORIGIN)
  })

  // External links (if any ever appear) open in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('closed', () => { win = null })
}

app.whenReady().then(() => {
  // Map app://local/<path> → dist/<path>, defaulting to index.html.
  protocol.handle('app', (request) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname)
    } catch {
      pathname = '/'
    }
    if (!pathname || pathname === '/') pathname = '/index.html'

    // Resolve safely inside DIST — never escape it via "../".
    const resolved = path.normalize(path.join(DIST, pathname))
    if (!resolved.startsWith(DIST)) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(resolved).toString())
  })

  createWindow()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

// Standard macOS behavior: keep running with the window closed,
// recreate it from the dock.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

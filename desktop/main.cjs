const { app, BrowserWindow, protocol, shell } = require('electron');
const { readFile, stat } = require('node:fs/promises');
const path = require('node:path');

protocol.registerSchemesAsPrivileged([
	{
		scheme: 'monkr',
		privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
	}
]);

const contentTypes = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.mjs': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.wasm': 'application/wasm',
	'.webmanifest': 'application/manifest+json',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

const buildDir = path.resolve(__dirname, '..', 'build');

async function serveApp(request) {
	const url = new URL(request.url);
	let pathname;
	try {
		pathname = decodeURIComponent(url.pathname);
	} catch {
		return new Response('Bad path', { status: 400 });
	}
	const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
	const candidate = path.resolve(buildDir, relativePath);
	if (candidate !== buildDir && !candidate.startsWith(buildDir + path.sep)) {
		return new Response('Forbidden', { status: 403 });
	}
	let filename = candidate;
	try {
		if (!(await stat(filename)).isFile()) throw new Error('Not a file');
	} catch {
		// SvelteKit's static fallback handles client-side routes.
		if (path.extname(relativePath)) return new Response('Not found', { status: 404 });
		filename = path.join(buildDir, 'index.html');
	}
	const bytes = await readFile(filename);
	return new Response(bytes, {
		headers: {
			'Content-Type': contentTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless'
		}
	});
}

async function createWindow() {
	const window = new BrowserWindow({
		icon: path.resolve(__dirname, '..', 'static', 'icon-512.png'),
		width: 1440,
		height: 900,
		minWidth: 1000,
		minHeight: 650,
		backgroundColor: '#09090b',
		webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
	});
	window.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https:\/\//i.test(url)) shell.openExternal(url);
		return { action: 'deny' };
	});
	window.webContents.on('will-navigate', (event, url) => {
		if (!url.startsWith('monkr://app/')) event.preventDefault();
	});
	await window.loadURL('monkr://app/');
}

if (process.env.PORTABLE_EXECUTABLE_DIR) {
	app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'MonkrLitePortableData'));
}

app.whenReady().then(async () => {
	protocol.handle('monkr', serveApp);
	await createWindow();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

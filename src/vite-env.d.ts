/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_MONKR_MEDIA_ORIGIN?: string;
	readonly VITE_MONKR_LEGACY_ORIGIN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

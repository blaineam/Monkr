// Popular Google Fonts for text overlays
export const fontFamilies = [
	// Sans-serif
	'Inter',
	'Roboto',
	'Open Sans',
	'Montserrat',
	'Poppins',
	'Lato',
	'Nunito',
	'Raleway',
	'Source Sans 3',
	'Ubuntu',
	'Rubik',
	'Work Sans',
	'DM Sans',
	'Space Grotesk',
	'Outfit',
	'Sora',
	'Plus Jakarta Sans',
	'Archivo',
	'Barlow',
	'Cabin',
	'Quicksand',
	'Manrope',
	'Figtree',
	'Geist',
	'Lexend',
	'Albert Sans',
	'Red Hat Display',
	'Urbanist',
	'Satoshi',
	'General Sans',
	// Display / Decorative
	'Bebas Neue',
	'Oswald',
	'Anton',
	'Righteous',
	'Permanent Marker',
	'Pacifico',
	'Lobster',
	'Satisfy',
	'Dancing Script',
	'Great Vibes',
	'Abril Fatface',
	'Titan One',
	'Bungee',
	'Bungee Shade',
	'Fredoka',
	'Comfortaa',
	'Josefin Sans',
	// Serif
	'Playfair Display',
	'Merriweather',
	'Lora',
	'PT Serif',
	'Libre Baskerville',
	'Cormorant Garamond',
	'EB Garamond',
	'Crimson Text',
	'Bitter',
	'Noto Serif',
	'DM Serif Display',
	'Fraunces',
	// Mono
	'JetBrains Mono',
	'Fira Code',
	'Source Code Pro',
	'IBM Plex Mono',
	'Space Mono'
];

let loadedFonts = new Set<string>();

export function loadFont(family: string) {
	if (loadedFonts.has(family)) return;
	loadedFonts.add(family);

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.crossOrigin = 'anonymous';
	link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
	document.head.appendChild(link);
}

// Preload a few popular fonts
export function preloadFonts() {
	['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Space Grotesk', 'Bebas Neue', 'DM Sans'].forEach(loadFont);
}

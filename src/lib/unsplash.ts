// Unsplash API integration for background image search
// Get a free API key at https://unsplash.com/developers
// Set via localStorage: localStorage.setItem('unsplash_key', 'YOUR_KEY')
function getAccessKey(): string {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('unsplash_key') ?? '';
	}
	return '';
}

export interface UnsplashPhoto {
	id: string;
	urls: {
		thumb: string;
		small: string;
		regular: string;
		full: string;
	};
	user: {
		name: string;
		links: { html: string };
	};
	alt_description: string | null;
}

export async function searchUnsplash(
	query: string,
	page = 1,
	perPage = 20
): Promise<UnsplashPhoto[]> {
	try {
		const key = getAccessKey();
		if (!key) return [];
		const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`;
		const res = await fetch(url, {
			headers: { Authorization: `Client-ID ${key}` }
		});
		if (!res.ok) return [];
		const data = await res.json();
		return data.results ?? [];
	} catch {
		return [];
	}
}

// Curated categories with pre-defined search terms
export const backgroundCategories = [
	{ name: 'Abstract', query: 'abstract gradient colorful' },
	{ name: 'Nature', query: 'nature landscape scenic' },
	{ name: 'Space', query: 'galaxy nebula stars space' },
	{ name: 'Texture', query: 'texture pattern minimal' },
	{ name: 'Architecture', query: 'architecture minimal building' },
	{ name: 'Ocean', query: 'ocean waves water blue' },
	{ name: 'Mountains', query: 'mountains landscape scenic' },
	{ name: 'Dark', query: 'dark moody minimal black' },
	{ name: 'Pastel', query: 'pastel soft colors minimal' },
	{ name: 'Neon', query: 'neon lights glow vibrant' }
];

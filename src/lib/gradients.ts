import type { GradientPreset } from './types';

export const gradientPresets: GradientPreset[] = [
	// Cosmic
	{ name: 'Nebula', css: 'linear-gradient(135deg, #0c0a09, #581c87, #c026d3, #f472b6)', category: 'Cosmic' },
	{ name: 'Deep Space', css: 'linear-gradient(135deg, #020617, #1e1b4b, #4338ca)', category: 'Cosmic' },
	{ name: 'Stardust', css: 'linear-gradient(135deg, #1e1b4b, #7c3aed, #c084fc)', category: 'Cosmic' },
	{ name: 'Galactic', css: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)', category: 'Cosmic' },
	// Warm
	{ name: 'Sunset', css: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)', category: 'Warm' },
	{ name: 'Rose Gold', css: 'linear-gradient(135deg, #fda4af, #f472b6, #e879f9)', category: 'Warm' },
	{ name: 'Lava', css: 'linear-gradient(135deg, #dc2626, #f97316, #facc15)', category: 'Warm' },
	{ name: 'Ember', css: 'linear-gradient(135deg, #7f1d1d, #b91c1c, #f97316)', category: 'Warm' },
	{ name: 'Peach', css: 'linear-gradient(135deg, #fed7aa, #fdba74, #fb923c)', category: 'Warm' },
	// Cool
	{ name: 'Ocean', css: 'linear-gradient(135deg, #0ea5e9, #2563eb, #7c3aed)', category: 'Cool' },
	{ name: 'Arctic', css: 'linear-gradient(135deg, #ecfeff, #67e8f9, #06b6d4)', category: 'Cool' },
	{ name: 'Deep Sea', css: 'linear-gradient(135deg, #0f172a, #1e3a5f, #0ea5e9)', category: 'Cool' },
	{ name: 'Frost', css: 'linear-gradient(135deg, #dbeafe, #93c5fd, #3b82f6)', category: 'Cool' },
	{ name: 'Ice', css: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)', category: 'Cool' },
	// Nature
	{ name: 'Aurora', css: 'linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)', category: 'Nature' },
	{ name: 'Forest', css: 'linear-gradient(135deg, #064e3b, #065f46, #10b981)', category: 'Nature' },
	{ name: 'Tropical', css: 'linear-gradient(135deg, #f59e0b, #10b981, #06b6d4)', category: 'Nature' },
	{ name: 'Spring', css: 'linear-gradient(135deg, #bbf7d0, #86efac, #4ade80)', category: 'Nature' },
	// Pastel
	{ name: 'Cotton Candy', css: 'linear-gradient(135deg, #f9a8d4, #c4b5fd, #93c5fd)', category: 'Pastel' },
	{ name: 'Lavender', css: 'linear-gradient(135deg, #e9d5ff, #c4b5fd, #a78bfa)', category: 'Pastel' },
	{ name: 'Mint', css: 'linear-gradient(135deg, #d1fae5, #a7f3d0, #6ee7b7)', category: 'Pastel' },
	{ name: 'Blush', css: 'linear-gradient(135deg, #fce7f3, #fbcfe8, #f9a8d4)', category: 'Pastel' },
	// Neon
	{ name: 'Neon', css: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)', category: 'Neon' },
	{ name: 'Electric', css: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)', category: 'Neon' },
	{ name: 'Cyberpunk', css: 'linear-gradient(135deg, #f0abfc, #c084fc, #818cf8, #22d3ee)', category: 'Neon' },
	// Neutral
	{ name: 'Slate', css: 'linear-gradient(135deg, #334155, #475569, #64748b)', category: 'Neutral' },
	{ name: 'Storm', css: 'linear-gradient(135deg, #1e293b, #334155, #475569)', category: 'Neutral' },
	{ name: 'Graphite', css: 'linear-gradient(135deg, #18181b, #27272a, #3f3f46)', category: 'Neutral' },
	{ name: 'Silver', css: 'linear-gradient(135deg, #d4d4d8, #a1a1aa, #71717a)', category: 'Neutral' },
	// Mesh-like
	{ name: 'Purple Haze', css: 'radial-gradient(at 20% 80%, #7c3aed 0%, transparent 60%), radial-gradient(at 80% 20%, #ec4899 0%, transparent 60%), radial-gradient(at 50% 50%, #2563eb 0%, transparent 80%), #1e1b4b', category: 'Mesh' },
	{ name: 'Sunset Mesh', css: 'radial-gradient(at 30% 70%, #f97316 0%, transparent 50%), radial-gradient(at 70% 30%, #ec4899 0%, transparent 50%), radial-gradient(at 50% 50%, #a855f7 0%, transparent 60%), #1e1b4b', category: 'Mesh' },
	{ name: 'Ocean Mesh', css: 'radial-gradient(at 20% 20%, #06b6d4 0%, transparent 50%), radial-gradient(at 80% 80%, #3b82f6 0%, transparent 50%), radial-gradient(at 50% 50%, #8b5cf6 0%, transparent 60%), #0f172a', category: 'Mesh' },
];

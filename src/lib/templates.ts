// Layout templates for common device arrangements
export interface LayoutTemplate {
	id: string;
	name: string;
	description: string;
	positions: Array<{
		x: number;
		y: number;
		scale: number;
		rotation: number;
		tiltX: number;
		tiltY: number;
	}>;
}

export const layoutTemplates: LayoutTemplate[] = [
	{
		id: 'single-center',
		name: 'Single Center',
		description: '1 device centered',
		positions: [{ x: 50, y: 50, scale: 1, rotation: 0, tiltX: 0, tiltY: 0 }]
	},
	{
		id: 'single-tilt',
		name: 'Single Tilted',
		description: '1 device with 3D tilt',
		positions: [{ x: 50, y: 50, scale: 1, rotation: 0, tiltX: -8, tiltY: 12 }]
	},
	{
		id: 'duo-side-by-side',
		name: 'Side by Side',
		description: '2 devices next to each other',
		positions: [
			{ x: 35, y: 50, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 65, y: 50, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 }
		]
	},
	{
		id: 'duo-overlap',
		name: 'Overlap',
		description: '2 devices overlapping',
		positions: [
			{ x: 40, y: 50, scale: 0.9, rotation: -5, tiltX: 0, tiltY: 8 },
			{ x: 60, y: 50, scale: 0.9, rotation: 5, tiltX: 0, tiltY: -8 }
		]
	},
	{
		id: 'duo-stacked',
		name: 'Stacked',
		description: '2 devices stacked vertically',
		positions: [
			{ x: 50, y: 35, scale: 0.8, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 50, y: 65, scale: 0.8, rotation: 0, tiltX: 0, tiltY: 0 }
		]
	},
	{
		id: 'trio-fan',
		name: 'Fan',
		description: '3 devices fanned out',
		positions: [
			{ x: 30, y: 52, scale: 0.75, rotation: -12, tiltX: 0, tiltY: 5 },
			{ x: 50, y: 48, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 70, y: 52, scale: 0.75, rotation: 12, tiltX: 0, tiltY: -5 }
		]
	},
	{
		id: 'trio-cascade',
		name: 'Cascade',
		description: '3 devices cascading',
		positions: [
			{ x: 30, y: 40, scale: 0.7, rotation: 0, tiltX: -5, tiltY: 10 },
			{ x: 50, y: 50, scale: 0.8, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 70, y: 60, scale: 0.7, rotation: 0, tiltX: 5, tiltY: -10 }
		]
	},
	{
		id: 'quad-grid',
		name: 'Grid 2x2',
		description: '4 devices in a grid',
		positions: [
			{ x: 30, y: 35, scale: 0.65, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 70, y: 35, scale: 0.65, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 30, y: 65, scale: 0.65, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 70, y: 65, scale: 0.65, rotation: 0, tiltX: 0, tiltY: 0 }
		]
	},
	{
		id: 'hero-left',
		name: 'Hero Left',
		description: 'Large device left, small right',
		positions: [
			{ x: 38, y: 50, scale: 1, rotation: 0, tiltX: 0, tiltY: 5 },
			{ x: 72, y: 55, scale: 0.6, rotation: 0, tiltX: 0, tiltY: -5 }
		]
	},
	{
		id: 'hero-right',
		name: 'Hero Right',
		description: 'Small device left, large right',
		positions: [
			{ x: 28, y: 55, scale: 0.6, rotation: 0, tiltX: 0, tiltY: 5 },
			{ x: 62, y: 50, scale: 1, rotation: 0, tiltX: 0, tiltY: -5 }
		]
	},
	{
		id: 'perspective-row',
		name: 'Perspective Row',
		description: '3 devices with 3D perspective',
		positions: [
			{ x: 25, y: 50, scale: 0.7, rotation: 0, tiltX: 0, tiltY: 20 },
			{ x: 50, y: 48, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 75, y: 50, scale: 0.7, rotation: 0, tiltX: 0, tiltY: -20 }
		]
	},
	{
		id: 'isometric',
		name: 'Isometric',
		description: '2 devices with isometric tilt',
		positions: [
			{ x: 40, y: 50, scale: 0.85, rotation: 0, tiltX: -15, tiltY: 15 },
			{ x: 65, y: 50, scale: 0.85, rotation: 0, tiltX: -15, tiltY: 15 }
		]
	},
	{
		id: 'phone-tablet',
		name: 'Phone + Tablet',
		description: 'Phone overlapping tablet',
		positions: [
			{ x: 45, y: 50, scale: 0.9, rotation: 0, tiltX: 0, tiltY: 5 },
			{ x: 65, y: 55, scale: 0.5, rotation: 5, tiltX: 0, tiltY: -5 }
		]
	},
	{
		id: 'laptop-phone',
		name: 'Laptop + Phone',
		description: 'Laptop with phone overlay',
		positions: [
			{ x: 45, y: 48, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 75, y: 60, scale: 0.45, rotation: 5, tiltX: 0, tiltY: -8 }
		]
	},
	{
		id: 'stacked-overlap',
		name: 'Stacked Overlap',
		description: '3 devices stacked with overlap',
		positions: [
			{ x: 40, y: 40, scale: 0.7, rotation: -8, tiltX: 0, tiltY: 5 },
			{ x: 50, y: 50, scale: 0.8, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 60, y: 60, scale: 0.7, rotation: 8, tiltX: 0, tiltY: -5 }
		]
	},
	{
		id: 'scattered',
		name: 'Scattered',
		description: '4 devices scattered with rotation',
		positions: [
			{ x: 25, y: 35, scale: 0.55, rotation: -15, tiltX: 5, tiltY: 10 },
			{ x: 70, y: 30, scale: 0.6, rotation: 8, tiltX: -3, tiltY: -5 },
			{ x: 35, y: 65, scale: 0.5, rotation: 12, tiltX: 0, tiltY: 8 },
			{ x: 75, y: 68, scale: 0.55, rotation: -5, tiltX: 3, tiltY: -10 }
		]
	},
	{
		id: 'diagonal-cascade',
		name: 'Diagonal',
		description: '3 devices on a diagonal',
		positions: [
			{ x: 25, y: 30, scale: 0.65, rotation: -5, tiltX: -5, tiltY: 15 },
			{ x: 50, y: 50, scale: 0.75, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 75, y: 70, scale: 0.65, rotation: 5, tiltX: 5, tiltY: -15 }
		]
	},
	{
		id: 'floating-stack',
		name: 'Float Stack',
		description: '3 devices floating with depth',
		positions: [
			{ x: 35, y: 55, scale: 0.6, rotation: -3, tiltX: -10, tiltY: 12 },
			{ x: 50, y: 45, scale: 0.85, rotation: 0, tiltX: -5, tiltY: 5 },
			{ x: 65, y: 55, scale: 0.6, rotation: 3, tiltX: -10, tiltY: -12 }
		]
	},
	{
		id: 'showcase-five',
		name: 'Showcase 5',
		description: '5 devices in a showcase arc',
		positions: [
			{ x: 15, y: 55, scale: 0.45, rotation: -10, tiltX: 0, tiltY: 20 },
			{ x: 32, y: 48, scale: 0.6, rotation: -5, tiltX: 0, tiltY: 10 },
			{ x: 50, y: 45, scale: 0.75, rotation: 0, tiltX: 0, tiltY: 0 },
			{ x: 68, y: 48, scale: 0.6, rotation: 5, tiltX: 0, tiltY: -10 },
			{ x: 85, y: 55, scale: 0.45, rotation: 10, tiltX: 0, tiltY: -20 }
		]
	}
];

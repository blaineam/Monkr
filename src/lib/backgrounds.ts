// Curated background image categories from shots.so-style asset library

export interface BackgroundImage {
	preview: string; // thumbnail URL
	original: string; // full-res URL
}

export interface BackgroundImageCategory {
	id: string;
	name: string;
	images: BackgroundImage[];
}

// Build image lists from the manifest data
const categoryData: Record<string, { name: string; files: string[] }> = {
	abstract: {
		name: 'Abstract',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
			'10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg',
			'shots-1.jpg', 'shots-2.jpg', 'shots-3.jpg', 'shots-4.jpg', 'shots-5.jpg',
			'shots-6.jpg', 'shots-7.jpg', 'shots-8.jpg', 'shots-9.jpg', 'shots-10.jpg',
			'shots-11.jpg', 'shots-12.jpg', 'shots-13.jpg', 'shots-14.jpg', 'shots-15.jpg',
			'shots-16.jpg', 'shots-18.jpg', 'shots-19.jpg'
		]
	},
	cosmic: {
		name: 'Cosmic',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg',
			'shots-1.jpg', 'shots-2.jpg', 'shots-3.jpg', 'shots-4.jpg', 'shots-5.jpg',
			'shots-6.jpg', 'shots-7.jpg', 'shots-8.jpg', 'shots-9.jpg', 'shots-10.jpg'
		]
	},
	desktop: {
		name: 'Desktop',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
			'10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg',
			'16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg',
			'21.jpg', '22.jpg', '23.jpg', '24.jpg', '25.jpg',
			'26.jpg', '27.jpg', '28.jpg', '29.jpg', '30.jpg',
			'31.jpg', '32.jpg', '33.jpg', '34.jpg', '35.jpg',
			'36.jpg', '37.jpg', '38.jpg', '39.jpg', '40.jpg',
			'41.jpg', '42.jpeg', '43.jpeg', '44.jpg', '45.jpg',
			'46.jpg', '47.jpg', '48.jpg', '49.jpg', '50.jpg', '51.jpg'
		]
	},
	earth: {
		name: 'Earth',
		files: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg']
	},
	'holo-gradients': {
		name: 'Holo',
		files: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg']
	},
	'mystic-gradients': {
		name: 'Mystic',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
			'10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg'
		]
	},
	'paper-glass': {
		name: 'Glass',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg',
			'6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg', '11.jpg'
		]
	},
	radiant: {
		name: 'Radiant',
		files: [
			'1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
			'10.jpg', '11.jpg', '12.jpg'
		]
	},
	'vintage-gradients': {
		name: 'Vintage',
		files: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg']
	}
};

export const backgroundImageCategories: BackgroundImageCategory[] = Object.entries(categoryData).map(
	([id, { name, files }]) => ({
		id,
		name,
		images: files.map((f) => ({
			preview: `/backgrounds/preview/${id}/${f}`,
			original: `/backgrounds/original/${id}/${f}`
		}))
	})
);

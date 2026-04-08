// Perspective transform: compute CSS matrix3d() to warp a rectangle into an arbitrary quadrilateral

/**
 * Solve a linear system Ax = b using Gaussian elimination with partial pivoting.
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
	const n = A.length;
	const M = A.map((row, i) => [...row, b[i]]);

	for (let col = 0; col < n; col++) {
		let maxRow = col;
		let maxVal = Math.abs(M[col][col]);
		for (let row = col + 1; row < n; row++) {
			const val = Math.abs(M[row][col]);
			if (val > maxVal) {
				maxVal = val;
				maxRow = row;
			}
		}
		[M[col], M[maxRow]] = [M[maxRow], M[col]];

		for (let row = col + 1; row < n; row++) {
			const factor = M[row][col] / M[col][col];
			for (let j = col; j <= n; j++) {
				M[row][j] -= factor * M[col][j];
			}
		}
	}

	const x = new Array(n);
	for (let row = n - 1; row >= 0; row--) {
		x[row] = M[row][n];
		for (let j = row + 1; j < n; j++) {
			x[row] -= M[row][j] * x[j];
		}
		x[row] /= M[row][row];
	}
	return x;
}

/**
 * Compute a CSS matrix3d() string that maps a w×h rectangle to a quadrilateral.
 *
 * @param w - source width (element's rendered width)
 * @param h - source height (element's rendered height)
 * @param dst - 8 numbers: [x0,y0, x1,y1, x2,y2, x3,y3]
 *              corners in order: top-left, top-right, bottom-left, bottom-right
 *              coordinates are in pixels relative to the container
 */
export function computeMatrix3d(
	w: number,
	h: number,
	dst: [number, number, number, number, number, number, number, number]
): string {
	const src = [0, 0, w, 0, 0, h, w, h];

	// Build 8x8 system
	const A: number[][] = [];
	const b: number[] = [];
	for (let i = 0; i < 4; i++) {
		const sx = src[i * 2],
			sy = src[i * 2 + 1];
		const dx = dst[i * 2],
			dy = dst[i * 2 + 1];
		A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
		A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
		b.push(dx);
		b.push(dy);
	}

	const coeffs = gaussianElimination(A, b);
	const [a, bb, c, d, e, f, g, hh] = coeffs;

	return `matrix3d(${a},${d},0,${g}, ${bb},${e},0,${hh}, 0,0,1,0, ${c},${f},0,1)`;
}

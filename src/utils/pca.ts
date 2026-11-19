export interface PcaInputItem {
  id: string;
  vector: number[];
}

export interface PcaProjectedPoint {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface PcaResult<T extends PcaInputItem> {
  points: Array<T & { coords3D: [number, number, number] }>;
  varianceExplained: [number, number, number];
}

/**
 * Computes eigenvalues and eigenvectors of a real symmetric matrix
 * using the classical Jacobi rotation method.
 */
function jacobiEigenSymmetric(matrix: number[][], maxIterations = 100): {
  eigenvalues: number[];
  eigenvectors: number[][];
} {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    let p: number = 0;
    let q: number = 1;
    let maxOffDiag = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(a[i][j]);
        if (absVal > maxOffDiag) {
          maxOffDiag = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOffDiag < 1e-10) {
      break;
    }

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    const tau = (aqq - app) / (2 * apq);
    const t =
      tau >= 0
        ? 1 / (tau + Math.sqrt(1 + tau * tau))
        : -1 / (-tau + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    a[p][p] = app - t * apq;
    a[q][q] = aqq + t * apq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let r = 0; r < n; r++) {
      if (r !== p && r !== q) {
        const arp = a[r][p];
        const arq = a[r][q];
        a[r][p] = c * arp - s * arq;
        a[p][r] = a[r][p];
        a[r][q] = s * arp + c * arq;
        a[q][r] = a[r][q];
      }
    }

    for (let r = 0; r < n; r++) {
      const vrp = v[r][p];
      const vrq = v[r][q];
      v[r][p] = c * vrp - s * vrq;
      v[r][q] = s * vrp + c * vrq;
    }
  }

  const eigenvalues = Array.from({ length: n }, (_, i) => a[i][i]);
  // Columns of v are eigenvectors; return list of eigenvectors
  const eigenvectors = Array.from({ length: n }, (_, col) =>
    Array.from({ length: n }, (_, row) => v[row][col]),
  );

  return { eigenvalues, eigenvectors };
}

/**
 * Projects high-dimensional embedding vectors down to 3D using Principal Component Analysis (PCA),
 * then scales uniformly so the scatter fits cleanly within [-range, range].
 */
export function projectEmbeddingsTo3D<T extends PcaInputItem>(
  items: T[],
  scaleRange = 2.1,
): PcaResult<T> {
  if (items.length === 0) {
    return { points: [], varianceExplained: [0, 0, 0] };
  }

  const dims = items[0].vector.length;
  const n = items.length;

  // 1. Compute mean vector
  const mean = Array(dims).fill(0);
  for (const item of items) {
    for (let d = 0; d < dims; d++) {
      mean[d] += item.vector[d];
    }
  }
  for (let d = 0; d < dims; d++) {
    mean[d] /= n;
  }

  // 2. Mean-center data matrix
  const centered = items.map((item) =>
    item.vector.map((val, d) => val - mean[d]),
  );

  // 3. Covariance matrix (D x D)
  const cov = Array.from({ length: dims }, () => Array(dims).fill(0));
  const denom = Math.max(n - 1, 1);
  for (let i = 0; i < dims; i++) {
    for (let j = i; j < dims; j++) {
      let sum = 0;
      for (let row = 0; row < n; row++) {
        sum += centered[row][i] * centered[row][j];
      }
      const val = sum / denom;
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }

  // 4. Eigendecomposition sorted descending by eigenvalue
  const { eigenvalues, eigenvectors } = jacobiEigenSymmetric(cov);
  const sortedIndices = eigenvalues
    .map((val, idx) => ({ val: Math.max(0, val), idx }))
    .sort((a, b) => b.val - a.val);

  const totalVariance = sortedIndices.reduce((acc, item) => acc + item.val, 0) || 1;
  const top3 = sortedIndices.slice(0, 3);

  // Canonicalize eigenvector sign for deterministic orientation
  const axes = top3.map(({ idx }) => {
    const vec = [...eigenvectors[idx]];
    let maxIdx = 0;
    for (let i = 1; i < vec.length; i++) {
      if (Math.abs(vec[i]) > Math.abs(vec[maxIdx])) {
        maxIdx = i;
      }
    }
    if (vec[maxIdx] < 0) {
      for (let i = 0; i < vec.length; i++) vec[i] = -vec[i];
    }
    return vec;
  });

  // 5. Project each centered vector onto top 3 principal components
  const rawProjected = centered.map((row) =>
    axes.map((axis) =>
      row.reduce((sum, val, d) => sum + val * axis[d], 0),
    ) as [number, number, number],
  );

  // Uniformly scale into [-scaleRange, scaleRange] while preserving aspect ratio
  let maxAbs = 0;
  for (const [x, y, z] of rawProjected) {
    maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y), Math.abs(z));
  }
  const factor = maxAbs > 1e-8 ? scaleRange / maxAbs : 1;

  const points = items.map((item, idx) => {
    const [x, y, z] = rawProjected[idx];
    return {
      ...item,
      coords3D: [
        Math.round(x * factor * 1000) / 1000,
        Math.round(y * factor * 1000) / 1000,
        Math.round(z * factor * 1000) / 1000,
      ] as [number, number, number],
    };
  });

  const varianceExplained: [number, number, number] = [
    Math.round(((top3[0]?.val ?? 0) / totalVariance) * 100),
    Math.round(((top3[1]?.val ?? 0) / totalVariance) * 100),
    Math.round(((top3[2]?.val ?? 0) / totalVariance) * 100),
  ];

  return { points, varianceExplained };
}

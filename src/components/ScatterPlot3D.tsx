import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  cosineSimilarity,
  getNearestNeighbors,
  type ComparisonEmbeddingItem,
} from '../utils/embeddings';

export type ProjectedEmbeddingPoint = ComparisonEmbeddingItem & {
  coords3D: [number, number, number];
};

export type CameraPreset = 'iso' | 'top' | 'front' | 'side';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  sourceId: string;
  nonce: number;
}

interface ScatterPlot3DProps {
  plotId: string;
  title: string;
  subtitle: string;
  points: ProjectedEmbeddingPoint[];
  varianceExplained: [number, number, number];
  selectedPointId: string;
  onSelectPoint: (pointId: string) => void;
  showLinks: boolean;
  showClusters: boolean;
  showLabels: boolean;
  externalCameraPose: CameraPose | null;
  onCameraPoseChange?: (pose: CameraPose) => void;
  testId: string;
}

interface HoverTooltipState {
  point: ProjectedEmbeddingPoint;
  x: number;
  y: number;
  similarityToSelected: number | null;
}

const PRESET_CAMERA_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  iso: [5.2, 3.6, 5.6],
  top: [0.01, 7.6, 0.01],
  front: [0, 0.4, 7.6],
  side: [7.6, 0.4, 0],
};

function createTextLabelSprite(label: string, accentHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 22;
  ctx.font = `600 ${fontSize}px "DM Sans", system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;

  const padX = 14;
  const padY = 8;
  canvas.width = Math.ceil(textWidth + padX * 2);
  canvas.height = fontSize + padY * 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 2.5;
  const r = 8;
  const w = canvas.width;
  const h = canvas.height;
  ctx.beginPath();
  ctx.moveTo(r, 1.5);
  ctx.lineTo(w - r, 1.5);
  ctx.quadraticCurveTo(w - 1.5, 1.5, w - 1.5, r);
  ctx.lineTo(w - 1.5, h - r);
  ctx.quadraticCurveTo(w - 1.5, h - 1.5, w - r, h - 1.5);
  ctx.lineTo(r, h - 1.5);
  ctx.quadraticCurveTo(1.5, h - 1.5, 1.5, h - r);
  ctx.lineTo(1.5, r);
  ctx.quadraticCurveTo(1.5, 1.5, r, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.fillRect(6, h - 5, w - 12, 3.5);

  ctx.font = `600 ${fontSize}px "DM Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2 - 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const aspect = w / h;
  const spriteHeight = 0.28;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createSimilarityBadgeSprite(scoreText: string, borderHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 116;
  canvas.height = 38;

  ctx.fillStyle = '#FFFDF5';
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 2.5;
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(scoreText, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.62, 0.21, 1);
  sprite.renderOrder = 12;
  return sprite;
}

function createAxisBadgeSprite(axisText: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 72;
  canvas.height = 34;
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#6B7280';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(axisText, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.45, 0.22, 1);
  return sprite;
}

export function ScatterPlot3D({
  plotId,
  title,
  subtitle,
  points,
  varianceExplained,
  selectedPointId,
  onSelectPoint,
  showLinks,
  showClusters,
  showLabels,
  externalCameraPose,
  onCameraPoseChange,
  testId,
}: ScatterPlot3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelectPoint);
  const onCameraChangeRef = useRef(onCameraPoseChange);
  const selectedIdRef = useRef(selectedPointId);
  const hoveredIdRef = useRef<string | null>(null);

  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const floorMarkerRef = useRef<THREE.Mesh | null>(null);
  const pointMapRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const labelGroupRef = useRef<THREE.Group | null>(null);
  const clusterGroupRef = useRef<THREE.Group | null>(null);
  const linksGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isSoftwareGlRef = useRef<boolean>(false);
  const suppressSyncRef = useRef<boolean>(false);
  const transitionGoalRef = useRef<THREE.Vector3 | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});

  const [webglError, setWebglError] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>('iso');
  const [tooltip, setTooltip] = useState<HoverTooltipState | null>(null);

  onSelectRef.current = onSelectPoint;
  onCameraChangeRef.current = onCameraPoseChange;
  selectedIdRef.current = selectedPointId;

  // Build Three.js scene once per points array
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();
    isSoftwareGlRef.current = isSoftwareGl;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;
    renderer.setSize(width, height);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const handleContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(...PRESET_CAMERA_POSITIONS.iso);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe5e7eb, 1.15);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // Coordinate floor grid + axes
    const floorY = -2.35;
    const grid = new THREE.GridHelper(5.2, 8, 0xd1d5db, 0xe5e7eb);
    grid.position.y = floorY;
    scene.add(grid);

    const axesMaterialX = new THREE.LineBasicMaterial({ color: 0xd1d5db });
    const axisPoints = [
      [new THREE.Vector3(-2.6, 0, 0), new THREE.Vector3(2.6, 0, 0)],
      [new THREE.Vector3(0, floorY, 0), new THREE.Vector3(0, 2.5, 0)],
      [new THREE.Vector3(0, 0, -2.6), new THREE.Vector3(0, 0, 2.6)],
    ];
    for (const pair of axisPoints) {
      const geo = new THREE.BufferGeometry().setFromPoints(pair);
      scene.add(new THREE.Line(geo, axesMaterialX));
    }

    const sphereGeo = new THREE.SphereGeometry(0.17, 24, 24);
    const clickableMeshes: THREE.Mesh[] = [];
    const createdMaterials: THREE.Material[] = [axesMaterialX];
    const createdGeometries: THREE.BufferGeometry[] = [sphereGeo];
    const createdTextures: THREE.Texture[] = [];

    const axisBadges: Array<{ text: string; pos: [number, number, number] }> = [
      { text: 'PC1', pos: [2.85, 0, 0] },
      { text: 'PC2', pos: [0, 2.68, 0] },
      { text: 'PC3', pos: [0, 0, 2.85] },
    ];
    for (const badge of axisBadges) {
      const sprite = createAxisBadgeSprite(badge.text);
      sprite.position.set(...badge.pos);
      scene.add(sprite);
      if (sprite.material.map) createdTextures.push(sprite.material.map);
      createdMaterials.push(sprite.material);
    }

    const dropLineMat = new THREE.LineBasicMaterial({
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.65,
    });
    createdMaterials.push(dropLineMat);

    const labelGroup = new THREE.Group();
    scene.add(labelGroup);
    labelGroupRef.current = labelGroup;

    const clusterGroup = new THREE.Group();
    scene.add(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    const linksGroup = new THREE.Group();
    scene.add(linksGroup);
    linksGroupRef.current = linksGroup;

    const pointMap = new Map<string, THREE.Vector3>();
    const meshMap = new Map<string, THREE.Mesh>();

    for (const pt of points) {
      const [px, py, pz] = pt.coords3D;
      const pos = new THREE.Vector3(px, py, pz);
      pointMap.set(pt.id, pos);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pt.colorHex),
        roughness: 0.28,
        metalness: 0.12,
      });
      createdMaterials.push(mat);

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.copy(pos);
      mesh.userData.pointId = pt.id;
      scene.add(mesh);
      clickableMeshes.push(mesh);
      meshMap.set(pt.id, mesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        pos,
        new THREE.Vector3(px, floorY, pz),
      ]);
      createdGeometries.push(lineGeo);
      scene.add(new THREE.Line(lineGeo, dropLineMat));

      const sprite = createTextLabelSprite(pt.label, pt.colorHex);
      sprite.position.set(px, py + 0.36, pz);
      labelGroup.add(sprite);
      if (sprite.material.map) createdTextures.push(sprite.material.map);
      createdMaterials.push(sprite.material);
    }

    pointMapRef.current = pointMap;
    meshMapRef.current = meshMap;

    // Build cluster envelopes (Sentence 1 financial cluster vs Sentence 2 river cluster)
    const buildClusterEnvelope = (
      clusterIds: string[],
      colorHex: number,
    ) => {
      const clusterVecs = clusterIds
        .map((id) => pointMap.get(id))
        .filter((v): v is THREE.Vector3 => Boolean(v));
      if (clusterVecs.length < 2) return;

      const centroid = new THREE.Vector3();
      for (const v of clusterVecs) centroid.add(v);
      centroid.divideScalar(clusterVecs.length);

      let maxDist = 0.55;
      for (const v of clusterVecs) {
        maxDist = Math.max(maxDist, centroid.distanceTo(v) + 0.35);
      }

      const hullGeo = new THREE.SphereGeometry(maxDist, 20, 16);
      const hullMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      createdGeometries.push(hullGeo);
      createdMaterials.push(hullMat);
      const hullMesh = new THREE.Mesh(hullGeo, hullMat);
      hullMesh.position.copy(centroid);
      clusterGroup.add(hullMesh);

      const floorRingGeo = new THREE.RingGeometry(maxDist * 0.72, maxDist * 0.78, 40);
      floorRingGeo.rotateX(-Math.PI / 2);
      const floorRingMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      createdGeometries.push(floorRingGeo);
      createdMaterials.push(floorRingMat);
      const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
      floorRing.position.set(centroid.x, floorY + 0.015, centroid.z);
      clusterGroup.add(floorRing);
    };

    const financeIds = points
      .filter((p) => p.group === 'finance' || p.id === 'bert-bank-finance')
      .map((p) => p.id);
    const riverIds = points
      .filter((p) => p.group === 'river' || p.id === 'bert-bank-river')
      .map((p) => p.id);

    buildClusterEnvelope(financeIds, 0x2563eb);
    buildClusterEnvelope(riverIds, 0xf97316);

    // Selection ring highlight + floor pulse ring
    const ringGeo = new THREE.TorusGeometry(0.28, 0.026, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    createdGeometries.push(ringGeo);
    createdMaterials.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ringMesh);
    selectionRingRef.current = ringMesh;

    const floorMarkerGeo = new THREE.RingGeometry(0.18, 0.3, 32);
    floorMarkerGeo.rotateX(-Math.PI / 2);
    const floorMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    createdGeometries.push(floorMarkerGeo);
    createdMaterials.push(floorMarkerMat);
    const floorMarker = new THREE.Mesh(floorMarkerGeo, floorMarkerMat);
    scene.add(floorMarker);
    floorMarkerRef.current = floorMarker;

    const initialSelectedPos = pointMap.get(selectedIdRef.current);
    if (initialSelectedPos) {
      ringMesh.position.copy(initialSelectedPos);
      floorMarker.position.set(initialSelectedPos.x, floorY + 0.02, initialSelectedPos.z);
    } else {
      ringMesh.visible = false;
      floorMarker.visible = false;
    }

    // Coalesced on-demand rendering + smooth camera preset transitions
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTimestamp = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        const delta = Math.min(0.05, (now - lastTimestamp) / 1000);
        lastTimestamp = now;
        renderDirty = false;

        let needsMoreFrames = false;
        if (transitionGoalRef.current) {
          const goal = transitionGoalRef.current;
          if (isSoftwareGl) {
            camera.position.copy(goal);
            transitionGoalRef.current = null;
          } else {
            const alpha = 1 - Math.exp(-8 * delta);
            camera.position.lerp(goal, alpha);
            if (camera.position.distanceTo(goal) < 0.03) {
              camera.position.copy(goal);
              transitionGoalRef.current = null;
            } else {
              needsMoreFrames = true;
            }
          }
        }

        // Smooth scale highlight on hovered sphere
        for (const [id, mesh] of meshMapRef.current.entries()) {
          const targetScale = id === hoveredIdRef.current ? 1.26 : id === selectedIdRef.current ? 1.12 : 1;
          mesh.scale.setScalar(targetScale);
        }

        controls.update();
        if (selectionRingRef.current) {
          selectionRingRef.current.lookAt(camera.position);
        }
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if ((renderDirty || needsMoreFrames) && !disposed) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    const handleControlsStart = () => {
      transitionGoalRef.current = null;
      setActivePreset(null);
    };
    const handleControlsChange = () => {
      requestRender();
      if (!suppressSyncRef.current && onCameraChangeRef.current) {
        onCameraChangeRef.current({
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [controls.target.x, controls.target.y, controls.target.z],
          sourceId: plotId,
          nonce: Date.now(),
        });
      }
    };

    controls.addEventListener('start', handleControlsStart);
    controls.addEventListener('change', handleControlsChange);

    // Raycasting for clicking & hovering 3D points
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const distMoved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (distMoved > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.pointId as string | undefined;
        if (hitId) {
          onSelectRef.current(hitId);
        }
      }
    };

    let lastHoverCheck = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 45) return;
      lastHoverCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.pointId as string;
        const pt = points.find((p) => p.id === hitId);
        if (pt) {
          if (hoveredIdRef.current !== hitId) {
            hoveredIdRef.current = hitId;
            requestRender();
          }
          const selPt = points.find((p) => p.id === selectedIdRef.current);
          const sim =
            selPt && selPt.id !== pt.id ? cosineSimilarity(selPt.vector, pt.vector) : null;
          setTooltip({
            point: pt,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            similarityToSelected: sim,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null;
        setTooltip(null);
        requestRender();
      }
      renderer.domElement.style.cursor = 'grab';
    };

    const handlePointerLeave = () => {
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null;
        requestRender();
      }
      setTooltip(null);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed) return;
      const w = Math.max(240, Math.floor(entry.contentRect.width));
      const h = Math.max(240, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.removeEventListener('change', handleControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      createdTextures.forEach((t) => t.dispose());
      envTexture.dispose();
      renderer.dispose();
    };
  }, [points, plotId]);

  // Update visibility of labels & cluster envelopes
  useEffect(() => {
    if (labelGroupRef.current) {
      labelGroupRef.current.visible = showLabels;
    }
    if (clusterGroupRef.current) {
      clusterGroupRef.current.visible = showClusters;
    }
    requestRenderRef.current();
  }, [showLabels, showClusters]);

  // Update selection ring + dynamic similarity connector lines to nearest neighbors
  useEffect(() => {
    const floorY = -2.35;
    const ring = selectionRingRef.current;
    const floorMarker = floorMarkerRef.current;
    const linksGroup = linksGroupRef.current;

    const pos = pointMapRef.current.get(selectedPointId);
    if (ring && floorMarker) {
      if (pos) {
        ring.position.copy(pos);
        ring.visible = true;
        floorMarker.position.set(pos.x, floorY + 0.02, pos.z);
        floorMarker.visible = true;
      } else {
        ring.visible = false;
        floorMarker.visible = false;
      }
    }

    if (linksGroup) {
      // Clear & dispose previous link geometries/materials
      while (linksGroup.children.length > 0) {
        const child = linksGroup.children[0];
        linksGroup.remove(child);
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        } else if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }

      if (showLinks && pos) {
        const selectedPoint = points.find((p) => p.id === selectedPointId);
        if (selectedPoint) {
          const neighbors = getNearestNeighbors(selectedPoint, points, 3);
          neighbors.forEach((neighbor, idx) => {
            const targetPos = pointMapRef.current.get(neighbor.item.id);
            if (!targetPos) return;

            const isStrong = neighbor.similarity >= 0.45;
            const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, targetPos]);
            const lineMat = new THREE.LineBasicMaterial({
              color: isStrong ? 0x111111 : 0x9ca3af,
              transparent: true,
              opacity: isStrong ? 0.78 - idx * 0.14 : 0.45,
            });
            linksGroup.add(new THREE.Line(lineGeo, lineMat));

            // Add cosine similarity badge at midpoint of top 2 nearest links
            if (idx < 2) {
              const mid = new THREE.Vector3().addVectors(pos, targetPos).multiplyScalar(0.5);
              mid.y += 0.14;
              const badge = createSimilarityBadgeSprite(
                `cos ${neighbor.similarity.toFixed(2)}`,
                isStrong ? '#111111' : '#9CA3AF',
              );
              badge.position.copy(mid);
              linksGroup.add(badge);
            }
          });
        }
      }
    }

    requestRenderRef.current();
  }, [selectedPointId, showLinks, points]);

  // Mirror external camera pose when camera sync is active
  useEffect(() => {
    if (!externalCameraPose || externalCameraPose.sourceId === plotId) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    suppressSyncRef.current = true;
    transitionGoalRef.current = null;
    camera.position.set(...externalCameraPose.position);
    controls.target.set(...externalCameraPose.target);
    controls.update();
    requestRenderRef.current();
    suppressSyncRef.current = false;
  }, [externalCameraPose, plotId]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetPos = PRESET_CAMERA_POSITIONS[preset];
    controls.target.set(0, 0, 0);
    if (isSoftwareGlRef.current) {
      camera.position.set(...targetPos);
      controls.update();
    } else {
      transitionGoalRef.current = new THREE.Vector3(...targetPos);
    }
    requestRenderRef.current();

    if (onCameraChangeRef.current) {
      onCameraChangeRef.current({
        position: targetPos,
        target: [0, 0, 0],
        sourceId: plotId,
        nonce: Date.now(),
      });
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col">
      <div className="px-4 py-3.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#111111]">{title}</h3>
          <p className="text-xs text-gray-600">{subtitle}</p>
        </div>
        <span className="text-[11px] font-mono text-gray-600 tabular-nums">
          3D PCA Projection · PC1 {varianceExplained[0]}% · PC2 {varianceExplained[1]}% · PC3{' '}
          {varianceExplained[2]}%
        </span>
      </div>

      {/* Camera angle preset strip */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-gray-500">Camera Angle</span>
        <div className="flex items-center gap-1" role="group" aria-label={`Camera views for ${title}`}>
          {(
            [
              { id: 'iso', label: '3D Iso' },
              { id: 'top', label: 'Top' },
              { id: 'front', label: 'Front' },
              { id: 'side', label: 'Side' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activePreset === preset.id
                  ? 'bg-[#FFD43B] text-[#111111] border border-[#E5B800]'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[330px] sm:h-[370px] bg-white">
        {webglError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50">
            <p className="text-sm font-semibold text-[#111111]">
              3D WebGL viewport unavailable in this browser context
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Use the word buttons below to inspect the exact 3D PCA coordinates and vectors.
            </p>
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              data-testid={testId}
              aria-label={`${title} interactive 3D PCA projection`}
              className="w-full h-full"
            />
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm text-xs"
                style={{
                  left: Math.min(tooltip.x + 14, 240),
                  top: Math.max(8, tooltip.y - 48),
                }}
              >
                <div className="font-mono font-bold text-[#111111] flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tooltip.point.colorHex }}
                  />
                  {tooltip.point.label}
                </div>
                <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                  {tooltip.point.note}
                </div>
                {tooltip.similarityToSelected !== null && (
                  <div className="font-mono text-[11px] font-semibold text-[#111111] mt-1 tabular-nums">
                    Cosine sim to selected: {tooltip.similarityToSelected.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
        <div className="text-xs text-gray-500">
          Drag to rotate · Scroll to zoom · Hover or click any sphere to explore nearest neighbors
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Select word in ${title}`}>
          {points.map((pt) => {
            const isSelected = pt.id === selectedPointId;
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => onSelectPoint(pt.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFD43B] border-[#111111] text-[#111111] font-bold'
                    : 'bg-white border-gray-300 hover:border-[#111111] text-[#111111]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: pt.colorHex }}
                />
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

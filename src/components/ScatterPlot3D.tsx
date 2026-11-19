import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ComparisonEmbeddingItem } from '../utils/embeddings';

export type ProjectedEmbeddingPoint = ComparisonEmbeddingItem & {
  coords3D: [number, number, number];
};

interface ScatterPlot3DProps {
  title: string;
  subtitle: string;
  points: ProjectedEmbeddingPoint[];
  varianceExplained: [number, number, number];
  selectedPointId: string;
  onSelectPoint: (pointId: string) => void;
  testId: string;
}

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
  const spriteHeight = 0.29;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
  sprite.renderOrder = 10;
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
  title,
  subtitle,
  points,
  varianceExplained,
  selectedPointId,
  onSelectPoint,
  testId,
}: ScatterPlot3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelectPoint);
  const selectedIdRef = useRef(selectedPointId);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const pointMapRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const requestRenderRef = useRef<() => void>(() => {});
  const [webglError, setWebglError] = useState(false);

  onSelectRef.current = onSelectPoint;
  selectedIdRef.current = selectedPointId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Software-WebGL probe
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
    camera.position.set(5.2, 3.6, 5.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);
    controls.update();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe5e7eb, 1.1);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // Coordinate floor grid + subtle axes
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
    const axisLines: THREE.Line[] = [];
    for (const pair of axisPoints) {
      const geo = new THREE.BufferGeometry().setFromPoints(pair);
      const line = new THREE.Line(geo, axesMaterialX);
      scene.add(line);
      axisLines.push(line);
    }

    // Add data spheres, drop lines, and text label sprites
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
      opacity: 0.75,
    });
    createdMaterials.push(dropLineMat);

    const pointMap = new Map<string, THREE.Vector3>();

    for (const pt of points) {
      const [px, py, pz] = pt.coords3D;
      const pos = new THREE.Vector3(px, py, pz);
      pointMap.set(pt.id, pos);

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pt.colorHex),
        roughness: 0.3,
        metalness: 0.12,
      });
      createdMaterials.push(mat);

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.copy(pos);
      mesh.userData.pointId = pt.id;
      scene.add(mesh);
      clickableMeshes.push(mesh);

      // Vertical guide line to grid floor
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        pos,
        new THREE.Vector3(px, floorY, pz),
      ]);
      createdGeometries.push(lineGeo);
      const line = new THREE.Line(lineGeo, dropLineMat);
      scene.add(line);

      // Crisp 3D sprite label
      const sprite = createTextLabelSprite(pt.label, pt.colorHex);
      sprite.position.set(px, py + 0.36, pz);
      scene.add(sprite);
      if (sprite.material.map) {
        createdTextures.push(sprite.material.map);
      }
      createdMaterials.push(sprite.material);
    }

    pointMapRef.current = pointMap;

    // Selection ring highlight
    const ringGeo = new THREE.TorusGeometry(0.28, 0.024, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    createdGeometries.push(ringGeo);
    createdMaterials.push(ringMat);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    const initialSelectedPos = pointMap.get(selectedIdRef.current);
    if (initialSelectedPos) {
      ringMesh.position.copy(initialSelectedPos);
    } else {
      ringMesh.visible = false;
    }
    scene.add(ringMesh);
    selectionRingRef.current = ringMesh;

    // Coalesced on-demand rendering
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

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
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        if (selectionRingRef.current) {
          selectionRingRef.current.lookAt(camera.position);
        }
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);

    // Raycasting for clicking points in 3D space
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
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(clickableMeshes, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

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
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      createdTextures.forEach((t) => t.dispose());
      envTexture.dispose();
      renderer.dispose();
    };
  }, [points]);

  // Move selection ring when selectedPointId changes without tearing down WebGL scene
  useEffect(() => {
    const ring = selectionRingRef.current;
    if (!ring) return;
    const pos = pointMapRef.current.get(selectedPointId);
    if (pos) {
      ring.position.copy(pos);
      ring.visible = true;
    } else {
      ring.visible = false;
    }
    requestRenderRef.current();
  }, [selectedPointId]);

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

      <div className="relative w-full h-[320px] sm:h-[360px] bg-white">
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
          <div
            ref={containerRef}
            data-testid={testId}
            aria-label={`${title} interactive 3D PCA projection`}
            className="w-full h-full"
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Drag to rotate · Scroll to zoom · Click a sphere or button to inspect vector</span>
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

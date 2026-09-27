import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { posSound } from '../utils/audio';
import { Sparkles, Flame, RotateCw, Volume2 } from 'lucide-react';

interface Biryani3DPlateProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero' | number;
  className?: string;
  interactive?: boolean;
  autoRotate?: boolean;
  showWobblePrompt?: boolean;
  onPlateClick?: () => void;
  wobbleTrigger?: number;
}

export const Biryani3DPlate: React.FC<Biryani3DPlateProps> = ({
  size = 'md',
  className = '',
  interactive = true,
  autoRotate = true,
  showWobblePrompt = false,
  onPlateClick,
  wobbleTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const plateGroupRef = useRef<THREE.Group | null>(null);
  const steamParticlesRef = useRef<THREE.Points | null>(null);
  const [isWobbling, setIsWobbling] = useState(false);
  const [wobbleCount, setWobbleCount] = useState(0);
  const [hasWebGlError, setHasWebGlError] = useState(false);

  // Wobble physics state
  const physicsRef = useRef({
    angleX: 0,
    angleZ: 0,
    velX: 0,
    velZ: 0,
    yOffset: 0,
    velY: 0,
    isDragging: false,
    prevPointerX: 0,
    prevPointerY: 0,
    userRotY: 0,
    userRotX: 0.35,
  });

  // Calculate pixel dimensions
  const getDimensions = useCallback(() => {
    if (typeof size === 'number') return { w: size, h: size };
    switch (size) {
      case 'xs':
        return { w: 46, h: 46 };
      case 'sm':
        return { w: 72, h: 72 };
      case 'md':
        return { w: 140, h: 140 };
      case 'lg':
        return { w: 260, h: 260 };
      case 'hero':
        return { w: 340, h: 340 };
      default:
        return { w: 140, h: 140 };
    }
  }, [size]);

  // Trigger high-energy spring wobble on click/tap
  const triggerWobble = useCallback(() => {
    const phys = physicsRef.current;
    // Impulse: random tilt + upward bounce
    const impulseStrength = 0.55;
    phys.velX += (Math.random() > 0.5 ? 1 : -1) * impulseStrength * (0.8 + Math.random() * 0.4);
    phys.velZ += (Math.random() > 0.5 ? 1 : -1) * impulseStrength * (0.8 + Math.random() * 0.4);
    phys.velY += 0.25;

    posSound.playBiryaniWobble();
    setIsWobbling(true);
    setWobbleCount((prev) => prev + 1);

    setTimeout(() => {
      setIsWobbling(false);
    }, 1200);

    if (onPlateClick) {
      onPlateClick();
    }
  }, [onPlateClick]);

  // Respond to external wobble triggers (from parent buttons)
  useEffect(() => {
    if (wobbleTrigger && wobbleTrigger > 0) {
      triggerWobble();
    }
  }, [wobbleTrigger, triggerWobble]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { w, h } = getDimensions();

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 5.2, 7.8);
    camera.lookAt(0, 0.4, 0);

    // 2. WebGL Renderer with error safety & high performance
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('WebGL init fallback:', e);
      setHasWebGlError(true);
      return;
    }

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting (Warm restaurant lighting for Biryani)
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.6);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const warmPoint = new THREE.PointLight(0xf97316, 2.0, 10);
    warmPoint.position.set(0, 3.5, 1);
    scene.add(warmPoint);

    // 4. Constructing 3D Biryani Plate Group
    const plateGroup = new THREE.Group();
    plateGroupRef.current = plateGroup;
    scene.add(plateGroup);

    // --- A. Ceramic Plate Base ---
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xfcfbf7,
      roughness: 0.18,
      metalness: 0.05,
    });

    const plateGeo = new THREE.CylinderGeometry(3.3, 2.3, 0.4, 36);
    const plateMesh = new THREE.Mesh(plateGeo, plateMaterial);
    plateMesh.position.y = -0.2;
    plateGroup.add(plateMesh);

    // Golden Decorative Rim
    const goldRimGeo = new THREE.TorusGeometry(3.28, 0.1, 16, 48);
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const goldRimMesh = new THREE.Mesh(goldRimGeo, goldRimMat);
    goldRimMesh.rotation.x = Math.PI / 2;
    goldRimMesh.position.y = 0.01;
    plateGroup.add(goldRimMesh);

    // Inner Dish Cavity
    const innerCavityGeo = new THREE.CylinderGeometry(3.05, 2.5, 0.15, 32);
    const innerCavityMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.3,
    });
    const innerCavityMesh = new THREE.Mesh(innerCavityGeo, innerCavityMat);
    innerCavityMesh.position.y = -0.05;
    plateGroup.add(innerCavityMesh);

    // --- B. Mound of Aromatic Basmati Rice ---
    const riceGroup = new THREE.Group();
    plateGroup.add(riceGroup);

    // Central Saffron Rice Dome
    const riceDomeGeo = new THREE.SphereGeometry(2.7, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.46);
    const riceDomeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Warm Saffron
      roughness: 0.85,
      bumpScale: 0.1,
    });
    const riceDomeMesh = new THREE.Mesh(riceDomeGeo, riceDomeMat);
    riceDomeMesh.scale.set(1.0, 0.52, 1.0);
    riceDomeMesh.position.y = -0.05;
    riceGroup.add(riceDomeMesh);

    // Realistic Individual Rice Grain Clusters (3 hues: Saffron, Orange Tikka, Steamed Cream)
    const grainMats = [
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.75 }), // Saffron yellow
      new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.8 }),  // Spicy orange
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.6 }),  // Fragrant cream
    ];

    const grainGeo = new THREE.CapsuleGeometry(0.06, 0.22, 4, 6);
    const grainCount = 140;

    for (let i = 0; i < grainCount; i++) {
      const mat = grainMats[i % grainMats.length];
      const grain = new THREE.Mesh(grainGeo, mat);

      // Distribute in dome formation
      const radius = 0.4 + Math.random() * 2.2;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.max(0.05, 1.15 * (1 - (radius / 2.7) ** 1.8) + (Math.random() - 0.5) * 0.18);

      grain.position.set(x, y, z);
      grain.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      grain.scale.set(0.9 + Math.random() * 0.4, 0.9 + Math.random() * 0.4, 0.9 + Math.random() * 0.4);
      riceGroup.add(grain);
    }

    // --- C. Juicy Roasted Chicken Leg (Tandoori Zaiqa Biryani Drumstick) ---
    const chickenGroup = new THREE.Group();
    chickenGroup.position.set(0.35, 0.82, 0.2);
    chickenGroup.rotation.set(-0.25, 0.65, 0.35);

    // Thick Spiced Roasted Meat Piece
    const chickenMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Tandoori char-roasted glaze
      roughness: 0.55,
      metalness: 0.12,
    });
    const meatGeo = new THREE.SphereGeometry(0.82, 18, 14);
    const meatMesh = new THREE.Mesh(meatGeo, chickenMat);
    meatMesh.scale.set(1.4, 0.85, 0.95);
    chickenGroup.add(meatMesh);

    // Tikka Boti Secondary Bulge
    const botiMat = new THREE.MeshStandardMaterial({
      color: 0x781a04, // Deep charred spice
      roughness: 0.65,
    });
    const botiGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const botiMesh = new THREE.Mesh(botiGeo, botiMat);
    botiMesh.position.set(-0.55, 0.2, 0.15);
    botiMesh.scale.set(1.1, 0.8, 0.9);
    chickenGroup.add(botiMesh);

    // Drumstick Bone
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.4,
    });
    const boneGeo = new THREE.CylinderGeometry(0.13, 0.16, 1.25, 10);
    const boneMesh = new THREE.Mesh(boneGeo, boneMat);
    boneMesh.position.set(0.9, 0.12, -0.05);
    boneMesh.rotation.z = -Math.PI / 2.8;
    chickenGroup.add(boneMesh);

    // Bone Knuckle Tip
    const knuckleGeo = new THREE.SphereGeometry(0.19, 10, 8);
    const knuckleMesh = new THREE.Mesh(knuckleGeo, boneMat);
    knuckleMesh.position.set(1.42, 0.42, -0.08);
    chickenGroup.add(knuckleMesh);

    plateGroup.add(chickenGroup);

    // --- D. Fresh Garnishes: Coriander, Birista Fried Onions, Lemon Slice & Chili ---
    // 1. Fresh Coriander / Mint leaves
    const herbMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const herbGeo = new THREE.CircleGeometry(0.18, 5);

    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(herbGeo, herbMat);
      const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 0.6 + Math.random() * 1.4;
      leaf.position.set(
        Math.cos(angle) * dist,
        1.15 - (dist / 2.7) * 0.6 + 0.1,
        Math.sin(angle) * dist
      );
      leaf.rotation.set(-Math.PI / 3 + Math.random() * 0.4, Math.random() * Math.PI, 0);
      plateGroup.add(leaf);
    }

    // 2. Crispy Brown Fried Onions (Birista)
    const biristaMat = new THREE.MeshStandardMaterial({
      color: 0x582405, // Dark golden brown fried onions
      roughness: 0.7,
    });
    const onionGeo = new THREE.BoxGeometry(0.06, 0.03, 0.35);
    for (let i = 0; i < 18; i++) {
      const onion = new THREE.Mesh(onionGeo, biristaMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.8;
      onion.position.set(Math.cos(angle) * r, 0.95 + Math.random() * 0.25, Math.sin(angle) * r);
      onion.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      plateGroup.add(onion);
    }

    // 3. Fresh Lemon Wedge
    const lemonGroup = new THREE.Group();
    lemonGroup.position.set(-1.45, 0.55, 1.1);
    lemonGroup.rotation.set(0.4, -0.6, 0.3);

    const lemonRindMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const lemonPulpMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 });

    const lemonRind = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 16, 1, false, 0, Math.PI), lemonRindMat);
    lemonGroup.add(lemonRind);
    const lemonPulp = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 16, 1, false, 0, Math.PI), lemonPulpMat);
    lemonGroup.add(lemonPulp);
    plateGroup.add(lemonGroup);

    // 4. Sliced Green Chili
    const chiliMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });
    const chiliGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
    const chiliMesh = new THREE.Mesh(chiliGeo, chiliMat);
    chiliMesh.position.set(-0.7, 1.05, -0.7);
    chiliMesh.rotation.set(0.7, 0.3, 0.2);
    plateGroup.add(chiliMesh);

    // --- E. Rising Animated Steam Particles ---
    const steamCount = 36;
    const steamGeo = new THREE.BufferGeometry();
    const steamPositions = new Float32Array(steamCount * 3);
    const steamVelocities: { x: number; y: number; z: number; startY: number }[] = [];

    for (let i = 0; i < steamCount; i++) {
      const x = (Math.random() - 0.5) * 1.8;
      const y = 1.0 + Math.random() * 2.8;
      const z = (Math.random() - 0.5) * 1.8;
      steamPositions[i * 3] = x;
      steamPositions[i * 3 + 1] = y;
      steamPositions[i * 3 + 2] = z;

      steamVelocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: 0.025 + Math.random() * 0.03,
        z: (Math.random() - 0.5) * 0.015,
        startY: 1.0 + Math.random() * 0.4,
      });
    }

    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));

    // Custom steam canvas texture for soft puff
    const steamCanvas = document.createElement('canvas');
    steamCanvas.width = 64;
    steamCanvas.height = 64;
    const ctx = steamCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      grad.addColorStop(0.4, 'rgba(254, 243, 199, 0.35)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const steamTex = new THREE.CanvasTexture(steamCanvas);

    const steamMat = new THREE.PointsMaterial({
      size: 0.65,
      map: steamTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const steamParticles = new THREE.Points(steamGeo, steamMat);
    steamParticlesRef.current = steamParticles;
    plateGroup.add(steamParticles);

    // --- F. Animation & Physics Wobble Loop ---
    let reqId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const phys = physicsRef.current;

      // 1. Spring physics for wobble / jiggle
      const stiffness = 85.0; // Spring frequency
      const damping = 7.0;    // Oscillation decay

      // X wobble
      const forceX = -stiffness * phys.angleX - damping * phys.velX;
      phys.velX += forceX * dt;
      phys.angleX += phys.velX * dt;

      // Z wobble
      const forceZ = -stiffness * phys.angleZ - damping * phys.velZ;
      phys.velZ += forceZ * dt;
      phys.angleZ += phys.velZ * dt;

      // Vertical bounce
      const forceY = -stiffness * phys.yOffset - damping * phys.velY;
      phys.velY += forceY * dt;
      phys.yOffset += phys.velY * dt;

      // 2. Idle auto-rotation
      if (autoRotate && !phys.isDragging) {
        phys.userRotY += 0.8 * dt;
      }

      // 3. Apply orientation to plate group
      if (plateGroupRef.current) {
        plateGroupRef.current.rotation.x = phys.userRotX + phys.angleX;
        plateGroupRef.current.rotation.y = phys.userRotY;
        plateGroupRef.current.rotation.z = phys.angleZ;
        plateGroupRef.current.position.y = phys.yOffset;
      }

      // 4. Animate rising steam particles
      if (steamParticlesRef.current) {
        const positions = steamParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < steamCount; i++) {
          positions[i * 3 + 1] += steamVelocities[i].y;
          positions[i * 3] += Math.sin(clock.elapsedTime * 2 + i) * 0.005;
          positions[i * 3 + 2] += Math.cos(clock.elapsedTime * 2 + i) * 0.005;

          // Reset when steam climbs above plate
          if (positions[i * 3 + 1] > 4.2) {
            positions[i * 3 + 1] = steamVelocities[i].startY;
            positions[i * 3] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
          }
        }
        steamParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const { w: newW, h: newH } = getDimensions();
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      plateGeo.dispose();
      plateMaterial.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [getDimensions, autoRotate]);

  // Pointer drag & click handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    physicsRef.current.isDragging = true;
    physicsRef.current.prevPointerX = e.clientX;
    physicsRef.current.prevPointerY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const phys = physicsRef.current;
    if (!interactive || !phys.isDragging) return;
    const dx = e.clientX - phys.prevPointerX;
    const dy = e.clientY - phys.prevPointerY;
    phys.userRotY += dx * 0.018;
    phys.userRotX = Math.max(0.1, Math.min(0.9, phys.userRotX + dy * 0.01));
    phys.prevPointerX = e.clientX;
    phys.prevPointerY = e.clientY;
  };

  const handlePointerUp = () => {
    physicsRef.current.isDragging = false;
  };

  const { w, h } = getDimensions();

  if (hasWebGlError) {
    return (
      <div
        className={`relative select-none inline-flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-center ${className}`}
        style={{ width: w, height: h }}
      >
        <div className="text-4xl animate-bounce">🍲</div>
        <span className="text-xs font-black text-amber-300 mt-1">Zaiqa Chicken Biryani</span>
      </div>
    );
  }

  return (
    <div
      className={`relative select-none inline-flex flex-col items-center justify-center group ${className}`}
      style={{ width: w, height: h, touchAction: 'none' }}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        onClick={triggerWobble}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
        className={`w-full h-full cursor-grab active:cursor-grabbing transition-transform ${
          isWobbling ? 'scale-105' : 'hover:scale-102'
        }`}
        title="Click or Drag: 3D Biryani Plate Rotates & Sizzles!"
      />

      {/* Floating Interactive Badge (Wobble Indicator) */}
      {showWobblePrompt && (
        <button
          onClick={triggerWobble}
          className="absolute -bottom-1 bg-amber-500 hover:bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-1 border border-amber-300 animate-bounce cursor-pointer active:scale-90 transition-all pointer-events-auto"
        >
          <Flame className="w-3 h-3 text-stone-950 fill-stone-950" />
          <span>Rotate Plate 3D</span>
        </button>
      )}

      {/* Sparks Burst on Wobble */}
      {isWobbling && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-xs bg-amber-400/90 text-stone-950 font-black px-2 py-0.5 rounded-md shadow-md animate-ping">
            ✨ Fresh & Hot!
          </span>
        </div>
      )}
    </div>
  );
};

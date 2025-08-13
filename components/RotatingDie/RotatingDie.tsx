'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
    /** If true, canvas fills the viewport behind your content. */
    fullScreen?: boolean;
    /** If not fullScreen, reserve vertical space with a fixed height (e.g., "50svh"). */
    height?: string;
    className?: string;
    'data-testid'?: string;
    /** Optional CSS font stack for the numbers (e.g., "Cinzel, Trajan Pro, serif") */
    faceFont?: string;
};

export default function RotatingDie({
    fullScreen = false,
    height = '50svh',
    className,
    'data-testid': dataTestId = 'rotating-die',
    faceFont = '900 220px Cinzel, Trajan Pro, "Times New Roman", serif',
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current!;
        while (container.firstChild) container.removeChild(container.firstChild);

        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
        camera.position.z = 4;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setClearColor(0x000000, 1); // pitch black
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);

        // Cross-version color space compatibility
        const rAny = renderer as any; // TypeScript workaround for THREE.js version differences
        if ('outputColorSpace' in rAny && (THREE as any).SRGBColorSpace) {
            rAny.outputColorSpace = (THREE as any).SRGBColorSpace;
        } else if ('outputEncoding' in rAny) {
            // Fallback for older three versions (<= r152-ish) that used outputEncoding.
            // 3001 is the numeric value that used to be THREE.sRGBEncoding.
            rAny.outputEncoding = 3001;
        }

        container.appendChild(renderer.domElement);

        // ----- Background: stars + nebula -----
        const disposables: Array<{ dispose: () => void }> = [];

        // Starfield (Points)
        const makeStarfield = () => {
            const count = 1200;
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = 50 + Math.random() * 40;
                const theta = Math.random() * Math.PI * 2;
                const u = Math.random() * 2 - 1; // cos(phi)
                const s = Math.sqrt(1 - u * u);
                positions[i * 3 + 0] = r * s * Math.cos(theta);
                positions[i * 3 + 1] = r * s * Math.sin(theta);
                positions[i * 3 + 2] = r * u;
            }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                size: 0.06,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
            });
            const stars = new THREE.Points(geom, mat);
            stars.name = 'starfield';
            disposables.push(geom, mat);
            scene.add(stars);
            return stars;
        };

        // Nebula canvas texture
        const makeNebulaTexture = (w = 1024, h = 768) => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, w, h);
                // layered radial gradients (purple/cyan) with additive feel
                const blobs = [
                    { x: w * 0.3, y: h * 0.4, r: Math.min(w, h) * 0.5, c0: 'rgba(90, 30, 150, 0.25)', c1: 'rgba(0,0,0,0)' },
                    { x: w * 0.65, y: h * 0.45, r: Math.min(w, h) * 0.45, c0: 'rgba(40, 120, 255, 0.2)', c1: 'rgba(0,0,0,0)' },
                    { x: w * 0.45, y: h * 0.6, r: Math.min(w, h) * 0.35, c0: 'rgba(130, 60, 200, 0.18)', c1: 'rgba(0,0,0,0)' },
                ];
                blobs.forEach(({ x, y, r, c0, c1 }) => {
                    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                    g.addColorStop(0, c0);
                    g.addColorStop(1, c1);
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                });
                // sprinkle tiny cyan specks for a digital sparkle
                ctx.fillStyle = 'rgba(160, 220, 255, 0.5)';
                for (let i = 0; i < 300; i++) {
                    const x = Math.random() * w;
                    const y = Math.random() * h;
                    const s = Math.random() * 1.5 + 0.3;
                    ctx.fillRect(x, y, s, s);
                }
            }
            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            disposables.push(tex);
            return tex;
        };

        const stars = makeStarfield();

        // Two large, translucent nebula planes behind the die
        const nebulaTex1 = makeNebulaTexture();
        const nebulaMat1 = new THREE.MeshBasicMaterial({
            map: nebulaTex1,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const nebula1 = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), nebulaMat1);
        nebula1.position.set(-5, 0, -30);
        nebula1.rotation.z = -0.1;
        disposables.push(nebulaMat1, nebula1.geometry);
        scene.add(nebula1);

        const nebulaTex2 = makeNebulaTexture();
        const nebulaMat2 = new THREE.MeshBasicMaterial({
            map: nebulaTex2,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const nebula2 = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), nebulaMat2);
        nebula2.position.set(6, 1, -35);
        nebula2.rotation.z = 0.15;
        disposables.push(nebulaMat2, nebula2.geometry);
        scene.add(nebula2);

        // ----- Lights -----
        const ambient = new THREE.AmbientLight(0x334455, 0.8);
        const dir = new THREE.DirectionalLight(0x66aaff, 0.8);
        dir.position.set(3, 4, 5);
        scene.add(ambient, dir);

        // ----- d12 with per-face textures (numbers; sword on 12) -----
        const geometry = new THREE.DodecahedronGeometry(1, 0);

        const makeFaceCanvas = (label: number, fontSpec: string) => {
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (!ctx) return canvas;

            // dark face base
            ctx.fillStyle = '#121212';
            ctx.fillRect(0, 0, size, size);

            // faint inner vignette
            const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.6);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Tron-ish glow
            ctx.shadowColor = 'rgba(120, 200, 255, 0.65)';
            ctx.shadowBlur = 28;

            if (label === 12) {
                // Sword glyph (simple vector shape). Falls back to "12" if Path2D is unavailable.
                const P2D: typeof Path2D | undefined = typeof Path2D !== 'undefined' ? Path2D : undefined;
                if (P2D) {
                    const p = new P2D(
                        'M256 60 L272 340 L240 340 Z ' + // blade
                        'M232 350 L280 350 L280 370 L232 370 Z ' + // guard
                        'M248 370 L264 370 L264 420 L248 420 Z ' + // grip
                        'M240 420 L272 420 L272 440 L240 440 Z' // pommel
                    );
                    ctx.fillStyle = '#cfe9ff';
                    ctx.strokeStyle = '#a3d4ff';
                    ctx.lineWidth = 4;
                    ctx.fill(p);
                    ctx.stroke(p);
                } else {
                    ctx.font = fontSpec;
                    ctx.fillStyle = '#cfe9ff';
                    ctx.fillText('12', size / 2, size / 2 + 10);
                }
            } else {
                ctx.font = fontSpec;
                ctx.fillStyle = '#cfe9ff';
                ctx.fillText(String(label), size / 2, size / 2 + 10);
            }

            return canvas;
        };

        const makeFaceMaterial = (label: number) => {
            const canvas = makeFaceCanvas(label, faceFont);
            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            tex.anisotropy = 4;
            const mat = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                metalness: 0.8,
                roughness: 0.25,
                map: tex,
            });
            disposables.push(tex, mat);
            return mat;
        };

        const faceMaterials = Array.from({ length: 12 }, (_, i) => makeFaceMaterial(i + 1));
        const mesh = new THREE.Mesh(geometry, faceMaterials);

        // Orange outline
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff6a00 });
        const wire = new THREE.LineSegments(edges, lineMat);

        // Tilt a bit
        mesh.rotation.x = 0.7;
        mesh.rotation.y = 0.2;

        scene.add(mesh, wire);

        // Resize
        const handleResize = () => {
            const { clientWidth, clientHeight } = container;
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(clientWidth, clientHeight);
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        // Animation
        let raf = 0;
        const clock = new THREE.Clock();
        const axis = new THREE.Vector3(1, 1, 0).normalize();

        const animate = () => {
            const delta = clock.getDelta();
            // Die rotation
            mesh.rotateOnAxis(axis, delta * 0.6);
            wire.rotation.copy(mesh.rotation);
            // Subtle background motion
            stars.rotation.y += delta * 0.02;
            nebula1.rotation.z += delta * 0.005;
            nebula2.rotation.z -= delta * 0.004;

            renderer.render(scene, camera);
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', handleResize);

            scene.remove(mesh, wire, ambient, dir, stars, nebula1, nebula2);

            geometry.dispose();
            edges.dispose();
            lineMat.dispose();

            disposables.forEach(d => {
                try {
                    d.dispose();
                } catch {
                    /* no-op */
                }
            });

            (mesh.material as THREE.Material[]).forEach(m => m.dispose());

            renderer.dispose();
            if (renderer.domElement?.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, [faceFont]);

    // Full-screen background mode keeps the canvas behind your UI and non-interactive
    const style: React.CSSProperties = fullScreen
        ? { position: 'fixed', inset: 0, width: '100vw', height: '100svh', pointerEvents: 'none' }
        : { height };

    return (
        <div
            ref={containerRef}
            data-testid={dataTestId}
            aria-hidden="true"
            className={['w-full', 'mx-auto', className, fullScreen ? '' : 'max-w-3xl'].filter(Boolean).join(' ')}
            style={style}
        />
    );
}

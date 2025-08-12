'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
    height?: string;
    className?: string;
    'data-testid'?: string;
};

export default function RotatingDie({
    height = '50svh',
    className,
    'data-testid': dataTestId = 'rotating-die',
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current!;
        while (container.firstChild) container.removeChild(container.firstChild);

        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 4;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setClearColor(0x000000, 1); // pitch black
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);

        // Cross-version color space compatibility without ts-expect-error
        const rAny = renderer as any;
        if (typeof rAny.outputColorSpace !== 'undefined' && (THREE as any).SRGBColorSpace) {
            rAny.outputColorSpace = (THREE as any).SRGBColorSpace;
        } else if (typeof rAny.outputEncoding !== 'undefined' && (THREE as any).sRGBEncoding) {
            rAny.outputEncoding = (THREE as any).sRGBEncoding;
        }

        container.appendChild(renderer.domElement);

        // Lighting for Tron-like vibe
        const ambient = new THREE.AmbientLight(0x334455, 0.8);
        const dir = new THREE.DirectionalLight(0x66aaff, 0.8);
        dir.position.set(3, 4, 5);
        scene.add(ambient, dir);

        // d12 (Dodecahedron)
        const geometry = new THREE.DodecahedronGeometry(1, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.8,
            roughness: 0.25,
        });
        const mesh = new THREE.Mesh(geometry, material);

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
            mesh.rotateOnAxis(axis, delta * 0.6);
            wire.rotation.copy(mesh.rotation);
            renderer.render(scene, camera);
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', handleResize);
            scene.remove(mesh, wire, ambient, dir);

            geometry.dispose();
            material.dispose();
            edges.dispose();
            lineMat.dispose();
            renderer.dispose();

            if (renderer.domElement?.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            data-testid={dataTestId}
            aria-hidden="true"
            className={['w-full', 'max-w-3xl', 'mx-auto', className].filter(Boolean).join(' ')}
            style={{ height }}
        />
    );
}

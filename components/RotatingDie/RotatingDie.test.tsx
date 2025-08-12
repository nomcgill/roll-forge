/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

// Lightweight mock so jsdom doesn't need WebGL.
// Keeps tests fast and avoids touching global setup.
jest.mock('three', () => {
    const createCanvas = () => {
        const canvas = document.createElement('canvas');
        // @ts-ignore
        canvas.getContext = () => ({});
        return canvas;
    };

    const Scene = jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        remove: jest.fn(),
    }));
    const PerspectiveCamera = jest.fn().mockImplementation(() => ({
        position: { z: 0 },
        updateProjectionMatrix: jest.fn(),
    }));
    const WebGLRenderer = jest.fn().mockImplementation(() => {
        const domElement = createCanvas();
        return {
            setClearColor: jest.fn(),
            setPixelRatio: jest.fn(),
            setSize: jest.fn(),
            render: jest.fn(),
            dispose: jest.fn(),
            domElement,
        };
    });
    const AmbientLight = jest.fn();
    const DirectionalLight = jest.fn();
    const DodecahedronGeometry = jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
    }));
    const MeshStandardMaterial = jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
    }));
    const Mesh = jest.fn().mockImplementation(() => ({
        rotation: { x: 0, y: 0, z: 0 },
        rotateOnAxis: jest.fn(),
    }));
    const EdgesGeometry = jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
    }));
    const LineBasicMaterial = jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
    }));
    const LineSegments = jest.fn().mockImplementation(() => ({}));
    const Vector3 = jest.fn().mockImplementation(() => ({
        normalize: jest.fn().mockReturnThis(),
    }));
    const Clock = jest.fn().mockImplementation(() => ({
        getDelta: jest.fn().mockReturnValue(0.016),
    }));

    const SRGBColorSpace = 3001;
    const sRGBEncoding = 3001;

    return {
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        AmbientLight,
        DirectionalLight,
        DodecahedronGeometry,
        MeshStandardMaterial,
        Mesh,
        EdgesGeometry,
        LineBasicMaterial,
        LineSegments,
        Vector3,
        Clock,
        SRGBColorSpace,
        sRGBEncoding,
    };
});

import RotatingDie from './RotatingDie';

afterEach(() => {
    cleanup();
    jest.clearAllMocks();
});

describe('RotatingDie', () => {
    it('renders a canvas inside the container', () => {
        render(<RotatingDie data-testid="rotating-die" height="300px" />);
        const container = screen.getByTestId('rotating-die');
        const canvas = container.querySelector('canvas');
        expect(container).toBeInTheDocument();
        expect(canvas).not.toBeNull();
    });

    it('cleans up on unmount without throwing', () => {
        const { unmount } = render(<RotatingDie data-testid="rotating-die" height="300px" />);
        expect(() => unmount()).not.toThrow();
    });
});

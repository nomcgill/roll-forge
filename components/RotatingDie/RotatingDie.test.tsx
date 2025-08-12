/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

/** Stub all canvas 2D contexts so getContext('2d') never returns null */
const ctxStub = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
} as unknown as CanvasRenderingContext2D;

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: jest.fn(() => ctxStub),
});

// Mock the subset of Three used by RotatingDie
jest.mock('three', () => {
    const makeCanvas = () => document.createElement('canvas');

    const Scene = jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        remove: jest.fn(),
    }));

    const PerspectiveCamera = jest.fn().mockImplementation(() => ({
        position: { z: 0 },
        updateProjectionMatrix: jest.fn(),
    }));

    const WebGLRenderer = jest.fn().mockImplementation(() => {
        const domElement = makeCanvas();
        return {
            setClearColor: jest.fn(),
            setPixelRatio: jest.fn(),
            setSize: jest.fn(),
            render: jest.fn(),
            dispose: jest.fn(),
            domElement,
            outputColorSpace: undefined,
            outputEncoding: undefined,
        };
    });

    const AmbientLight = jest.fn().mockImplementation(() => ({}));
    const DirectionalLight = jest.fn().mockImplementation(() => ({
        position: { set: jest.fn() },
    }));

    const DodecahedronGeometry = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const PlaneGeometry = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const EdgesGeometry = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const BufferGeometry = jest.fn().mockImplementation(() => ({ setAttribute: jest.fn(), dispose: jest.fn() }));
    const Float32BufferAttribute = jest.fn().mockImplementation(() => ({}));

    const MeshStandardMaterial = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const MeshBasicMaterial = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const LineBasicMaterial = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));
    const PointsMaterial = jest.fn().mockImplementation(() => ({ dispose: jest.fn() }));

    const CanvasTexture = jest.fn().mockImplementation(() => ({ needsUpdate: true, anisotropy: 0, dispose: jest.fn() }));

    // Capture constructor args so mesh.material exists (array of materials in this component)
    const Mesh = jest.fn().mockImplementation((_geometry?: any, material?: any) => ({
        rotation: { x: 0, y: 0, z: 0, copy: jest.fn() },
        position: { set: jest.fn(), copy: jest.fn() },
        lookAt: jest.fn(),
        renderOrder: 0,
        geometry: { dispose: jest.fn() },
        material, // <-- important for cleanup path
    }));

    const LineSegments = jest.fn().mockImplementation(() => ({
        rotation: { copy: jest.fn() },
    }));

    const Points = jest.fn().mockImplementation(() => ({
        rotation: { x: 0, y: 0, z: 0 },
    }));

    const Vector3 = jest.fn().mockImplementation(() => ({
        normalize: jest.fn().mockReturnThis(),
    }));

    const Clock = jest.fn().mockImplementation(() => ({
        getDelta: jest.fn().mockReturnValue(0.016),
    }));

    const AdditiveBlending = 2;
    const SRGBColorSpace = 3001;
    const sRGBEncoding = 3001;

    return {
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        AmbientLight,
        DirectionalLight,
        DodecahedronGeometry,
        PlaneGeometry,
        EdgesGeometry,
        BufferGeometry,
        Float32BufferAttribute,
        MeshStandardMaterial,
        MeshBasicMaterial,
        LineBasicMaterial,
        PointsMaterial,
        CanvasTexture,
        Mesh,
        LineSegments,
        Points,
        Vector3,
        Clock,
        AdditiveBlending,
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

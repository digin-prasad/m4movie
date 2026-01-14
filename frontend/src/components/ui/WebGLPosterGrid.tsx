'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useMemo, useRef, useLayoutEffect, useState, Suspense } from 'react';
import * as THREE from 'three';
import { Movie } from '@/types/movie';
import { vortexVertexShader, vortexFragmentShader } from '@/lib/shaders';

interface WebGLPosterGridProps {
    movies: Movie[];
}

// SMOOTH SURFACE DENSITY
const ROWS = 60;
const COLS = 80;
const TOTAL = ROWS * COLS;

// Cap groups to prevent network overload / texture thrashing
// 50 is plenty for variety (1 in 50 chance of repeat)
const MAX_GROUPS = 50;

function PosterInstances({ movies, groupIndex, isHovered, groupCount }: { movies: Movie[], groupIndex: number, isHovered: boolean, groupCount: number }) {
    const { viewport } = useThree();
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Select movie wraps around
    const movie = movies[groupIndex % movies.length];
    const posterUrl = movie?.poster_path
        ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
        : '/placeholder.jpg';

    // This can suspend!
    const texture = useTexture(posterUrl);
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const { positions, randoms } = useMemo(() => {
        const pos = [];
        const rnd = [];

        const width = viewport.width * 3.0;
        const height = viewport.height * 3.0;
        const xStep = width / COLS;
        const yStep = height / ROWS;

        for (let i = 0; i < TOTAL; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const uniqueIndex = (col + row * 53) % groupCount;

            if (uniqueIndex === groupIndex) {
                // Base position
                let x = (col * xStep) - (width / 2) + (xStep / 2);
                let y = (row * yStep) - (height / 2) + (yStep / 2);

                // JITTER
                const jitterX = (Math.random() - 0.5) * xStep * 0.9;
                const jitterY = (Math.random() - 0.5) * yStep * 0.9;

                x += jitterX;
                y += jitterY;

                pos.push(x, y, 0);
                rnd.push(Math.random());
            }
        }
        return {
            positions: new Float32Array(pos),
            randoms: new Float32Array(rnd)
        };
    }, [viewport, groupIndex, groupCount]);

    useFrame((state) => {
        if (!materialRef.current || !meshRef.current) return;

        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

        const worldMouse = new THREE.Vector2(
            state.pointer.x * (viewport.width / 2),
            state.pointer.y * (viewport.height / 2)
        );

        materialRef.current.uniforms.uMouse.value.lerp(worldMouse, 0.1);

        const targetHover = isHovered ? 1.0 : 0.0;
        const currentHover = materialRef.current.uniforms.uHover.value;
        const newHover = THREE.MathUtils.lerp(currentHover, targetHover, 0.05);

        materialRef.current.uniforms.uHover.value = newHover;
    });

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const temp = new THREE.Object3D();
        let idx = 0;

        const width = viewport.width * 3.0;
        const xStep = width / COLS;
        const yStep = (viewport.height * 3.0) / ROWS; // Note: Use viewport.height * 3.0 to match logic

        // Safety check: ensure we don't overflow positions buffer
        const maxIdx = positions.length / 3;

        for (let i = 0; i < TOTAL; i++) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const uniqueIndex = (col + row * 53) % groupCount;

            if (uniqueIndex === groupIndex) {
                if (idx >= maxIdx) break; // Prevent crash

                const x = positions[idx * 3];
                const y = positions[idx * 3 + 1];
                const z = positions[idx * 3 + 2];

                temp.position.set(x, y, z);
                temp.updateMatrix();
                meshRef.current.setMatrixAt(idx, temp.matrix);
                idx++;
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positions, groupIndex, groupCount, viewport]); // Dependencies crucial

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uTexture: { value: texture },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0 },
    }), [texture]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, positions.length / 3]}
            frustumCulled={false}
        >
            <planeGeometry args={[0.5, 0.75]}>
                <instancedBufferAttribute
                    attach="attributes-aRandom"
                    args={[randoms, 1]}
                />
            </planeGeometry>
            <shaderMaterial
                ref={materialRef}
                vertexShader={vortexVertexShader}
                fragmentShader={vortexFragmentShader}
                uniforms={uniforms}
                transparent={true}
                depthTest={true}
                depthWrite={true}
            />
        </instancedMesh>
    );
}

export function WebGLPosterGrid({ movies }: WebGLPosterGridProps) {
    const [isHovered, setIsHovered] = useState(false);

    const uniqueCount = movies?.length || 0;
    const groupCount = Math.min(uniqueCount, MAX_GROUPS);

    if (!movies || movies.length === 0) return null;

    return (
        <div
            className="absolute inset-0 z-0"
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onPointerMove={() => setIsHovered(true)}
        >
            <Canvas
                performance={{ min: 0.5 }} // Allow degrading quality to 50% if FPS drops
                camera={{ position: [0, 0, 22], fov: 35 }}
                gl={{
                    antialias: false, // Disable MSAA for performance (posters don't need it much)
                    alpha: true,
                    powerPreference: "high-performance",
                    stencil: false,
                    depth: true
                }}
                dpr={[1, 1.5]} // Cap DPI to 1.5 max
            >
                <color attach="background" args={['#000000']} />

                {/* Wrap in Suspense to handle async textures */}
                <Suspense fallback={null}>
                    {Array.from({ length: groupCount }).map((_, i) => (
                        <PosterInstances
                            key={i}
                            movies={movies}
                            groupIndex={i}
                            groupCount={groupCount}
                            isHovered={isHovered}
                        />
                    ))}
                </Suspense>
            </Canvas>
        </div>
    );
}

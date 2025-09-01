"use client"

import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, useAnimations, Html } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6b46ff]"></div>
        <span className="ml-2 text-sm text-gray-600">Loading 3D Model...</span>
      </div>
    </Html>
  )
}

function Model({ url, isHovered, isClicked }: { url: string; isHovered: boolean; isClicked: boolean }) {
  const { scene, animations } = useGLTF(url)
  const modelRef = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animations, modelRef)
  const [animationsLoaded, setAnimationsLoaded] = useState(false)

  useEffect(() => {
    if (actions['gyro_spin']) {
      if (isClicked) {
        // High speed animation when clicked
        actions['gyro_spin'].setEffectiveTimeScale(2.5)
        actions['gyro_spin'].play()
        actions['gyro_spin'].setLoop(THREE.LoopRepeat, Infinity)
      } else if (isHovered) {
        // Normal speed animation on hover
        actions['gyro_spin'].setEffectiveTimeScale(1.0)
        actions['gyro_spin'].play()
        actions['gyro_spin'].setLoop(THREE.LoopRepeat, Infinity)
      } else {
        // Default slow speed when not interacting
        actions['gyro_spin'].setEffectiveTimeScale(0.5)
        actions['gyro_spin'].play()
        actions['gyro_spin'].setLoop(THREE.LoopRepeat, Infinity)
      }
      setAnimationsLoaded(true)
    }
    
    if (actions['gyro rune enchanting']) {
      if (isClicked) {
        // High speed animation when clicked
        actions['gyro rune enchanting'].setEffectiveTimeScale(2.5)
        actions['gyro rune enchanting'].play()
        actions['gyro rune enchanting'].setLoop(THREE.LoopRepeat, Infinity)
      } else if (isHovered) {
        // Normal speed animation on hover
        actions['gyro rune enchanting'].setEffectiveTimeScale(1.0)
        actions['gyro rune enchanting'].play()
        actions['gyro rune enchanting'].setLoop(THREE.LoopRepeat, Infinity)
      } else {
        // Default slow speed when not interacting
        actions['gyro rune enchanting'].setEffectiveTimeScale(0.5)
        actions['gyro rune enchanting'].play()
        actions['gyro rune enchanting'].setLoop(THREE.LoopRepeat, Infinity)
      }
    }
  }, [actions, isHovered, isClicked])

  return (
    <group ref={modelRef}>
      <primitive object={scene} scale={5.72} />
      {!animationsLoaded && <LoadingSpinner />}
    </group>
  )
}

export default function ModelViewer({ isButtonClicked }: { isButtonClicked: boolean }) {
  const [isHovered, setIsHovered] = useState(false)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Listen for cursor movement anywhere on the screen
  useEffect(() => {
    const handleMouseMove = () => {
      setIsHovered(true)
      // Reset to stable state after 3 seconds of no movement
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      mouseMoveTimeoutRef.current = setTimeout(() => setIsHovered(false), 3000)
    }

    // Listen for mouse movement on the entire document
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full h-64 mb-6 relative z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          <Model 
            url="/3d-model/scene.gltf" 
            isHovered={isHovered}
            isClicked={isButtonClicked}
          />
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate={!isHovered && !isButtonClicked}
            autoRotateSpeed={0.3}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}

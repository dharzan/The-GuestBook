import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mountEl = mountRef.current
    if (!mountEl) return

    const { clientWidth, clientHeight } = mountEl
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 100)
    camera.position.set(0, 0, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountEl.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const directional = new THREE.DirectionalLight(0x90caf9, 1.1)
    directional.position.set(2, 2, 3)
    scene.add(directional)

    const geometry = new THREE.IcosahedronGeometry(1.6, 1)
    const material = new THREE.MeshStandardMaterial({
      color: 0x5b7cfa,
      metalness: 0.35,
      roughness: 0.25,
      emissive: new THREE.Color(0x1f2937),
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.4 }),
    )
    mesh.add(wireframe)

    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      mesh.rotation.y += 0.0035
      mesh.rotation.x += 0.002
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current) return
      const { clientWidth: w, clientHeight: h } = mountRef.current
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      mountEl.removeChild(renderer.domElement)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [])

  return (
    <div className="three-hero" aria-hidden="true">
      <div ref={mountRef} className="three-canvas" />
      <div className="three-overlay">
        <p className="eyebrow">A little glow</p>
        <h2>Share your wishes while the sphere spins on</h2>
        <p className="muted">Your message and voice note go straight to the couple.</p>
      </div>
    </div>
  )
}

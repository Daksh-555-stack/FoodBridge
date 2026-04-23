import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function TruckScene() {
  const canvasRef = useRef(null)
  const [isMobile] = useState(() => window.innerWidth < 768)
  const [prefersReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (isMobile) return undefined

    gsap.registerPlugin(ScrollTrigger)

    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x1c1c1c)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x1c1c1c, 30, 80)

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 4, 16)
    camera.lookAt(0, 1, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    const sunLight = new THREE.DirectionalLight(0xffd700, 1.2)
    sunLight.position.set(10, 20, 10)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 100
    sunLight.shadow.camera.left = -30
    sunLight.shadow.camera.right = 30
    sunLight.shadow.camera.top = 20
    sunLight.shadow.camera.bottom = -20
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3)
    fillLight.position.set(-10, 5, -5)
    scene.add(fillLight)

    const bounceLight = new THREE.PointLight(0xff8800, 0.2, 20)
    bounceLight.position.set(0, -1, 0)
    scene.add(bounceLight)

    const groundGeo = new THREE.PlaneGeometry(200, 60)
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x2a2a2a,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.5
    ground.receiveShadow = true
    scene.add(ground)

    const roadGeo = new THREE.PlaneGeometry(200, 8)
    const roadMat = new THREE.MeshLambertMaterial({
      color: 0x333333,
    })
    const road = new THREE.Mesh(roadGeo, roadMat)
    road.rotation.x = -Math.PI / 2
    road.position.y = -0.48
    road.receiveShadow = true
    scene.add(road)

    for (let i = 0; i < 20; i += 1) {
      const dashGeo = new THREE.PlaneGeometry(2, 0.15)
      const dashMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.6,
        transparent: true,
      })
      const dash = new THREE.Mesh(dashGeo, dashMat)
      dash.rotation.x = -Math.PI / 2
      dash.position.set(-47.5 + i * 5, -0.47, 0)
      dash.userData.isRoadDash = true
      scene.add(dash)
    }

    const edgeLineMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      opacity: 0.8,
      transparent: true,
    })
    const leftEdgeGeo = new THREE.PlaneGeometry(200, 0.2)
    const leftEdge = new THREE.Mesh(leftEdgeGeo, edgeLineMat)
    leftEdge.rotation.x = -Math.PI / 2
    leftEdge.position.set(0, -0.47, 3.8)
    scene.add(leftEdge)

    const rightEdge = leftEdge.clone()
    rightEdge.position.z = -3.8
    scene.add(rightEdge)

    const truck = new THREE.Group()
    scene.add(truck)

    const bodyGeo = new THREE.BoxGeometry(5, 2.5, 2.2)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.4,
      metalness: 0.3,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(-0.5, 1.2, 0)
    body.castShadow = true
    truck.add(body)

    const logoPanelGeo = new THREE.PlaneGeometry(3, 0.8)
    const logoPanelMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.9,
      transparent: true,
    })
    const logoPanel = new THREE.Mesh(logoPanelGeo, logoPanelMat)
    logoPanel.position.set(-0.5, 1.3, 1.11)
    truck.add(logoPanel)

    const stripeGeo = new THREE.BoxGeometry(5.02, 0.3, 2.22)
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.5,
      metalness: 0.2,
    })
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    stripe.position.set(-0.5, 0.15, 0)
    truck.add(stripe)

    const cabGeo = new THREE.BoxGeometry(2, 2.2, 2.2)
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x0d9668,
      roughness: 0.3,
      metalness: 0.4,
    })
    const cab = new THREE.Mesh(cabGeo, cabMat)
    cab.position.set(2.5, 1.1, 0)
    cab.castShadow = true
    truck.add(cab)

    const roofGeo = new THREE.BoxGeometry(1.8, 0.4, 2.0)
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0a7a52,
      roughness: 0.4,
      metalness: 0.3,
    })
    const cabRoof = new THREE.Mesh(roofGeo, roofMat)
    cabRoof.position.set(2.5, 2.4, 0)
    truck.add(cabRoof)

    const windshieldGeo = new THREE.PlaneGeometry(1.3, 1.0)
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x223355,
      roughness: 0.1,
      metalness: 0.8,
      opacity: 0.7,
      transparent: true,
    })
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat)
    windshield.position.set(3.51, 1.4, 0)
    windshield.rotation.y = Math.PI / 2
    truck.add(windshield)

    const sideWindowGeo = new THREE.PlaneGeometry(0.8, 0.6)
    const sideWindowL = new THREE.Mesh(sideWindowGeo, windshieldMat)
    sideWindowL.position.set(2.3, 1.7, 1.11)
    truck.add(sideWindowL)

    const sideWindowR = new THREE.Mesh(sideWindowGeo, windshieldMat)
    sideWindowR.position.set(2.3, 1.7, -1.11)
    sideWindowR.rotation.y = Math.PI
    truck.add(sideWindowR)

    const bumperGeo = new THREE.BoxGeometry(0.3, 0.5, 2.2)
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.2,
      metalness: 0.8,
    })
    const bumper = new THREE.Mesh(bumperGeo, bumperMat)
    bumper.position.set(3.65, 0.25, 0)
    truck.add(bumper)

    const headlightGeo = new THREE.SphereGeometry(0.2, 16, 16)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffff44,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.5,
    })
    const headlightL = new THREE.Mesh(headlightGeo, headlightMat)
    headlightL.position.set(3.6, 0.6, 0.7)
    truck.add(headlightL)

    const headlightR = new THREE.Mesh(headlightGeo, headlightMat)
    headlightR.position.set(3.6, 0.6, -0.7)
    truck.add(headlightR)

    const grillGeo = new THREE.BoxGeometry(0.15, 0.6, 1.4)
    const grillMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.3,
    })
    const grill = new THREE.Mesh(grillGeo, grillMat)
    grill.position.set(3.65, 0.8, 0)
    truck.add(grill)

    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 16)
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.3,
      metalness: 0.7,
    })
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat)
    exhaust.position.set(1.8, 2.9, -0.9)
    truck.add(exhaust)

    const chassisGeo = new THREE.BoxGeometry(7.5, 0.3, 0.4)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7,
      metalness: 0.5,
    })
    const chassisL = new THREE.Mesh(chassisGeo, chassisMat)
    chassisL.position.set(-0.25, 0.0, 0.8)
    truck.add(chassisL)

    const chassisR = new THREE.Mesh(chassisGeo, chassisMat)
    chassisR.position.set(-0.25, 0.0, -0.8)
    truck.add(chassisR)

    function createWheel(x, z) {
      const wheelGroup = new THREE.Group()

      const tyreGeo = new THREE.TorusGeometry(0.55, 0.22, 16, 32)
      const tyreMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1,
      })
      const tyre = new THREE.Mesh(tyreGeo, tyreMat)
      tyre.castShadow = true
      wheelGroup.add(tyre)

      const rimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.18, 32)
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.1,
        metalness: 0.9,
      })
      const rim = new THREE.Mesh(rimGeo, rimMat)
      rim.rotation.x = Math.PI / 2
      wheelGroup.add(rim)

      const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 16)
      const hubMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.2,
        metalness: 0.6,
      })
      const hub = new THREE.Mesh(hubGeo, hubMat)
      hub.rotation.x = Math.PI / 2
      wheelGroup.add(hub)

      for (let i = 0; i < 5; i += 1) {
        const spokeGeo = new THREE.BoxGeometry(0.06, 0.52, 0.05)
        const spokeMat = new THREE.MeshStandardMaterial({
          color: 0xaaaaaa,
          roughness: 0.2,
          metalness: 0.8,
        })
        const spoke = new THREE.Mesh(spokeGeo, spokeMat)
        spoke.rotation.z = (i / 5) * Math.PI * 2
        wheelGroup.add(spoke)
      }

      wheelGroup.rotation.x = Math.PI / 2
      wheelGroup.position.set(x, 0.5, z)
      truck.add(wheelGroup)
      return wheelGroup
    }

    const wheelFL = createWheel(3.0, 1.2)
    const wheelFR = createWheel(3.0, -1.2)
    const wheelML = createWheel(-1.0, 1.2)
    const wheelMR = createWheel(-1.0, -1.2)
    const wheelRL = createWheel(-2.2, 1.2)
    const wheelRR = createWheel(-2.2, -1.2)
    const wheels = [wheelFL, wheelFR, wheelML, wheelMR, wheelRL, wheelRR]

    function createTree(x, z, scale) {
      const treeGroup = new THREE.Group()

      const trunkGeo = new THREE.CylinderGeometry(
        0.15 * scale,
        0.2 * scale,
        1.5 * scale,
        8
      )
      const trunkMat = new THREE.MeshLambertMaterial({
        color: 0x5c3d11,
      })
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 0.75 * scale
      trunk.castShadow = true
      treeGroup.add(trunk)

      const foliageColours = [0x1a5c2a, 0x1e6b30, 0x246b35]
      for (let i = 0; i < 3; i += 1) {
        const coneGeo = new THREE.ConeGeometry(
          (0.9 - i * 0.15) * scale,
          (1.2 - i * 0.1) * scale,
          8
        )
        const coneMat = new THREE.MeshLambertMaterial({
          color: foliageColours[i],
        })
        const cone = new THREE.Mesh(coneGeo, coneMat)
        cone.position.y = (1.5 + i * 0.7) * scale
        cone.castShadow = true
        treeGroup.add(cone)
      }

      treeGroup.position.set(x, -0.5, z)
      treeGroup.userData.isTree = true
      treeGroup.userData.baseX = x
      scene.add(treeGroup)
      return treeGroup
    }

    for (let i = 0; i < 20; i += 1) {
      const x = -50 + i * 5 + Math.random() * 2
      const z = 5 + Math.random() * 7
      const scale = 0.7 + Math.random() * 0.6
      createTree(x, z, scale)
    }

    for (let i = 0; i < 20; i += 1) {
      const x = -50 + i * 5 + Math.random() * 2
      const z = -(5 + Math.random() * 7)
      const scale = 0.7 + Math.random() * 0.6
      createTree(x, z, scale)
    }

    const skyGeo = new THREE.PlaneGeometry(300, 100)
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0d1117,
    })
    const sky = new THREE.Mesh(skyGeo, skyMat)
    sky.position.set(0, 20, -40)
    scene.add(sky)

    const starGeo = new THREE.BufferGeometry()
    const starCount = 200
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 200
      starPositions[i * 3 + 1] = 10 + Math.random() * 30
      starPositions[i * 3 + 2] = -20 + Math.random() * -20
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    function createFoodIcon(x, y, z, colour) {
      const group = new THREE.Group()
      const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4)
      const boxMat = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.5,
        emissive: colour,
        emissiveIntensity: 0.2,
      })
      const box = new THREE.Mesh(boxGeo, boxMat)
      group.add(box)
      group.position.set(x, y, z)
      scene.add(group)
      return group
    }

    const foodOffsets = [
      [-0.5, 0.5],
      [1.0, -0.4],
      [2.0, 0.0],
      [-1.5, 0.6],
      [0.5, -0.6],
    ]
    const foodIcons = [
      createFoodIcon(1.0, 3.5, 0.5, 0xff6b35),
      createFoodIcon(-0.5, 3.8, -0.4, 0x10b981),
      createFoodIcon(2.0, 3.6, 0.0, 0xff4444),
      createFoodIcon(-1.5, 3.4, 0.6, 0xffcc00),
      createFoodIcon(0.5, 3.9, -0.6, 0xaa44ff),
    ]

    const smokeParticles = []
    const smokeGeo = new THREE.SphereGeometry(0.08, 6, 6)
    const smokeMaterialBase = new THREE.MeshBasicMaterial({
      color: 0x888888,
      opacity: 0.4,
      transparent: true,
    })
    for (let i = 0; i < 12; i += 1) {
      const smoke = new THREE.Mesh(smokeGeo, smokeMaterialBase.clone())
      smoke.position.set(1.8 + Math.random() * 0.3, 2.9 + i * 0.3, -0.9)
      smoke.visible = false
      scene.add(smoke)
      smokeParticles.push({
        mesh: smoke,
        offset: i * 0.1,
        speed: 0.3 + Math.random() * 0.2,
      })
    }

    const progress = { value: 0 }
    let animationId
    let scrollTrigger
    const clock = new THREE.Clock()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', handleResize)

    if (!prefersReducedMotion) {
      scrollTrigger = ScrollTrigger.create({
        trigger: '.scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          progress.value = self.progress
        },
      })
    }

    function animate() {
      animationId = window.requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const p = progress.value

      truck.position.x = 25 - p * 50
      truck.position.y = Math.sin(elapsed * 8) * 0.04
      truck.rotation.z = Math.sin(elapsed * 8) * 0.01

      const travelDistance = p * 50
      const wheelRotation = travelDistance / 0.55
      wheels.forEach((wheel) => {
        wheel.rotation.z = wheelRotation
      })

      const camTargetX = truck.position.x + 8
      camera.position.x += (camTargetX - camera.position.x) * 0.02
      camera.position.y = 4 + Math.sin(elapsed * 0.5) * 0.2
      camera.lookAt(truck.position.x, truck.position.y + 1, 0)

      foodIcons.forEach((icon, i) => {
        icon.position.x = truck.position.x + foodOffsets[i][0]
        icon.position.y = 3.4 + Math.sin(elapsed * 2 + i * 1.2) * 0.15
        icon.position.z = foodOffsets[i][1]
        icon.rotation.y = elapsed * 0.5 + i * 0.8
      })

      smokeParticles.forEach((particle) => {
        particle.mesh.visible = true
        const smokeProgress = (elapsed * particle.speed + particle.offset) % 1
        particle.mesh.position.x = truck.position.x + 1.8
        particle.mesh.position.y = 2.9 + smokeProgress * 2.5
        particle.mesh.position.z = -0.9
        particle.mesh.material.opacity = 0.4 * (1 - smokeProgress)
        particle.mesh.scale.setScalar(1 + smokeProgress * 2)
      })

      scene.children.forEach((child) => {
        if (child.userData.isRoadDash) {
          child.position.x -= 0.05
          if (child.position.x < -50) {
            child.position.x += 100
          }
        }
        if (child.userData.isTree) {
          child.position.x = child.userData.baseX + truck.position.x * 0.3
        }
      })

      renderer.render(scene, camera)
    }

    if (prefersReducedMotion) {
      truck.position.x = 0
      foodIcons.forEach((icon, i) => {
        icon.position.x = foodOffsets[i][0]
        icon.position.z = foodOffsets[i][1]
      })
      renderer.render(scene, camera)
    } else {
      animate()
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationId) window.cancelAnimationFrame(animationId)
      if (scrollTrigger) scrollTrigger.kill()
      renderer.dispose()
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      scene.clear()
    }
  }, [isMobile, prefersReducedMotion])

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1c1c1c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: '#10b981',
            fontSize: '80px',
            textAlign: 'center',
          }}
        >
          🚚
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}

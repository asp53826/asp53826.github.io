import { useEffect, useRef } from "react";
import type { TrackId } from "./Observatory";

type Props = {
  activeTrack: TrackId;
};

const routeColors: Record<TrackId, number> = {
  systems: 0x39d9f9,
  quant: 0xf2b84b,
  defense: 0x65e6a7,
  "ml-infrastructure": 0x9f8cff
};

const routePaths: Record<TrackId, number[]> = {
  systems: [0, 1, 2, 3, 7],
  quant: [0, 1, 4, 6, 7],
  defense: [0, 2, 5, 6, 7],
  "ml-infrastructure": [0, 2, 3, 5, 7]
};

export default function EngineeringScene({ activeTrack }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      if (disposed || !host) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 1.1, 11.4);

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        host.dataset.fallback = "true";
        return;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);
      host.dataset.rendered = "true";

      const root = new THREE.Group();
      root.rotation.x = -0.12;
      scene.add(root);

      const positions = [
        [-4.2, 0.2, 0],
        [-2.7, 1.8, -0.6],
        [-2.3, -1.5, 0.4],
        [-0.2, 1.2, 0.1],
        [-0.4, -1.5, -0.7],
        [1.9, 1.4, -0.4],
        [2.2, -1.3, 0.5],
        [4.25, 0.15, 0]
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

      const neutralMaterial = new THREE.MeshStandardMaterial({
        color: 0x14223a,
        emissive: 0x09111f,
        metalness: 0.68,
        roughness: 0.32
      });
      const nodes = positions.map((position, index) => {
        const geometry = index === 0 || index === 7
          ? new THREE.OctahedronGeometry(index === 7 ? 0.48 : 0.38, 0)
          : new THREE.BoxGeometry(0.58, 0.58, 0.58);
        const mesh = new THREE.Mesh(geometry, neutralMaterial.clone());
        mesh.position.copy(position);
        mesh.rotation.set(index * 0.11, index * 0.18, index * 0.07);
        root.add(mesh);
        return mesh;
      });

      const connections = [
        [0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 4],
        [3, 5], [3, 6], [4, 5], [4, 6], [5, 7], [6, 7]
      ];
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x36506f, transparent: true, opacity: 0.46 });
      connections.forEach(([from, to]) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([positions[from], positions[to]]);
        root.add(new THREE.Line(geometry, lineMaterial));
      });

      const grid = new THREE.GridHelper(12, 24, 0x24405f, 0x15243a);
      grid.position.y = -2.35;
      grid.rotation.z = 0.02;
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      gridMaterials.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.22;
      });
      root.add(grid);

      const packetMaterial = new THREE.MeshBasicMaterial({ color: routeColors[activeTrack] });
      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 12), packetMaterial);
      root.add(packet);

      const ambient = new THREE.AmbientLight(0x96b8dd, 1.35);
      const key = new THREE.PointLight(0x39d9f9, 12, 18);
      key.position.set(1.5, 3.5, 5);
      scene.add(ambient, key);

      const pointer = { x: 0, y: 0 };
      let animationFrame = 0;
      let animationStart = performance.now();
      let renderUntil = animationStart + (reducedMotion.matches ? 0 : 1850);

      const resize = () => {
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderUntil = performance.now() + 240;
        requestRender();
      };

      const setRoute = () => {
        const color = new THREE.Color(routeColors[activeTrack]);
        packetMaterial.color.copy(color);
        const active = new Set(routePaths[activeTrack]);
        nodes.forEach((node, index) => {
          const material = node.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          material.color.set(active.has(index) ? color : 0x14223a);
          material.emissive.set(active.has(index) ? color : 0x09111f);
          material.emissiveIntensity = active.has(index) ? 0.34 : 0.1;
        });
        animationStart = performance.now();
        renderUntil = animationStart + (reducedMotion.matches ? 0 : 1850);
        requestRender();
      };

      const routePoint = (elapsed: number) => {
        const ids = routePaths[activeTrack];
        const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(elapsed / 1600, 1));
        const scaled = progress * (ids.length - 1);
        const segment = Math.min(Math.floor(scaled), ids.length - 2);
        const local = scaled - segment;
        return positions[ids[segment]].clone().lerp(positions[ids[segment + 1]], local);
      };

      const render = (now: number) => {
        animationFrame = 0;
        const elapsed = now - animationStart;
        packet.position.copy(routePoint(elapsed));
        packet.scale.setScalar(reducedMotion.matches ? 1 : 1 + Math.sin(elapsed * 0.014) * 0.22);
        root.rotation.y += (pointer.x * 0.07 - root.rotation.y) * 0.075;
        root.rotation.x += (-0.12 + pointer.y * 0.035 - root.rotation.x) * 0.075;
        nodes.forEach((node, index) => {
          node.rotation.y += reducedMotion.matches ? 0 : 0.002 + index * 0.00016;
        });
        renderer.render(scene, camera);
        if (!disposed && (now < renderUntil || Math.abs(root.rotation.y - pointer.x * 0.07) > 0.001)) {
          animationFrame = requestAnimationFrame(render);
        }
      };

      const requestRender = () => {
        if (!animationFrame) animationFrame = requestAnimationFrame(render);
      };

      const onPointerMove = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        renderUntil = performance.now() + 260;
        requestRender();
      };
      const onPointerLeave = () => {
        pointer.x = 0;
        pointer.y = 0;
        renderUntil = performance.now() + 420;
        requestRender();
      };

      const observer = new ResizeObserver(resize);
      observer.observe(host);
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
      setRoute();
      resize();

      cleanup = () => {
        cancelAnimationFrame(animationFrame);
        observer.disconnect();
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
        root.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
        lineMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        delete host.dataset.rendered;
      };
    };

    void start();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [activeTrack]);

  return <div className="os-scene" ref={hostRef} aria-hidden="true"><span className="os-scene-fallback" /></div>;
}

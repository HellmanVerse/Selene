"use client";
import { useEffect, useRef } from "react";
export default function TerrainMesh({ grid }: { grid: number[][] }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let end = () => {},
      stopped = false;
    Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
    ]).then(([T, { OrbitControls }]) => {
      if (stopped || !host.current) return;
      const parent = host.current,
        scene = new T.Scene(),
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true }),
        camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(1.9, 2, 2.4);
      camera.lookAt(0, 0, 0);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      parent.append(renderer.domElement);
      const rows = grid.length,
        cols = grid[0].length,
        min = Math.min(...grid.flat()),
        max = Math.max(...grid.flat()),
        geo = new T.PlaneGeometry(2, 2, cols - 1, rows - 1),
        pos = geo.attributes.position,
        colors = [];
      for (let i = 0; i < pos.count; i++) {
        const z = grid[Math.floor(i / cols)][i % cols];
        pos.setZ(i, ((z - min) / Math.max(max - min, 1)) * 0.4);
        const c = new T.Color().setHSL(
          0.22,
          0.3,
          0.16 + ((z - min) / Math.max(1, max - min)) * 0.5,
        );
        colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const mesh = new T.Mesh(
        geo,
        new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      scene.add(new T.AmbientLight(0xffffff, 2));
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(2, 3, 1);
      scene.add(light);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 1.5;
      controls.maxDistance = 6;
      let frame = 0;
      const resize = () => {
        camera.aspect = parent.clientWidth / parent.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(parent.clientWidth, parent.clientHeight);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(parent);
      resize();
      const render = () => {
        frame = requestAnimationFrame(render);
        controls.update();
        renderer.render(scene, camera);
      };
      render();
      end = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        geo.dispose();
        (mesh.material as InstanceType<typeof T.Material>).dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
    return () => {
      stopped = true;
      end();
    };
  }, [grid]);
  return (
    <div className="terrain-mesh" ref={host}>
      <span className="mono">
        Measured LOLA surface · heights normalized for display
      </span>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Minus, RotateCcw, Maximize2 } from "lucide-react";
import type { Vector3 } from "three";
type Props = {
  lat: number;
  lon: number;
  earth?: boolean;
  onSelect?: (lat: number, lon: number) => void;
  name?: string;
};
export default function Globe({
  lat,
  lon,
  earth = false,
  onSelect,
  name,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    marker = useRef<HTMLDivElement>(null);
  const selection = useRef({ lat, lon });
  selection.current = { lat, lon };
  const select = useRef(onSelect);
  select.current = onSelect;
  const control = useRef<{
    zoom: (factor: number) => void;
    reset: () => void;
    fly: (la: number, lo: number) => void;
  } | null>(null);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let dispose = () => {},
      stopped = false;
    Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
    ])
      .then(([T, { OrbitControls }]) => {
        if (stopped || !host.current) return;
        const parent = host.current,
          scene = new T.Scene(),
          camera = new T.PerspectiveCamera(33, 1, 0.01, 100);
        camera.position.set(3.6, 0.7, 0.15);
        const renderer = new T.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        parent.prepend(renderer.domElement);
        renderer.domElement.setAttribute(
          "aria-label",
          earth
            ? "Interactive Earth globe"
            : "Interactive lunar globe. Click a location to select coordinates.",
        );
        const loader = new T.TextureLoader();
        const texture = loader.load(
          earth ? "/earth.jpg" : "/moon.jpg",
          () => setReady(true),
          undefined,
          () => {
            setFailed(true);
            setReady(true);
          },
        );
        texture.colorSpace = T.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const material = new T.MeshStandardMaterial({
          map: texture,
          roughness: 1,
          metalness: 0,
        });
        const sphere = new T.Mesh(new T.SphereGeometry(1, 96, 64), material);
        scene.add(sphere);
        scene.add(new T.AmbientLight(0xffffff, earth ? 1.4 : 1.75));
        const light = new T.DirectionalLight(0xffffff, earth ? 2.2 : 2.7);
        light.position.set(3, 4, 2);
        scene.add(light);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 1.25;
        controls.maxDistance = 5;
        controls.rotateSpeed = 0.45;
        const vector = (la: number, lo: number, r = 1) =>
          new T.Vector3(
            r * Math.cos((la * Math.PI) / 180) * Math.cos((lo * Math.PI) / 180),
            r * Math.sin((la * Math.PI) / 180),
            -r *
              Math.cos((la * Math.PI) / 180) *
              Math.sin((lo * Math.PI) / 180),
          );
        const ring = new T.Mesh(
          new T.RingGeometry(0.018, 0.026, 40),
          new T.MeshBasicMaterial({
            color: 0xd1ff72,
            side: T.DoubleSide,
            depthTest: true,
          }),
        );
        scene.add(ring);
        const region = new T.LineLoop(
          new T.BufferGeometry(),
          new T.LineBasicMaterial({
            color: 0xd1ff72,
            transparent: true,
            opacity: 0.6,
          }),
        );
        scene.add(region);
        let tween: Vector3 | null = null,
          id = 0,
          down = { x: 0, y: 0 };
        const fitDistance = () =>
          Math.min(
            5,
            (earth ? 3.8 : 3.6) /
              Math.min(
                parent.clientWidth / Math.max(parent.clientHeight, 1),
                1,
              ),
          );
        const fly = (la: number, lo: number) => {
          tween = vector(la, lo, fitDistance());
        };
        control.current = {
          zoom: (f) => {
            tween = null;
            camera.position.multiplyScalar(f);
            camera.position.setLength(
              Math.min(5, Math.max(1.25, camera.position.length())),
            );
          },
          reset: () => fly(0, 0),
          fly,
        };
        if (earth) fly(lat, lon);
        const ray = new T.Raycaster(),
          mouse = new T.Vector2();
        const pointerDown = (e: PointerEvent) => {
          down = { x: e.clientX, y: e.clientY };
          tween = null;
        };
        const pointerUp = (e: PointerEvent) => {
          if (
            !select.current ||
            Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5
          )
            return;
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(mouse, camera);
          const hit = ray.intersectObject(sphere)[0];
          if (hit) {
            const p = hit.point.normalize();
            select.current(
              (Math.asin(p.y) * 180) / Math.PI,
              (Math.atan2(-p.z, p.x) * 180) / Math.PI,
            );
          }
        };
        renderer.domElement.addEventListener("pointerdown", pointerDown);
        renderer.domElement.addEventListener("pointerup", pointerUp);
        const resize = () => {
          if (!parent.clientWidth || !parent.clientHeight) return;
          camera.aspect = parent.clientWidth / parent.clientHeight;
          camera.updateProjectionMatrix();
          camera.position.setLength(fitDistance());
          if (tween) tween.setLength(fitDistance());
          renderer.setSize(parent.clientWidth, parent.clientHeight);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(parent);
        resize();
        const render = () => {
          id = requestAnimationFrame(render);
          const s = selection.current,
            p = vector(s.lat, s.lon, 1.006);
          ring.position.copy(p);
          ring.quaternion.setFromUnitVectors(
            new T.Vector3(0, 0, 1),
            p.clone().normalize(),
          );
          if (tween) {
            camera.position.lerp(tween, 0.045);
            if (camera.position.distanceTo(tween) < 0.001) tween = null;
          }
          controls.update();
          const projected = p.clone().project(camera),
            visible = p.dot(camera.position) > 1;
          if (marker.current) {
            marker.current.style.left = `${((projected.x + 1) / 2) * parent.clientWidth}px`;
            marker.current.style.top = `${((-projected.y + 1) / 2) * parent.clientHeight}px`;
            marker.current.style.opacity = visible ? "1" : "0";
          }
          renderer.render(scene, camera);
        };
        render();
        dispose = () => {
          cancelAnimationFrame(id);
          observer.disconnect();
          controls.dispose();
          renderer.domElement.removeEventListener("pointerdown", pointerDown);
          renderer.domElement.removeEventListener("pointerup", pointerUp);
          sphere.geometry.dispose();
          material.dispose();
          texture.dispose();
          ring.geometry.dispose();
          (ring.material as InstanceType<typeof T.Material>).dispose();
          region.geometry.dispose();
          (region.material as InstanceType<typeof T.Material>).dispose();
          renderer.dispose();
          renderer.domElement.remove();
          control.current = null;
        };
      })
      .catch(() => setFailed(true));
    return () => {
      stopped = true;
      dispose();
    };
    // Globe lifecycle is independent of changing coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earth]);
  useEffect(() => {
    control.current?.fly(lat, lon);
  }, [lat, lon]);
  return (
    <div className={`globe-shell ${earth ? "earth-shell" : ""}`}>
      <div className="orbital orbital-one" />
      <div className="orbital orbital-two" />
      <div className="globe-render" ref={host}>
        {!ready && !failed && (
          <div className="globe-loading mono">
            Loading {earth ? "Earth" : "lunar"} imagery…
          </div>
        )}
        {failed && (
          <div className="globe-loading">
            3D rendering is unavailable. Use coordinate entry below to analyze
            any lunar region.
          </div>
        )}
        <div className="globe-marker" ref={marker}>
          <span />
          {name && (
            <label>
              {name}
              <small>
                {Math.abs(lat).toFixed(2)}°{lat < 0 ? "S" : "N"} ·{" "}
                {Math.abs(lon).toFixed(2)}°{lon < 0 ? "W" : "E"}
              </small>
            </label>
          )}
        </div>
      </div>
      <div className="globe-tools">
        <button
          aria-label="Zoom in"
          onClick={() => control.current?.zoom(0.85)}
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => control.current?.zoom(1.15)}
        >
          <Minus size={15} />
        </button>
        <button
          aria-label="Reset globe"
          onClick={() => control.current?.reset()}
        >
          <RotateCcw size={14} />
        </button>
        <button
          aria-label="Center selection"
          onClick={() => control.current?.fly(lat, lon)}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}

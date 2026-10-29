"use client";
import { useEffect, useRef, useState } from "react";
import Globe from "./Globe";
type Map3D = HTMLElement & { flyCameraTo: (options: unknown) => void };
type GoogleAPI = {
  maps: {
    importLibrary: (
      name: string,
    ) => Promise<{ Map3DElement: new (options: unknown) => Map3D }>;
  };
};
declare global {
  interface Window {
    google?: GoogleAPI;
  }
}
export default function GoogleEarth({
  lat,
  lon,
  name,
}: {
  lat: number;
  lon: number;
  name: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<Map3D | null>(null),
    [failed, setFailed] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    async function init() {
      if (!window.google) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key!)}&v=beta&loading=async`;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.append(s);
        });
      }
      const lib = await window.google!.maps.importLibrary("maps3d");
      if (disposed || !host.current) return;
      map.current = new lib.Map3DElement({
        center: { lat, lng: lon, altitude: 0 },
        range: 150000,
        tilt: 65,
        heading: 0,
        mode: "HYBRID",
      });
      host.current.append(map.current);
      map.current.style.height = "100%";
      map.current.style.width = "100%";
    }
    init().catch(() => setFailed(true));
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // Camera movement is updated separately when another candidate is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    map.current?.flyCameraTo({
      endCamera: {
        center: { lat, lng: lon, altitude: 0 },
        range: 150000,
        tilt: 65,
        heading: 0,
      },
      durationMillis: 2200,
    });
  }, [lat, lon]);
  if (!key || failed)
    return (
      <>
        <Globe earth lat={lat} lon={lon} name={name} />
        <div className="viewer-note mono">
          Open 3D globe · Google photorealistic view requires a Maps API key
        </div>
      </>
    );
  return <div ref={host} className="google-earth" />;
}

"use client";
import { useEffect, useRef, useState } from "react";
import Globe from "./Globe";
type Map3D = HTMLElement & {
  range: number;
  stopCameraAnimation: () => void;
  flyCameraTo: (options: unknown) => void;
};
type Marker3D = HTMLElement & {
  position: { lat: number; lng: number };
  label: string;
};
type GoogleAPI = {
  maps: {
    importLibrary: (name: string) => Promise<{
      Map3DElement: new (options: unknown) => Map3D;
      Marker3DElement: new (options: unknown) => Marker3D;
    }>;
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
  elevation = 0,
}: {
  lat: number;
  lon: number;
  name: string;
  elevation?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<Map3D | null>(null),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    marker = useRef<Marker3D | null>(null);
  const selection = useRef({ lat, lon, name, elevation });
  selection.current = { lat, lon, name, elevation };
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    async function init() {
      if (!window.google) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key!)}&v=weekly&libraries=maps3d`;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.append(s);
        });
      }
      const lib = await window.google!.maps.importLibrary("maps3d");
      if (disposed || !host.current) return;
      map.current = new lib.Map3DElement({
        center: {
          lat: selection.current.lat,
          lng: selection.current.lon,
          altitude: Math.max(0, selection.current.elevation) + 300,
        },
        range: 5000,
        tilt: 45,
        heading: 0,
        mode: "HYBRID",
        gestureHandling: "GREEDY",
      });
      marker.current = new lib.Marker3DElement({
        position: { lat: selection.current.lat, lng: selection.current.lon },
        label: selection.current.name,
        altitudeMode: "CLAMP_TO_GROUND",
      });
      map.current.append(marker.current);
      map.current.addEventListener("gmp-error", () => setFailed(true));
      host.current.append(map.current);
      setReady(true);
      map.current.style.height = "100%";
      map.current.style.width = "100%";
    }
    init().catch(() => setFailed(true));
    return () => {
      disposed = true;
      map.current?.stopCameraAnimation();
      map.current?.remove();
      marker.current = null;
      map.current = null;
    };
    // Camera movement is updated separately when another candidate is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready || failed) return;
    if (marker.current) {
      marker.current.position = { lat, lng: lon };
      marker.current.label = name;
    }
    map.current?.stopCameraAnimation();
    map.current?.flyCameraTo({
      endCamera: {
        center: {
          lat: selection.current.lat,
          lng: selection.current.lon,
          altitude: Math.max(0, selection.current.elevation) + 300,
        },
        range: 5000,
        tilt: 45,
        heading: 0,
      },
      durationMillis: 2200,
    });
  }, [lat, lon, name, elevation, ready, failed]);
  if (!key || failed)
    return (
      <>
        <Globe earth lat={lat} lon={lon} name={name} />
        <div className="viewer-note mono">
          Overview globe · Detailed Google 3D requires Maps API configuration.
          Use “Open in Google Earth” for detailed exploration.
        </div>
      </>
    );
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div ref={host} className="google-earth" />
      {ready && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            background: "#111",
            padding: 8,
            display: "flex",
            gap: 12,
          }}
        >
          <button
            aria-label="Zoom Earth map in"
            onClick={() => {
              if (map.current) {
                map.current.stopCameraAnimation();
                map.current.range = Math.max(20, map.current.range / 2);
              }
            }}
          >
            ＋
          </button>
          <button
            aria-label="Zoom Earth map out"
            onClick={() => {
              if (map.current) {
                map.current.stopCameraAnimation();
                map.current.range = Math.min(30000000, map.current.range * 2);
              }
            }}
          >
            −
          </button>
          <button
            onClick={() =>
              map.current?.flyCameraTo({
                endCamera: {
                  center: {
                    lat,
                    lng: lon,
                    altitude: Math.max(0, elevation) + 300,
                  },
                  range: 5000,
                  tilt: 45,
                  heading: 0,
                },
                durationMillis: 1200,
              })
            }
          >
            Recenter location
          </button>
        </div>
      )}
    </div>
  );
}

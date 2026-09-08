import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import L from "leaflet";
import type { Region } from "../types/gis";
import { PolygonListPanel } from "../components/PolygonListPanel";

const EAST_JAVA_CENTER: LatLngExpression = [-7.7, 112.5];
const EAST_JAVA_ZOOM = 8;
const EAST_JAVA_BOUNDS: LatLngBoundsExpression = [
  [-8.9, 110.8],
  [-6.5, 114.5],
];

function getBoundsFromGeojson(geojsonStr: string): L.LatLngBounds | null {
  try {
    const geom = typeof geojsonStr === "string" ? JSON.parse(geojsonStr) : geojsonStr;
    const geometry = geom.geometry || geom;
    return L.geoJSON(geometry).getBounds();
  } catch {
    return null;
  }
}

interface HomeViewProps {
  onNavigateToEditor: () => void;
  onUpdateCount?: (count: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigateToEditor, onUpdateCount }) => {
  const mapRef = useRef<L.Map | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false); // hidden by default

  const fetchRegions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/regions");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: Region[] = await res.json();
      setRegions(data);
      if (onUpdateCount) onUpdateCount(data.length);
    } catch (err: any) {
      console.error("Gagal memuat data wilayah:", err);
      setError(err.message || "Gagal memuat data dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegions(); }, []);

  const handleFlyTo = (region: Region) => {
    if (!mapRef.current) return;
    const bounds = getBoundsFromGeojson(region.geojson);
    if (bounds && bounds.isValid()) {
      mapRef.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1 });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Full-bleed Map */}
      <MapContainer
        center={EAST_JAVA_CENTER}
        zoom={EAST_JAVA_ZOOM}
        maxBounds={EAST_JAVA_BOUNDS}
        maxBoundsViscosity={0.8}
        minZoom={7}
        className="w-full h-screen"
        zoomControl={true}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {regions.map((region) => {
          try {
            const geometry =
              typeof region.geojson === "string" ? JSON.parse(region.geojson) : region.geojson;
            const feature: GeoJSON.Feature = {
              type: "Feature",
              properties: { id: region.id, name: region.name, ownership: region.ownership, created_at: region.created_at },
              geometry: geometry.geometry || geometry,
            };
            const isPTN = region.ownership === "Perguruan Tinggi Islam";
            const mainColor = isPTN ? "#2563eb" : "#059669";
            const fillColor = isPTN ? "#3b82f6" : "#10b981";
            return (
              <GeoJSON
                key={`${region.id}-${region.name}`}
                data={feature}
                style={() => ({ color: mainColor, fillColor, weight: 2.5, opacity: 0.9, fillOpacity: 0.35 })}
                onEachFeature={(_feat, layer) => {
                  layer.bindPopup(
                    `<div style="min-width:180px;padding:2px">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                        <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">ID #${region.id}</span>
                        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${isPTN ? "rgba(59,130,246,.2)" : "rgba(16,185,129,.2)"};color:${isPTN ? "#93c5fd" : "#6ee7b7"};border:1px solid ${isPTN ? "rgba(59,130,246,.4)" : "rgba(16,185,129,.4)"}">
                          ${region.ownership}
                        </span>
                      </div>
                      <h3 style="font-size:14px;font-weight:600;color:#f8fafc;margin:0 0 6px 0;line-height:1.3">${region.name}</h3>
                      <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:6px;font-size:11px;color:#94a3b8">
                        Status: <strong style="color:#e2e8f0">${region.ownership}</strong>
                      </div>
                    </div>`,
                    { closeButton: true, autoPan: true }
                  );
                }}
              />
            );
          } catch (e) {
            console.error("Gagal parsing GeoJSON ID:", region.id, e);
            return null;
          }
        })}
      </MapContainer>

      {/* Polygon list panel — read-only, hidden by default */}
      <PolygonListPanel
        regions={regions}
        loading={loading}
        isOpen={listOpen}
        onToggle={() => setListOpen((o) => !o)}
        onFlyTo={handleFlyTo}
        onRefresh={fetchRegions}
      />

      {/* Bottom-left legend */}
      <div className="fixed bottom-6 left-6 z-[1000] pointer-events-auto">
        <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-3.5 shadow-2xl shadow-black/60 max-w-xs text-xs text-slate-300 space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-white tracking-wide">Legenda Kepemilikan</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400 font-mono">
              {regions.length} Poligon
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/40 border border-blue-500 inline-block" />
              <span>Perguruan Tinggi Islam</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500 inline-block" />
              <span>Pondok Pesantren</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              onClick={fetchRegions}
              disabled={loading}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 hover:underline cursor-pointer"
              title="Perbarui Data"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={onNavigateToEditor}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <span>+ Tambah Poligon</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && regions.length === 0 && (
        <div className="fixed inset-0 z-[1040] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-sm text-slate-200">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat poligon Jawa Timur...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1050] bg-red-950/90 border border-red-500/50 text-red-200 text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={fetchRegions} className="underline hover:text-white ml-2">Coba lagi</button>
        </div>
      )}
    </div>
  );
};
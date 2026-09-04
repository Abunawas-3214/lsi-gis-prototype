import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import L from "leaflet";
import { DrawControl } from "../components/DrawControl";
import { PolygonListPanel } from "../components/PolygonListPanel";
import type { OwnershipType, Region } from "../types/gis";

const EAST_JAVA_CENTER: LatLngExpression = [-7.7, 112.5];
const EAST_JAVA_ZOOM = 8;
const EAST_JAVA_BOUNDS: LatLngBoundsExpression = [
  [-8.9, 110.8],
  [-6.5, 114.5],
];

interface EditorViewProps {
  onNavigateHome: () => void;
  onRegionAdded?: () => void;
}

type ModalMode = "create" | "edit-meta";

interface ModalState {
  open: boolean;
  mode: ModalMode;
  region?: Region;           // edit-meta mode: existing region
  pendingLayer?: L.Layer | null; // create mode: newly drawn layer
  pendingGeoJSON?: any;          // create mode: new geometry
}

function getBoundsFromGeojson(geojsonStr: string): L.LatLngBounds | null {
  try {
    const geom = typeof geojsonStr === "string" ? JSON.parse(geojsonStr) : geojsonStr;
    const geometry = geom.geometry || geom;
    return L.geoJSON(geometry).getBounds();
  } catch {
    return null;
  }
}

export const EditorView: React.FC<EditorViewProps> = ({ onNavigateHome, onRegionAdded }) => {
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  const [regions, setRegions] = useState<Region[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [listOpen, setListOpen] = useState(true);

  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create" });
  const [formName, setFormName] = useState("");
  const [formOwnership, setFormOwnership] = useState<OwnershipType>("Negeri");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Fetch regions ──────────────────────────────────────────────────────────
  const fetchRegions = useCallback(async () => {
    setLoadingRegions(true);
    try {
      const res = await fetch("/api/regions");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data: Region[] = await res.json();
      setRegions(data);
    } catch (err: any) {
      console.error("Gagal memuat regions:", err);
    } finally {
      setLoadingRegions(false);
    }
  }, []);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ── Fly to a region ────────────────────────────────────────────────────────
  const handleFlyTo = (region: Region) => {
    if (!mapRef.current) return;
    const bounds = getBoundsFromGeojson(region.geojson);
    if (bounds && bounds.isValid()) {
      mapRef.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1 });
    }
  };

  // ── Open edit-meta modal ───────────────────────────────────────────────────
  const handleOpenEditMeta = (region: Region) => {
    setFormName(region.name);
    setFormOwnership(region.ownership);
    setFormError(null);
    setModal({ open: true, mode: "edit-meta", region });
  };

  // ── Delete from list (via trash button) ────────────────────────────────────
  const handleDeleteFromList = async (region: Region) => {
    if (!window.confirm(`Hapus wilayah "${region.name}"? Tindakan ini tidak dapat diurungkan.`)) return;
    setDeletingId(region.id);
    try {
      const res = await fetch(`/api/regions/${region.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      await fetchRegions();
      showToast(`Wilayah "${region.name}" dihapus.`);
      if (onRegionAdded) onRegionAdded();
    } catch (err: any) {
      showToast("Gagal menghapus: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── New polygon drawn on map ───────────────────────────────────────────────
  const handlePolygonCreated = useCallback((layer: L.Layer, geojson: any) => {
    setFormName("");
    setFormOwnership("Negeri");
    setFormError(null);
    setModal({ open: true, mode: "create", pendingLayer: layer, pendingGeoJSON: geojson });
  }, []);

  // ── Geometry edited via leaflet-draw toolbar ───────────────────────────────
  const handleRegionGeometryEdited = useCallback(async (id: number, geojson: any) => {
    try {
      const res = await fetch(`/api/regions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geojson }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      // Don't re-fetch; the visual state is already correct from leaflet-draw
      showToast("Geometri wilayah diperbarui.");
      if (onRegionAdded) onRegionAdded();
    } catch (err: any) {
      showToast("Gagal memperbarui geometri: " + err.message);
    }
  }, [onRegionAdded]);

  // ── Region(s) deleted via leaflet-draw toolbar ────────────────────────────
  const handleRegionGeometryDeleted = useCallback(async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) =>
        fetch(`/api/regions/${id}`, { method: "DELETE" })
      ));
      await fetchRegions();
      showToast(ids.length === 1 ? "Wilayah dihapus." : `${ids.length} wilayah dihapus.`);
      if (onRegionAdded) onRegionAdded();
    } catch (err: any) {
      showToast("Gagal menghapus: " + err.message);
    }
  }, [fetchRegions, onRegionAdded]);

  // ── Modal cancel ───────────────────────────────────────────────────────────
  const handleModalCancel = () => {
    if (modal.mode === "create" && modal.pendingLayer && featureGroupRef.current) {
      featureGroupRef.current.removeLayer(modal.pendingLayer);
    }
    setModal({ open: false, mode: "create" });
    setFormError(null);
  };

  // ── Modal submit ───────────────────────────────────────────────────────────
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { setFormError("Nama wilayah wajib diisi."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (modal.mode === "create") {
        const geometry = modal.pendingGeoJSON?.geometry || modal.pendingGeoJSON;
        const res = await fetch("/api/regions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            ownership: formOwnership,
            geojson: JSON.stringify(geometry),
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal menyimpan."); }
        setModal({ open: false, mode: "create" });
        await fetchRegions();
        if (onRegionAdded) onRegionAdded();
        showToast(`Wilayah "${formName.trim()}" berhasil disimpan.`);
      } else {
        // edit-meta
        if (!modal.region) return;
        const res = await fetch(`/api/regions/${modal.region.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), ownership: formOwnership }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Gagal memperbarui."); }
        setModal({ open: false, mode: "create" });
        await fetchRegions();
        if (onRegionAdded) onRegionAdded();
        showToast(`Wilayah "${formName.trim()}" diperbarui.`);
      }
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const coordinateCount =
    modal.pendingGeoJSON?.geometry?.coordinates?.[0]?.length ||
    modal.pendingGeoJSON?.coordinates?.[0]?.length || 0;

  return (
    <div className="relative w-full h-full">
      {/* ── Full-bleed Map ─────────────────────────────────────────────────── */}
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
        {/*
          DrawControl owns ALL polygon layers:
          - Existing regions (from `regions` prop)
          - Newly drawn polygons (via leaflet-draw)
          Edit/delete geometry happens here via leaflet-draw toolbar.
        */}
        <DrawControl
          onPolygonCreated={handlePolygonCreated}
          featureGroupRef={featureGroupRef}
          regions={regions}
          onRegionGeometryEdited={handleRegionGeometryEdited}
          onRegionGeometryDeleted={handleRegionGeometryDeleted}
        />
      </MapContainer>

      {/* ── Polygon List Panel (top-right, same side as Home) ──────────────── */}
      <PolygonListPanel
        regions={regions}
        loading={loadingRegions}
        isOpen={listOpen}
        onToggle={() => setListOpen((o) => !o)}
        onFlyTo={handleFlyTo}
        onRefresh={fetchRegions}
        onEditMeta={handleOpenEditMeta}
        onDelete={handleDeleteFromList}
        deletingId={deletingId}
      />

      {/* ── Instructions banner (bottom center) ────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <div className="bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-full px-5 py-2.5 shadow-2xl shadow-black/60 flex items-center gap-3 text-xs text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            Gambar <strong>poligon baru</strong> · Gunakan ✏️ <strong>Edit</strong> atau 🗑️ <strong>Delete</strong> di toolbar kiri atas untuk mengubah geometri.
          </span>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1050] bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{toastMessage}</span>
          <button onClick={onNavigateHome} className="ml-2 underline font-semibold text-emerald-300 hover:text-white cursor-pointer">
            Lihat di Peta
          </button>
        </div>
      )}

      {/* ── Modal (Create / Edit Meta) ──────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl shadow-black/80 text-slate-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  {modal.mode === "create" ? "Simpan Batas Wilayah" : "Edit Nama & Status"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.mode === "create"
                    ? `Poligon baru dengan ${coordinateCount} titik koordinat.`
                    : `ID #${modal.region?.id} — ${modal.region?.name}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleModalCancel}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label
                  htmlFor="region-name"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Nama Wilayah / Lembaga
                </label>
                <input
                  id="region-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="cth. Kawasan Agrowisata Batu"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Ownership */}
              <div>
                <label
                  htmlFor="region-ownership"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Status Kepemilikan
                </label>
                <div className="relative">
                  <select
                    id="region-ownership"
                    value={formOwnership}
                    onChange={(e) => setFormOwnership(e.target.value as OwnershipType)}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer"
                  >
                    <option value="Negeri">Negeri (Pemerintah / BUMN)</option>
                    <option value="Swasta">Swasta (Privat / Yayasan)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleModalCancel}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>
                    {submitting
                      ? "Menyimpan..."
                      : modal.mode === "create"
                      ? "Simpan Wilayah"
                      : "Perbarui"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
import React from "react";
import type { Region } from "../types/gis";

export function ownershipColor(ownership: string) {
  return ownership === "Negeri"
    ? { stroke: "#2563eb", fill: "#3b82f6" }
    : { stroke: "#059669", fill: "#10b981" };
}

interface PolygonListPanelProps {
  regions: Region[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onFlyTo: (region: Region) => void;
  onRefresh?: () => void;
  /** If provided, shows an edit-metadata button per item */
  onEditMeta?: (region: Region) => void;
  /** If provided, shows a delete button per item */
  onDelete?: (region: Region) => void;
  deletingId?: number | null;
}

export const PolygonListPanel: React.FC<PolygonListPanelProps> = ({
  regions,
  loading,
  isOpen,
  onToggle,
  onFlyTo,
  onRefresh,
  onEditMeta,
  onDelete,
  deletingId,
}) => {
  const hasActions = onEditMeta || onDelete;

  return (
    <div className="fixed top-20 right-4 z-[1000] w-72 pointer-events-auto">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header / toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-white tracking-wide hover:bg-slate-800/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
            </svg>
            <span>Daftar Wilayah</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
              {regions.length}
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <>
            {/* Legend + refresh */}
            <div className="px-4 pb-2 flex items-center gap-4 text-[10px] text-slate-400 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40 border border-blue-500 inline-block" />
                <span>Negeri</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500 inline-block" />
                <span>Swasta</span>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="ml-auto text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  title="Refresh"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto py-1 px-1">
              {loading && regions.length === 0 ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-500">
                  <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
                  <span>Memuat...</span>
                </div>
              ) : regions.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">Belum ada wilayah.</p>
              ) : (
                regions.map((region) => {
                  const col = ownershipColor(region.ownership);
                  return (
                    <div
                      key={region.id}
                      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800/70 transition cursor-pointer select-none"
                      onClick={() => onFlyTo(region)}
                      title="Klik untuk pindah ke lokasi"
                    >
                      {/* color dot */}
                      <span
                        className="flex-shrink-0 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: col.fill + "55", borderColor: col.stroke }}
                      />
                      {/* name + badge */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-200 truncate leading-tight">
                          {region.name}
                        </p>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: col.fill + "22",
                            color: col.fill,
                            border: `1px solid ${col.fill}44`,
                          }}
                        >
                          {region.ownership}
                        </span>
                      </div>
                      {/* action buttons (hover) */}
                      {hasActions && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          {onEditMeta && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditMeta(region); }}
                              title="Edit nama & status"
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 transition cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 16H9v-2.586z" />
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(region); }}
                              disabled={deletingId === region.id}
                              title="Hapus"
                              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition cursor-pointer disabled:opacity-40"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
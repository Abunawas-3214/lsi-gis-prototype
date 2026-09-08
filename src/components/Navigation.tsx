import React from "react";

interface NavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  regionsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavigate,
  regionsCount,
}) => {
  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-[1050] pointer-events-auto">
      <nav className="flex items-center gap-2 p-1.5 bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 rounded-full shadow-2xl shadow-black/50 text-xs sm:text-sm font-medium transition-all">
        {/* Brand indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-300 font-semibold tracking-wide border-r border-slate-700/60">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-white">LSI-GIS</span>
          <span className="text-slate-400 text-[11px] font-normal hidden sm:inline">Protoype</span>
        </div>

        {/* Home Tab */}
        <button
          onClick={() => onNavigate("/")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${currentPath === "/"
            ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/25"
            : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          title="Tampilan Peta Wilayah"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Peta Wilayah</span>
          {typeof regionsCount === "number" && (
            <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {regionsCount}
            </span>
          )}
        </button>

        {/* Editor Tab */}
        <button
          onClick={() => onNavigate("/editor")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${currentPath === "/editor"
            ? "bg-emerald-600 text-white font-medium shadow-md shadow-emerald-500/25"
            : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          title="Editor Gambar Poligon"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Editor Poligon</span>
        </button>
      </nav>
    </header>
  );
};

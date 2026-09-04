import React, { useState, useEffect, useCallback } from "react";
import { Navigation } from "./components/Navigation";
import { HomeView } from "./views/HomeView";
import { EditorView } from "./views/EditorView";

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/editor") ? "/editor" : "/";
    }
    return "/";
  });

  const [regionsCount, setRegionsCount] = useState<number | undefined>(undefined);

  // Sync state with browser URL popstate (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.startsWith("/editor") ? "/editor" : "/";
      setCurrentPath(path);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
    }
  }, [currentPath]);

  // Fetch initial regions count for navigation badge
  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/regions");
      if (res.ok) {
        const data = await res.json();
        setRegionsCount(data.length);
      }
    } catch (e) {
      console.warn("Unable to fetch regions count:", e);
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Floating Top Navigation Pill */}
      <Navigation
        currentPath={currentPath}
        onNavigate={navigate}
        regionsCount={regionsCount}
      />

      {/* View Switcher */}
      {currentPath === "/editor" ? (
        <EditorView
          onNavigateHome={() => navigate("/")}
          onRegionAdded={() => {
            setRegionsCount((prev) => (prev !== undefined ? prev + 1 : 1));
          }}
        />
      ) : (
        <HomeView
          onNavigateToEditor={() => navigate("/editor")}
          onUpdateCount={(count) => setRegionsCount(count)}
        />
      )}
    </main>
  );
}

export default App;

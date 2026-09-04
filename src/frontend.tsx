import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Declare global type variable to prevent leaflet-draw ReferenceError in strict mode
if (typeof window !== "undefined") {
  (window as any).L = L;
  (window as any).type = undefined;
}

// Fix Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Import leaflet-draw
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

// Patch leaflet-draw undeclared 'type' variable bug in L.GeometryUtil.readableArea
if (typeof window !== "undefined" && (L as any).GeometryUtil) {
  const defaultPrecision = { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0, ft: 0, nm: 2 };
  (L as any).GeometryUtil.readableArea = function (area: number, isMetric: any, precision: any) {
    let areaStr: string;
    let units: string[] = ["ha", "m"];
    const p = (L.Util as any).extend({}, defaultPrecision, precision);

    if (isMetric) {
      const typeStr = typeof isMetric;
      if (typeStr === "string") {
        units = [isMetric];
      } else if (typeStr !== "boolean") {
        units = isMetric;
      }

      if (area >= 1000000 && units.indexOf("km") !== -1) {
        areaStr = (L as any).GeometryUtil.formattedNumber(area * 0.000001, p["km"]) + " km²";
      } else if (area >= 10000 && units.indexOf("ha") !== -1) {
        areaStr = (L as any).GeometryUtil.formattedNumber(area * 0.0001, p["ha"]) + " ha";
      } else {
        areaStr = (L as any).GeometryUtil.formattedNumber(area, p["m"]) + " m²";
      }
    } else {
      let yards = area / 0.836127;
      if (yards >= 3097600) {
        areaStr = (L as any).GeometryUtil.formattedNumber(yards / 3097600, p["mi"]) + " mi²";
      } else if (yards >= 4840) {
        areaStr = (L as any).GeometryUtil.formattedNumber(yards / 4840, p["ac"]) + " acres";
      } else {
        areaStr = (L as any).GeometryUtil.formattedNumber(yards, p["yd"]) + " yd²";
      }
    }

    return areaStr;
  };
}

import { App } from "./App";

const elem = document.getElementById("root")!;
let root = (window as any).__reactRoot;
if (!root) {
  root = createRoot(elem);
  (window as any).__reactRoot = root;
}

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

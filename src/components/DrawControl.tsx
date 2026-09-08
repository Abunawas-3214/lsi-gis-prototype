import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import type { Region } from "../types/gis";
import { ownershipColor } from "./PolygonListPanel";

interface DrawControlProps {
  onPolygonCreated: (layer: L.Layer, geojson: any) => void;
  featureGroupRef: React.MutableRefObject<L.FeatureGroup | null>;
  /** Existing regions to render & allow editing */
  regions?: Region[];
  /** Called after user finishes editing a region's geometry */
  onRegionGeometryEdited?: (id: number, geojson: any) => void;
  /** Called after user deletes region(s) via the toolbar */
  onRegionGeometryDeleted?: (ids: number[]) => void;
}

export const DrawControl: React.FC<DrawControlProps> = ({
  onPolygonCreated,
  featureGroupRef,
  regions = [],
  onRegionGeometryEdited,
  onRegionGeometryDeleted,
}) => {
  const map = useMap();

  // --- stable callback refs so Effect 1 closure never goes stale ---
  const cbCreated = useRef(onPolygonCreated);
  const cbEdited = useRef(onRegionGeometryEdited);
  const cbDeleted = useRef(onRegionGeometryDeleted);
  useEffect(() => { cbCreated.current = onPolygonCreated; });
  useEffect(() => { cbEdited.current = onRegionGeometryEdited; });
  useEffect(() => { cbDeleted.current = onRegionGeometryDeleted; });

  // leafletLayerId -> regionId  (for layers that came from the DB)
  const regionLayerMap = useRef(new Map<number, number>());
  // leafletLayerIds that the user drew fresh (not from DB)
  const newLayerIds = useRef(new Set<number>());

  // signal that the FeatureGroup is ready so Effect 2 can populate it
  const [fgReady, setFgReady] = useState(false);

  // ── Effect 1: Set up draw control + event handlers (once) ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).L = L;
    (window as any).__leafletMap = map;
    (window as any).type = undefined;

    // Patch leaflet-draw readableArea strict-mode bug
    if ((L as any).GeometryUtil) {
      const defaultP = { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0, ft: 0, nm: 2 };
      (L as any).GeometryUtil.readableArea = function (area: number, isMetric: any, precision: any) {
        let areaStr: string;
        let units: string[] = ["ha", "m"];
        const p = (L.Util as any).extend({}, defaultP, precision);
        if (isMetric) {
          const t = typeof isMetric;
          if (t === "string") units = [isMetric];
          else if (t !== "boolean") units = isMetric;
          if (area >= 1000000 && units.indexOf("km") !== -1)
            areaStr = (L as any).GeometryUtil.formattedNumber(area * 0.000001, p["km"]) + " km²";
          else if (area >= 10000 && units.indexOf("ha") !== -1)
            areaStr = (L as any).GeometryUtil.formattedNumber(area * 0.0001, p["ha"]) + " ha";
          else
            areaStr = (L as any).GeometryUtil.formattedNumber(area, p["m"]) + " m²";
        } else {
          const yards = area / 0.836127;
          if (yards >= 3097600)
            areaStr = (L as any).GeometryUtil.formattedNumber(yards / 3097600, p["mi"]) + " mi²";
          else if (yards >= 4840)
            areaStr = (L as any).GeometryUtil.formattedNumber(yards / 4840, p["ac"]) + " acres";
          else
            areaStr = (L as any).GeometryUtil.formattedNumber(yards, p["yd"]) + " yd²";
        }
        return areaStr;
      };
    }

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    featureGroupRef.current = drawnItems;

    const drawControl = new (L.Control as any).Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: { color: "#f43f5e", message: "<strong>Peringatan:</strong> Garis tidak boleh bersilangan!" },
          shapeOptions: { color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 0.35, weight: 2.5 },
        },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        edit: {},
        remove: {},
      },
    });
    map.addControl(drawControl);

    const handleCreated = (e: any) => {
      const layer = e.layer as L.Polygon;
      drawnItems.addLayer(layer);
      newLayerIds.current.add(drawnItems.getLayerId(layer));
      cbCreated.current(layer, layer.toGeoJSON());
    };

    const handleEdited = (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const lid = drawnItems.getLayerId(layer);
        const rid = regionLayerMap.current.get(lid);
        if (rid !== undefined && cbEdited.current) {
          const geojson = (layer as L.Polygon).toGeoJSON().geometry;
          cbEdited.current(rid, geojson);
        }
      });
    };

    const handleDeleted = (e: any) => {
      const deletedIds: number[] = [];
      e.layers.eachLayer((layer: any) => {
        const lid = drawnItems.getLayerId(layer);
        const rid = regionLayerMap.current.get(lid);
        if (rid !== undefined) {
          deletedIds.push(rid);
          regionLayerMap.current.delete(lid);
        }
        newLayerIds.current.delete(lid);
      });
      if (deletedIds.length > 0 && cbDeleted.current) {
        cbDeleted.current(deletedIds);
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    setFgReady(true);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      featureGroupRef.current = null;
      setFgReady(false);
    };
  }, [map]); // intentionally only [map]

  // ── Effect 2: Sync existing regions into the FeatureGroup ──────────────
  useEffect(() => {
    if (!fgReady) return;
    const fg = featureGroupRef.current;
    if (!fg) return;

    // Remove old region layers (keep user-drawn new ones)
    regionLayerMap.current.forEach((_rid, lid) => {
      const layer = fg.getLayer(lid);
      if (layer) fg.removeLayer(layer);
    });
    regionLayerMap.current.clear();

    // Add current regions
    regions.forEach((region) => {
      try {
        const geom = typeof region.geojson === "string" ? JSON.parse(region.geojson) : region.geojson;
        const geometry = geom.geometry || geom;
        const col = ownershipColor(region.ownership);
        const isPTI = region.ownership === "Perguruan Tinggi Islam";

        const geoLayer = L.geoJSON(geometry, {
          style: () => ({
            color: col.stroke,
            fillColor: col.fill,
            fillOpacity: 0.35,
            weight: 2.5,
            opacity: 0.85,
          }),
        });

        geoLayer.eachLayer((layer: any) => {
          layer.bindPopup(
            `<div style="min-width:170px;padding:2px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase">ID #${region.id}</span>
                <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${isPTI ? "rgba(59,130,246,.2)" : "rgba(16,185,129,.2)"};color:${isPTI ? "#93c5fd" : "#6ee7b7"};border:1px solid ${isPTI ? "rgba(59,130,246,.4)" : "rgba(16,185,129,.4)"}">
                  ${region.ownership}
                </span>
              </div>
              <h3 style="font-size:14px;font-weight:600;color:#f8fafc;margin:0 0 6px 0">${region.name}</h3>
              <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:6px;font-size:11px;color:#94a3b8">
                Status: <strong style="color:#e2e8f0">${region.ownership}</strong>
              </div>
            </div>`,
            { closeButton: true, autoPan: true }
          );
          fg.addLayer(layer);
          const lid = fg.getLayerId(layer);
          regionLayerMap.current.set(lid, region.id);
        });
      } catch (err) {
        console.warn("DrawControl: Failed to add region", region.id, err);
      }
    });
  }, [regions, fgReady]); // re-sync whenever regions or ready-state change

  return null;
};
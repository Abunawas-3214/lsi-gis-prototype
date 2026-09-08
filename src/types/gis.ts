export type OwnershipType = "Perguruan Tinggi Islam" | "Pondok Pesantren";

export interface Region {
  id: number;
  name: string;
  ownership: OwnershipType;
  geojson: string; // JSON string representing GeoJSON geometry or Feature
  created_at?: string;
}

export interface RegionCreateInput {
  name: string;
  ownership: OwnershipType;
  geojson: any;
}

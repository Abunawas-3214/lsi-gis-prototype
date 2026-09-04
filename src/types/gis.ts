export type OwnershipType = "Negeri" | "Swasta";

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

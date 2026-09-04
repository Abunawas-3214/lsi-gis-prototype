import { serve } from "bun";
import { Database } from "bun:sqlite";
import index from "./src/index.html";

// 1. Initialize SQLite Database
const db = new Database("gis.db", { create: true });
db.run("PRAGMA journal_mode = WAL;");

// 2. Create 'regions' table
db.run(`
  CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ownership TEXT NOT NULL,
    geojson TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 3. Seed initial sample data if table is empty
const countQuery = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM regions").get();
if (!countQuery || countQuery.count === 0) {
  const insertStmt = db.prepare("INSERT INTO regions (name, ownership, geojson) VALUES (?, ?, ?)");
  
  const sampleRegions = [
    {
      name: "Kawasan Kampus ITS Sukolilo Surabaya",
      ownership: "Negeri",
      geojson: JSON.stringify({
        type: "Polygon",
        coordinates: [
          [
            [112.788, -7.278],
            [112.802, -7.278],
            [112.804, -7.288],
            [112.790, -7.289],
            [112.788, -7.278]
          ]
        ]
      })
    },
    {
      name: "Kompleks Universitas Brawijaya Malang",
      ownership: "Negeri",
      geojson: JSON.stringify({
        type: "Polygon",
        coordinates: [
          [
            [112.608, -7.948],
            [112.620, -7.948],
            [112.621, -7.958],
            [112.609, -7.959],
            [112.608, -7.948]
          ]
        ]
      })
    },
    {
      name: "Kawasan Konservasi Bromo Forest",
      ownership: "Swasta",
      geojson: JSON.stringify({
        type: "Polygon",
        coordinates: [
          [
            [112.915, -7.925],
            [112.955, -7.925],
            [112.960, -7.965],
            [112.910, -7.970],
            [112.915, -7.925]
          ]
        ]
      })
    }
  ];

  for (const sample of sampleRegions) {
    insertStmt.run(sample.name, sample.ownership, sample.geojson);
  }
  console.log(`[Database] Seeded ${sampleRegions.length} initial regions for East Java.`);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 4. Start Bun HTTP Server
const port = Number(process.env.PORT) || 3000;

const server = serve({
  port,
  routes: {
    // API Routes
    "/api/regions": {
      GET() {
        const regions = db.query("SELECT * FROM regions ORDER BY id DESC").all();
        return Response.json(regions, {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      },
      async POST(req) {
        try {
          const body = (await req.json()) as { name?: string; ownership?: string; geojson?: any };
          const { name, ownership, geojson } = body;

          if (!name || !ownership || !geojson) {
            return Response.json(
              { error: "Field 'name', 'ownership', and 'geojson' are required." },
              { status: 400, headers: corsHeaders }
            );
          }

          const geojsonStr = typeof geojson === "string" ? geojson : JSON.stringify(geojson);

          const insertStmt = db.prepare(
            "INSERT INTO regions (name, ownership, geojson) VALUES (?, ?, ?) RETURNING *"
          );
          const newRegion = insertStmt.get(name.trim(), ownership.trim(), geojsonStr);

          return Response.json(
            { success: true, region: newRegion },
            {
              status: 201,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        } catch (err: any) {
          return Response.json(
            { error: "Invalid JSON or server error: " + err.message },
            { status: 500, headers: corsHeaders }
          );
        }
      },
      OPTIONS() {
        return new Response(null, { headers: corsHeaders });
      },
    },

    "/api/regions/:id": {
      async PUT(req) {
        const id = req.params.id;
        try {
          const body = (await req.json()) as { name?: string; ownership?: string; geojson?: any };
          const { name, ownership, geojson } = body;

          // Build dynamic update
          const updates: string[] = [];
          const values: any[] = [];
          
          if (name) {
            updates.push("name = ?");
            values.push(name.trim());
          }
          if (ownership) {
            updates.push("ownership = ?");
            values.push(ownership.trim());
          }
          if (geojson) {
            updates.push("geojson = ?");
            const geojsonStr = typeof geojson === "string" ? geojson : JSON.stringify(geojson);
            values.push(geojsonStr);
          }

          if (updates.length === 0) {
            return Response.json({ error: "No fields to update." }, { status: 400, headers: corsHeaders });
          }

          values.push(id);
          const updateStmt = db.prepare(`UPDATE regions SET ${updates.join(", ")} WHERE id = ? RETURNING *`);
          const updatedRegion = updateStmt.get(...values);

          if (!updatedRegion) {
             return Response.json({ error: "Region not found" }, { status: 404, headers: corsHeaders });
          }

          return Response.json({ success: true, region: updatedRegion }, { headers: corsHeaders });
        } catch (err: any) {
          return Response.json(
            { error: "Invalid JSON or server error: " + err.message },
            { status: 500, headers: corsHeaders }
          );
        }
      },
      DELETE(req) {
        const id = req.params.id;
        db.prepare("DELETE FROM regions WHERE id = ?").run(id);
        return Response.json({ success: true, deletedId: id }, { headers: corsHeaders });
      },
      OPTIONS() {
        return new Response(null, { headers: corsHeaders });
      },
    },

    // Frontend fallback - serves React SPA with HMR in development
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🌐 WebGIS Server running at ${server.url} (Port ${server.port})`);

import { NextResponse, type NextRequest } from "next/server";
import type { GeocodeResponse } from "@/lib/types";

/**
 * Address → lat/lon via Nominatim (OpenStreetMap).
 * Usage policy: max 1 request/second and an identifying User-Agent.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const cache = new Map<string, GeocodeResponse>();

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing address" }, { status: 400 });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "flights-near-home/1.0",
        "Accept-Language": "en",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!results.length) {
      return NextResponse.json({ error: "We couldn't find that address." }, { status: 404 });
    }
    // Keep what the user typed as the label; Nominatim's display_name is long.
    const body: GeocodeResponse = { address: q, lat: Number(results[0].lat), lon: Number(results[0].lon) };
    cache.set(key, body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Address lookup is unavailable right now." }, { status: 502 });
  }
}

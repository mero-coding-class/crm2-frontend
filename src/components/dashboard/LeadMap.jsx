import React, { useEffect, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon paths when bundlers change them
try {
  delete L.Icon.Default.prototype._getIconUrl;
} catch (e) {
  // ignore
}
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 }; // Kathmandu
const DEFAULT_DISPLAY_CITIES = ["kathmandu", "bhaktapur", "lalitpur"];

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom() || 10);
  }, [center, map]);
  return null;
}

function FitBounds({ positions, centerOverride }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length === 0) return;
    try {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
      if (centerOverride) {
        map.setView([centerOverride.lat, centerOverride.lng], map.getZoom() || 10);
      } else {
        map.fitBounds(bounds.pad(0.25));
      }
    } catch (err) {
      // ignore
    }
  }, [positions, centerOverride, map]);
  return null;
}

// Simple Nominatim geocode for city+country
async function geocodeCity(city, country = "Nepal") {
  if (!city) return null;
  const q = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "edu-crm/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn("Geocode failed", err);
  }
  return null;
}

const LeadMap = ({ leads = [], defaultCountry = "Nepal", defaultCity = "Kathmandu" }) => {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [queryCity, setQueryCity] = useState("");
  const [queryCountry, setQueryCountry] = useState("");
  const [coordsCache, setCoordsCache] = useState({}); // city|country -> {lat,lng}

  // Pre-populate cache for default city
  useEffect(() => {
    (async () => {
      const key = `${defaultCity}|${defaultCountry}`;
      if (!coordsCache[key]) {
        const g = await geocodeCity(defaultCity, defaultCountry);
        if (g) {
          setCoordsCache((c) => ({ ...c, [key]: g }));
          setCenter(g);
        }
      } else {
        setCenter(coordsCache[key]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: get coords for a lead (from cache or geocode)
  const resolveLeadCoords = async (lead) => {
    // Try multiple fields for city and country. Backend sometimes uses different names.
    const city = (
      lead.city || lead.student_city || lead.address_city || lead.address_line_1 || lead.address_line_2 || ""
    )
      .toString()
      .trim();
    // prefer explicit country; some records accidentally use `county` instead
    const country = (lead.country || lead.county || defaultCountry).toString().trim() || defaultCountry;
    if (!city) return null;
    const key = `${city}|${country}`;
    if (coordsCache[key]) return coordsCache[key];
    // Try a couple of queries: city,country then city alone
    console.debug("LeadMap: geocoding", { city, country, key, leadId: lead.id });
    let g = await geocodeCity(city, country);
    if (!g) {
      console.debug("LeadMap: fallback geocode city only", { city });
      g = await geocodeCity(city, "");
    }
    if (!g && (lead.address_line_1 || lead.address_line_2)) {
      const combined = `${lead.address_line_1 || ""} ${lead.address_line_2 || ""}`.trim();
      if (combined) {
        console.debug("LeadMap: fallback geocode from address_line_1/2", { combined });
        g = await geocodeCity(combined, country);
      }
    }
    if (g) {
      setCoordsCache((c) => ({ ...c, [key]: g }));
      console.debug("LeadMap: geocode success", { key, coords: g });
    } else {
      console.warn("LeadMap: geocode failed for lead", { lead, key });
    }
    return g;
  };

  // Build markers for leads (memoize for performance)
  const [markers, setMarkers] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const results = [];
      // If user hasn't searched, limit initial pins to the main valley cities for performance
      const hasQuery = String(queryCity || "").trim() || String(queryCountry || "").trim();
      const leadsToIterate = hasQuery
        ? leads
        : (leads || []).filter((lead) => {
            const c = (lead.city || lead.student_city || lead.address_city || "").toString().toLowerCase();
            return DEFAULT_DISPLAY_CITIES.includes(c);
          });
      for (const lead of leadsToIterate) {
        const city = (lead.city || lead.student_city || lead.address_city || "").trim();
        const country = (lead.country || defaultCountry).trim() || defaultCountry;
        if (!city) continue;
        const key = `${city}|${country}`;
        let loc = coordsCache[key];
        if (!loc) {
          loc = await geocodeCity(city, country);
          if (loc && mounted) setCoordsCache((c) => ({ ...c, [key]: loc }));
        }
        if (loc) {
          results.push({ lead, pos: loc });
        }
      }
      if (mounted) {
        // determine if new marker was added compared to previous
        setMarkers((prev) => {
          const prevKeys = new Set(prev.map((m) => `${m.lead.id || m.lead.email || m.lead.phone_number}-${m.pos.lat}-${m.pos.lng}`));
          const added = results.find((r) => !prevKeys.has(`${r.lead.id || r.lead.email || r.lead.phone_number}-${r.pos.lat}-${r.pos.lng}`));
          if (added) {
            // center on newly added marker; FitBounds will also adjust map when appropriate
            setCenter(added.pos);
          }
          return results;
        });
      }
    })();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, coordsCache, queryCity, queryCountry]);

  const filtered = useMemo(() => {
    const qc = queryCity.trim().toLowerCase();
    const qcountry = queryCountry.trim().toLowerCase();
    if (!qc && !qcountry) return markers;
    return markers.filter(({ lead }) => {
      const c = (lead.city || lead.student_city || lead.address_city || "").toLowerCase();
      const co = (lead.country || defaultCountry || "").toLowerCase();
      const okCity = qc ? c.includes(qc) : true;
      const okCountry = qcountry ? co.includes(qcountry) : true;
      return okCity && okCountry;
    });
  }, [markers, queryCity, queryCountry, defaultCountry]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-3">
        <input
          placeholder="Search city (e.g., Kathmandu)"
          value={queryCity}
          onChange={(e) => setQueryCity(e.target.value)}
          className="border rounded px-3 py-1 w-64"
        />
        <input
          placeholder="Search country (optional)"
          value={queryCountry}
          onChange={(e) => setQueryCountry(e.target.value)}
          className="border rounded px-3 py-1 w-48"
        />
        <button
          className="bg-[#294998] hover:bg-[#1E3776] text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          onClick={async () => {
            const city = queryCity || defaultCity;
            const country = queryCountry || defaultCountry;
            const g = await geocodeCity(city, country);
            if (g) setCenter(g);
          }}
        >
          Center
        </button>
      </div>

      <div className="rounded overflow-hidden" style={{ minHeight: 360 }}>
        {/* Use an explicit pixel height so Leaflet has a concrete container size */}
        <MapContainer key={`${center.lat}-${center.lng}`} center={[center.lat, center.lng]} zoom={10} style={{ height: 360, width: "100%" }}>
          <Recenter center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map(({ lead, pos }, i) => (
            <Marker key={i} position={[pos.lat, pos.lng]}>
              {/* Tooltip shows on hover by default; do not make it permanent */}
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs font-semibold">{lead.student_name || lead.name || "Lead"}</div>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <strong>{lead.student_name || lead.name || "Lead"}</strong>
                  <div>{lead.course_name || lead.course || ""}</div>
                  <div>{lead.city || lead.student_city || ""}</div>
                  <div className="text-xs text-gray-600">{lead.email || ""}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {markers.length === 0 && (
          <div className="p-3 text-sm text-gray-500">No locations found yet; ensure leads include a city. The map will center on Kathmandu by default.</div>
        )}
      </div>
    </div>
  );
};

export default LeadMap;

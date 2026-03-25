import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, GeoJSON, useMap, Tooltip, Marker } from "react-leaflet";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, MapPin, Lightbulb, BarChart3, Layers, Trophy, Plus, Minus } from "lucide-react";
import type { Layer, PathOptions } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: "Standard",
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    label: "Topografisch",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    label: "Dunkel",
  },
};

type TileLayerKey = keyof typeof TILE_LAYERS;

function TileLayerSwitcher({ layer }: { layer: TileLayerKey }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map, layer]);
  const cfg = TILE_LAYERS[layer];
  return <TileLayer key={layer} url={cfg.url} attribution={cfg.attribution} />;
}

// Zoom controls component
function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute z-[1000] flex flex-col gap-1.5" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7rem)', right: 'calc(env(safe-area-inset-right, 0px) + 1rem)' }}>
      <button
        className="w-10 h-10 bg-card border border-border rounded-lg shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all"
        onClick={() => map.zoomIn()}
        data-testid="button-zoom-in"
        aria-label="Hineinzoomen"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        className="w-10 h-10 bg-card border border-border rounded-lg shadow-md flex items-center justify-center hover:bg-accent active:scale-95 transition-all"
        onClick={() => map.zoomOut()}
        data-testid="button-zoom-out"
        aria-label="Herauszoomen"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}

// Veedel labels component - shows names as markers at polygon centroids
function VeedelLabels({ geojson, teamSet, soloSet }: { geojson: any; teamSet: Set<string>; soloSet: Set<string> }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on("zoomend", handler);
    return () => { map.off("zoomend", handler); };
  }, [map]);

  // Calculate centroids (always call useMemo — never skip hooks conditionally)
  const labels = useMemo(() => {
    if (!geojson) return [];
    return geojson.features.map((feature: any) => {
      const name = feature.properties?.name;
      if (!name) return null;

      // Calculate centroid from MultiPolygon
      const coords = feature.geometry.coordinates;
      let sumLat = 0, sumLng = 0, count = 0;
      for (const polygon of coords) {
        for (const ring of polygon) {
          for (const [lng, lat] of ring) {
            sumLat += lat;
            sumLng += lng;
            count++;
          }
        }
      }
      if (count === 0) return null;

      const isTeam = teamSet.has(name);
      const isSolo = soloSet.has(name);

      return {
        name,
        lat: sumLat / count,
        lng: sumLng / count,
        isTeam,
        isSolo,
      };
    }).filter(Boolean);
  }, [geojson, teamSet, soloSet]);

  // Don't render labels when zoomed out too far
  if (zoom < 12 || !geojson) return null;

  // Adjust font size based on zoom
  const fontSize = zoom >= 15 ? 12 : zoom >= 14 ? 11 : zoom >= 13 ? 10 : 9;
  const showAll = zoom >= 13;

  return (
    <>
      {labels.map((label: any) => {
        // At lower zoom, only show visited ones to reduce clutter
        if (!showAll && !label.isTeam && !label.isSolo) return null;

        let color = "#6b7280";
        let fontWeight = "500";
        if (label.isTeam) { color = "#15803d"; fontWeight = "700"; }
        else if (label.isSolo) { color = "#1d4ed8"; fontWeight = "700"; }

        const icon = L.divIcon({
          className: "veedel-label",
          html: `<div style="
            font-size:${fontSize}px;
            font-weight:${fontWeight};
            color:${color};
            text-shadow: 0 0 4px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,0.9), 0 0 2px rgba(255,255,255,0.9);
            white-space:nowrap;
            pointer-events:none;
            text-align:center;
            line-height:1.2;
          ">${label.name}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        return (
          <Marker
            key={label.name}
            position={[label.lat, label.lng]}
            icon={icon}
            interactive={false}
          />
        );
      })}
    </>
  );
}

interface Stats {
  totalVeedel: number;
  teamVisited: number;
  soloVisited: number;
  teamVeedel: string[];
  soloVeedel: string[];
  allSoloVisits: Record<number, string[]>;
}

// Use API_BASE for the geojson fetch so it works in deployed iframe
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export default function MapPage() {
  const { user, logout } = useAuth();
  const [geojson, setGeojson] = useState<any>(null);
  const [tileLayer, setTileLayer] = useState<TileLayerKey>("standard");
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats");
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    // Use API_BASE to ensure it works both locally and in deployed iframe
    fetch(`${API_BASE}/api/geojson`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setGeojson)
      .catch((err) => {
        console.error("GeoJSON fetch failed:", err);
        // Fallback: try relative path
        fetch("./cologne.geojson")
          .then((r) => r.json())
          .then(setGeojson)
          .catch(console.error);
      });
  }, []);

  const teamSet = useMemo(() => new Set(stats?.teamVeedel || []), [stats]);
  const soloSet = useMemo(() => new Set(stats?.soloVeedel || []), [stats]);

  const getStyle = useCallback((feature: any): PathOptions => {
    const name = feature?.properties?.name;
    const isTeam = teamSet.has(name);
    const isSolo = soloSet.has(name);

    if (isTeam) {
      return {
        fillColor: "#16a34a",
        fillOpacity: 0.45,
        color: "#15803d",
        weight: 2,
      };
    }
    if (isSolo) {
      return {
        fillColor: "#2563eb",
        fillOpacity: 0.35,
        color: "#1d4ed8",
        weight: 2,
      };
    }
    return {
      fillColor: "#d1d5db",
      fillOpacity: 0.3,
      color: "#6b7280",
      weight: 2,
    };
  }, [teamSet, soloSet]);

  const onEachFeature = useCallback((feature: any, layer: Layer) => {
    const name = feature.properties?.name;
    if (name) {
      const isTeam = teamSet.has(name);
      const isSolo = soloSet.has(name);
      let statusHtml = '<span style="color:#9ca3af">Noch nicht besucht</span>';
      if (isTeam) statusHtml = '<span style="color:#16a34a;font-weight:600">Team besucht ✓</span>';
      else if (isSolo) statusHtml = '<span style="color:#2563eb;font-weight:600">Solo besucht ✓</span>';

      layer.bindTooltip(
        `<div style="font-weight:600;font-size:14px;margin-bottom:2px">${name}</div><div style="font-size:12px">${statusHtml}</div>`,
        { sticky: true, className: "veedel-tooltip" }
      );
      (layer as any).on("click", () => {
        window.location.hash = `/veedel/${encodeURIComponent(name)}`;
      });
      // Highlight on hover
      (layer as any).on("mouseover", () => {
        (layer as any).setStyle({ weight: 3, fillOpacity: 0.6 });
      });
      (layer as any).on("mouseout", () => {
        (layer as any).setStyle(getStyle(feature));
      });
    }
  }, [teamSet, soloSet, getStyle]);

  const geojsonKey = useMemo(
    () => `${JSON.stringify(stats?.teamVeedel)}-${JSON.stringify(stats?.soloVeedel)}-${geojson ? "loaded" : "none"}`,
    [stats, geojson]
  );

  return (
    <div className="h-dvh flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between bg-card border-b border-border shrink-0"
        style={{
          position: 'relative',
          zIndex: 1001,
          paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
          paddingBottom: '0.75rem',
          paddingLeft: `calc(1rem + env(safe-area-inset-left, 0px))`,
          paddingRight: `calc(1rem + env(safe-area-inset-right, 0px))`,
        }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-semibold text-base" data-testid="text-app-title">Veedel Explorer</span>
        </div>

        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs" data-testid="badge-stats">
            {stats ? `${stats.teamVisited + stats.soloVisited}/${stats.totalVeedel}` : "..."}
          </Badge>
          <Link href="/vorschlaege">
            <Button variant="ghost" size="sm" data-testid="link-suggestions">
              <Lightbulb className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/statistik">
            <Button variant="ghost" size="sm" data-testid="link-stats">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/achievements">
            <Button variant="ghost" size="sm" data-testid="link-achievements">
              <Trophy className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Legend */}
      <div
        className="absolute z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-1.5"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', left: 'calc(env(safe-area-inset-left, 0px) + 1rem)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-green-600 inline-block" />
          <span>Team besucht</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
          <span>Solo besucht ({user?.displayName})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" />
          <span>Noch nicht besucht</span>
        </div>
      </div>

      {/* Layer switcher */}
      <div className="absolute z-[1001]" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4rem)', right: 'calc(env(safe-area-inset-right, 0px) + 1rem)' }}>
        <Button
          variant="secondary"
          size="sm"
          className="shadow-md"
          onClick={() => setShowLayerPicker(!showLayerPicker)}
          data-testid="button-layers"
        >
          <Layers className="w-4 h-4 mr-1" /> Karte
        </Button>
        {showLayerPicker && (
          <div className="mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {Object.entries(TILE_LAYERS).map(([key, cfg]) => (
              <button
                key={key}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  tileLayer === key ? "bg-accent font-medium" : ""
                }`}
                onClick={() => {
                  setTileLayer(key as TileLayerKey);
                  setShowLayerPicker(false);
                }}
                data-testid={`button-layer-${key}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[50.9375, 6.9603]}
          zoom={12}
          minZoom={10}
          maxZoom={18}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayerSwitcher layer={tileLayer} />
          <ZoomControls />
          {geojson && (
            <>
              <GeoJSON
                key={geojsonKey}
                data={geojson}
                style={getStyle}
                onEachFeature={onEachFeature}
              />
              <VeedelLabels geojson={geojson} teamSet={teamSet} soloSet={soloSet} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

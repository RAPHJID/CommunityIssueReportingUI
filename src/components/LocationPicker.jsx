import { useEffect, useState } from "react";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./LocationPicker.css";

const DEFAULT_CENTER = [-1.195, 36.775];
const BOUNDARY_URL = "/ndenderu-ward.geojson";
const pinIcon = L.divIcon({
  className: "civic-pin",
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [34, 42],
  iconAnchor: [17, 38],
});

// GeoJSON uses [longitude, latitude], while Leaflet uses [latitude, longitude].
// Ray casting, with points on the boundary accepted.
function pointOnSegment(x, y, ax, ay, bx, by) {
  const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
  if (Math.abs(cross) > 1e-9) return false;
  return x >= Math.min(ax, bx) - 1e-9 && x <= Math.max(ax, bx) + 1e-9 &&
    y >= Math.min(ay, by) - 1e-9 && y <= Math.max(ay, by) + 1e-9;
}
function insideRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (pointOnSegment(x, y, xi, yi, xj, yj)) return true;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function insidePolygon(x, y, rings) {
  return rings.length > 0 && insideRing(x, y, rings[0]) &&
    !rings.slice(1).some((hole) => insideRing(x, y, hole));
}
function insideGeometry(latitude, longitude, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return insidePolygon(longitude, latitude, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon) => insidePolygon(longitude, latitude, polygon));
  return false;
}
function insideBoundary(latitude, longitude, data) {
  const features = data?.type === "FeatureCollection" ? data.features :
    data?.type === "Feature" ? [data] : [];
  return features.some((feature) => insideGeometry(latitude, longitude, feature.geometry));
}
function validBoundary(data) {
  const features = data?.type === "FeatureCollection" ? data.features :
    data?.type === "Feature" ? [data] : [];
  return features.length > 0 && features.every((feature) =>
    ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type));
}

function MapClickHandler({ onPick, disabled }) {
  useMapEvents({
    click(event) {
      if (!disabled) onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng, accuracyMeters: null });
    },
  });
  return null;
}
function FitBoundary({ boundary }) {
  const map = useMap();
  useEffect(() => {
    if (boundary) {
      const layer = L.geoJSON(boundary);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15 });
    }
  }, [boundary, map]);
  return null;
}
function RecenterOnPoint({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 15));
  }, [point, map]);
  return null;
}

export default function LocationPicker({ point, onChange, disabled = false }) {
  const [boundary, setBoundary] = useState(null);
  const [boundaryError, setBoundaryError] = useState("");
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBoundary() {
      try {
        const response = await fetch(BOUNDARY_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Boundary request failed (${response.status})`);
        const data = await response.json();
        if (!validBoundary(data)) throw new Error("Invalid ward boundary GeoJSON.");
        setBoundary(data);
        setBoundaryError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          setBoundaryError("Could not load Ndenderu Ward boundary. Check public/ndenderu-ward.geojson and refresh.");
        }
      }
    }
    loadBoundary();
    return () => controller.abort();
  }, []);

  // If a saved pin is outside the loaded boundary, clear it to avoid submission.
  useEffect(() => {
    if (boundary && point && !insideBoundary(point.latitude, point.longitude, boundary)) {
      onChange(null);
      setMessage("The selected pin is outside the MVP Ndenderu Ward boundary. Choose a location inside the outlined area.");
    }
  }, [boundary, point, onChange]);

  function selectPoint(nextPoint) {
    if (!boundary) {
      setMessage("Wait for the Ndenderu Ward boundary to load before selecting a pin.");
      return;
    }
    if (!insideBoundary(nextPoint.latitude, nextPoint.longitude, boundary)) {
      onChange(null);
      setMessage("That location is outside the MVP Ndenderu Ward boundary. Please select a point inside the outlined area.");
      return;
    }
    setMessage("");
    onChange(nextPoint);
  }

  function locate() {
    setMessage("");
    if (!boundary) { setMessage("The ward boundary must load before GPS can be used."); return; }
    if (!navigator.geolocation) { setMessage("This browser does not support GPS. Select a point manually."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        selectPoint({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy <= 10000 ? Math.max(1, coords.accuracy) : null,
        });
      },
      (error) => {
        setLocating(false);
        setMessage(error.code === 1 ? "Location permission denied. You can select a point manually." : "GPS unavailable. Try selecting a point manually.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  return (
    <div className="civic-location-picker">
      <div className="civic-location-toolbar">
        <span>Select an issue location inside the outlined Ndenderu Ward</span>
        <button type="button" onClick={locate} disabled={disabled || locating || !boundary}>
          {locating ? "Locating…" : "◎ Use my location"}
        </button>
      </div>
      <MapContainer center={DEFAULT_CENTER} zoom={14} scrollWheelZoom={false} className="civic-location-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundary boundary={boundary} />
        {boundary && <GeoJSON data={boundary} style={{ color: "#287347", weight: 3, fillColor: "#4e9b65", fillOpacity: 0.13 }} />}
        <MapClickHandler onPick={selectPoint} disabled={disabled || !boundary} />
        {point && boundary && insideBoundary(point.latitude, point.longitude, boundary) && (
          <>
            <Marker position={[point.latitude, point.longitude]} icon={pinIcon} />
            <RecenterOnPoint point={point} />
          </>
        )}
      </MapContainer>
      <p className="civic-location-coords">
        {point && boundary && insideBoundary(point.latitude, point.longitude, boundary)
          ? `Selected: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}${point.accuracyMeters ? ` (GPS accuracy ≈ ${Math.round(point.accuracyMeters)} m)` : ""}`
          : boundary ? "No valid pin selected. Click inside the green boundary." : "Loading Ndenderu Ward boundary…"}
      </p>
      {boundaryError && <p className="civic-location-error" role="alert">{boundaryError}</p>}
      {message && <p className="civic-location-error" role="alert">{message}</p>}
      <p className="civic-location-coords">MVP boundary data is provisional and may not match the official ward boundary exactly.</p>
    </div>
  );
}

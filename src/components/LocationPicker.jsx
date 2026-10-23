import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./LocationPicker.css";

const pinIcon = L.divIcon({ className: "civic-pin", html: '<span aria-hidden="true">📍</span>', iconSize: [34, 42], iconAnchor: [17, 38] });
const DEFAULT_CENTER = [-1.195, 36.775]; // Approximate Ndenderu–Ruaka map center; not a selected location.

function ClickToPin({ onChange, disabled }) {
  useMapEvents({ click(event) { if (!disabled) onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng, accuracyMeters: null }); } });
  return null;
}
function Recenter({ point }) {
  const map = useMap();
  useEffect(() => { if (point) map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 15)); }, [point, map]);
  return null;
}
export default function LocationPicker({ point, onChange, disabled = false }) {
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  function locate() {
    setGpsError("");
    if (!navigator.geolocation) { setGpsError("This browser does not support GPS location."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocating(false); onChange({ latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy <= 10000 ? Math.max(1, coords.accuracy) : null }); },
      (error) => { setLocating(false); setGpsError(error.code === 1 ? "Location permission was denied. You can still click the map." : "Unable to determine your location. Try placing a pin manually."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }
  return <div className="civic-location-picker">
    <div className="civic-location-toolbar"><span>Click the map to place the issue pin</span><button type="button" onClick={locate} disabled={disabled || locating}>{locating ? "Locating…" : "◎ Use my location"}</button></div>
    <MapContainer center={DEFAULT_CENTER} zoom={14} scrollWheelZoom={false} className="civic-location-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToPin onChange={onChange} disabled={disabled} />
      {point && <><Marker position={[point.latitude, point.longitude]} icon={pinIcon}/><Recenter point={point}/></>}
    </MapContainer>
    {point ? <p className="civic-location-coords">Selected: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} {point.accuracyMeters ? `(GPS accuracy ≈ ${Math.round(point.accuracyMeters)} m)` : ""}</p> : <p className="civic-location-coords">No point selected yet. Zoom to your ward and click the exact issue location.</p>}
    {gpsError && <p className="civic-location-error" role="alert">{gpsError}</p>}
  </div>;
}

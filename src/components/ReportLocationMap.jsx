import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { apiRequest } from "../services/api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./ReportLocationMap.css";

const defaultMarker = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ReportLocationMap({ locationId, locationName }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!locationId) {
      setLocation(null);
      setError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLocation(null);
    setError("");
    setLoading(true);
    apiRequest(`/Location/${encodeURIComponent(locationId)}`)
      .then((result) => {
        if (!cancelled) setLocation(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load the report location.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [locationId, retryKey]);

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  const hasCoordinates = location && location.latitude != null && location.longitude != null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

  return (
    <section className="report-location-section" aria-labelledby="report-location-title">
      <p className="report-details-section-label">WHERE IT HAPPENED</p>
      <h3 id="report-location-title">Reported location</h3>
      {locationName && <p className="report-location-name">{locationName}</p>}
      {!locationId ? (
        <p className="muted">This report has no saved location.</p>
      ) : loading ? (
        <p className="muted" role="status">Loading location map...</p>
      ) : error ? (
        <div role="alert">
          <p className="muted">{error}</p>
          <button type="button" className="retry-button" onClick={() => setRetryKey((value) => value + 1)}>Try again</button>
        </div>
      ) : !hasCoordinates ? (
        <p className="muted">GPS coordinates are unavailable for this location.</p>
      ) : (
        <>
          <div className="report-location-map">
            <MapContainer key={locationId} center={[latitude, longitude]} zoom={16} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[latitude, longitude]} icon={defaultMarker} />
            </MapContainer>
          </div>
          <p className="report-location-coordinates">GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
        </>
      )}
    </section>
  );
}

export default ReportLocationMap;

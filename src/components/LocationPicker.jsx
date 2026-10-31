import { useEffect, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationPicker.css";

const DEFAULT_CENTER = [-1.195, 36.775];
const BOUNDARY_URL = `${import.meta.env.BASE_URL}ndenderu-ward.geojson`;

const pinIcon = L.divIcon({
  className: "civic-pin",
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [34, 42],
  iconAnchor: [17, 38],
});

// GeoJSON: [longitude, latitude]
// Leaflet: [latitude, longitude]

function pointOnSegment(x, y, ax, ay, bx, by) {
  const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);

  if (Math.abs(cross) > 1e-9) return false;

  return (
    x >= Math.min(ax, bx) - 1e-9 &&
    x <= Math.max(ax, bx) + 1e-9 &&
    y >= Math.min(ay, by) - 1e-9 &&
    y <= Math.max(ay, by) + 1e-9
  );
}

function insideRing(x, y, ring) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (pointOnSegment(x, y, xi, yi, xj, yj)) {
      return true;
    }

    if (
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

function insidePolygon(x, y, rings) {
  if (!rings.length || !insideRing(x, y, rings[0])) {
    return false;
  }

  return !rings.slice(1).some((hole) => insideRing(x, y, hole));
}

function getFeatures(data) {
  if (data?.type === "FeatureCollection") {
    return data.features || [];
  }

  if (data?.type === "Feature") {
    return [data];
  }

  if (["Polygon", "MultiPolygon"].includes(data?.type)) {
    return [{ geometry: data }];
  }

  return [];
}

function insideGeometry(latitude, longitude, geometry) {
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return insidePolygon(longitude, latitude, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      insidePolygon(longitude, latitude, polygon)
    );
  }

  return false;
}

function insideBoundary(latitude, longitude, boundary) {
  return getFeatures(boundary).some((feature) =>
    insideGeometry(latitude, longitude, feature.geometry)
  );
}

function validBoundary(data) {
  const features = getFeatures(data);

  return (
    features.length > 0 &&
    features.every((feature) =>
      ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)
    )
  );
}

function MapClickHandler({ onPick, disabled }) {
  useMapEvents({
    click(event) {
      if (disabled) return;

      onPick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        accuracyMeters: null,
      });
    },
  });

  return null;
}

function FitBoundary({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) return;

    const bounds = L.geoJSON(boundary).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [18, 18],
        maxZoom: 15,
      });
    }
  }, [boundary, map]);

  return null;
}

function FlyToArea({ area }) {
  const map = useMap();

  useEffect(() => {
    if (!area) return;

    map.flyTo(
      [area.latitude, area.longitude],
      16,
      { duration: 1.1 }
    );
  }, [area, map]);

  return null;
}

function RecenterOnPoint({ point }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;

    map.flyTo(
      [point.latitude, point.longitude],
      Math.max(map.getZoom(), 15)
    );
  }, [point, map]);

  return null;
}

export default function LocationPicker({
  point,
  onChange,
  disabled = false,
}) {
  const [boundary, setBoundary] = useState(null);
  const [boundaryError, setBoundaryError] = useState("");
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [focusArea, setFocusArea] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBoundary() {
      try {
        const response = await fetch(BOUNDARY_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Boundary request failed (${response.status})`
          );
        }

        const data = await response.json();

        if (!validBoundary(data)) {
          throw new Error("Invalid ward boundary GeoJSON.");
        }

        setBoundary(data);
        setBoundaryError("");
      } catch (error) {
        if (error.name !== "AbortError") {
          setBoundaryError(
            "Could not load Ndenderu Ward boundary. " +
            "Check public/ndenderu-ward.geojson and refresh."
          );
        }
      }
    }

    loadBoundary();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (
      boundary &&
      point &&
      !insideBoundary(
        point.latitude,
        point.longitude,
        boundary
      )
    ) {
      onChange(null);

      setMessage(
        "The selected pin is outside Ndenderu Ward. " +
        "Choose a location inside the outlined area."
      );
    }
  }, [boundary, point, onChange]);

  function selectPoint(nextPoint) {
    if (!boundary) {
      setMessage(
        "Wait for the Ndenderu Ward boundary to load."
      );
      return;
    }

    if (
      !insideBoundary(
        nextPoint.latitude,
        nextPoint.longitude,
        boundary
      )
    ) {
      onChange(null);

      setMessage(
        "That location is outside Ndenderu Ward. " +
        "Please select a point inside the green boundary."
      );
      return;
    }

    setMessage("");
    onChange(nextPoint);
  }

  async function searchArea() {
    if (disabled || searching) return;

    const query = areaQuery.trim();

    if (!query) {
      setSearchError("Enter an area or landmark name.");
      return;
    }

    if (!boundary) {
      setSearchError(
        "Wait for the ward boundary to load."
      );
      return;
    }

    setSearching(true);
    setSearchError("");
    setAreaResults([]);

    try {
      const bounds = L.geoJSON(boundary).getBounds();

      const viewbox = [
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast(),
        bounds.getSouth(),
      ].join(",");

      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: "ke",
        viewbox,
        bounded: "0",
        limit: "30",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Area search unavailable (HTTP ${response.status}). ` +
          "Please try again later or select the location manually."
        );
      }

      const results = await response.json();

      if (!Array.isArray(results)) {
        throw new Error("Unexpected search response.");
      }

      const withinWard = results.filter((item) => {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          insideBoundary(latitude, longitude, boundary)
        );
      });

      setAreaResults(withinWard);

      if (!withinWard.length) {
        setSearchError(
          "No matching place was found inside Ndenderu Ward. " +
          "Try a shorter place name or select the exact point " +
          "manually on the map."
        );
      }
    } catch (error) {
      setSearchError(
        error.message || "Area search failed."
      );
    } finally {
      setSearching(false);
    }
  }

  function locate() {
    setMessage("");

    if (!boundary) {
      setMessage(
        "The ward boundary must load before GPS can be used."
      );
      return;
    }

    if (!navigator.geolocation) {
      setMessage(
        "This browser does not support GPS. " +
        "Please choose a point manually."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);

        selectPoint({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters:
            coords.accuracy <= 10000
              ? Math.max(1, coords.accuracy)
              : null,
        });
      },
      (error) => {
        setLocating(false);

        setMessage(
          error.code === 1
            ? "Location permission denied. " +
              "You can search or select a point manually."
            : "GPS unavailable. " +
              "Try searching or selecting a point manually."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }

  const validPoint =
    point &&
    boundary &&
    insideBoundary(
      point.latitude,
      point.longitude,
      boundary
    );

  return (
    <div className="civic-location-picker">
      <div className="civic-location-toolbar">
        <span>
          Select an issue location inside Ndenderu Ward
        </span>

        <button
          type="button"
          onClick={locate}
          disabled={disabled || locating || !boundary}
        >
          {locating
            ? "Locating..."
            : "◎ Use my location"}
        </button>
      </div>

      {/* AREA SEARCH - NO NESTED FORM */}

      <div className="civic-area-search">
        <label htmlFor="civic-area-query">
          Search for an area or landmark
        </label>

        <div className="civic-area-search-controls">
          <input
            id="civic-area-query"
            type="search"
            value={areaQuery}
            onChange={(event) => {
              setAreaQuery(event.target.value);
              setAreaResults([]);
              setSearchError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchArea();
              }
            }}
            placeholder="Search for a road, market or landmark"
            disabled={disabled || !boundary}
          />

          <button
            type="button"
            onClick={searchArea}
            disabled={disabled || !boundary || searching}
          >
            {searching ? "Searching..." : "Find area"}
          </button>
        </div>

        {searchError && (
          <p
            className="civic-location-error"
            role="alert"
          >
            {searchError}
          </p>
        )}

        {areaResults.length > 0 && (
          <div className="civic-area-results">
            {areaResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setFocusArea({
                    latitude: Number(item.lat),
                    longitude: Number(item.lon),
                  });

                  setAreaQuery(item.display_name);
                  setAreaResults([]);
                  setSearchError("");

                  setMessage(
                    "Map moved to the searched area. " +
                    "Click the exact issue location to place your pin."
                  );
                }}
              >
                📍 {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAP */}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={14}
        scrollWheelZoom={false}
        className="civic-location-map"
      >
        <TileLayer
          attribution={
            '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            "OpenStreetMap</a> contributors"
          }
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundary boundary={boundary} />

        <FlyToArea area={focusArea} />

        {boundary && (
          <GeoJSON
            data={boundary}
            style={{
              color: "#287347",
              weight: 3,
              fillColor: "#4e9b65",
              fillOpacity: 0.13,
            }}
          />
        )}

        <MapClickHandler
          onPick={selectPoint}
          disabled={disabled || !boundary}
        />

        {validPoint && (
          <>
            <Marker
              position={[
                point.latitude,
                point.longitude,
              ]}
              icon={pinIcon}
            />

            <RecenterOnPoint point={point} />
          </>
        )}
      </MapContainer>

      {/* LOCATION FEEDBACK */}

      <p className="civic-location-coords">
        {validPoint
          ? `Selected: ${point.latitude.toFixed(6)}, ` +
            `${point.longitude.toFixed(6)}` +
            (point.accuracyMeters
              ? ` (GPS accuracy ≈ ${Math.round(
                  point.accuracyMeters
                )} m)`
              : "")
          : boundary
            ? "No valid pin selected. Click inside the green boundary."
            : "Loading Ndenderu Ward boundary..."}
      </p>

      {boundaryError && (
        <p className="civic-location-error" role="alert">
          {boundaryError}
        </p>
      )}

      {message && (
        <p className="civic-location-error" role="status">
          {message}
        </p>
      )}

      <p className="civic-location-coords">
        Ward boundary data is provisional and may not
        match the official boundary exactly.
      </p>
    </div>
  );
}
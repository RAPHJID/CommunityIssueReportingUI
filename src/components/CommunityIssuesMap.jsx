import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { apiRequest } from "../services/api";
import "leaflet/dist/leaflet.css";
import "./CommunityIssuesMap.css";

const NDENDERU_CENTER = [-1.1885, 36.75];

const STATUS_COLORS = {
  Submitted: "#64748b",
  "Under Review": "#8b5cf6",
  Acknowledged: "#0284c7",
  "In Progress": "#f59e0b",
  Resolved: "#16a34a",
  Rejected: "#dc2626",
  Duplicate: "#94a3b8",
};

const STATUS_FILTERS = [
  "All Reports",
  "Submitted",
  "Under Review",
  "Acknowledged",
  "In Progress",
  "Resolved",
  "Rejected",
  "Duplicate",
];

function createStatusIcon(status) {
  const color = STATUS_COLORS[status] || "#64748b";

  return L.divIcon({
    className: "community-pin-wrapper",
    html: `
      <div
        class="community-map-pin"
        style="--pin-color: ${color}"
      >
        <span class="community-map-pin-center"></span>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -35],
  });
}

function isInsideWard(latitude, longitude, boundary) {
  if (!boundary) return false;

  const point = L.latLng(latitude, longitude);
  const layer = L.geoJSON(boundary);
  const bounds = layer.getBounds();

  return bounds.isValid() && bounds.contains(point);
}

function MapBounds({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) {
      map.setView(NDENDERU_CENTER, 13);
      return;
    }

    const layer = L.geoJSON(boundary);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 14,
      });
    } else {
      map.setView(NDENDERU_CENTER, 13);
    }
  }, [map, boundary]);

  return null;
}

export default function CommunityIssuesMap({
  reports = [],
  getStatusLabel,
  formatDate,
  onOpenReport,
}) {
  const [locations, setLocations] = useState([]);
  const [boundary, setBoundary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [selectedStatus, setSelectedStatus] =
    useState("All Reports");

  const [search, setSearch] = useState("");

  // ==========================================
  // LOAD SAVED REPORT LOCATIONS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest("/Location");

        if (!Array.isArray(data)) {
          throw new Error(
            "The server returned an invalid locations response."
          );
        }

        if (!cancelled) {
          setLocations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Unable to load map locations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  // ==========================================
  // LOAD NDENDERU WARD BOUNDARY
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadBoundary() {
      try {
        const response = await fetch(
          "/ndenderu-ward.geojson"
        );

        if (!response.ok) {
          throw new Error("Ward boundary unavailable.");
        }

        const data = await response.json();

        if (!cancelled) {
          setBoundary(data);
        }
      } catch (err) {
        console.warn(
          "Could not load Ndenderu boundary:",
          err
        );
      }
    }

    loadBoundary();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // MATCH REPORTS WITH SAVED LOCATIONS
  // ==========================================

  const mappedReports = useMemo(() => {
    const locationLookup = new Map(
      locations.map((location) => [
        String(location.id).toLowerCase(),
        location,
      ])
    );

    return reports
      .map((report) => {
        const location = locationLookup.get(
          String(report.locationId || "").toLowerCase()
        );

        if (!location) return null;

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);



        if (
          location.latitude == null ||
          location.longitude == null ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return null;
        }

        if (
  boundary &&
  !isInsideWard(latitude, longitude, boundary)
) {
  return null;
}

        return {
          ...report,
          latitude,
          longitude,
          status: getStatusLabel(report.currentStatus),
          locationName:
            location.description ||
            location.name ||
            location.locationName ||
            "Reported location",
        };
      })
      .filter(Boolean);
  }, [reports, locations, getStatusLabel, boundary]);

  // ==========================================
  // SEARCH AND STATUS FILTERS
  // ==========================================

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mappedReports.filter((report) => {
      const matchesStatus =
        selectedStatus === "All Reports" ||
        report.status === selectedStatus;

      const searchableText = [
        report.title,
        report.description,
        report.locationName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [mappedReports, selectedStatus, search, boundary]);

  const totalResolved = mappedReports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const totalActive = mappedReports.filter(
    (report) =>
      !["Resolved", "Rejected", "Duplicate"].includes(
        report.status
      )
  ).length;

  return (
    <section
      className="community-map-section"
      aria-labelledby="community-map-title"
    >
      <div className="community-map-heading">
        <div>
          <span className="community-map-eyebrow">
            NDENDERU WARD · COMMUNITY MONITOR
          </span>

          <h2 id="community-map-title">
            Explore community issues
          </h2>

          <p>
            Discover reported problems across Ndenderu Ward
            and follow the progress being made.
          </p>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="community-map-stats">
        <div className="community-map-stat">
          <span>Mapped reports</span>
          <strong>{mappedReports.length}</strong>
        </div>

        <div className="community-map-stat">
          <span>Active issues</span>
          <strong>{totalActive}</strong>
        </div>

        <div className="community-map-stat">
          <span>Resolved issues</span>
          <strong>{totalResolved}</strong>
        </div>
      </div>

      {/* CONTROLS */}

      <div className="community-map-controls">
        <label>
          Search issues

          <input
            type="search"
            placeholder="Search roads, water, garbage..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </label>

        <label>
          Filter by status

          <select
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value)
            }
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* MAP */}

      {loading ? (
        <div className="community-map-message" role="status">
          Loading community issue locations...
        </div>
      ) : error ? (
        <div className="community-map-message" role="alert">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setRetryKey((value) => value + 1)
            }
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="community-map-frame">
            <MapContainer
              center={NDENDERU_CENTER}
              zoom={13}
              scrollWheelZoom={false}
              className="community-map-leaflet"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {boundary && (
                <GeoJSON
                  data={boundary}
                  style={{
                    color: "#16835d",
                    weight: 3,
                    fillColor: "#16a34a",
                    fillOpacity: 0.06,
                    dashArray: "7 5",
                  }}
                />
              )}

              {visibleReports.map((report) => (
                <Marker
                  key={report.id}
                  position={[
                    report.latitude,
                    report.longitude,
                  ]}
                  icon={createStatusIcon(report.status)}
                >
                  <Popup>
                    <div className="community-map-popup">
                      <span
                        className="community-map-popup-status"
                        style={{
                          color:
                            STATUS_COLORS[report.status] ||
                            "#64748b",
                        }}
                      >
                        ● {report.status}
                      </span>

                      <h3>
                        {report.title || "Untitled report"}
                      </h3>

                      <p>
                        {report.description
                          ? report.description.length > 120
                            ? `${report.description.slice(0, 120)}...`
                            : report.description
                          : "No description provided."}
                      </p>

                      <small>
                        {report.locationName}
                      </small>

                      <small>
                        Reported {formatDate(report.createdAt)}
                      </small>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenReport(report.id)
                        }
                      >
                        View full report →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <MapBounds boundary={boundary} />
            </MapContainer>
          </div>

          <div className="community-map-footer">
            <p>
              Showing <strong>{visibleReports.length}</strong>{" "}
              of <strong>{mappedReports.length}</strong>{" "}
              mapped reports
            </p>

            <div className="community-map-legend">
              {Object.entries(STATUS_COLORS).map(
                ([status, color]) => (
                  <span key={status}>
                    <i
                      style={{
                        backgroundColor: color,
                      }}
                    />
                    {status}
                  </span>
                )
              )}
            </div>
          </div>

          {mappedReports.length === 0 && (
            <p className="community-map-note">
              No reports with valid saved coordinates are
              available to display yet.
            </p>
          )}

          {mappedReports.length > 0 &&
            visibleReports.length === 0 && (
              <p className="community-map-note">
                No mapped issues match your current filters.
              </p>
            )}

          {reports.length > mappedReports.length && (
            <p className="community-map-note">
              Some reports are not shown because their
              saved locations could not be matched to
              valid coordinates.
            </p>
          )}
        </>
      )}
    </section>
  );
}
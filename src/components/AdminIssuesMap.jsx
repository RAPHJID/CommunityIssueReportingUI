
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
import {
  booleanPointInPolygon,
  point,
} from "@turf/turf";

import { apiRequest } from "../services/api";
import "leaflet/dist/leaflet.css";

// ==========================================
// MAP CONFIGURATION
// ==========================================

const CENTER = [-1.1885, 36.75];

const STATUS_COLORS = {
  Submitted: "#64748b",
  "Under Review": "#8b5cf6",
  Acknowledged: "#0284c7",
  "In Progress": "#f59e0b",
  Resolved: "#16a34a",
  Rejected: "#dc2626",
  Duplicate: "#94a3b8",
  "Out of Jurisdiction": "#78716c",
};

const CLOSED_STATUSES = [
  "Resolved",
  "Rejected",
  "Duplicate",
  "Out of Jurisdiction",
];

// ==========================================
// MARKER ICON
// ==========================================

function createMarkerIcon(status) {
  const color = STATUS_COLORS[status] || "#64748b";

  return L.divIcon({
    className: "admin-map-marker-wrapper",
    html: `
      <div class="admin-map-marker" style="background:${color}">
        <span></span>
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

// ==========================================
// GEOJSON WARD VALIDATION
// ==========================================

function getWardPolygons(boundary) {
  if (!boundary) return [];

  if (boundary.type === "FeatureCollection") {
    return boundary.features.filter(
      (feature) =>
        feature?.geometry?.type === "Polygon" ||
        feature?.geometry?.type === "MultiPolygon"
    );
  }

  if (boundary.type === "Feature") {
    return ["Polygon", "MultiPolygon"].includes(
      boundary.geometry?.type
    )
      ? [boundary]
      : [];
  }

  if (
    boundary.type === "Polygon" ||
    boundary.type === "MultiPolygon"
  ) {
    return [
      {
        type: "Feature",
        properties: {},
        geometry: boundary,
      },
    ];
  }

  return [];
}

function isInsideNdenderu(latitude, longitude, boundary) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  try {
    const locationPoint = point([
      longitude,
      latitude,
    ]);

    return getWardPolygons(boundary).some((polygon) =>
      booleanPointInPolygon(locationPoint, polygon)
    );
  } catch {
    return false;
  }
}

// ==========================================
// INITIAL MAP POSITION
// ==========================================

function FitWard({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) return;

    const bounds = L.geoJSON(boundary).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 14,
      });
    }
  }, [map, boundary]);

  return null;
}

// ==========================================
// ZOOM TO SEARCHED AREA
// ==========================================

function FlyToArea({ selectedArea }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedArea) return;

    map.flyTo(
      [
        selectedArea.latitude,
        selectedArea.longitude,
      ],
      16,
      {
        duration: 1.2,
      }
    );
  }, [map, selectedArea]);

  return null;
}

// ==========================================
// ADMIN ISSUES MAP
// ==========================================

export default function AdminIssuesMap({
  reports = [],
  getStatusLabel,
  formatDate,
  onOpenReport,
  onManageReport,
}) {
  // REFERENCE DATA

  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [boundary, setBoundary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  // REPORT FILTERS

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("Unresolved");
  const [categoryFilter, setCategoryFilter] =
    useState("all");

  // AREA SEARCH

  const [areaSearch, setAreaSearch] = useState("");
  const [areaResults, setAreaResults] = useState([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaError, setAreaError] = useState("");
  const [selectedArea, setSelectedArea] = useState(null);

  // ==========================================
  // LOAD LOCATIONS AND CATEGORIES
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      setLoading(true);
      setError("");

      try {
        const [locationData, categoryData] =
          await Promise.all([
            apiRequest("/Location"),
            apiRequest("/Category"),
          ]);

        if (
          !Array.isArray(locationData) ||
          !Array.isArray(categoryData)
        ) {
          throw new Error(
            "Invalid map reference data."
          );
        }

        if (!cancelled) {
          setLocations(locationData);
          setCategories(categoryData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load admin map data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMapData();

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
          `${import.meta.env.BASE_URL}ndenderu-ward.geojson`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load Ndenderu Ward boundary."
          );
        }

        const data = await response.json();

        if (getWardPolygons(data).length === 0) {
          throw new Error(
            "The Ndenderu Ward boundary is invalid."
          );
        }

        if (!cancelled) {
          setBoundary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load the ward boundary."
          );
        }
      }
    }

    loadBoundary();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // SEARCH FOR AN AREA WITHIN NDENDERU
  // ==========================================

  async function searchNdenderuArea(event) {
    event.preventDefault();

    const query = areaSearch.trim();

    if (!query) {
      setAreaError("Enter an area name.");
      return;
    }

    if (!boundary) {
      setAreaError(
        "Ndenderu Ward boundary is not available."
      );
      return;
    }

    if (areaLoading) return;

    setAreaLoading(true);
    setAreaError("");
    setAreaResults([]);

    try {
      const params = new URLSearchParams({
        q: `${query}, Kiambu County, Kenya`,
        format: "jsonv2",
        addressdetails: "1",
        limit: "10",
        countrycodes: "ke",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Location search is temporarily unavailable."
        );
      }

      const results = await response.json();

      if (!Array.isArray(results)) {
        throw new Error(
          "Unexpected location search response."
        );
      }

      const withinWard = results.filter((result) => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);

        return isInsideNdenderu(
          latitude,
          longitude,
          boundary
        );
      });

      if (withinWard.length === 0) {
        setAreaError(
          "No matching location was found inside Ndenderu Ward. Try another local area or landmark."
        );
        return;
      }

      setAreaResults(withinWard);
    } catch (err) {
      setAreaError(
        err.message ||
          "Unable to search for this area."
      );
    } finally {
      setAreaLoading(false);
    }
  }

  // ==========================================
  // JOIN REPORTS WITH LOCATIONS
  // ==========================================

  const mappedReports = useMemo(() => {
    if (!boundary) return [];

    const locationLookup = new Map(
      locations.map((location) => [
        String(location.id).toLowerCase(),
        location,
      ])
    );

    const categoryLookup = new Map(
      categories.map((category) => [
        String(category.id).toLowerCase(),
        category.name,
      ])
    );

    return reports
      .map((report) => {
        const location = locationLookup.get(
          String(report.locationId || "").toLowerCase()
        );

        if (!location) return null;

        if (
          location.latitude == null ||
          location.longitude == null
        ) {
          return null;
        }

        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          (latitude === 0 && longitude === 0)
        ) {
          return null;
        }

        if (
          !isInsideNdenderu(
            latitude,
            longitude,
            boundary
          )
        ) {
          return null;
        }

        return {
          ...report,
          latitude,
          longitude,
          status: getStatusLabel(
            report.currentStatus
          ),
          categoryName:
            categoryLookup.get(
              String(report.categoryId || "").toLowerCase()
            ) || "Uncategorized",
          locationName:
            location.description ||
            location.name ||
            location.locationName ||
            "Reported location",
        };
      })
      .filter(Boolean);
  }, [
    reports,
    locations,
    categories,
    boundary,
    getStatusLabel,
  ]);

  // ==========================================
  // FILTER MAPPED REPORTS
  // ==========================================

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mappedReports.filter((report) => {
      const matchesStatus =
        statusFilter === "All Reports" ||
        (statusFilter === "Unresolved"
          ? !CLOSED_STATUSES.includes(
              report.status
            )
          : report.status === statusFilter);

      const matchesCategory =
        categoryFilter === "all" ||
        String(
          report.categoryId || ""
        ).toLowerCase() ===
          categoryFilter.toLowerCase();

      const searchableText = [
        report.title,
        report.description,
        report.categoryName,
        report.locationName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesCategory &&
        (!query ||
          searchableText.includes(query))
      );
    });
  }, [
    mappedReports,
    search,
    statusFilter,
    categoryFilter,
  ]);

  // ==========================================
  // MAP STATISTICS
  // ==========================================

  const unresolvedCount = mappedReports.filter(
    (report) =>
      !CLOSED_STATUSES.includes(report.status)
  ).length;

  const inProgressCount = mappedReports.filter(
    (report) =>
      report.status === "In Progress"
  ).length;

  const resolvedCount = mappedReports.filter(
    (report) =>
      report.status === "Resolved"
  ).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      className="admin-map-section"
      aria-labelledby="admin-map-title"
    >
      <div className="admin-map-heading">
        <div>
          <p className="admin-eyebrow">
            NDENDERU WARD / GEOGRAPHICAL OVERVIEW
          </p>

          <h3 id="admin-map-title">
            Community Issues Map
          </h3>

          <p className="muted">
            Locate community complaints, identify
            unresolved issues, and open reports
            for action.
          </p>
        </div>
      </div>

      {/* MAP STATISTICS */}

      <div className="admin-map-stats">
        <div>
          <span>Mapped reports</span>
          <strong>
            {mappedReports.length}
          </strong>
        </div>

        <div>
          <span>Unresolved</span>
          <strong>
            {unresolvedCount}
          </strong>
        </div>

        <div>
          <span>In progress</span>
          <strong>
            {inProgressCount}
          </strong>
        </div>

        <div>
          <span>Resolved</span>
          <strong>
            {resolvedCount}
          </strong>
        </div>
      </div>

      {/* REPORT FILTERS */}

      <div className="admin-map-controls">
        <label>
          Search reports

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search issues or locations..."
          />
        </label>

        <label>
          Status

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="Unresolved">
              Unresolved
            </option>

            <option value="All Reports">
              All Reports
            </option>

            {Object.keys(
              STATUS_COLORS
            ).map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Categories
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* NDENDERU WARD AREA SEARCH */}

      <div className="admin-area-search">
        <h4>
          Find an area in Ndenderu Ward
        </h4>

        <form onSubmit={searchNdenderuArea}>
          <input
            type="search"
            value={areaSearch}
            onChange={(event) => {
              setAreaSearch(
                event.target.value
              );
              setAreaResults([]);
              setAreaError("");
            }}
            placeholder="Search an area or landmark..."
            aria-label="Search within Ndenderu Ward"
          />

          <button
            type="submit"
            disabled={
              areaLoading ||
              !boundary
            }
          >
            {areaLoading
              ? "Searching..."
              : "Find area"}
          </button>
        </form>

        {areaError && (
          <p
            className="admin-area-error"
            role="alert"
          >
            {areaError}
          </p>
        )}

        {areaResults.length > 0 && (
          <div className="admin-area-results">
            {areaResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => {
                  setSelectedArea({
                    latitude: Number(
                      result.lat
                    ),
                    longitude: Number(
                      result.lon
                    ),
                  });

                  setAreaSearch(
                    result.display_name
                  );
                  setAreaResults([]);
                  setAreaError("");
                }}
              >
                📍 {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAP */}

      {loading ? (
        <div
          className="state-box"
          role="status"
        >
          Loading admin map...
        </div>
      ) : error ? (
        <div
          className="state-box"
          role="alert"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setRetryKey(
                (value) => value + 1
              )
            }
          >
            Retry map
          </button>
        </div>
      ) : (
        <>
          <div className="admin-map-frame">
            <MapContainer
              center={CENTER}
              zoom={13}
              scrollWheelZoom={false}
              className="admin-map-leaflet"
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

              {visibleReports.map(
                (report) => (
                  <Marker
                    key={report.id}
                    position={[
                      report.latitude,
                      report.longitude,
                    ]}
                    icon={createMarkerIcon(
                      report.status
                    )}
                  >
                    <Popup>
                      <div className="admin-map-popup">
                        <strong>
                          {report.title}
                        </strong>

                        <span
                          style={{
                            color:
                              STATUS_COLORS[
                                report.status
                              ] || "#64748b",
                          }}
                        >
                          ● {report.status}
                        </span>

                        <p>
                          {report.description
                            ? report.description.slice(
                                0,
                                140
                              )
                            : "No description provided."}
                        </p>

                        <small>
                          Category:{" "}
                          {report.categoryName}
                        </small>

                        <small>
                          {report.locationName}
                        </small>

                        <small>
                          Reported{" "}
                          {formatDate(
                            report.createdAt
                          )}
                        </small>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenReport(
                              report.id
                            )
                          }
                        >
                          View report details
                        </button>

                        {!CLOSED_STATUSES.includes(
                          report.status
                        ) && (
                          <button
                            type="button"
                            className="admin-map-manage-button"
                            onClick={() =>
                              onManageReport(
                                report.id
                              )
                            }
                          >
                            Manage report status
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              )}

              <FitWard boundary={boundary} />

              <FlyToArea
                selectedArea={selectedArea}
              />
            </MapContainer>
          </div>

          {/* MAP FOOTER */}

          <div className="admin-map-footer">
            <p>
              Showing{" "}
              {visibleReports.length} of{" "}
              {mappedReports.length} mapped
              reports
            </p>

            <div className="admin-map-legend">
              {Object.entries(
                STATUS_COLORS
              ).map(([status, color]) => (
                <span key={status}>
                  <i
                    style={{
                      backgroundColor: color,
                    }}
                  />
                  {status}
                </span>
              ))}
            </div>
          </div>

          {mappedReports.length === 0 && (
            <p className="muted">
              No reports with valid locations
              inside Ndenderu Ward are
              available yet.
            </p>
          )}

          {mappedReports.length > 0 &&
            visibleReports.length === 0 && (
              <p className="muted">
                No mapped reports match
                your filters.
              </p>
            )}
        </>
      )}
    </section>
  );
}


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
  "Out of Jurisdiction": "#78716c",
};

const STATUS_FILTERS = [
  "All Reports",
  ...Object.keys(STATUS_COLORS),
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

function MapBounds({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) {
      map.setView(NDENDERU_CENTER, 14);
      return;
    }

    const layer = L.geoJSON(boundary);
    const bounds = layer.getBounds();

    if (!bounds.isValid()) {
      map.setView(NDENDERU_CENTER, 14);
      return;
    }

    map.fitBounds(bounds, {
      padding: [12, 12],
      maxZoom: 16,
      animate: true,
    });

    map.setMaxBounds(bounds.pad(0.15));
    map.options.maxBoundsViscosity = 0.85;
  }, [map, boundary]);

  return null;
}

function FlyToSearchedArea({ area }) {
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

// Preliminary bounding-box check.
// The backend remains responsible for exact ward validation.
function isInsideWardBounds(latitude, longitude, boundary) {
  if (!boundary) return true;

  const bounds = L.geoJSON(boundary).getBounds();

  return (
    bounds.isValid() &&
    bounds.contains([latitude, longitude])
  );
}

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

  return !rings.slice(1).some((hole) =>
    insideRing(x, y, hole)
  );
}

function insideBoundary(latitude, longitude, boundary) {
  if (!boundary) return false;

  const features =
    boundary.type === "FeatureCollection"
      ? boundary.features || []
      : boundary.type === "Feature"
        ? [boundary]
        : [{ geometry: boundary }];

  return features.some(({ geometry }) => {
    if (!geometry) return false;

    if (geometry.type === "Polygon") {
      return insidePolygon(
        longitude,
        latitude,
        geometry.coordinates
      );
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates.some((polygon) =>
        insidePolygon(longitude, latitude, polygon)
      );
    }

    return false;
  });
}

export default function CommunityIssuesMap({
  reports = [],
  getStatusLabel,
  formatDate,
  onOpenReport,
}) {
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [boundary, setBoundary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [selectedStatus, setSelectedStatus] =
    useState("All Reports");
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [search, setSearch] = useState("");

  const [areaQuery, setAreaQuery] = useState("");
const [areaResults, setAreaResults] = useState([]);
const [searchingArea, setSearchingArea] = useState(false);
const [areaSearchError, setAreaSearchError] = useState("");
const [focusedArea, setFocusedArea] = useState(null);

  // ==========================================
  // LOAD LOCATIONS AND CATEGORIES
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      setCategoryError("");

      const [locationResult, categoryResult] =
        await Promise.allSettled([
          apiRequest("/Location"),
          apiRequest("/Category"),
        ]);

      if (cancelled) return;

      if (locationResult.status === "fulfilled") {
        if (Array.isArray(locationResult.value)) {
          setLocations(locationResult.value);
        } else {
          setLocations([]);
          setError("Invalid locations response.");
        }
      } else {
        setLocations([]);
        setError(
          locationResult.reason?.message ||
            "Unable to load map locations."
        );
      }

      if (categoryResult.status === "fulfilled") {
        if (Array.isArray(categoryResult.value)) {
          setCategories(categoryResult.value);
        } else {
          setCategories([]);
          setCategoryError("Invalid categories response.");
        }
      } else {
        setCategories([]);
        setCategoryError(
          "Categories could not be loaded. Please retry."
        );
      }

      setLoading(false);
    }

    loadData();

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
          throw new Error("Ward boundary unavailable.");
        }

        const data = await response.json();

        if (!cancelled) {
          setBoundary(data);
        }
      } catch (err) {
        console.warn(
          "Unable to load Ndenderu boundary:",
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
  // CATEGORY LOOKUP
  // ==========================================

  const categoryLookup = useMemo(() => {
    return new Map(
      categories.map((category) => [
        String(category.id).toLowerCase(),
        category.name,
      ])
    );
  }, [categories]);

  // ==========================================
  // MATCH REPORTS WITH SAVED LOCATIONS
  // ==========================================

  const mappedReports = useMemo(() => {
    const locationLookup = new Map(
      locations
        .filter((location) => location?.id)
        .map((location) => [
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
          !isInsideWardBounds(
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
          status: getStatusLabel(report.currentStatus),
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
    boundary,
    getStatusLabel,
    categoryLookup,
  ]);

 
  // ==========================================
  // FILTER BY STATUS, CATEGORY, AND SEARCH
  // ==========================================

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mappedReports.filter((report) => {
      const matchesStatus =
        selectedStatus === "All Reports" ||
        report.status === selectedStatus;

      const matchesCategory =
        selectedCategory === "all" ||
        String(report.categoryId || "").toLowerCase() ===
          selectedCategory.toLowerCase();

      const searchableText = [
        report.title,
        report.description,
        report.locationName,
        report.categoryName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesCategory &&
        (!query || searchableText.includes(query))
      );
    });
  }, [
    mappedReports,
    selectedStatus,
    selectedCategory,
    search,
  ]);

  // ==========================================
  // MAP STATISTICS
  // ==========================================

  const totalResolved = mappedReports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const totalActive = mappedReports.filter(
    (report) =>
      ![
        "Resolved",
        "Rejected",
        "Duplicate",
        "Out of Jurisdiction",
      ].includes(report.status)
  ).length;

  // ==========================================
  // CATEGORY BREAKDOWN
  // ==========================================

  const categoryStats = useMemo(() => {
    const stats = categories.map((category) => ({
      id: String(category.id),
      name: category.name,
      count: mappedReports.filter(
        (report) =>
          String(report.categoryId || "").toLowerCase() ===
          String(category.id).toLowerCase()
      ).length,
    }));

    const uncategorizedCount = mappedReports.filter(
      (report) =>
        !categoryLookup.has(
          String(report.categoryId || "").toLowerCase()
        )
    ).length;

    if (uncategorizedCount > 0) {
      stats.push({
        id: "uncategorized",
        name: "Uncategorized",
        count: uncategorizedCount,
      });
    }

    return stats
      .filter((category) => category.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [categories, mappedReports, categoryLookup]);

  function selectCategory(categoryId) {
    setSelectedCategory((current) =>
      current === categoryId ? "all" : categoryId
    );
  }

  function resetFilters() {
    setSearch("");
    setSelectedStatus("All Reports");
    setSelectedCategory("all");
  }

  async function searchArea() {
  if (searchingArea) return;

  const query = areaQuery.trim();

  if (!query) {
    setAreaSearchError("Enter an area or landmark name.");
    return;
  }

  if (!boundary) {
    setAreaSearchError(
      "Wait for the Ndenderu Ward boundary to load."
    );
    return;
  }

  setSearchingArea(true);
  setAreaSearchError("");
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
        `Area search unavailable (HTTP ${response.status}).`
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
      setAreaSearchError(
        "No matching place was found inside Ndenderu Ward. " +
        "Try a shorter name."
      );
    }
  } catch (error) {
    setAreaSearchError(
      error.message || "Area search failed. Please try again."
    );
  } finally {
    setSearchingArea(false);
  }
}

function selectSearchedArea(item) {
  setFocusedArea({
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  });

  setAreaQuery(item.display_name);
  setAreaResults([]);
  setAreaSearchError("");
}

  return (
    <section
      className="community-map-section"
      aria-labelledby="community-map-title"
    >
      {/* HEADER */}

      <div className="community-map-heading">
        <div>
          <span className="community-map-eyebrow">
            NDENDERU WARD · COMMUNITY MONITOR
          </span>

          <h2 id="community-map-title">
            Explore community issues
          </h2>

          <p>
            Discover reported problems across Ndenderu Ward,
            explore issue categories, and follow their progress.
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

   {/* FIND AREA */}

      <div className="community-area-search">
        <label htmlFor="community-area-query">
          Find an area in Ndenderu Ward
        </label>

        <div className="community-area-search-controls">
          <input
            id="community-area-query"
            type="search"
            value={areaQuery}
            onChange={(event) => {
              setAreaQuery(event.target.value);
              setAreaResults([]);
              setAreaSearchError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                searchArea();
              }
            }}
            placeholder="Search a road, market or landmark..."
            disabled={!boundary || searchingArea}
          />

          <button
            type="button"
            onClick={searchArea}
            disabled={!boundary || searchingArea}
          >
            {searchingArea ? "Searching..." : "Find area"}
          </button>
        </div>

        {areaSearchError && (
          <p
            className="community-area-search-error"
            role="alert"
          >
            {areaSearchError}
          </p>
        )}

        {areaResults.length > 0 && (
          <div className="community-area-search-results">
            {areaResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => selectSearchedArea(item)}
              >
                📍 {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* FILTERS */}

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

        <label>
          Filter by category
          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
          >
            <option value="all">All Categories</option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={String(category.id)}
              >
                {category.name}
              </option>
            ))}

            {categoryStats.some(
              (category) =>
                category.id === "uncategorized"
            ) && (
              <option value="uncategorized">
                Uncategorized
              </option>
            )}
          </select>
        </label>
      </div>

      <div className="community-map-filter-actions">
        <span>
          {visibleReports.length} matching{" "}
          {visibleReports.length === 1
            ? "report"
            : "reports"}
        </span>

        <button
          type="button"
          onClick={resetFilters}
          className="community-map-reset"
        >
          Clear filters
        </button>
      </div>

      {/* MAP */}

      {loading ? (
        <div
          className="community-map-message"
          role="status"
        >
          Loading community issues...
        </div>
      ) : error ? (
        <div
          className="community-map-message"
          role="alert"
        >
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
  zoom={14}
  minZoom={12}
  maxZoom={19}
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
                            ? `${report.description.slice(
                                0,
                                120
                              )}...`
                            : report.description
                          : "No description provided."}
                      </p>

                      <small>
                        Category: {report.categoryName}
                      </small>

                      <small>{report.locationName}</small>

                      <small>
                        Reported{" "}
                        {formatDate(report.createdAt)}
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
              <FlyToSearchedArea area={focusedArea} />
            </MapContainer>
          </div>

          {/* MAP FOOTER */}

          <div className="community-map-footer">
            <p>
              Showing{" "}
              <strong>{visibleReports.length}</strong>{" "}
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
              No reports with valid mapped locations are
              available yet.
            </p>
          )}

          {mappedReports.length > 0 &&
            visibleReports.length === 0 && (
              <p className="community-map-note">
                No issues match your current filters.
              </p>
            )}

          {reports.length > mappedReports.length && (
            <p className="community-map-note">
              Some reports are not displayed because their
              saved locations are missing, invalid, or
              outside the ward's preliminary map bounds.
            </p>
          )}
        </>
      )}

      {/* CATEGORY BREAKDOWN */}

      <div className="community-category-breakdown">
        <div className="community-category-heading">
          <h3>Community issues by category</h3>
          <p>
            Discover the most frequently reported types of
            community problems. Select a category to filter
            the map.
          </p>
        </div>

        {categoryError && (
          <div
            className="community-category-warning"
            role="alert"
          >
            <span>{categoryError}</span>

            <button
              type="button"
              onClick={() =>
                setRetryKey((value) => value + 1)
              }
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <p className="muted">
            Loading category statistics...
          </p>
        ) : categoryStats.length === 0 ? (
          <p className="muted">
            No categorized mapped reports are available yet.
          </p>
        ) : (
          <div className="community-category-list">
            {categoryStats.map((category) => {
              const percentage =
                mappedReports.length > 0
                  ? (category.count /
                      mappedReports.length) *
                    100
                  : 0;

              const isActive =
                selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  className={`community-category-item ${
                    isActive ? "is-active" : ""
                  }`}
                  onClick={() =>
                    selectCategory(category.id)
                  }
                  aria-pressed={isActive}
                >
                  <div className="community-category-item-top">
                    <span>{category.name}</span>
                    <strong>{category.count}</strong>
                  </div>

                  <div className="community-category-track">
                    <div
                      className="community-category-progress"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <span className="community-category-percentage">
                    {percentage.toFixed(1)}% of mapped reports
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

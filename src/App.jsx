
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "./services/api";
import "./App.css";

import Navbar from "./components/Navbar";
import ReportStatistics from "./components/ReportStatistics";
import ReportFilters from "./components/ReportFilters";
import ReportList from "./components/ReportList";
import LoginForm from "./components/LoginForm";
import ReportForm from "./components/ReportForm";
import ReportDetails from "./components/ReportDetails";
import AdminDashboard from "./components/AdminDashboard";
import { isAdminUser } from "./utils/authRoles";

const STATUS = {
  0: "Submitted",
  1: "Under Review",
  2: "Acknowledged",
  3: "In Progress",
  4: "Resolved",
  5: "Rejected",
  6: "Duplicate",
};

const FILTERS = [
  "All Reports",
  "Submitted",
  "Under Review",
  "Acknowledged",
  "In Progress",
  "Resolved",
  "Rejected",
  "Duplicate",
];

function getStatusLabel(status) {
  if (typeof status === "number" || /^\d+$/.test(String(status))) {
    return STATUS[status] ?? "Unknown";
  }

  const normalized = String(status ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");

  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Unknown";
}

function formatDate(dateString) {
  if (!dateString) return "Date unavailable";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getSavedUser() {
  try {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

function getLocationName(location) {
  return (
    location?.description ??
    location?.name ??
    location?.locationName ??
    "Unnamed location"
  );
}

function App() {
  // ==========================================
  // DASHBOARD STATE
  // ==========================================

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Reports");

  // ==========================================
  // AUTHENTICATION AND REPORT FORM STATE
  // ==========================================

  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [showLogin, setShowLogin] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const isAdmin = isAdminUser(currentUser);

  // ==========================================
  // INDIVIDUAL REPORT DETAILS STATE
  // ==========================================

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // ==========================================
  // REPORT STATUS HISTORY STATE
  // ==========================================

  const [reportHistory, setReportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // ==========================================
  // LOAD ALL COMMUNITY REPORTS
  // ==========================================

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/Report");

      if (!Array.isArray(data)) {
        throw new Error(
          "The API returned an unexpected reports response."
        );
      }

      setReports(data);
    } catch (err) {
      setError(
        err.message || "Unable to load community reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ==========================================
  // LOAD CATEGORY AND LOCATION NAMES
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [categoryData, locationData] = await Promise.all([
          apiRequest("/Category"),
          apiRequest("/Location"),
        ]);

        if (cancelled) return;

        if (Array.isArray(categoryData)) {
          setCategories(categoryData);
        }

        if (Array.isArray(locationData)) {
          setLocations(locationData);
        }
      } catch (err) {
        console.error(
          "Unable to load report reference data:",
          err
        );
      }
    }

    loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOAD INDIVIDUAL REPORT DETAILS
  // ==========================================

  const loadReportDetails = useCallback(async (reportId) => {
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedReport(null);

    try {
      const data = await apiRequest(`/Report/${reportId}`);

      if (!data || data.id !== reportId) {
        throw new Error(
          "The API returned an unexpected report response."
        );
      }

      setSelectedReport(data);
    } catch (err) {
      setDetailsError(
        err.message || "Unable to load report details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD REPORT STATUS HISTORY
  // ==========================================

  const loadReportHistory = useCallback(async (reportId) => {
    setHistoryLoading(true);
    setHistoryError("");
    setReportHistory([]);

    try {
      const data = await apiRequest(
        `/ReportStatusHistory/report/${reportId}`
      );

      if (!Array.isArray(data)) {
        throw new Error(
          "The API returned an unexpected status history response."
        );
      }

      setReportHistory(data);
    } catch (err) {
      setHistoryError(
        err.message || "Unable to load report status history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ==========================================
  // FETCH DETAILS AND HISTORY WHEN SELECTED
  // ==========================================

  useEffect(() => {
    if (selectedReportId) {
      loadReportDetails(selectedReportId);
      loadReportHistory(selectedReportId);
    }
  }, [
    selectedReportId,
    loadReportDetails,
    loadReportHistory,
  ]);

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const statistics = useMemo(() => {
    const resolved = reports.filter(
      (report) =>
        getStatusLabel(report.currentStatus) === "Resolved"
    ).length;

    const unresolved = reports.filter(
      (report) =>
        !["Resolved", "Rejected", "Duplicate"].includes(
          getStatusLabel(report.currentStatus)
        )
    ).length;

    return {
      total: reports.length,
      unresolved,
      resolved,
    };
  }, [reports]);

  // ==========================================
  // SEARCH AND FILTER REPORTS
  // ==========================================

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const status = getStatusLabel(report.currentStatus);

      const matchesFilter =
        activeFilter === "All Reports" ||
        status === activeFilter;

      const searchableText =
        `${report.title ?? ""} ${report.description ?? ""}`
          .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [reports, search, activeFilter]);

  // ==========================================
  // SELECTED REPORT REFERENCE DATA
  // ==========================================

  const selectedCategory = categories.find(
    (category) =>
      category.id === selectedReport?.categoryId
  );

  const selectedLocation = locations.find(
    (location) =>
      location.id === selectedReport?.locationId
  );

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================

  function handleLogin(user) {
    setCurrentUser(user);
    setShowLogin(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setCurrentUser(null);
    setShowLogin(false);
    setShowReportForm(false);
    setShowAdminDashboard(false);
  }

  // ==========================================
  // REPORT NAVIGATION HANDLERS
  // ==========================================

  function handleSelectReport(reportId) {
    setShowAdminDashboard(false);
    setSelectedReportId(reportId);
    setSelectedReport(null);
    setDetailsError("");

    setReportHistory([]);
    setHistoryError("");

    document.getElementById("reports")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleBackToReports() {
    setSelectedReportId(null);
    setSelectedReport(null);
    setDetailsError("");

    setReportHistory([]);
    setHistoryError("");
  }

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <div className="app">
      <Navbar />

      <main>
        {/* HERO SECTION */}

        <section className="hero" id="home">
          <div className="container">
            <div className="eyebrow">
              Your community. Your voice.
            </div>

            <h1>
              Let's make our community better, together.
            </h1>

            <p>
              See the issues residents have reported,
              follow their progress, and stay informed
              about the work needed in our community.
            </p>
          </div>
        </section>

        {/* LOGIN SECTION */}

        <section
          className="container login-area"
          aria-label="Account"
        >
          {currentUser ? (
            <div className="login-status">
              <div>
                <p>
                  Signed in as{" "}
                  <strong>{currentUser.fullName}</strong>
                </p>

                <p className="muted">
                  {currentUser.email}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          ) : (
            !showLogin && (
              <div className="login-prompt">
                <p className="muted">
                  Want to report a community issue?
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowLogin(true)}
                >
                  Sign in to submit a report
                </button>
              </div>
            )
          )}

          {showLogin && (
            <LoginForm
              onLogin={handleLogin}
              onCancel={() => setShowLogin(false)}
            />
          )}
        </section>

        {isAdmin && (
          <section className="container" aria-label="Administration access">
            <button type="button" className="secondary-button" onClick={() => {
              setShowAdminDashboard(current => !current);
              setSelectedReportId(null);
            }}>
              {showAdminDashboard ? "Return to community reports" : "Open admin dashboard"}
            </button>
          </section>
        )}

        {isAdmin && showAdminDashboard && (
          <div className="container">
            <AdminDashboard
              reports={reports}
              loading={loading}
              error={error}
              onRetry={loadReports}
              onOpenReport={handleSelectReport}
              getStatusLabel={getStatusLabel}
              formatDate={formatDate}
            />
          </div>
        )}

        {/* REPORT SUBMISSION SECTION */}

        {currentUser && (
          <section className="container report-launch-area">
            {!showReportForm ? (
              <button
                type="button"
                className="report-launch-button"
                onClick={() => setShowReportForm(true)}
              >
                <span className="report-launch-copy">
                  <span className="report-launch-eyebrow">
                    YOUR COMMUNITY NEEDS YOU
                  </span>

                  <span className="report-launch-title">
                    Something needs attention?
                  </span>

                  <span className="report-launch-description">
                    Submit a report and help bring
                    local issues into focus.
                  </span>
                </span>

                <span
                  className="report-launch-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            ) : (
              <ReportForm
                onCancel={() => setShowReportForm(false)}
                onReportCreated={loadReports}
              />
            )}
          </section>
        )}

        {/* COMMUNITY STATISTICS */}

        <ReportStatistics statistics={statistics} />

        {/* REPORTS SECTION */}

        <section
          className="container reports-section"
          id="reports"
        >
          {selectedReportId ? (
            <ReportDetails
              report={selectedReport}
              loading={detailsLoading}
              error={detailsError}
              onBack={handleBackToReports}
              onRetry={() =>
                loadReportDetails(selectedReportId)
              }
              getStatusLabel={getStatusLabel}
              formatDate={formatDate}
              categoryName={
                selectedCategory?.name ??
                "Category unavailable"
              }
              locationName={
                selectedLocation
                  ? getLocationName(selectedLocation)
                  : "Location unavailable"
              }
              history={reportHistory}
              historyLoading={historyLoading}
              historyError={historyError}
              onRetryHistory={() =>
                loadReportHistory(selectedReportId)
              }
            />
          ) : (
            <>
              {/* SEARCH AND FILTERS */}

              <ReportFilters
                search={search}
                onSearchChange={setSearch}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                filters={FILTERS}
              />

              {/* LOADING STATE */}

              {loading ? (
                <div
                  className="state-box"
                  role="status"
                >
                  <h3>
                    Loading community reports...
                  </h3>

                  <p className="muted">
                    Please wait while we fetch
                    the latest data.
                  </p>
                </div>
              ) : error ? (
                /* ERROR STATE */

                <div
                  className="state-box"
                  role="alert"
                >
                  <h3>
                    We couldn't load the reports
                  </h3>

                  <p className="muted">
                    {error}
                  </p>

                  <button
                    className="retry-button"
                    type="button"
                    onClick={loadReports}
                  >
                    Try again
                  </button>
                </div>
              ) : filteredReports.length === 0 ? (
                /* EMPTY STATE */

                <div className="state-box">
                  <h3>
                    {reports.length === 0
                      ? "No reports have been submitted yet"
                      : "No matching reports found"}
                  </h3>

                  <p className="muted">
                    {reports.length === 0
                      ? "Reports submitted by residents will appear here."
                      : "Try another search term or choose a different status filter."}
                  </p>
                </div>
              ) : (
                /* REPORT LIST */

                <ReportList
                  reports={filteredReports}
                  totalReports={reports.length}
                  getStatusLabel={getStatusLabel}
                  formatDate={formatDate}
                  onSelectReport={handleSelectReport}
                />
              )}
            </>
          )}
        </section>
      </main>

      {/* FOOTER */}

      <footer className="footer">
        <div className="container">
          Community Connect · Building a more
          accountable community.
        </div>
      </footer>
    </div>
  );
}

export default App;

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "./services/api";
import "./App.css";
import Navbar from "./components/Navbar";
import ReportStatistics from "./components/ReportStatistics";
import ReportFilters from "./components/ReportFilters";
import ReportList from "./components/ReportList";
import LoginForm from "./components/LoginForm";
import ReportForm from "./components/ReportForm";

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

  if (Number.isNaN(date.getTime())) return "Date unavailable";

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

function App() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Reports");
  const [showReportForm, setShowReportForm] = useState(false);

  // Authentication state belongs at the top level of App.
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [showLogin, setShowLogin] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/Report");

      if (!Array.isArray(data)) {
        throw new Error("The API returned an unexpected reports response.");
      }

      setReports(data);
    } catch (err) {
      setError(err.message || "Unable to load community reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const statistics = useMemo(() => {
    const resolved = reports.filter(
      (report) => getStatusLabel(report.currentStatus) === "Resolved"
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

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const status = getStatusLabel(report.currentStatus);

      const matchesFilter =
        activeFilter === "All Reports" || status === activeFilter;

      const searchableText =
        `${report.title ?? ""} ${report.description ?? ""}`.toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [reports, search, activeFilter]);

  function handleLogin(user) {
    setCurrentUser(user);
    setShowLogin(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setShowLogin(false);
  }

  return (
    <div className="app">
      <Navbar />

      <main>
        <section className="hero" id="home">
          <div className="container">
            <div className="eyebrow">Your community. Your voice.</div>

            <h1>Let's make our community better, together.</h1>

            <p>
              See the issues residents have reported, follow their progress,
              and stay informed about the work needed in our community.
            </p>
          </div>
        </section>

        {/* Sign-in area: between the hero and statistics. */}
        <section className="container login-area" aria-label="Account">
          {currentUser ? (
            <div className="login-status">
              <div>
                <p>
                  Signed in as <strong>{currentUser.fullName}</strong>
                </p>
                <p className="muted">{currentUser.email}</p>
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
            Submit a report and help bring local issues into focus.
          </span>
        </span>

        <span className="report-launch-arrow" aria-hidden="true">
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


        <ReportStatistics statistics={statistics} />

        <section className="container reports-section" id="reports">
          <ReportFilters
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            filters={FILTERS}
          />

          {loading ? (
            <div className="state-box" role="status">
              <h3>Loading community reports...</h3>
              <p className="muted">
                Please wait while we fetch the latest data.
              </p>
            </div>
          ) : error ? (
            <div className="state-box" role="alert">
              <h3>We couldn't load the reports</h3>
              <p className="muted">{error}</p>

              <button
                className="retry-button"
                type="button"
                onClick={loadReports}
              >
                Try again
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
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
            <ReportList
              reports={filteredReports}
              totalReports={reports.length}
              getStatusLabel={getStatusLabel}
              formatDate={formatDate}
            />
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          Community Connect · Building a more accountable community.
        </div>
      </footer>
    </div>
  );
}

export default App;
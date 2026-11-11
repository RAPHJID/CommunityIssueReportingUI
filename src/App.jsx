import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { apiRequest } from "./services/api";
import "./App.css";
import Navbar from "./components/Navbar";
import ReportStatistics from "./components/ReportStatistics";
import ReportFilters from "./components/ReportFilters";
import ReportList from "./components/ReportList";
import LoginForm from "./components/LoginForm";
import JoinCommunity from "./components/JoinCommunity";
import ReportForm from "./components/ReportForm";
import ReportDetails from "./components/ReportDetails";
import AdminDashboard from "./components/AdminDashboard";
import CommunityIssuesMap from "./components/CommunityIssuesMap";
import HomePage from "./components/HomePage";
import { isAdminUser } from "./utils/authRoles";

const STATUS = {
  0: "Submitted",
  1: "Under Review",
  2: "Acknowledged",
  3: "In Progress",
  4: "Resolved",
  5: "Rejected",
  6: "Duplicate",
  7: "Out Of Jurisdiction",
};

const FILTERS = [
  "All Reports", "Submitted", "Under Review", "Acknowledged",
  "In Progress", "Resolved", "Rejected", "Duplicate", "Out Of Jurisdiction",
];

function getStatusLabel(status) {
  if (typeof status === "number" || /^\d+$/.test(String(status))) {
    return STATUS[status] ?? "Unknown";
  }
  const normalized = String(status ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Unknown";
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function getSavedUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getLocationName(location) {
  return location?.description ?? location?.name ?? location?.locationName ?? "Unnamed location";
}

function ViewBanner({ title, description }) {
  return (
    <div className="cc-view-banner">
      <div className="container">
        <span className="cc-view-kicker">NDENDERU WARD / COMMUNITY CONNECT</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function AccountStatus({ currentUser, onLogout, onLogin }) {
  return (
    <section className="container login-area" aria-label="Account">
      {currentUser ? (
        <div className="login-status">
          <div>
            <p>Signed in as <strong>{currentUser.fullName}</strong></p>
            <p className="muted">{currentUser.email}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onLogout}>Sign out</button>
        </div>
      ) : (
        <div className="login-prompt">
          <p className="muted">Want to report a community issue?</p>
          <button type="button" className="primary-button" onClick={onLogin}>
            Sign in to submit a report
          </button>
        </div>
      )}
    </section>
  );
}

function ReportDetailsRoute({ categories, locations, currentUser }) {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [retryReport, setRetryReport] = useState(0);
  const [retryHistory, setRetryHistory] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError("");
    setLoading(true);
    apiRequest(`/Report/${encodeURIComponent(reportId)}`)
      .then((data) => {
        if (!cancelled) {
          if (!data || String(data.id).toLowerCase() !== String(reportId).toLowerCase()) {
            throw new Error("The API returned an unexpected report response.");
          }
          setReport(data);
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message || "Unable to load report details."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reportId, retryReport]);

  useEffect(() => {
    let cancelled = false;
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    apiRequest(`/ReportStatusHistory/report/${encodeURIComponent(reportId)}`)
      .then((data) => {
        if (!cancelled) {
          if (!Array.isArray(data)) throw new Error("Unexpected status history response.");
          setHistory(data);
        }
      })
      .catch((err) => { if (!cancelled) setHistoryError(err.message || "Unable to load status history."); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [reportId, retryHistory]);

  const category = categories.find((item) => String(item.id) === String(report?.categoryId));
  const location = locations.find((item) => String(item.id) === String(report?.locationId));

  return (
    <>
      <ViewBanner title="Community report" description="Follow this issue and see the recorded progress." />
      <section className="container reports-section" id="reports">
        <ReportDetails
          report={report}
          loading={loading}
          error={error}
          onBack={() => navigate("/explore-issues")}
          onRetry={() => setRetryReport((value) => value + 1)}
          getStatusLabel={getStatusLabel}
          formatDate={formatDate}
          categoryName={category?.name ?? "Category unavailable"}
          locationName={location ? getLocationName(location) : "Location unavailable"}
          history={history}
          historyLoading={historyLoading}
          historyError={historyError}
          onRetryHistory={() => setRetryHistory((value) => value + 1)}
          currentUser={currentUser}
        />
      </section>
    </>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const isAdmin = isAdminUser(currentUser);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Reports");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/Report");
      if (!Array.isArray(data)) throw new Error("The API returned an unexpected reports response.");
      setReports(data);
    } catch (err) {
      setError(err.message || "Unable to load community reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiRequest("/Category"), apiRequest("/Location")])
      .then(([categoryData, locationData]) => {
        if (cancelled) return;
        if (Array.isArray(categoryData)) setCategories(categoryData);
        if (Array.isArray(locationData)) setLocations(locationData);
      })
      .catch((err) => console.error("Unable to load report reference data:", err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  const statistics = useMemo(() => {
    const resolved = reports.filter((r) => getStatusLabel(r.currentStatus) === "Resolved").length;
    const unresolved = reports.filter((r) =>
      !["Resolved", "Rejected", "Duplicate", "Out Of Jurisdiction"].includes(getStatusLabel(r.currentStatus))
    ).length;
    return { total: reports.length, resolved, unresolved };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesStatus = activeFilter === "All Reports" || getStatusLabel(r.currentStatus) === activeFilter;
      const text = `${r.title ?? ""} ${r.description ?? ""}`.toLowerCase();
      return matchesStatus && (!query || text.includes(query));
    });
  }, [reports, search, activeFilter]);

  function handleLogin(user) {
    setCurrentUser(user);
    const requested = location.state?.from;
    const destination = typeof requested === "string" && requested.startsWith("/") && !requested.startsWith("//")
      ? requested : "/explore-issues";
    navigate(destination, { replace: true });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    if (location.pathname.startsWith("/admin") || location.pathname === "/report-issue") {
      navigate("/", { replace: true });
    }
  }

  async function handleUpdateReportStatus(reportId, newStatus, reason, notes) {
    if (!isAdmin) throw new Error("Only administrators can update report statuses.");
    await apiRequest(`/Report/${encodeURIComponent(reportId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        newStatus: Number(newStatus),
        reason: reason.trim(),
        notes: notes.trim() || null,
      }),
    });
    await loadReports();
  }

  const openReport = (reportId) => navigate(`/reports/${encodeURIComponent(reportId)}`);
  const account = (
    <AccountStatus
      currentUser={currentUser}
      onLogout={handleLogout}
      onLogin={() => navigate("/login", { state: { from: "/report-issue" } })}
    />
  );

  return (
    <div className="app">
      <Navbar isAdmin={isAdmin} currentUser={currentUser} />
      <main>
        <Routes>
          <Route path="/" element={
            <HomePage
              reports={reports}
              loading={loading}
              getStatusLabel={getStatusLabel}
              onExplore={() => navigate("/explore-issues")}
              onReport={() => navigate("/report-issue")}
              onOpenReport={openReport}
            />
          } />

          <Route path="/explore-issues" element={
            <>
              <ViewBanner title="Community reports" description="Explore what residents are reporting and follow each issue's progress." />
              {account}
              <section className="container" id="community-map">
                <CommunityIssuesMap
                  reports={reports}
                  getStatusLabel={getStatusLabel}
                  formatDate={formatDate}
                  onOpenReport={openReport}
                />
              </section>
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
                  <div className="state-box" role="status"><h3>Loading community reports...</h3><p className="muted">Please wait while we fetch the latest data.</p></div>
                ) : error ? (
                  <div className="state-box" role="alert"><h3>We couldn't load the reports</h3><p className="muted">{error}</p><button className="retry-button" type="button" onClick={loadReports}>Try again</button></div>
                ) : filteredReports.length === 0 ? (
                  <div className="state-box"><h3>{reports.length === 0 ? "No reports have been submitted yet" : "No matching reports found"}</h3><p className="muted">{reports.length === 0 ? "Reports submitted by residents will appear here." : "Try another search term or choose a different status filter."}</p></div>
                ) : (
                  <ReportList
                    reports={filteredReports}
                    totalReports={reports.length}
                    getStatusLabel={getStatusLabel}
                    formatDate={formatDate}
                    onSelectReport={openReport}
                  />
                )}
              </section>
            </>
          } />

          <Route path="/reports/:reportId" element={
            <ReportDetailsRoute categories={categories} locations={locations} currentUser={currentUser} />
          } />

          <Route path="/login" element={currentUser ? <Navigate to="/explore-issues" replace /> : (
            <>
              <ViewBanner title="Welcome back" description="Sign in to participate in Ndenderu community reporting." />
              <section className="container login-area" aria-label="Sign in">
                <LoginForm onLogin={handleLogin} onCancel={() => navigate("/")} />
                <p style={{ textAlign: "center", marginTop: 20, color: "#4d6c5c" }}>
                  New to Community Connect?{" "}
                  <a href="/join" onClick={(event) => { event.preventDefault(); navigate("/join", { state: { from: location.state?.from || "/report-issue" } }); }} style={{ color: "#246e4c", fontWeight: 800 }}>Join the community →</a>
                </p>
              </section>
            </>
          )} />

          <Route path="/join" element={currentUser ? <Navigate to="/explore-issues" replace /> : <JoinCommunity />} />

          <Route path="/report-issue" element={!currentUser ? (
            <Navigate to="/login" state={{ from: "/report-issue" }} replace />
          ) : (
            <>
              <ViewBanner title="Make your voice count" description="Tell us what needs attention in your neighborhood." />
              {account}
              <section className="container report-launch-area">
                <ReportForm
                  onCancel={() => navigate("/explore-issues")}
                  onReportCreated={loadReports}
                  onViewReport={openReport}
                />
              </section>
            </>
          )} />

          <Route path="/admin/dashboard" element={!currentUser ? (
            <Navigate to="/login" state={{ from: "/admin/dashboard" }} replace />
          ) : !isAdmin ? (
            <>
              <ViewBanner title="Access restricted" description="Only administrators can view this dashboard." />
              <section className="container state-box" role="alert">
                <h3>Administrator access required</h3>
                <p className="muted">Your account does not have permission to open this page.</p>
                <button type="button" className="primary-button" onClick={() => navigate("/explore-issues")}>Explore community issues</button>
              </section>
            </>
          ) : (
            <>
              <ViewBanner title="Community oversight" description="Review and manage submitted issues." />
              {account}
              <div className="container">
                <AdminDashboard
                  reports={reports}
                  loading={loading}
                  error={error}
                  onRetry={loadReports}
                  onOpenReport={openReport}
                  onUpdateStatus={handleUpdateReportStatus}
                  getStatusLabel={getStatusLabel}
                  formatDate={formatDate}
                />
              </div>
            </>
          )} />

          <Route path="*" element={
            <>
              <ViewBanner title="Page not found" description="We couldn't find the page you requested." />
              <div className="container state-box">
                <h3>404 — This page doesn't exist</h3>
                <button className="primary-button" type="button" onClick={() => navigate("/")}>Return home</button>
              </div>
            </>
          } />
        </Routes>
      </main>
      <footer className="footer"><div className="container">Community Connect · Building a more accountable community.</div></footer>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}

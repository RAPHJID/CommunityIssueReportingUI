import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "./services/api";
import "./App.css";
import Navbar from "./components/Navbar";
import ReportStatistics from "./components/ReportStatistics";
import ReportFilters from "./components/ReportFilters";

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

    .replace(/\_/g, " ");

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

function App() {

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [activeFilter, setActiveFilter] = useState("All Reports");

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

      const matchesSearch =

        !query ||

        `${report.title ?? ""} ${report.description ?? ""}`

          .toLowerCase()

          .includes(query);

      return matchesFilter && matchesSearch;

    });

  }, [reports, search, activeFilter]);

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

              <p className="muted">Please wait while we fetch the latest data.</p>

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

            <>

              <p className="muted">

                Showing {filteredReports.length} of {reports.length} reports

              </p>

              <div className="report-grid">

                {filteredReports.map((report) => {

                  const status = getStatusLabel(report.currentStatus);

                  const statusClass = status

                    .toLowerCase()

                    .replace(/\s+/g, "-");

                  return (

                    <article className="report-card" key={report.id}>

                      <div className="card-top">

                        <h3>{report.title || "Untitled report"}</h3>

                        <span className={`status status-${statusClass}`}>

                          {status}

                        </span>

                      </div>

                      <p className="report-description">

                        {report.description || "No description provided."}

                      </p>

                      <div className="card-footer">

                        <span className="date">

                          Reported {formatDate(report.createdAt)}

                        </span>

                        {report.isDuplicate && (

                          <span className="duplicate-note">

                            Marked as duplicate

                          </span>

                        )}

                      </div>

                    </article>

                  );

                })}

              </div>

            </>

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

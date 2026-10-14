import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "./services/api";



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

      <style>{`

        * { box-sizing: border-box; }



        body {

          margin: 0;

          background: #f7f8fa;

          color: #182230;

          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,

            "Segoe UI", sans-serif;

        }



        button, input { font: inherit; }



        .app { min-height: 100vh; }



        .navbar {

          background: #fff;

          border-bottom: 1px solid #e8ebef;

        }





.nav-inner, .container {

  width: calc(100% - 64px);

  max-width: 1600px;

  margin: 0 auto;

}



        .nav-inner {

          min-height: 76px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

        }



        .brand {

          display: flex;

          align-items: center;

          gap: 12px;

          font-size: 17px;

          font-weight: 800;

          letter-spacing: -0.4px;

        }



        .brand-icon {

          width: 42px;

          height: 42px;

          display: grid;

          place-items: center;

          background: #e7f5ee;

          color: #16754b;

          border-radius: 12px;

          font-size: 22px;

        }



        .nav-label {

          color: #667085;

          font-size: 13px;

        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-links a {
          color: #475467;
          text-decoration: none;
          font-size: 14px;
          font-weight: 650;
          transition: color 0.2s ease;
        }

        .nav-links a:hover { color: #16754b; }

        .nav-report-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 17px;
          border: none;
          border-radius: 10px;
          background: #16754b;
          color: #ffffff !important;
          text-decoration: none;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .nav-report-button:hover {
          background: #105b39;
          transform: translateY(-1px);
        }

        .nav-report-button:focus-visible,
        .nav-links a:focus-visible {
          outline: 3px solid #85d6ad;
          outline-offset: 3px;
        }



        .hero {

          background: #123d30;

          color: white;

          padding: 64px 0 68px;

        }



        .eyebrow {

          color: #a8e6c5;

          font-size: 12px;

          font-weight: 800;

          letter-spacing: 1.8px;

          text-transform: uppercase;

        }



        .hero h1 {

          max-width: 680px;

          margin: 16px 0;

          font-size: clamp(32px, 5vw, 49px);

          line-height: 1.12;

          letter-spacing: -1.8px;

        }



        .hero p {

          max-width: 610px;

          color: #d6e8df;

          line-height: 1.8;

          font-size: 16px;

          margin: 0;

        }



        .stats {

          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 18px;

          margin-top: -28px;

          position: relative;

        }



        .stat {

          background: white;

          border: 1px solid #e9edf0;

          border-radius: 14px;

          padding: 22px;

          box-shadow: 0 5px 20px rgba(16, 24, 40, 0.04);

        }



        .stat-label {

          color: #667085;

          font-size: 13px;

          font-weight: 600;

        }



        .stat-number {

          margin-top: 10px;

          font-size: 31px;

          font-weight: 800;

          letter-spacing: -1px;

        }



        .reports-section { padding: 48px 0 72px; }



        .section-heading {

          display: flex;

          justify-content: space-between;

          align-items: flex-end;

          gap: 20px;

          margin-bottom: 24px;

        }



        .section-heading h2 {

          margin: 0 0 8px;

          font-size: 25px;

          letter-spacing: -0.7px;

        }



        .muted {

          color: #667085;

          font-size: 14px;

          line-height: 1.6;

        }





.search {

  width: min(320px, 100%);

  border: 1px solid #d8dee6;

  background: #ffffff;

  color: #182230;

  caret-color: #16754b;

  border-radius: 10px;

  padding: 12px 14px;

  outline: none;

}



.search::placeholder {

  color: #667085;

  opacity: 1;

}



.search:focus {

  border-color: #21845b;

  box-shadow: 0 0 0 3px rgba(33, 132, 91, 0.12);

}







        .filters {

          display: flex;

          flex-wrap: wrap;

          gap: 9px;

          margin-bottom: 26px;

        }



        .filter-button {

          border: 1px solid #e0e5eb;

          background: white;

          color: #475467;

          border-radius: 9px;

          padding: 9px 13px;

          cursor: pointer;

          font-size: 13px;

          font-weight: 650;

        }



        .filter-button:hover { border-color: #98b9a8; }



        .filter-button.active {

          background: #123d30;

          color: white;

          border-color: #123d30;

        }



        .report-grid {

          display: grid;

          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 18px;

        }



        .report-card {

          background: white;

          border: 1px solid #e7ebef;

          border-radius: 14px;

          padding: 22px;

          min-width: 0;

          transition: box-shadow 0.2s, transform 0.2s;

        }



        .report-card:hover {

          box-shadow: 0 8px 26px rgba(16, 24, 40, 0.06);

          transform: translateY(-2px);

        }



        .card-top {

          display: flex;

          justify-content: space-between;

          align-items: flex-start;

          gap: 12px;

        }



        .report-card h3 {

          margin: 0;

          font-size: 18px;

          line-height: 1.45;

          overflow-wrap: anywhere;

        }



        .status {

          display: inline-flex;

          flex-shrink: 0;

          align-items: center;

          border-radius: 999px;

          padding: 6px 10px;

          font-size: 11px;

          font-weight: 800;

          background: #f2f4f7;

          color: #475467;

        }



        .status-submitted { background: #eff8ff; color: #175cd3; }

        .status-under-review { background: #fff6ed; color: #c4320a; }

        .status-acknowledged { background: #f4f3ff; color: #5925dc; }

        .status-in-progress { background: #fffaeb; color: #b54708; }

        .status-resolved { background: #ecfdf3; color: #027a48; }

        .status-rejected { background: #fef3f2; color: #b42318; }

        .status-duplicate { background: #f2f4f7; color: #475467; }



        .report-description {

          color: #667085;

          font-size: 14px;

          line-height: 1.75;

          margin: 14px 0 20px;

          overflow-wrap: anywhere;

        }



        .card-footer {

          display: flex;

          flex-wrap: wrap;

          align-items: center;

          justify-content: space-between;

          gap: 12px;

          border-top: 1px solid #f0f2f5;

          padding-top: 16px;

        }



        .date {

          color: #667085;

          font-size: 12px;

        }



        .duplicate-note {

          color: #b54708;

          font-size: 12px;

          font-weight: 700;

        }



        .state-box {

          background: white;

          border: 1px solid #e7ebef;

          border-radius: 14px;

          padding: 38px 22px;

          text-align: center;

        }



        .state-box h3 { margin: 0 0 8px; }



        .retry-button {

          border: none;

          border-radius: 9px;

          padding: 11px 16px;

          margin-top: 12px;

          background: #123d30;

          color: white;

          font-weight: 700;

          cursor: pointer;

        }



        .footer {

          border-top: 1px solid #e8ebef;

          background: white;

          padding: 24px 0;

          color: #667085;

          font-size: 12px;

        }



        @media (max-width: 680px) {

          .nav-inner, .container {

            width: min(100% - 28px, 1120px);

          }
          .nav-inner { min-height: 66px; gap: 10px; }
          .brand { font-size: 15px; gap: 8px; }
          .brand-icon { width: 36px; height: 36px; }
          .nav-label { display: none; }
          .nav-links { gap: 8px; }
          .nav-links a:not(.nav-report-button) { display: none; }
          .nav-report-button { min-height: 40px; padding: 0 12px; font-size: 12px; white-space: nowrap; }

          .hero { padding: 46px 0 56px; }

          .hero h1 { letter-spacing: -1px; }

          .stats { gap: 9px; }

          .stat { padding: 15px 12px; }

          .stat-label { font-size: 11px; }

          .stat-number { font-size: 25px; }

          .reports-section { padding-top: 38px; }

          .section-heading {

            align-items: stretch;

            flex-direction: column;

          }

          .search { width: 100%; }

          .report-grid { grid-template-columns: 1fr; }

          .report-card { padding: 18px; }

          .card-top { flex-direction: column; }

        }

      `}</style>



      <header className="navbar">
        <div className="nav-inner">
          <a
            className="brand"
            href="#home"
            aria-label="Community Connect home"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <span className="brand-icon" aria-hidden="true">⌂</span>
            <span>Community Connect</span>
          </a>

          <nav className="nav-links" aria-label="Main navigation">
            <a className="nav-home-link" href="#home">Home</a>
            <a className="nav-reports-link" href="#reports">Community Reports</a>
            <a className="nav-report-button" href="#reports">View Reports</a>
          </nav>
        </div>
      </header>



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



        <section className="container stats" aria-label="Report statistics">

          <div className="stat">

            <div className="stat-label">Total reports</div>

            <div className="stat-number">{statistics.total}</div>

          </div>

          <div className="stat">

            <div className="stat-label">Awaiting resolution</div>

            <div className="stat-number">{statistics.unresolved}</div>

          </div>

          <div className="stat">

            <div className="stat-label">Resolved reports</div>

            <div className="stat-number">{statistics.resolved}</div>

          </div>

        </section>



        <section className="container reports-section" id="reports">

          <div className="section-heading">

            <div>

              <h2>Community reports</h2>

              <p className="muted">

                Follow reported issues and their current status.

              </p>

            </div>



            <input

              className="search"

              type="search"

              placeholder="Search reports..."

              aria-label="Search reports"

              value={search}

              onChange={(event) => setSearch(event.target.value)}

            />

          </div>



          <div className="filters" aria-label="Filter reports by status">

            {FILTERS.map((filter) => (

              <button

                key={filter}

                type="button"

                className={`filter-button ${

                  activeFilter === filter ? "active" : ""

                }`}

                aria-pressed={activeFilter === filter}

                onClick={() => setActiveFilter(filter)}

              >

                {filter}

              </button>

            ))}

          </div>



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

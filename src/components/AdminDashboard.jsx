import { useMemo, useState } from "react";
import "./AdminDashboard.css";

const FILTERS = ["All Reports", "Submitted", "Under Review", "Acknowledged", "In Progress", "Resolved", "Rejected", "Duplicate"];

export default function AdminDashboard({ reports, loading, error, onRetry, onOpenReport, getStatusLabel, formatDate }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Reports");

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter(r => ["Submitted", "Under Review", "Acknowledged", "In Progress"].includes(getStatusLabel(r.currentStatus))).length,
    resolved: reports.filter(r => getStatusLabel(r.currentStatus) === "Resolved").length,
    rejected: reports.filter(r => getStatusLabel(r.currentStatus) === "Rejected").length,
  }), [reports, getStatusLabel]);

  const visible = useMemo(() => reports.filter(r => {
    const status = getStatusLabel(r.currentStatus);
    const matchesStatus = filter === "All Reports" || status === filter;
    const query = search.trim().toLowerCase();
    return matchesStatus && (!query || `${r.title || ""} ${r.description || ""}`.toLowerCase().includes(query));
  }), [reports, filter, search, getStatusLabel]);

  return (
    <section className="admin-dashboard" aria-labelledby="admin-dashboard-title">
      <div className="admin-heading">
        <div><p className="admin-eyebrow">ADMINISTRATION / OVERVIEW</p><h2 id="admin-dashboard-title">Report management</h2><p className="muted">Review incoming community issues. Administrative actions will be added next.</p></div>
        <button type="button" className="secondary-button" onClick={onRetry}>Refresh reports</button>
      </div>
      <div className="admin-stats">
        <div><span>Total reports</span><strong>{stats.total}</strong></div>
        <div><span>In progress / pending</span><strong>{stats.pending}</strong></div>
        <div><span>Resolved</span><strong>{stats.resolved}</strong></div>
        <div><span>Rejected</span><strong>{stats.rejected}</strong></div>
      </div>
      <div className="admin-controls">
        <label>Search reports<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or description" /></label>
        <label>Status<select value={filter} onChange={e => setFilter(e.target.value)}>{FILTERS.map(x => <option key={x} value={x}>{x}</option>)}</select></label>
      </div>
      {loading ? <div className="state-box" role="status">Loading reports...</div> : error ? <div className="state-box" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Try again</button></div> : (
        <>
          <p className="muted">Showing {visible.length} of {reports.length} reports</p>
          {visible.length === 0 ? <div className="state-box">No reports match these filters.</div> : (
            <div className="admin-report-list">
              {visible.map(r => <article className="admin-report-row" key={r.id}>
                <div><h3>{r.title || "Untitled report"}</h3><p>{r.description || "No description provided."}</p><small>Reported {formatDate(r.createdAt)}</small></div>
                <div className="admin-report-actions"><span className="admin-status">{getStatusLabel(r.currentStatus)}</span><button type="button" className="secondary-button" onClick={() => onOpenReport(r.id)}>View details</button></div>
              </article>)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

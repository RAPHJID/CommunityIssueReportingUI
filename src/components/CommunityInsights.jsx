import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import "./CommunityInsights.css";

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const formatMonth = (date) => date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
const getCategoryId = (row) => row?.id ?? row?.categoryId;
const getCategoryName = (row) => row?.name ?? row?.categoryName ?? "Uncategorised";

export default function CommunityInsights({ reports = [], loading = false, error = "", onOpenReport }) {
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [support, setSupport] = useState(null);
  const [supportError, setSupportError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiRequest("/Category")
      .then((result) => { if (!cancelled && Array.isArray(result)) setCategories(result); })
      .catch(() => { if (!cancelled) setCategoriesError("Category names could not be loaded."); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setSupportError("");
    apiRequest("/CommunityInsights/support-summary")
      .then((result) => { if (!cancelled) setSupport(result); })
      .catch(() => { if (!cancelled) { setSupport(null); setSupportError("Support insights are unavailable. Check that the optional backend endpoint is installed and your admin session is active."); } });
    return () => { cancelled = true; };
  }, [refreshKey, reports]);

  const categoryRows = useMemo(() => {
    const names = new Map(categories.map((category) => [String(getCategoryId(category)), getCategoryName(category)]));
    const counts = new Map();
    for (const report of reports) {
      const name = report.categoryName || names.get(String(report.categoryId)) || "Uncategorised";
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [categories, reports]);

  const activity = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: monthKey(date), label: formatMonth(date), count: 0 };
    });
    const byMonth = new Map(months.map((month) => [month.key, month]));
    for (const report of reports) {
      const date = new Date(report.createdAt);
      if (!Number.isNaN(date.getTime())) {
        const month = byMonth.get(monthKey(date));
        if (month) month.count += 1;
      }
    }
    return months;
  }, [reports]);

  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.count));
  const maxMonthly = Math.max(1, ...activity.map((row) => row.count));
  const resolved = reports.filter((r) => Number(r.currentStatus) === 4 || String(r.currentStatus).toLowerCase() === "resolved").length;
  const resolutionRate = reports.length ? Math.round(100 * resolved / reports.length) : 0;

  return (
    <section className="cci-section" aria-labelledby="cci-title">
      <header className="cci-header">
        <div><p className="cci-eyebrow">COMMUNITY INTELLIGENCE</p><h3 id="cci-title">What residents are telling us</h3><p>Insights calculated from recorded Ndenderu Ward reports. Support totals come from the report-like records.</p></div>
        <button type="button" onClick={() => { setRefreshKey((key) => key + 1); setCategoriesError(""); }} className="cci-refresh">Refresh insights</button>
      </header>
      {loading ? <p className="cci-message" role="status">Loading report insights...</p> : error ? <p className="cci-message" role="alert">Report insights are unavailable until reports load.</p> : (
      <>
        <div className="cci-highlights">
          <div><span>Resolution rate</span><strong>{resolutionRate}%</strong><small>{resolved} of {reports.length} recorded reports</small></div>
          <div><span>Most reported category</span><strong className="cci-highlight-text">{categoryRows[0]?.name || "No reports yet"}</strong><small>{categoryRows[0] ? `${categoryRows[0].count} reports` : "No categories to compare"}</small></div>
          <div><span>Community support actions</span><strong>{support ? Number(support.totalSupportActions ?? 0).toLocaleString() : "—"}</strong><small>{support ? "Recorded support actions, not unique residents" : "Requires support summary API"}</small></div>
        </div>
        <div className="cci-panels">
          <article className="cci-panel"><div className="cci-panel-heading"><h4>Most reported issues</h4><span>By category</span></div>
            {categoriesError && <p className="cci-hint">{categoriesError} Category IDs may appear as uncategorised.</p>}
            {categoryRows.length ? <div className="cci-category-list">{categoryRows.slice(0, 6).map((row) => <div className="cci-category" key={row.name}><div><strong>{row.name}</strong><span>{row.count}</span></div><div className="cci-bar"><span style={{ width: `${(row.count / maxCategory) * 100}%` }} /></div></div>)}</div> : <p className="cci-empty">Categories will appear after the first report is recorded.</p>}
          </article>
          <article className="cci-panel"><div className="cci-panel-heading"><h4>Reporting activity</h4><span>Last 6 calendar months</span></div>
            <div className="cci-months" aria-label="Reports submitted by month">{activity.map((row) => <div className="cci-month" key={row.key}><strong>{row.count}</strong><div className="cci-month-track"><span style={{ height: `${row.count ? Math.max(8, (row.count / maxMonthly) * 100) : 0}%` }} /></div><small>{row.label}</small></div>)}</div>
            <p className="cci-hint">Monthly bars count new reports, not status changes.</p>
          </article>
        </div>
        <article className="cci-panel cci-support"><div className="cci-panel-heading"><h4>Issues receiving community support</h4><span>Top 5 by supporters</span></div>
          {supportError ? <p className="cci-hint" role="status">{supportError}</p> : !support?.topReports?.length ? <p className="cci-empty">No support actions recorded yet.</p> : <div className="cci-support-list">{support.topReports.map((row, index) => <div className="cci-support-row" key={row.reportId}><span className="cci-rank">{index + 1}</span><div><strong>{row.title || "Untitled report"}</strong><small>{row.count} {row.count === 1 ? "supporter" : "supporters"}</small></div><button type="button" onClick={() => onOpenReport?.(row.reportId)}>View issue</button></div>)}</div>}
          <p className="cci-hint">Support counts show interest, not issue severity or official priority.</p>
        </article>
      </>)}
    </section>
  );
}

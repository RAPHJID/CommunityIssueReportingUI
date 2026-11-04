import "./ReportDetailsV2.css";

function formatHistoryDate(dateString) {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function ReportTimeline({ report, history = [], loading, error, onRetry, getStatusLabel }) {
  const events = [
    { id: `submission-${report.id}`, title: "Report submitted", description: "A resident submitted this community issue.", date: report.createdAt, type: "submission" },
    ...history.map((entry, index) => ({ id: entry.id || `update-${index}`, title: getStatusLabel(entry.newStatus), description: entry.reason, notes: entry.notes, date: entry.createdAt, type: "status-change" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <section className="report-timeline-section rd2-timeline" aria-labelledby="report-timeline-title">
      <div className="report-timeline-header"><div><p className="report-details-section-label">A RECORD OF PROGRESS</p><h3 id="report-timeline-title">The issue's journey</h3><p className="report-timeline-intro">Every recorded status change, from the original submission onward.</p></div><span className="report-timeline-count">{history.length} {history.length === 1 ? "update" : "updates"}</span></div>
      {loading ? <div className="report-timeline-state" role="status">Loading the report's history…</div> : error ? <div className="report-timeline-state" role="alert"><p>{error}</p><button type="button" className="retry-button" onClick={onRetry}>Try again</button></div> : (
        <ol className="rd2-timeline-list">{events.map((event, index) => <li className={`rd2-timeline-event ${index === events.length - 1 ? "is-latest" : ""}`} key={event.id}><div className="rd2-timeline-rail"><span className="rd2-timeline-dot" aria-hidden="true">{index === events.length - 1 ? "●" : "✓"}</span></div><div className="rd2-timeline-card"><div className="rd2-timeline-event-top"><div><span className="rd2-event-type">{event.type === "submission" ? "ORIGINAL SUBMISSION" : "STATUS UPDATE"}</span><h4>{event.title}</h4></div>{event.date ? <time dateTime={event.date}>{formatHistoryDate(event.date)}</time> : <span>Date unavailable</span>}</div>{event.description && <p>{event.description}</p>}{event.notes && <div className="rd2-timeline-notes"><strong>Additional notes</strong><p>{event.notes}</p></div>}{event.type === "submission" && history.length === 0 && <p className="rd2-timeline-pending">No further updates have been recorded yet.</p>}</div></li>)}</ol>
      )}
    </section>
  );
}
export default ReportTimeline;

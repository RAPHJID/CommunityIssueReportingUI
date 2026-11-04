import ReportLocationMap from "./ReportLocationMap";
import ReportTimeline from "./ReportTimeline";
import ReportGallery from "./ReportGallery";
import "./ReportDetailsV2.css";

const STAGES = ["Submitted", "Under Review", "Acknowledged", "In Progress", "Resolved"];
const ICONS = { Category: "◈", Location: "⌖", Reported: "◷", Status: "◎" };

function ReportDetails({ report, loading, error, onBack, onRetry, getStatusLabel, formatDate, categoryName, locationName, history, historyLoading, historyError, onRetryHistory }) {
  const status = report ? getStatusLabel(report.currentStatus) : "Unknown";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");
  const isClosedException = ["Rejected", "Duplicate", "Out of Jurisdiction"].includes(status);
  const stageIndex = STAGES.indexOf(status);
  const progress = stageIndex >= 0 ? Math.round((stageIndex / (STAGES.length - 1)) * 100) : 0;

  return (
    <section className="rd2" aria-label="Community report details">
      <div className="rd2-topline">
        <span className="rd2-breadcrumb"><span>COMMUNITY CONNECT</span><span aria-hidden="true"> / </span>REPORT DETAILS</span>
        <button type="button" className="rd2-back" onClick={onBack}><span aria-hidden="true">←</span> Back to reports</button>
      </div>

      {loading ? (
        <div className="rd2-state" role="status"><span className="rd2-spinner" aria-hidden="true"/><h3>Opening community report</h3><p>Getting the latest issue details…</p></div>
      ) : error ? (
        <div className="rd2-state" role="alert"><h3>We couldn't open this report</h3><p>{error}</p><button type="button" onClick={onRetry} className="rd2-action">Try again</button></div>
      ) : report ? (
        <>
          <header className="rd2-hero">
            <div className="rd2-hero-copy">
              <p className="rd2-overline"><span className="rd2-live-dot"/> NDENDERU WARD · COMMUNITY ISSUE</p>
              <h2>{report.title || "Untitled report"}</h2>
              <p className="rd2-hero-sub">A concern raised by a community resident. Explore the details, location, and recorded updates below.</p>
              <div className="rd2-hero-chips"><span className={`rd2-status rd2-status-${statusClass}`}>{status}</span><span className="rd2-resident">◉ Resident submission</span></div>
            </div>
            <div className="rd2-hero-mark" aria-hidden="true"><span>⌖</span><small>LOCAL VOICES<br/>VISIBLE ISSUES</small></div>
          </header>

          <div className="rd2-metadata" aria-label="Report summary">
            {[
              { label: "Category", value: categoryName || "Unavailable" },
              { label: "Location", value: locationName || "Unavailable" },
              { label: "Date reported", value: formatDate(report.createdAt) },
              { label: "Current status", value: status },
            ].map(({label,value}) => <div className="rd2-meta" key={label}><span className="rd2-meta-icon" aria-hidden="true">{ICONS[label === "Date reported" ? "Reported" : label === "Current status" ? "Status" : label]}</span><div><span className="rd2-meta-label">{label}</span><strong>{value}</strong></div></div>)}
          </div>

          <section className="rd2-progress" aria-labelledby="rd2-progress-title">
            <div className="rd2-section-heading"><div><p className="rd2-kicker">AT A GLANCE</p><h3 id="rd2-progress-title">Where this report stands</h3></div><span className="rd2-progress-label">{isClosedException ? "Closed / flagged" : stageIndex >= 0 ? `${progress}% of status stages` : "Status recorded"}</span></div>
            {isClosedException ? (
              <div className="rd2-exception"><span aria-hidden="true">ⓘ</span><div><strong>{status} report</strong><p>This report is marked as {status.toLowerCase()}. Review the recorded timeline below for more context.</p></div></div>
            ) : stageIndex >= 0 ? (
              <><div className="rd2-stage-grid">{STAGES.map((stage, index) => <div key={stage} className={`rd2-stage ${index < stageIndex ? "is-done" : ""} ${index === stageIndex ? "is-current" : ""}`}><span className="rd2-stage-symbol" aria-hidden="true">{index < stageIndex ? "✓" : index + 1}</span><span>{stage}</span></div>)}</div><div className="rd2-progress-track" role="progressbar" aria-label="Report status stages" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div><p className="rd2-progress-note">This indicator shows the current workflow stage, not a guarantee that the issue has been physically resolved.</p></>
            ) : <p className="rd2-progress-note">The report's current status is {status}. See the recorded updates below.</p>}
          </section>

          <section className="rd2-description" aria-labelledby="rd2-description-title"><p className="rd2-kicker">THE RESIDENT'S CONCERN</p><h3 id="rd2-description-title">About this issue</h3><p>{report.description || "No description was provided for this report."}</p></section>

          <div className="rd2-content"><ReportLocationMap locationId={report.locationId} locationName={locationName}/><ReportGallery reportId={report.id}/><ReportTimeline report={report} history={history} loading={historyLoading} error={historyError} onRetry={onRetryHistory} getStatusLabel={getStatusLabel}/></div>
          {report.isDuplicate && <div className="rd2-duplicate" role="note">ⓘ This report has been marked as a duplicate.</div>}
          <footer className="rd2-footer"><strong>COMMUNITY CONNECT</strong><span>Making community concerns visible · Ndenderu Ward</span></footer>
        </>
      ) : <div className="rd2-state"><h3>Report not found</h3><p>The requested report could not be displayed.</p></div>}
    </section>
  );
}
export default ReportDetails;

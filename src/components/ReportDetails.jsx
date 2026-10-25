import ReportLocationMap from "./ReportLocationMap";
import ReportTimeline from "./ReportTimeline";
import ReportGallery from "./ReportGallery";

function ReportDetails({
  report,
  loading,
  error,
  onBack,
  onRetry,
  getStatusLabel,
  formatDate,
  categoryName,
  locationName,
  history,
  historyLoading,
  historyError,
  onRetryHistory,
}) {
  const status = report ? getStatusLabel(report.currentStatus) : "Unknown";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");

  return (
    <section className="report-details-panel">
      <div className="report-details-topbar">
        <span className="report-details-eyebrow">COMMUNITY REPORT / DETAILS</span>
        <button type="button" className="report-details-back" onClick={onBack}>
          ← Back to reports
        </button>
      </div>

      {loading ? (
        <div className="state-box" role="status">
          <h3>Loading report details...</h3>
          <p className="muted">Please wait while we retrieve this report.</p>
        </div>
      ) : error ? (
        <div className="state-box" role="alert">
          <h3>Unable to load report details</h3>
          <p className="muted">{error}</p>
          <button type="button" className="retry-button" onClick={onRetry}>Try again</button>
        </div>
      ) : report ? (
        <>
          <div className="report-details-heading">
            <div>
              <p className="report-details-kicker">COMMUNITY ISSUE REPORT</p>
              <h2>{report.title || "Untitled report"}</h2>
              <p className="report-details-subtitle">Submitted by a community resident</p>
            </div>
            <span className={`status status-${statusClass}`}>{status}</span>
          </div>

          <div className="report-details-meta">
            <div className="report-details-meta-item"><span>Category</span><strong>{categoryName}</strong></div>
            <div className="report-details-meta-item"><span>Location</span><strong>{locationName}</strong></div>
            <div className="report-details-meta-item"><span>Date reported</span><strong>{formatDate(report.createdAt)}</strong></div>
            <div className="report-details-meta-item"><span>Current status</span><strong>{status}</strong></div>
          </div>

          <div className="report-details-body">
            <p className="report-details-section-label">THE REPORTED ISSUE</p>
            <h3>Issue description</h3>
            <p className="report-details-description">{report.description || "No description provided."}</p>
          </div>

          <ReportLocationMap locationId={report.locationId} locationName={locationName} />

          <ReportGallery reportId={report.id} />

          <ReportTimeline
            report={report}
            history={history}
            loading={historyLoading}
            error={historyError}
            onRetry={onRetryHistory}
            getStatusLabel={getStatusLabel}
          />

          {report.isDuplicate && (
            <div className="report-details-duplicate">This report has been marked as a duplicate.</div>
          )}

          <div className="report-details-bottom">
            <span>COMMUNITY CONNECT</span>
            <span>Transparency through reporting</span>
          </div>
        </>
      ) : (
        <div className="state-box">
          <h3>Report not found</h3>
          <p className="muted">The requested report could not be displayed.</p>
        </div>
      )}
    </section>
  );
}

export default ReportDetails;

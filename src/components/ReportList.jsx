
function ReportList({
  reports,
  totalReports,
  getStatusLabel,
  formatDate,
  onSelectReport,
}) {
  return (
    <>
      <p className="muted">
        Showing {reports.length} of {totalReports} reports
      </p>

      <div className="report-grid">
        {reports.map((report) => {
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

              <button
                type="button"
                className="report-view-button"
                onClick={() => onSelectReport(report.id)}
                aria-label={`View details for ${report.title || "report"}`}
              >
                View report details
                <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default ReportList;

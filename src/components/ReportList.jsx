import "./CommunityReports.css";
import ReportSupport from "./ReportSupport";

const STATUS_META = {
  Submitted: { icon: "◷", tone: "blue", detail: "Waiting for review" },
  "Under Review": { icon: "◎", tone: "amber", detail: "Being assessed" },
  Acknowledged: { icon: "✓", tone: "purple", detail: "Issue acknowledged" },
  "In Progress": { icon: "↗", tone: "amber", detail: "Work in progress" },
  Resolved: { icon: "✓", tone: "green", detail: "Marked as resolved" },
  Rejected: { icon: "×", tone: "red", detail: "Report not accepted" },
  Duplicate: { icon: "⊞", tone: "slate", detail: "Already reported" },
  "Out of Jurisdiction": { icon: "!", tone: "slate", detail: "Outside coverage area" },
};

function ReportList({ reports, totalReports, getStatusLabel, formatDate, onSelectReport }) {
  return (
    <div className="cc-report-list">
      <div className="cc-list-toolbar">
        <div className="cc-list-count">
          <span className="cc-list-count-icon" aria-hidden="true">▦</span>
          <span>Showing <strong>{reports.length}</strong> of <strong>{totalReports}</strong> community reports</span>
        </div>
        <span className="cc-list-sort-note">Community issue directory</span>
      </div>

      <div className="cc-report-grid">
        {reports.map((report, index) => {
          const status = getStatusLabel(report.currentStatus);
          const meta = STATUS_META[status] || { icon: "•", tone: "slate", detail: "Status update" };
          const title = report.title?.trim() || "Untitled report";
          const description = report.description?.trim() || "No description provided for this report.";
          return (
            <article className="cc-report-card" key={report.id} style={{ "--cc-card-index": Math.min(index, 8) }}>
              <div className="cc-card-topline">
                <span className="cc-card-type"><span className="cc-card-type-dot" /> COMMUNITY REPORT</span>
                <span className={`cc-status cc-status--${meta.tone}`}>
                  <span aria-hidden="true">{meta.icon}</span> {status}
                </span>
              </div>
              <h3 className="cc-card-title">{title}</h3>
              <p className="cc-card-description">{description}</p>
              <div className="cc-card-meta">
                <span className="cc-card-meta-item"><span aria-hidden="true">◷</span> Reported {formatDate(report.createdAt)}</span>
                {report.isDuplicate && <span className="cc-card-duplicate">Duplicate report</span>}
                <ReportSupport reportId={report.id} compact />
              </div>
              <div className="cc-card-bottom">
                <span className="cc-card-progress"><span className={`cc-card-progress-dot cc-card-progress-dot--${meta.tone}`} />{meta.detail}</span>
                <button type="button" className="cc-card-action" onClick={() => onSelectReport(report.id)} aria-label={`View details for ${title}`}>
                  View details <span className="cc-card-action-arrow" aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ReportList;

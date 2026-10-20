
function formatHistoryDate(dateString) {
  if (!dateString) return "Date unavailable";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ReportTimeline({
  report,
  history,
  loading,
  error,
  onRetry,
  getStatusLabel,
}) {
  const events = [
    {
      id: `submission-${report.id}`,
      title: "Report submitted",
      description: "A resident submitted this community issue.",
      date: report.createdAt,
      type: "submission",
    },
    ...history.map((entry) => ({
      id: entry.id,
      title: getStatusLabel(entry.newStatus),
      description: entry.reason,
      notes: entry.notes,
      date: entry.createdAt,
      type: "status-change",
    })),
  ].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  return (
    <section
      className="report-timeline-section"
      aria-labelledby="report-timeline-title"
    >
      <div className="report-timeline-header">
        <div>
          <p className="report-details-section-label">
            TRANSPARENCY & ACCOUNTABILITY
          </p>

          <h3 id="report-timeline-title">
            Report progress
          </h3>

          <p className="report-timeline-intro">
            Follow the recorded history of this community issue.
          </p>
        </div>

        <span className="report-timeline-count">
          {history.length} status updates
        </span>
      </div>

      {loading ? (
        <div className="report-timeline-state" role="status">
          Loading status history...
        </div>
      ) : error ? (
        <div className="report-timeline-state" role="alert">
          <p>{error}</p>

          <button
            type="button"
            className="retry-button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="report-timeline-list">
          {events.map((event, index) => (
            <div className="report-timeline-item" key={event.id}>
              <div className="report-timeline-track">
                <span
                  className={`report-timeline-dot ${
                    index === events.length - 1
                      ? "report-timeline-dot-current"
                      : ""
                  }`}
                />

                {index < events.length - 1 && (
                  <span className="report-timeline-line" />
                )}
              </div>

              <div className="report-timeline-content">
                <div className="report-timeline-event-heading">
                  <h4>{event.title}</h4>

                  <time dateTime={event.date}>
                    {formatHistoryDate(event.date)}
                  </time>
                </div>

                {event.description && (
                  <p>{event.description}</p>
                )}

                {event.notes && (
                  <div className="report-timeline-notes">
                    <strong>Additional notes</strong>
                    <p>{event.notes}</p>
                  </div>
                )}

                {event.type === "submission" &&
                  history.length === 0 && (
                    <p className="report-timeline-pending">
                      No further status updates have been recorded yet.
                    </p>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ReportTimeline;

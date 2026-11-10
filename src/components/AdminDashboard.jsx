
import { useMemo, useRef, useState } from "react";
import "./AdminDashboard.css";
import "./AdminDashboardV2.css";
import ResolutionEvidenceUpload from "./ResolutionEvidenceUpload";
import AdminIssuesMap from "./AdminIssuesMap";

const FILTERS = [
  "All Reports",
  "Submitted",
  "Under Review",
  "Acknowledged",
  "In Progress",
  "Resolved",
  "Rejected",
  "Duplicate",
  "Out of Jurisdiction",
];

const STATUS_OPTIONS = [
  { value: 1, label: "Under Review" },
  { value: 2, label: "Acknowledged" },
  { value: 3, label: "In Progress" },
  { value: 4, label: "Resolved" },
  { value: 5, label: "Rejected" },
];

const NEXT_STATUSES = {
  Submitted: [1, 5],
  "Under Review": [2, 5],
  Acknowledged: [3, 5],
  "In Progress": [4],
};

export default function AdminDashboard({
  reports = [],
  loading,
  error,
  onRetry,
  onOpenReport,
  onUpdateStatus,
  getStatusLabel,
  formatDate,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Reports");
  const [sortOrder, setSortOrder] = useState("newest");
  const [mapVisible, setMapVisible] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const reportListRef = useRef(null);

  const stats = useMemo(
    () => ({
      total: reports.length,

      pending: reports.filter((report) =>
        [
          "Submitted",
          "Under Review",
          "Acknowledged",
          "In Progress",
        ].includes(getStatusLabel(report.currentStatus))
      ).length,

      resolved: reports.filter(
        (report) =>
          getStatusLabel(report.currentStatus) === "Resolved"
      ).length,

      rejected: reports.filter(
        (report) =>
          getStatusLabel(report.currentStatus) === "Rejected"
      ).length,
      submitted: reports.filter((report) => getStatusLabel(report.currentStatus) === "Submitted").length,
      review: reports.filter((report) => getStatusLabel(report.currentStatus) === "Under Review").length,
      progressing: reports.filter((report) => getStatusLabel(report.currentStatus) === "In Progress").length,
      duplicate: reports.filter((report) => getStatusLabel(report.currentStatus) === "Duplicate").length,
    }),
    [reports, getStatusLabel]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const status = getStatusLabel(report.currentStatus);

      const matchesStatus =
        filter === "All Reports" || status === filter;

      const searchableText = [
        report.title,
        report.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!query || searchableText.includes(query))
      );
    }).sort((a, b) => {
      const left = new Date(a.createdAt).getTime() || 0;
      const right = new Date(b.createdAt).getTime() || 0;
      return sortOrder === "oldest" ? left - right : right - left;
    });
  }, [reports, filter, search, sortOrder, getStatusLabel]);

  function startEditing(report) {
    const options =
      NEXT_STATUSES[
        getStatusLabel(report.currentStatus)
      ] || [];

    if (!options.length) return;

    setEditingId(report.id);
    setSelectedStatus(String(options[0]));
    setReason("");
    setNotes("");
    setSaveError("");
    setSuccessMessage("");
  }

  function cancelEditing() {
    if (saving) return;

    setEditingId(null);
    setSaveError("");
  }

  function handleManageFromMap(reportId) {
    const report = reports.find(
      (item) => item.id === reportId
    );

    if (!report) return;

    const nextStatuses =
      NEXT_STATUSES[
        getStatusLabel(report.currentStatus)
      ] || [];

    // Show the report even if the list was filtered.
    setSearch("");
    setFilter("All Reports");

    if (nextStatuses.length > 0) {
      startEditing(report);
    } else {
      setEditingId(null);
    }

    // Scroll to the management list.
    requestAnimationFrame(() => {
      const row = document.getElementById(
        `admin-report-${reportId}`
      );

      (row || reportListRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  async function submitStatus(event, reportId) {
    event.preventDefault();

    if (saving) return;

    if (!reason.trim() || !selectedStatus) {
      setSaveError(
        "Select a status and enter a reason."
      );
      return;
    }

    if (reason.trim().length < 3) {
      setSaveError(
        "The reason must contain at least 3 characters."
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      await onUpdateStatus(
        reportId,
        Number(selectedStatus),
        reason,
        notes
      );

      setEditingId(null);
      setReason("");
      setNotes("");
      setSuccessMessage(
        "Report status updated successfully."
      );
    } catch (err) {
      setSaveError(
        err.message ||
          "Unable to update report status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="admin-dashboard"
      aria-labelledby="admin-dashboard-title"
    >
      <div className="cc-admin-hero">
        <div className="cc-admin-hero-art" aria-hidden="true"><span>◈</span></div>
        <div className="cc-admin-hero-content">
          <p className="cc-admin-overline">COMMUNITY CONNECT / ADMIN WORKSPACE</p>
          <h2 id="admin-dashboard-title">A clearer picture of <em>Ndenderu.</em></h2>
          <p>Monitor community reports, review their progress and record transparent updates — all in one workspace.</p>
          <div className="cc-admin-hero-actions">
            <button type="button" className="cc-admin-refresh" onClick={onRetry} disabled={loading}>
              <span aria-hidden="true">↻</span> {loading ? "Refreshing…" : "Refresh reports"}
            </button>
            <span className="cc-admin-live"><span aria-hidden="true" /> Using live report data</span>
          </div>
        </div>
      </div>

      <div className="cc-admin-section-title">
        <div><p className="cc-admin-kicker">AT A GLANCE</p><h3>Community activity</h3></div>
        <span>Ndenderu Ward</span>
      </div>
      <div className="cc-admin-metrics">
        <div className="cc-admin-metric"><span className="cc-admin-metric-icon">▦</span><p>Total reports</p><strong>{stats.total}</strong><small>All recorded community concerns</small></div>
        <div className="cc-admin-metric"><span className="cc-admin-metric-icon">◷</span><p>Awaiting resolution</p><strong>{stats.pending}</strong><small>Submitted, review, acknowledged or in progress</small></div>
        <div className="cc-admin-metric is-resolved"><span className="cc-admin-metric-icon">✓</span><p>Resolved</p><strong>{stats.resolved}</strong><small>Reports marked as resolved</small></div>
        <div className="cc-admin-metric"><span className="cc-admin-metric-icon">!</span><p>New submissions</p><strong>{stats.submitted}</strong><small>Reports awaiting initial review</small></div>
      </div>

      <div className="cc-admin-workflow">
        <div className="cc-admin-workflow-head"><div><p className="cc-admin-kicker">WORKFLOW SNAPSHOT</p><h3>Where issues stand</h3></div><span>Based on current status</span></div>
        <div className="cc-admin-workflow-track" aria-label="Distribution of report statuses">
          {[
            { label: "Submitted", count: stats.submitted, className: "submitted" },
            { label: "Under review", count: stats.review, className: "review" },
            { label: "In progress", count: stats.progressing, className: "progress" },
            { label: "Resolved", count: stats.resolved, className: "resolved" },
          ].map((item) => (
            <div key={item.label} className={`cc-admin-workflow-segment is-${item.className}`} style={{ flexGrow: item.count, flexBasis: 0, display: item.count ? undefined : "none" }} title={`${item.label}: ${item.count}`} />
          ))}
          {!stats.total && <div className="cc-admin-workflow-empty" />}
        </div>
        <div className="cc-admin-workflow-legend">
          <span><i className="is-submitted" /> Submitted <b>{stats.submitted}</b></span>
          <span><i className="is-review" /> Under review <b>{stats.review}</b></span>
          <span><i className="is-progress" /> In progress <b>{stats.progressing}</b></span>
          <span><i className="is-resolved" /> Resolved <b>{stats.resolved}</b></span>
          <span className="cc-admin-workflow-note">Other statuses are excluded from this bar.</span>
        </div>
      </div>

      <div className="cc-admin-map-heading">
        <div><p className="cc-admin-kicker">GEOGRAPHIC OVERVIEW</p><h3>Issues across the ward</h3><p>Explore reports on the map and open management controls from their markers.</p></div>
        <button type="button" className="cc-admin-map-toggle" aria-expanded={mapVisible} onClick={() => setMapVisible((value) => !value)}>{mapVisible ? "Hide map" : "Show map"}</button>
      </div>
      {!loading && !error && mapVisible && (
        <AdminIssuesMap
          reports={reports}
          getStatusLabel={getStatusLabel}
          formatDate={formatDate}
          onOpenReport={onOpenReport}
          onManageReport={handleManageFromMap}
        />
      )}

      {/* REPORT MANAGEMENT */}

      <div
        className="admin-management-section"
        ref={reportListRef}
      >
        <div className="admin-management-heading">
          <div>
            <p className="admin-eyebrow">
              REPORT MANAGEMENT
            </p>

            <h3>Review and update reports</h3>

            <p className="muted">
              Open reports, review their progress,
              and record status changes.
            </p>
          </div>
        </div>

        <div className="cc-admin-quickfilters" aria-label="Quick status filters">
          {[
            { label: "All reports", value: "All Reports" },
            { label: "New", value: "Submitted" },
            { label: "Under review", value: "Under Review" },
            { label: "In progress", value: "In Progress" },
            { label: "Resolved", value: "Resolved" },
          ].map((item) => (
            <button key={item.value} type="button" aria-pressed={filter === item.value} className={`cc-admin-quickfilter ${filter === item.value ? "is-active" : ""}`} onClick={() => setFilter(item.value)}>{item.label}</button>
          ))}
        </div>
        <div className="admin-controls">
          <label>
            Search reports

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search title or description"
            />
          </label>

          <label>
            Status

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
            >
              {FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        {successMessage && (
          <p
            className="admin-feedback-success"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {loading ? (
          <div className="state-box" role="status">
            Loading reports...
          </div>
        ) : error ? (
          <div className="state-box" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="muted">
              Showing {visible.length} of{" "}
              {reports.length} reports
            </p>

            {visible.length === 0 ? (
              <div className="cc-admin-empty">
                <span aria-hidden="true">⌕</span>
                <h4>No matching reports</h4>
                <p>Try a different search term or reset the filters.</p>
                <button type="button" onClick={() => { setSearch(""); setFilter("All Reports"); }}>Clear filters</button>
              </div>
            ) : (
              <div className="admin-report-list">
                {visible.map((report) => {
                  const currentStatus =
                    getStatusLabel(
                      report.currentStatus
                    );

                  const nextStatuses =
                    NEXT_STATUSES[currentStatus] || [];

                  const editing =
                    editingId === report.id;

                  return (
                    <article
                      className="admin-report-row"
                      id={`admin-report-${report.id}`}
                      key={report.id}
                    >
                      <div className="admin-report-main">
                        <h3>
                          {report.title ||
                            "Untitled report"}
                        </h3>

                        <p>
                          {report.description ||
                            "No description provided."}
                        </p>

                        <small className="cc-admin-report-date">
                          <span aria-hidden="true">◷</span> Reported {formatDate(report.createdAt)}
                        </small>

                        {/* RESOLUTION EVIDENCE */}

                        {currentStatus ===
                          "In Progress" && (
                          <ResolutionEvidenceUpload
                            reportId={report.id}
                          />
                        )}

                        {/* STATUS UPDATE FORM */}

                        {editing && (
                          <form
                            className="admin-status-form"
                            onSubmit={(event) =>
                              submitStatus(
                                event,
                                report.id
                              )
                            }
                          >
                            <h4>
                              Update report status
                            </h4>

                            <label
                              htmlFor={`status-${report.id}`}
                            >
                              New status
                            </label>

                            <select
                              id={`status-${report.id}`}
                              value={selectedStatus}
                              onChange={(event) =>
                                setSelectedStatus(
                                  event.target.value
                                )
                              }
                              disabled={saving}
                              required
                            >
                              {STATUS_OPTIONS.filter(
                                (option) =>
                                  nextStatuses.includes(
                                    option.value
                                  )
                              ).map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            {selectedStatus === "4" && (
                              <p className="muted">
                                Resolution evidence
                                must be uploaded before
                                this status can be saved.
                              </p>
                            )}

                            <label
                              htmlFor={`reason-${report.id}`}
                            >
                              Reason (required)
                            </label>

                            <textarea
                              id={`reason-${report.id}`}
                              rows={3}
                              value={reason}
                              onChange={(event) =>
                                setReason(
                                  event.target.value
                                )
                              }
                              disabled={saving}
                              minLength={3}
                              maxLength={1000}
                              required
                              placeholder="Explain why the status is changing"
                            />

                            <label
                              htmlFor={`notes-${report.id}`}
                            >
                              Additional notes
                              (optional)
                            </label>

                            <textarea
                              id={`notes-${report.id}`}
                              rows={2}
                              value={notes}
                              onChange={(event) =>
                                setNotes(
                                  event.target.value
                                )
                              }
                              disabled={saving}
                              maxLength={2000}
                              placeholder="Additional context"
                            />

                            {saveError && (
                              <p
                                className="admin-feedback-error"
                                role="alert"
                              >
                                {saveError}
                              </p>
                            )}

                            <div className="admin-status-form-actions">
                              <button
                                type="submit"
                                className="primary-button"
                                disabled={
                                  saving ||
                                  reason.trim().length <
                                    3 ||
                                  !selectedStatus
                                }
                              >
                                {saving
                                  ? "Saving..."
                                  : "Save status"}
                              </button>

                              <button
                                type="button"
                                className="secondary-button"
                                onClick={cancelEditing}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* REPORT ACTIONS */}

                      <div className="admin-report-actions">
                        <span className={`admin-status cc-admin-status-${currentStatus.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`}>
                          {currentStatus}
                        </span>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            onOpenReport(report.id)
                          }
                        >
                          View details
                        </button>

                        {nextStatuses.length > 0 && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              editing
                                ? cancelEditing()
                                : startEditing(report)
                            }
                            disabled={saving}
                          >
                            {editing
                              ? "Close status form"
                              : "Manage status"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

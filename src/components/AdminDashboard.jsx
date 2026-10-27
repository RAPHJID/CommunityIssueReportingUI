import { useMemo, useState } from "react";
import "./AdminDashboard.css";
import ResolutionEvidenceUpload from "./ResolutionEvidenceUpload";

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
  reports,
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

  const [editingId, setEditingId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const stats = useMemo(
    () => ({
      total: reports.length,

      pending: reports.filter((r) =>
        [
          "Submitted",
          "Under Review",
          "Acknowledged",
          "In Progress",
        ].includes(getStatusLabel(r.currentStatus))
      ).length,

      resolved: reports.filter(
        (r) => getStatusLabel(r.currentStatus) === "Resolved"
      ).length,

      rejected: reports.filter(
        (r) => getStatusLabel(r.currentStatus) === "Rejected"
      ).length,
    }),
    [reports, getStatusLabel]
  );

  const visible = useMemo(
    () =>
      reports.filter((r) => {
        const status = getStatusLabel(r.currentStatus);

        const matchesStatus =
          filter === "All Reports" || status === filter;

        const query = search.trim().toLowerCase();

        const searchableText =
          `${r.title || ""} ${r.description || ""}`.toLowerCase();

        return (
          matchesStatus &&
          (!query || searchableText.includes(query))
        );
      }),
    [reports, filter, search, getStatusLabel]
  );

  function startEditing(report) {
    const options =
      NEXT_STATUSES[getStatusLabel(report.currentStatus)] || [];

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

  async function submitStatus(event, reportId) {
    event.preventDefault();

    if (saving) return;

    if (!reason.trim() || !selectedStatus) {
      setSaveError("Select a status and enter a reason.");
      return;
    }

    if (reason.trim().length < 3) {
      setSaveError("The reason must contain at least 3 characters.");
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
      setSuccessMessage("Report status updated successfully.");
    } catch (err) {
      setSaveError(
        err.message || "Unable to update report status."
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
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">
            ADMINISTRATION / OVERVIEW
          </p>

          <h2 id="admin-dashboard-title">
            Report management
          </h2>

          <p className="muted">
            Review community issues and manage their progress.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onRetry}
        >
          Refresh reports
        </button>
      </div>

      <div className="admin-stats">
        <div>
          <span>Total reports</span>
          <strong>{stats.total}</strong>
        </div>

        <div>
          <span>In progress / pending</span>
          <strong>{stats.pending}</strong>
        </div>

        <div>
          <span>Resolved</span>
          <strong>{stats.resolved}</strong>
        </div>

        <div>
          <span>Rejected</span>
          <strong>{stats.rejected}</strong>
        </div>
      </div>

      <div className="admin-controls">
        <label>
          Search reports

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description"
          />
        </label>

        <label>
          Status

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {FILTERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {successMessage && (
        <p className="admin-feedback-success" role="status">
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

          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="muted">
            Showing {visible.length} of {reports.length} reports
          </p>

          {visible.length === 0 ? (
            <div className="state-box">
              No reports match these filters.
            </div>
          ) : (
            <div className="admin-report-list">
              {visible.map((report) => {
                const currentStatus = getStatusLabel(
                  report.currentStatus
                );

                const nextStatuses =
                  NEXT_STATUSES[currentStatus] || [];

                const editing = editingId === report.id;

                return (
                  <article
                    className="admin-report-row"
                    key={report.id}
                  >
                    <div className="admin-report-main">
                      <h3>
                        {report.title || "Untitled report"}
                      </h3>

                      <p>
                        {report.description ||
                          "No description provided."}
                      </p>

                      <small>
                        Reported {formatDate(report.createdAt)}
                      </small>

                      {currentStatus === "In Progress" && (
  <ResolutionEvidenceUpload
    reportId={report.id}
  />
)}

                      {editing && (
                        <form
                          className="admin-status-form"
                          onSubmit={(e) =>
                            submitStatus(e, report.id)
                          }
                        >

                          <h4>Update report status</h4>

                          <label
                            htmlFor={`status-${report.id}`}
                          >
                            New status
                          </label>

                          <select
                            id={`status-${report.id}`}
                            value={selectedStatus}
                            onChange={(e) =>
                              setSelectedStatus(e.target.value)
                            }
                            disabled={saving}
                            required
                          >
                            {STATUS_OPTIONS.filter((option) =>
                              nextStatuses.includes(option.value)
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
                              Resolution evidence must be uploaded
                              before this status can be saved.
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
                            onChange={(e) =>
                              setReason(e.target.value)
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
                            Additional notes (optional)
                          </label>

                          <textarea
                            id={`notes-${report.id}`}
                            rows={2}
                            value={notes}
                            onChange={(e) =>
                              setNotes(e.target.value)
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
                                reason.trim().length < 3 ||
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

                    <div className="admin-report-actions">
                      <span className="admin-status">
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
    </section>
  );
}
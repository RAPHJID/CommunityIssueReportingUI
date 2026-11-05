import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./ReportSupport.css";

// Compact cards load only a count. The detail view additionally loads supporter IDs.
export default function ReportSupport({ reportId, userId, compact = false }) {
  const [count, setCount] = useState(null);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const base = `/ReportLike/${encodeURIComponent(reportId)}`;

    async function load() {
      try {
        if (compact) {
          const result = await apiRequest(`${base}/count`);
          if (!cancelled) setCount(Number(result?.count ?? 0));
        } else {
          const likes = await apiRequest(base);
          if (!Array.isArray(likes)) throw new Error("Unable to read supporters.");
          if (!cancelled) {
            setCount(likes.length);
            setSupported(Boolean(userId) && likes.some(like =>
              String(like.userId).toLowerCase() === String(userId).toLowerCase()
            ));
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Couldn't load community support.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reportId, userId, compact, refreshKey]);

  async function toggleSupport() {
    if (!userId || compact || loading || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/ReportLike/${encodeURIComponent(reportId)}`, {
        method: supported ? "DELETE" : "POST"
      });
      // Fetch fresh authoritative data instead of guessing the final count.
      setRefreshKey(key => key + 1);
    } catch (err) {
      setError(err?.message || "Couldn't update support. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <span className="rs-count" title="Residents supporting this issue">
        <span aria-hidden="true">♡</span> {loading ? "…" : error ? "—" : count ?? 0} supporters
      </span>
    );
  }

  return (
    <section className="rs-panel" aria-label="Community support">
      <div className="rs-copy">
        <span className="rs-kicker">COMMUNITY VOICE</span>
        <h3>Does this issue affect you too?</h3>
        <p>Show that you want this concern addressed. One support per resident.</p>
        <strong className="rs-total" aria-live="polite">{loading ? "Loading supporters…" : `${count ?? "—"} ${count === 1 ? "resident supports" : "residents support"} this issue`}</strong>
      </div>
      <div className="rs-actions">
        {userId ? (
          <button type="button" className={`rs-button ${supported ? "is-supported" : ""}`} onClick={toggleSupport} disabled={loading || busy} aria-pressed={supported}>
            <span aria-hidden="true">{supported ? "♥" : "♡"}</span>
            {busy ? "Updating…" : supported ? "Supporting ✓" : "Support this issue"}
          </button>
        ) : (
          <span className="rs-signin">Sign in to support this issue.</span>
        )}
        {error && <p className="rs-error" role="alert">{error} <button type="button" onClick={() => setRefreshKey(key => key + 1)}>Retry</button></p>}
      </div>
    </section>
  );
}

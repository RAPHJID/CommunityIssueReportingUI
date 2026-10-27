import { useCallback, useEffect, useState } from "react";
import { apiRequest, getMediaUrl } from "../services/api";
import "./ReportGallery.css";

function ReportGallery({ reportId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (!reportId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadPhotos() {
      setLoading(true);
      setError("");
      setPhotos([]);
      setActiveIndex(null);
      setBrokenImages({});
      try {
        const result = await apiRequest(`/Media/report/${encodeURIComponent(reportId)}`);
        if (!Array.isArray(result)) {
          throw new Error("Unexpected response while loading photo evidence.");
        }
        if (!cancelled) {
          setPhotos(result.filter((item) => item && item.filePath && item.mediaType === 0));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load photo evidence.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPhotos();
    return () => { cancelled = true; };
  }, [reportId, reloadKey]);

  const closeLightbox = useCallback(() => setActiveIndex(null), []);
  const showPrevious = useCallback(() => {
    setActiveIndex((index) => index === null ? null : (index - 1 + photos.length) % photos.length);
  }, [photos.length]);
  const showNext = useCallback(() => {
    setActiveIndex((index) => index === null ? null : (index + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft" && photos.length > 1) showPrevious();
      if (event.key === "ArrowRight" && photos.length > 1) showNext();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, closeLightbox, showNext, showPrevious, photos.length]);

  const selectedPhoto = activeIndex === null ? null : photos[activeIndex];
  const originalPhotos = photos.filter(
  (item) => item.purpose === 0
);

const resolutionPhotos = photos.filter(
  (item) => item.purpose === 1
);

const reportAttachments = originalPhotos.length;
const resolutionEvidence = resolutionPhotos.length;

function renderPhotoSection(title, description, sectionPhotos) {
  if (sectionPhotos.length === 0) {
    return (
      <div className="evidence-gallery-empty">
        <p>
          {title === "Resolution Evidence"
            ? "No resolution evidence has been uploaded yet."
            : "No original report photos available."}
        </p>
      </div>
    );
  }

  return (
    <section className="evidence-photo-section">
      <h4>{title}</h4>
      <p className="muted">{description}</p>

      <div className="evidence-gallery-grid">
        {sectionPhotos.map((photo) => {
          const index = photos.indexOf(photo);

          return (
            <button
              className="evidence-gallery-tile"
              type="button"
              key={photo.id || `${photo.filePath}-${index}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${title} photo ${index + 1}`}
            >
              {brokenImages[photo.id || index] ? (
                <span className="evidence-gallery-image-error">
                  Image unavailable
                </span>
              ) : (
                <img
                  src={getMediaUrl(photo.filePath)}
                  alt={`${title} photo`}
                  loading="lazy"
                  onError={() =>
                    setBrokenImages((previous) => ({
                      ...previous,
                      [photo.id || index]: true,
                    }))
                  }
                />
              )}

              <span
                className={`evidence-gallery-tag ${
                  photo.purpose === 1 ? "is-resolution" : ""
                }`}
              >
                {photo.purpose === 1
                  ? "AFTER — RESOLUTION"
                  : "BEFORE — ORIGINAL REPORT"}
              </span>

              <span
                className="evidence-gallery-expand"
                aria-hidden="true"
              >
                ↗
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

  return (
    <section className="evidence-gallery" aria-labelledby="evidence-gallery-title">
      <div className="evidence-gallery-header">
        <div>
          <p className="evidence-gallery-eyebrow">VISUAL DOCUMENTATION</p>
          <h3 id="evidence-gallery-title">Photo evidence</h3>
          <p className="evidence-gallery-subtitle">Images submitted in connection with this community report.</p>
        </div>
        {!loading && !error && <span className="evidence-gallery-count">{photos.length} {photos.length === 1 ? "photo" : "photos"}</span>}
      </div>

      {loading ? (
        <div className="evidence-gallery-state" role="status">Loading photo evidence...</div>
      ) : error ? (
        <div className="evidence-gallery-state" role="alert">
          <p>We couldn't load the photos.</p>
          <p className="evidence-gallery-error-detail">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
        </div>
      ) : photos.length === 0 ? (
        <div className="evidence-gallery-empty">
          <span className="evidence-gallery-empty-icon" aria-hidden="true">▧</span>
          <strong>No photos attached yet</strong>
          <p>This report doesn't have any photo evidence at the moment.</p>
        </div>
      ) : (
        <>
          <div className="evidence-gallery-summary">
            {reportAttachments > 0 && <span><span className="evidence-gallery-dot" /> {reportAttachments} original {reportAttachments === 1 ? "photo" : "photos"}</span>}
            {resolutionEvidence > 0 && <span><span className="evidence-gallery-dot is-resolution" /> {resolutionEvidence} resolution {resolutionEvidence === 1 ? "photo" : "photos"}</span>}
          </div>
          <div className="evidence-before-after">
  {renderPhotoSection(
    "Original Report Photos",
    "BEFORE — Photos submitted when the issue was reported.",
    originalPhotos
  )}

  {renderPhotoSection(
    "Resolution Evidence",
    "AFTER — Photos showing the work completed.",
    resolutionPhotos
  )}
</div>
          <p className="evidence-gallery-footnote">Select a photo to view it in full size.</p>
        </>
      )}

      {selectedPhoto && (
        <div className="evidence-lightbox" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}>
          <div className="evidence-lightbox-content" role="dialog" aria-modal="true" aria-label="Photo evidence viewer">
            <div className="evidence-lightbox-topbar">
              <div>
                <strong>Photo evidence</strong>
                <span>{activeIndex + 1} of {photos.length} · {selectedPhoto.purpose === 1 ? "Resolution evidence" : "Report evidence"}</span>
              </div>
              <button type="button" className="evidence-lightbox-close" onClick={closeLightbox} aria-label="Close photo viewer">×</button>
            </div>
            <div className="evidence-lightbox-stage">
              {photos.length > 1 && <button type="button" className="evidence-lightbox-nav" onClick={showPrevious} aria-label="Previous photo">‹</button>}
              <img src={getMediaUrl(selectedPhoto.filePath)} alt={`Enlarged evidence photo ${activeIndex + 1}`} />
              {photos.length > 1 && <button type="button" className="evidence-lightbox-nav" onClick={showNext} aria-label="Next photo">›</button>}
            </div>
            <div className="evidence-lightbox-footer">Submitted evidence · {selectedPhoto.createdAt ? new Date(selectedPhoto.createdAt).toLocaleDateString() : "Date unavailable"}</div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReportGallery;

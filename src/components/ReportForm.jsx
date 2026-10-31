import { useEffect, useState } from "react";
import { apiRequest, uploadReportPhoto } from "../services/api";
import PhotoUploader from "./PhotoUploader";
import LocationPicker from "./LocationPicker";

function getOptionId(item) {
  return item?.id ?? item?.categoryId ?? item?.locationId ?? "";
}

function getOptionName(item) {
  return (
    item?.name ??
    item?.categoryName ??
    item?.locationName ??
    item?.description ??
    ""
  );
}

function isOtherCategory(name) {
  return /\b(other|general|miscellaneous)\b/i.test(name || "");
}

function getCategoryIcon(name) {
  const value = (name || "").toLowerCase();

  if (/road|pothole|transport|drainage/.test(value)) return "🛣️";
  if (/water|pipe|supply/.test(value)) return "💧";
  if (/garbage|waste|sanitation|sewage/.test(value)) return "♻️";
  if (/light|electric|power/.test(value)) return "💡";
  if (/health|hospital|clinic/.test(value)) return "🏥";
  if (/school|education/.test(value)) return "🏫";
  if (/security|safety|crime/.test(value)) return "🛡️";
  if (/environment|tree|pollution/.test(value)) return "🌱";
  if (isOtherCategory(value)) return "❓";

  return "📍";
}

export default function ReportForm({
  onReportCreated,
  onCancel,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [mapPoint, setMapPoint] = useState(null);
  const [wardId, setWardId] = useState("");
  const [locationDescription, setLocationDescription] =
    useState("");

  const [createdPinId, setCreatedPinId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [savedReportId, setSavedReportId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submissionModal, setSubmissionModal] = useState(null);

  const selectedCategory = categories.find(
    (category) =>
      String(getOptionId(category)) === String(categoryId)
  );

  const selectedCategoryIsOther = isOtherCategory(
    getOptionName(selectedCategory)
  );

  function showModal(type, titleText, message) {
    setSubmissionModal({
      type,
      title: titleText,
      message,
    });
  }

  function showSubmissionError(message) {
    setSubmitError(message);

    showModal(
      "error",
      "Something went wrong",
      message
    );
  }

  function closeModal() {
    setSubmissionModal(null);
  }

  // LOAD CATEGORIES AND AUTOMATIC NDENDERU WARD

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");

      try {
        const [categoryData, wardData] = await Promise.all([
          apiRequest("/Category"),
          apiRequest("/Ward"),
        ]);

        if (!Array.isArray(categoryData)) {
          throw new Error("Invalid categories response.");
        }

        if (!Array.isArray(wardData)) {
          throw new Error("Invalid wards response.");
        }

        const ndenderu = wardData.filter((ward) =>
          /^ndenderu(?:\s+ward)?$/i.test(
            String(
              ward.name ?? ward.wardName ?? ""
            ).trim()
          )
        );

        if (ndenderu.length !== 1 || !ndenderu[0].id) {
          throw new Error(
            "Ndenderu Ward could not be identified. " +
            "Please contact the administrator."
          );
        }

        if (!cancelled) {
          setCategories(categoryData);
          setWardId(String(ndenderu[0].id));
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error.message ||
            "Unable to load the report form."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // SUBMIT REPORT AND UPLOAD PHOTOS

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setSubmitError("");
    setSubmissionModal(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!savedReportId) {
      if (
        cleanTitle.length < 5 ||
        cleanTitle.length > 255
      ) {
        showSubmissionError(
          "The report title must contain between 5 and 255 characters."
        );
        return;
      }

      if (
        cleanDescription.length < 10 ||
        cleanDescription.length > 2000
      ) {
        showSubmissionError(
          "The description must contain between 10 and 2,000 characters."
        );
        return;
      }

      if (!categoryId) {
        showSubmissionError(
          "Please select the category that best describes your issue."
        );
        return;
      }

      if (!wardId) {
        showSubmissionError(
          "Ndenderu Ward is not available. " +
          "Please refresh the page and try again."
        );
        return;
      }

      if (!mapPoint) {
        showSubmissionError(
          "Please select the exact issue location on the map."
        );
        return;
      }
    }

    setIsSubmitting(true);

    let reportId = savedReportId;

    try {
      if (!reportId) {
        let finalLocationId = createdPinId;

        // Save selected map coordinates first.

        if (!finalLocationId) {
          const pin = await apiRequest(
            "/Location/report-pin",
            {
              method: "POST",
              body: JSON.stringify({
                latitude: mapPoint.latitude,
                longitude: mapPoint.longitude,
                accuracyMeters:
                  mapPoint.accuracyMeters ?? null,
                wardId,
                areaId: null,
                description:
                  locationDescription.trim() || null,
              }),
            }
          );

          if (!pin?.id) {
            throw new Error(
              "The selected location could not be saved. Please try again."
            );
          }

          finalLocationId = pin.id;
          setCreatedPinId(pin.id);
        }

        // Create the actual report.

        const createdReport = await apiRequest(
          "/Report",
          {
            method: "POST",
            body: JSON.stringify({
              title: cleanTitle,
              description: cleanDescription,
              categoryId,
              locationId: finalLocationId,
            }),
          }
        );

        if (!createdReport?.id) {
          throw new Error(
            "The server did not return a report ID. " +
            "Please check your reports before submitting again."
          );
        }

        reportId = createdReport.id;
        setSavedReportId(reportId);
      }

      // Upload photos one at a time.
      // Keep only failed photos for retry.

      const failedPhotos = [];

      for (const photo of photos) {
        try {
          await uploadReportPhoto(reportId, photo);
        } catch (uploadError) {
          console.error(
            "Photo upload failed:",
            uploadError
          );

          failedPhotos.push(photo);
        }
      }

      if (failedPhotos.length > 0) {
        setPhotos(failedPhotos);

        const message =
          `Your report was saved successfully, but ` +
          `${failedPhotos.length} photo(s) could not be ` +
          `confirmed as uploaded. Check the report first ` +
          `to avoid duplicate images, then retry if needed.`;

        setSubmitError(message);

        showModal(
          "warning",
          "Report saved — photos need attention",
          message
        );
      } else {
        // Everything succeeded.
        // Reset form for another report.

        setSavedReportId(null);
        setCreatedPinId(null);
        setTitle("");
        setDescription("");
        setCategoryId("");
        setMapPoint(null);
        setLocationDescription("");
        setPhotos([]);
        setSubmitError("");

        showModal(
          "success",
          "Your voice has been heard!",
          "Your community report has been submitted " +
          "successfully. Thank you for helping make " +
          "Ndenderu Ward a better place."
        );
      }

      if (onReportCreated) {
        try {
          await onReportCreated();
        } catch (refreshError) {
          console.error(
            "Unable to refresh reports:",
            refreshError
          );
        }
      }
    } catch (error) {
      showSubmissionError(
        error.message ||
        "Unable to submit your report. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className="report-form-panel"
      aria-labelledby="report-form-title"
    >
      {/* SUBMISSION FEEDBACK POPUP */}

      {submissionModal && (
        <div
          className="report-feedback-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className={
              `report-feedback-dialog ` +
              `report-feedback-${submissionModal.type}`
            }
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="report-feedback-title"
            aria-describedby="report-feedback-message"
          >
            <button
              type="button"
              className="report-feedback-close"
              aria-label="Close notification"
              onClick={closeModal}
            >
              ×
            </button>

            <div
              className="report-feedback-icon"
              aria-hidden="true"
            >
              {submissionModal.type === "success"
                ? "✓"
                : submissionModal.type === "warning"
                  ? "!"
                  : "×"}
            </div>

            <span className="report-feedback-eyebrow">
              NDENDERU COMMUNITY
            </span>

            <h2 id="report-feedback-title">
              {submissionModal.title}
            </h2>

            <p id="report-feedback-message">
              {submissionModal.message}
            </p>

            <button
              type="button"
              className="report-feedback-action"
              onClick={closeModal}
            >
              {submissionModal.type === "success"
                ? "Awesome, thank you!"
                : submissionModal.type === "warning"
                  ? "Review and retry"
                  : "Try again"}
            </button>
          </div>
        </div>
      )}

      {/* VISUAL SIDEBAR */}

      <div className="report-form-visual">
        <div
          className="report-form-brand"
          aria-hidden="true"
        >
          <span>W</span>
          <i />
        </div>

        <p className="report-form-kicker">
          COMMUNITY · ACTION · CHANGE
        </p>

        <h2 className="report-form-visual-heading">
          See an issue?
          <br />
          <span>Make it visible.</span>
        </h2>

        <p className="report-form-visual-copy">
          Every useful report starts with a clear
          description and the right location.
          Help your community understand what
          needs attention.
        </p>

        <div
          className="report-form-illustration"
          aria-hidden="true"
        >
          <div className="report-form-ring ring-one" />
          <div className="report-form-ring ring-two" />
          <div className="report-form-ring ring-three" />

          <div className="report-form-illustration-core">
            +
          </div>

          <span className="report-form-orbit-dot dot-one" />
          <span className="report-form-orbit-dot dot-two" />
          <span className="report-form-orbit-dot dot-three" />
        </div>

        <div className="report-form-visual-footer">
          <span />
          A better community begins with being heard.
        </div>
      </div>

      {/* FORM CONTENT */}

      <div className="report-form-content">
        <div className="report-form-topline">
          <span className="report-form-step">
            01 / NEW REPORT
          </span>

          <button
            type="button"
            className="report-form-close"
            onClick={onCancel}
            aria-label="Close report form"
          >
            ×
          </button>
        </div>

        <div className="report-form-intro">
          <p className="report-form-overline">
            YOUR VOICE MATTERS
          </p>

          <h2 id="report-form-title">
            Report an issue<span>.</span>
          </h2>

          <p>
            Tell us what is happening and where
            the community needs attention.
          </p>
        </div>

        {/* LOADING ERROR */}

        {optionsError && (
          <div
            className="report-form-error"
            role="alert"
          >
            <p>{optionsError}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        )}

        <form
          className="report-form-fields"
          onSubmit={handleSubmit}
        >
          {/* TITLE */}

          <div className="report-form-field">
            <div className="report-form-label-row">
              <label htmlFor="report-title">
                Report title
              </label>

              <span>{title.length}/255</span>
            </div>

            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Damaged road near the market"
              minLength={5}
              maxLength={255}
              required
              disabled={
                isSubmitting ||
                Boolean(savedReportId)
              }
            />

            <p className="report-form-hint">
              Summarise the issue in one clear sentence.
            </p>
          </div>

          {/* DESCRIPTION */}

          <div className="report-form-field">
            <div className="report-form-label-row">
              <label htmlFor="report-description">
                What happened?
              </label>

              <span>{description.length}/2000</span>
            </div>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder={
                "Describe the problem, its impact, " +
                "and any useful details..."
              }
              minLength={10}
              maxLength={2000}
              rows={4}
              required
              disabled={
                isSubmitting ||
                Boolean(savedReportId)
              }
            />

            <p className="report-form-hint">
              Include enough detail to help others
              understand the issue.
            </p>
          </div>

          {/* CATEGORY CARDS */}

          <div className="report-form-field">
            <div className="report-category-heading">
              <div>
                <h3 id="report-category-heading">
                  What type of issue is this?
                </h3>

                <p>
                  Choose the category that best
                  describes the problem.
                </p>
              </div>

              <span className="report-category-required">
                Required
              </span>
            </div>

            {loadingOptions ? (
              <p
                className="report-form-hint"
                role="status"
              >
                Loading issue categories...
              </p>
            ) : categories.length === 0 ? (
              <p className="report-form-hint">
                No categories are available yet.
                Please contact the administrator.
              </p>
            ) : (
              <div
                className="report-category-grid"
                role="radiogroup"
                aria-labelledby="report-category-heading"
                aria-required="true"
              >
                {categories
                  .filter((category) => {
                    const id = getOptionId(category);
                    const name = getOptionName(category);

                    return Boolean(id && name);
                  })
                  .map((category) => {
                    const id = String(
                      getOptionId(category)
                    );

                    const name =
                      getOptionName(category);

                    const categoryDescription =
                      category.description ||
                      (isOtherCategory(name)
                        ? "For issues that do not fit another category."
                        : "Select this category if it matches your issue.");

                    const selected =
                      String(categoryId) === id;

                    return (
                      <label
                        key={id}
                        className={
                          `report-category-card ` +
                          `${selected ? "is-selected" : ""} ` +
                          `${
                            isSubmitting || savedReportId
                              ? "is-disabled"
                              : ""
                          }`
                        }
                      >
                        <input
                          type="radio"
                          name="report-category"
                          value={id}
                          checked={selected}
                          onChange={() =>
                            setCategoryId(id)
                          }
                          disabled={
                            isSubmitting ||
                            Boolean(savedReportId)
                          }
                          required
                        />

                        <span
                          className="report-category-card-icon"
                          aria-hidden="true"
                        >
                          {getCategoryIcon(name)}
                        </span>

                        <span className="report-category-card-name">
                          {name}
                        </span>

                        <span className="report-category-card-description">
                          {categoryDescription}
                        </span>

                        <span
                          className="report-category-card-check"
                          aria-hidden="true"
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </label>
                    );
                  })}
              </div>
            )}

            {selectedCategoryIsOther && (
              <div className="report-category-other-help">
                <strong>
                  Can't find your issue in the list?
                </strong>

                <p>
                  No problem. Use this category and
                  explain the problem clearly in the
                  description above. The administrator
                  can review it and introduce new
                  categories later.
                </p>
              </div>
            )}

            <p className="report-form-hint">
              Categories help residents and administrators
              find similar community issues.
            </p>
          </div>

          {/* LOCATION PICKER */}

          <div className="report-form-field">
            <h3>Choose the issue location</h3>

            <p className="report-form-hint">
              Reporting is currently available only
              inside Ndenderu Ward.
              Use your GPS, search for an area,
              or click the exact location on the map.
            </p>

            {!wardId && !loadingOptions && (
              <p
                className="report-form-error"
                role="alert"
              >
                Ndenderu Ward could not be identified.
                Please contact the administrator.
              </p>
            )}

            <LocationPicker
              point={mapPoint}
              onChange={(nextPoint) => {
                setMapPoint(nextPoint);
                setCreatedPinId(null);
              }}
              disabled={
                isSubmitting ||
                Boolean(savedReportId) ||
                !wardId
              }
            />

            <label
              htmlFor="pin-description"
              style={{
                display: "block",
                marginTop: 12,
              }}
            >
              Nearby landmark (optional)
            </label>

            <input
              id="pin-description"
              value={locationDescription}
              onChange={(event) => {
                setLocationDescription(
                  event.target.value
                );

                setCreatedPinId(null);
              }}
              maxLength={500}
              placeholder="e.g. Near the market entrance"
              disabled={
                isSubmitting ||
                Boolean(savedReportId)
              }
            />
          </div>

          {/* PHOTO UPLOAD */}

          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            disabled={isSubmitting}
          />

          {/* INLINE ERROR */}

          {submitError && (
            <div
              className="report-form-error"
              role="alert"
            >
              <span aria-hidden="true">!</span>
              <p>{submitError}</p>
            </div>
          )}

          {/* SUBMIT BUTTON */}

          <button
            className="report-form-submit"
            type="submit"
            disabled={
              isSubmitting ||
              loadingOptions ||
              Boolean(optionsError)
            }
          >
            <span>
              {isSubmitting
                ? "Saving report and photos..."
                : savedReportId
                  ? "Retry remaining photos"
                  : "Submit community report"}
            </span>

            {!isSubmitting && (
              <span
                className="report-form-submit-arrow"
                aria-hidden="true"
              >
                →
              </span>
            )}
          </button>

          <p className="report-form-note">
            <span aria-hidden="true">◆</span>
            Your report will be recorded under
            your account and shared through
            the community reporting platform.
          </p>
        </form>
      </div>
    </section>
  );
}
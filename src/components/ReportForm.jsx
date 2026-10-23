
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


function ReportForm({ onReportCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationMode, setLocationMode] = useState("existing");
  const [mapPoint, setMapPoint] = useState(null);
  const [wardId, setWardId] = useState("");
  const [wards, setWards] = useState([]);
  const [locationDescription, setLocationDescription] = useState("");
  const [createdPinId, setCreatedPinId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [savedReportId, setSavedReportId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");

      try {
        const [categoryData, locationData] = await Promise.all([
          apiRequest("/Category"),
          apiRequest("/Location"),
        ]);

        if (!Array.isArray(categoryData) || !Array.isArray(locationData)) {
          throw new Error(
            "The server returned an unexpected category or location response."
          );
        }

        if (cancelled) return;

        setCategories(categoryData);
        setLocations(locationData);
        try {
          const wardData = await apiRequest("/Ward");
          if (!cancelled && Array.isArray(wardData)) setWards(wardData);
        } catch (wardError) { console.error("Unable to load wards:", wardError); }
      } catch (err) {
        if (!cancelled) {
          setOptionsError(
            err.message || "Unable to load categories and locations."
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    setSuccessMessage("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!savedReportId) {
      if (cleanTitle.length < 5 || cleanTitle.length > 255) {
        setSubmitError("The title must be between 5 and 255 characters.");
        return;
      }

      if (cleanDescription.length < 10 || cleanDescription.length > 2000) {
        setSubmitError("The description must be between 10 and 2,000 characters.");
        return;
      }

      if (!categoryId || (locationMode === "existing" ? !locationId : (!mapPoint || !wardId))) {
        setSubmitError(locationMode === "existing" ? "Please select both a category and a location." : "Please select a category, ward, and a point on the map.");
        return;
      }
    }

    setIsSubmitting(true);
    let reportId = savedReportId;

    try {
      if (!reportId) {
        let finalLocationId = locationId;
        if (locationMode === "map") {
          finalLocationId = createdPinId;
          if (!finalLocationId) {
            const pin = await apiRequest("/Location/report-pin", {
              method: "POST",
              body: JSON.stringify({
                latitude: mapPoint.latitude,
                longitude: mapPoint.longitude,
                accuracyMeters: mapPoint.accuracyMeters,
                wardId, areaId: null, description: locationDescription.trim() || null
              })
            });
            if (!pin?.id) throw new Error("Location was not saved. Please retry.");
            finalLocationId = pin.id;
            setCreatedPinId(pin.id);
          }
        }
        const createdReport = await apiRequest("/Report", {
          method: "POST",
          body: JSON.stringify({
            title: cleanTitle,
            description: cleanDescription,
            categoryId,
            locationId: finalLocationId,
          }),
        });

        if (!createdReport?.id) {
          throw new Error(
            "The server did not return a report ID. Check your reports before trying again."
          );
        }

        reportId = createdReport.id;
        setSavedReportId(reportId);
      }

      const failedPhotos = [];
      for (const photo of photos) {
        try {
          await uploadReportPhoto(reportId, photo);
        } catch (uploadError) {
          console.error("Photo upload failed:", uploadError);
          failedPhotos.push(photo);
        }
      }

      if (failedPhotos.length) {
        setPhotos(failedPhotos);
        setSubmitError(
          `Report saved, but ${failedPhotos.length} photo(s) could not be confirmed as uploaded. You can retry the remaining photos, but check the report first to avoid duplicate images.`
        );
        setSuccessMessage("Your community report was created successfully.");
      } else {
        setSavedReportId(null);
        setPhotos([]);
        setTitle("");
        setDescription("");
        setCategoryId("");
        setLocationId("");
        setCreatedPinId(null);
        setMapPoint(null);
        setWardId("");
        setLocationDescription("");
        setLocationMode("existing");
        setSuccessMessage("Your report and photos were submitted successfully.");
      }

      if (onReportCreated) {
        try {
          await onReportCreated();
        } catch (refreshError) {
          console.error("Unable to refresh reports:", refreshError);
        }
      }
    } catch (err) {
      setSubmitError(err.message || "Unable to submit your report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="report-form-panel" aria-labelledby="report-form-title">
      <div className="report-form-visual">
        <div className="report-form-brand" aria-hidden="true">
          <span>W</span>
          <i />
        </div>

        <p className="report-form-kicker">COMMUNITY · ACTION · CHANGE</p>

        <h2 className="report-form-visual-heading">
          See an issue?
          <br />
          <span>Make it visible.</span>
        </h2>

        <p className="report-form-visual-copy">
          Every useful report starts with a clear description and the right
          location. Help your community understand what needs attention.
        </p>

        <div className="report-form-illustration" aria-hidden="true">
          <div className="report-form-ring ring-one" />
          <div className="report-form-ring ring-two" />
          <div className="report-form-ring ring-three" />
          <div className="report-form-illustration-core">+</div>
          <span className="report-form-orbit-dot dot-one" />
          <span className="report-form-orbit-dot dot-two" />
          <span className="report-form-orbit-dot dot-three" />
        </div>

        <div className="report-form-visual-footer">
          <span />
          A better community begins with being heard.
        </div>
      </div>

      <div className="report-form-content">
        <div className="report-form-topline">
          <span className="report-form-step">01 / NEW REPORT</span>

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
          <p className="report-form-overline">YOUR VOICE MATTERS</p>
          <h2 id="report-form-title">
            Report an issue<span>.</span>
          </h2>
          <p>
            Tell us what is happening and where the community needs attention.
          </p>
        </div>

        {successMessage && (
          <div className="report-form-success" role="status">
            <span aria-hidden="true">✓</span>
            <p>{successMessage}</p>
          </div>
        )}

        {optionsError && (
          <div className="report-form-error" role="alert">
            <p>{optionsError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        )}

        <form className="report-form-fields" onSubmit={handleSubmit}>
          <div className="report-form-field">
            <div className="report-form-label-row">
              <label htmlFor="report-title">Report title</label>
              <span>{title.length}/255</span>
            </div>

            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Damaged road near the market"
              minLength={5}
              maxLength={255}
              required
              disabled={isSubmitting || Boolean(savedReportId)}
            />
            <p className="report-form-hint">
              Summarise the issue in one clear sentence.
            </p>
          </div>

          <div className="report-form-field">
            <div className="report-form-label-row">
              <label htmlFor="report-description">What happened?</label>
              <span>{description.length}/2000</span>
            </div>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the problem, its impact, and any useful details..."
              minLength={10}
              maxLength={2000}
              rows={4}
              required
              disabled={isSubmitting || Boolean(savedReportId)}
            />
            <p className="report-form-hint">
              Include enough detail to help others understand the issue.
            </p>
          </div>

          <div className="report-form-field">
            <label htmlFor="report-category">Issue category</label>

            <div className="report-form-select-wrap">
              <select
                id="report-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                disabled={loadingOptions || isSubmitting || Boolean(savedReportId)}
              >
                <option value="">
                  {loadingOptions ? "Loading categories..." : "Choose a category"}
                </option>

                {categories.map((category) => {
                  const id = getOptionId(category);
                  const name = getOptionName(category);

                  return id && name ? (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ) : null;
                })}
              </select>
            </div>
          </div>

          <div className="report-form-field">
            <label htmlFor="location-mode">How would you like to choose the issue location?</label>
            <select id="location-mode" value={locationMode} onChange={(e) => { setLocationMode(e.target.value); setCreatedPinId(null); }} disabled={isSubmitting || Boolean(savedReportId)}>
              <option value="existing">Choose an existing location</option>
              <option value="map">Pin the location on a map</option>
            </select>
            {locationMode === "existing" ? (
              <div className="report-form-select-wrap">
                <select id="report-location" value={locationId} onChange={(e) => setLocationId(e.target.value)} required disabled={loadingOptions || isSubmitting || Boolean(savedReportId)}>
                  <option value="">{loadingOptions ? "Loading locations..." : "Choose a location"}</option>
                  {locations.map((location) => {
                    const id = getOptionId(location);
                    const name = getOptionName(location);
                    return id && name ? <option key={id} value={id}>{name}</option> : null;
                  })}
                </select>
              </div>
            ) : (
              <>
                <label htmlFor="report-ward" style={{display:"block", marginTop:12}}>Ward</label>
                <select id="report-ward" value={wardId} onChange={(e) => { setWardId(e.target.value); setCreatedPinId(null); }} required disabled={isSubmitting || Boolean(savedReportId)}>
                  <option value="">Select the ward</option>
                  {wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name ?? ward.wardName ?? ward.description ?? ward.id}</option>)}
                </select>
                {wards.length === 0 && <p className="report-form-hint">No wards loaded. Confirm your API exposes GET /api/Ward.</p>}
                <LocationPicker point={mapPoint} onChange={(point) => { setMapPoint(point); setCreatedPinId(null); }} disabled={isSubmitting || Boolean(savedReportId)} />
                <label htmlFor="pin-description" style={{display:"block", marginTop:12}}>Nearby landmark (optional)</label>
                <input id="pin-description" value={locationDescription} onChange={(e) => { setLocationDescription(e.target.value); setCreatedPinId(null); }} maxLength={500} placeholder="e.g. Near the market entrance" disabled={isSubmitting || Boolean(savedReportId)} />
                <p className="report-form-hint">Select the correct ward manually. The map pin does not verify ward boundaries.</p>
              </>
            )}
          </div>

          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            disabled={isSubmitting}
          />

          {submitError && (
            <div className="report-form-error" role="alert">
              <span aria-hidden="true">!</span>
              <p>{submitError}</p>
            </div>
          )}

          <button
            className="report-form-submit"
            type="submit"
            disabled={isSubmitting || loadingOptions || Boolean(optionsError)}
          >
            <span>
              {isSubmitting ? "Saving report and photos..." : savedReportId ? "Retry remaining photos" : "Submit community report"}
            </span>
            {!isSubmitting && (
              <span className="report-form-submit-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>

          <p className="report-form-note">
            <span aria-hidden="true">◆</span>
            Your report will be recorded under your account and shared through
            the community reporting platform.
          </p>
        </form>
      </div>
    </section>
  );
}

export default ReportForm;

import { useEffect, useState } from "react";
import { uploadResolutionEvidence } from "../services/api";
import "./ResolutionEvidenceUpload.css";

export default function ResolutionEvidenceUpload({
  reportId,
  onUploaded,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
    setError("");
    setSuccess("");
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a photo first.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await uploadResolutionEvidence(reportId, file);

      setSuccess("Resolution evidence uploaded successfully.");
      setFile(null);

      if (onUploaded) {
        await onUploaded();
      }
    } catch (err) {
      setError(err.message || "Unable to upload resolution evidence.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="resolution-upload">
      <h3>Upload resolution evidence</h3>

      <p className="muted">
        Upload a photo showing that work has been completed
        or that the reported issue has been addressed.
      </p>

      <form onSubmit={handleUpload}>
        <label htmlFor="resolution-photo">
          Resolution photo
        </label>

        <input
          id="resolution-photo"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {previewUrl && (
          <div className="resolution-preview">
            <img
              src={previewUrl}
              alt="Selected resolution evidence preview"
            />
          </div>
        )}

        {error && (
          <p className="resolution-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="resolution-success" role="status">
            {success}
          </p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={!file || uploading}
        >
          {uploading ? "Uploading..." : "Upload evidence"}
        </button>
      </form>
    </section>
  );
}
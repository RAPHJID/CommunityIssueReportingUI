
import { useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

function PhotoUploader({
  photos,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const nextPreviews = photos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [photos]);

  function addFiles(fileList) {
    if (disabled) return;

    setError("");

    const incoming = Array.from(fileList);

    if (photos.length + incoming.length > MAX_PHOTOS) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_EXTENSIONS.test(file.name)) {
        setError(
          "Only JPG, JPEG, PNG and WEBP images are supported."
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `"${file.name}" exceeds the 5 MB limit.`
        );
        return;
      }

      if (file.size === 0) {
        setError("Empty files cannot be uploaded.");
        return;
      }
    }

    onChange([...photos, ...incoming]);
  }

  function removePhoto(index) {
    if (disabled) return;

    onChange(photos.filter((_, i) => i !== index));
    setError("");
  }

  return (
    <section className="photo-uploader">
      <div className="photo-uploader-heading">
        <div>
          <span className="photo-uploader-eyebrow">
            VISUAL EVIDENCE
          </span>
          <h3>Add supporting photos</h3>
          <p>
            Show the issue clearly so the community
            can understand what needs attention.
          </p>
        </div>

        <span className="photo-uploader-counter">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <div
        className={`photo-uploader-dropzone ${
          isDragging ? "is-dragging" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="photo-uploader-icon" aria-hidden="true">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>

        <strong>Every picture tells the story.</strong>
        <p>Drag photos here or choose them from your device.</p>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          hidden
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          className="photo-uploader-choose"
          disabled={disabled || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          + Choose photos
        </button>

        <span className="photo-uploader-limit">
          JPG, PNG, WEBP · Maximum 5 MB per photo
        </span>
      </div>

      {error && (
        <p className="photo-uploader-error" role="alert">
          {error}
        </p>
      )}

      {previews.length > 0 && (
        <div className="photo-uploader-previews">
          {previews.map((item, index) => (
            <div
              className="photo-uploader-preview"
              key={item.url}
            >
              <img
                src={item.url}
                alt={`Selected evidence ${index + 1}`}
              />

              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                disabled={disabled}
                onClick={() => removePhoto(index)}
              >
                ×
              </button>

              <span>PHOTO {index + 1}</span>
            </div>
          ))}
        </div>
      )}

      <p className="photo-uploader-privacy">
        Avoid including faces, identification documents,
        or private information in public evidence photos.
      </p>
    </section>
  );
}

export default PhotoUploader;

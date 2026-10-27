
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) return null;

  return response.json();
}

export async function uploadReportPhoto(reportId, file) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please sign in before uploading photos.");
  }

  const formData = new FormData();
  formData.append("File", file);
  formData.append("Purpose", "0");

  const response = await fetch(
    `${API_BASE_URL}/Media?reportId=${encodeURIComponent(reportId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `Photo upload failed (${response.status}).`
    );
  }

  return response.json();
}

export function getMediaUrl(filePath) {
  if (!filePath) return "";

  const apiOrigin = new URL(API_BASE_URL).origin;
  return new URL(filePath, apiOrigin).href;
}

export async function uploadResolutionEvidence(reportId, file) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please sign in as an administrator.");
  }

  if (!file) {
    throw new Error("Please select a photo.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP photos are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The maximum photo size is 5 MB.");
  }

  const formData = new FormData();

  formData.append("File", file);
  formData.append("Purpose", "1");

  const response = await fetch(
    `${API_BASE_URL}/Media?reportId=${encodeURIComponent(reportId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      errorText || `Evidence upload failed (${response.status}).`
    );
  }

  return response.json();
}
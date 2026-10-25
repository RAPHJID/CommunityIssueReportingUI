// UI convenience only. Backend authorization remains mandatory.
function decodeJwtPayload(token) {
  try {
    const segment = token?.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
  } catch { return null; }
}

export function isAdminUser(user) {
  if (!user) return false;
  const payload = decodeJwtPayload(user.token || localStorage.getItem("token"));
  const keys = ["role", "roles", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  const values = [...keys.flatMap(k => [user[k], user.user?.[k], payload?.[k]])];
  return values.some(v => (Array.isArray(v) ? v : [v]).some(role => typeof role === "string" && role.toLowerCase() === "admin"));
}

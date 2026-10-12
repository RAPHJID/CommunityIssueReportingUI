import { useEffect, useState } from "react";
import { apiRequest } from "./services/api";

function App() {
const [reports, setReports] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
async function loadReports() {
try {
const data = await apiRequest("/Report");
setReports(data);
} catch (err) {
setError(err.message || "Failed to connect to the API.");
} finally {
setLoading(false);
}
}

loadReports();

}, []);

return (
<main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}> <h1>Community Issue Reporting</h1> <p>React + ASP.NET Core API connection test</p>

  {loading && <p>Loading reports...</p>}

  {error && (
    <div>
      <h2>Connection failed</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      <p>Check that the API is running and CORS is configured.</p>
    </div>
  )}

  {!loading && !error && (
    <section>
      <h2>Reports from the API</h2>
      <p>Total reports: {reports.length}</p>

      {reports.length === 0 ? (
        <p>Connected successfully. No reports exist yet.</p>
      ) : (
        reports.map((report) => (
          <article
            key={report.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <h3>{report.title}</h3>
            <p>{report.description}</p>
            <p>Status: {report.currentStatus}</p>
          </article>
        ))
      )}
    </section>
  )}
</main>


);
}

export default App;

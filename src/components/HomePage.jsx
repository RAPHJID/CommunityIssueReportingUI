import "./HomePage.css";

const steps = [
  { number: "01", title: "Spot a problem", description: "A broken road, water shortage, waste problem, or another issue in your neighborhood." },
  { number: "02", title: "Put it on the map", description: "Submit the details and location so the issue can be seen and understood." },
  { number: "03", title: "Follow the journey", description: "See updates as reports move from submission to review and resolution." },
];
const terminal = new Set(["Resolved", "Rejected", "Duplicate", "Out of Jurisdiction"]);

export default function HomePage({ reports = [], loading = false, getStatusLabel, onExplore, onReport, onOpenReport }) {
  const resolved = reports.filter(r => getStatusLabel(r.currentStatus) === "Resolved").length;
  const active = reports.filter(r => !terminal.has(getStatusLabel(r.currentStatus))).length;
  const recent = [...reports].sort((a,b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)).slice(0,3);
  return (
    <div className="cc-home" id="home">
      <section className="cc-hero">
        <div className="cc-hero-glow" aria-hidden="true" />
        <div className="container cc-hero-grid">
          <div className="cc-hero-copy">
            <div className="cc-pill"><span className="cc-live-dot"/> A NEW WAY TO BE HEARD · NDENDERU WARD</div>
            <h1>Our community.<br/><em>Our voice.</em><br/>Our future.</h1>
            <p>Every street has a story. Every concern deserves to be seen. Discover a simpler way to raise local issues and follow their progress — together.</p>
            <div className="cc-hero-actions">
              <button type="button" className="cc-button cc-button-lime" onClick={onReport}>Report an issue <span>↗</span></button>
              <button type="button" className="cc-button cc-button-outline" onClick={onExplore}>Explore community issues <span>→</span></button>
            </div>
            <div className="cc-hero-foot"><span className="cc-hero-line"/> Built for the people of Ndenderu <span className="cc-hero-star">✳</span> A community pilot</div>
          </div>
          <div className="cc-hero-art" aria-label="Illustration of a connected community">
            <div className="cc-art-ring cc-ring-outer"/><div className="cc-art-ring cc-ring-mid"/><div className="cc-art-ring cc-ring-inner"/>
            <div className="cc-art-center"><span>NDENDERU</span><strong>We all<br/>belong here.</strong><small>KIAMBU COUNTY · KENYA</small></div>
            <div className="cc-orbit-chip cc-chip-one"><span>●</span> Better roads</div>
            <div className="cc-orbit-chip cc-chip-two"><span>●</span> Clean neighborhoods</div>
            <div className="cc-orbit-chip cc-chip-three"><span>●</span> Reliable services</div>
            <div className="cc-art-corner">01 / A MORE CONNECTED WARD</div>
          </div>
        </div>
        <div className="cc-hero-bottom"><div className="container"><span>THE FUTURE OF LOCAL PARTICIPATION</span><span>SCROLL TO DISCOVER ↓</span></div></div>
      </section>
      <section className="cc-metrics container" aria-label="Live report statistics">
        <div className="cc-metrics-heading"><span className="cc-section-kicker">A CLEARER PICTURE</span><strong>What's happening in our ward</strong><small>Live figures from community reports</small></div>
        <div className="cc-metric"><span>01 / TOTAL REPORTS</span><strong>{loading ? "—" : reports.length.toLocaleString()}</strong><small>Issues brought forward</small></div>
        <div className="cc-metric"><span>02 / IN PROGRESS</span><strong>{loading ? "—" : active.toLocaleString()}</strong><small>Open community concerns</small></div>
        <div className="cc-metric"><span>03 / RESOLVED</span><strong>{loading ? "—" : resolved.toLocaleString()}</strong><small>Reports marked resolved</small></div>
      </section>
      <section className="cc-intro container">
        <div><span className="cc-section-kicker">WHY COMMUNITY CONNECT?</span><h2>Real change starts<br/>with <em>being heard.</em></h2></div>
        <div><p>Sometimes the smallest problems make the biggest difference to everyday life. Community Connect is a pilot platform designed to help Ndenderu residents make local concerns visible and easier to follow.</p><button className="cc-text-link" type="button" onClick={onExplore}>See what your neighbors are reporting <span>↗</span></button></div>
      </section>
      <section className="cc-how"><div className="container"><div className="cc-section-top"><span className="cc-section-kicker">SIMPLE BY DESIGN</span><h2>Three steps.<br/><em>One stronger community.</em></h2><p>No complicated process. Just a clearer way to speak up and stay informed.</p></div><div className="cc-steps">{steps.map(s=><article className="cc-step" key={s.number}><span className="cc-step-number">{s.number} <span>↗</span></span><h3>{s.title}</h3><p>{s.description}</p></article>)}</div></div></section>
      <section className="cc-latest container"><div className="cc-latest-head"><div><span className="cc-section-kicker">FROM AROUND THE WARD</span><h2>Community voices,<br/><em>in the open.</em></h2></div><button type="button" className="cc-text-link" onClick={onExplore}>Explore all reports <span>↗</span></button></div><div className="cc-latest-grid">{recent.length ? recent.map(r=><button className="cc-issue" type="button" key={r.id} onClick={()=>onOpenReport(r.id)}><span className="cc-issue-top"><span>COMMUNITY REPORT</span><span className="cc-issue-arrow">↗</span></span><h3>{r.title || "Untitled report"}</h3><p>{r.description || "See the details and latest updates for this issue."}</p><span className="cc-issue-bottom"><span className="cc-issue-status">● {getStatusLabel(r.currentStatus)}</span><span>View details →</span></span></button>) : <div className="cc-empty"><span>✳</span><h3>Every voice starts somewhere.</h3><p>Community reports will appear here as residents submit them.</p><button type="button" className="cc-text-link" onClick={onReport}>Be the first to report ↗</button></div>}</div></section>
      <section className="cc-final"><div className="container cc-final-inner"><div><span className="cc-section-kicker">YOUR VOICE MATTERS</span><h2>A better Ndenderu<br/>begins <em>with us.</em></h2><p>Know something in your neighborhood that needs attention? Help put it on the map.</p></div><button className="cc-button cc-button-lime" type="button" onClick={onReport}>Make a report <span>↗</span></button></div></section>
      <div className="cc-pilot-note container">Community Connect is a demonstration pilot for community issue reporting. Submission and status information shown here does not represent an official government service commitment.</div>
    </div>
  );
}

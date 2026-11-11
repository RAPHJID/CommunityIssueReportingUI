import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./JoinCommunity.css";

// IMPORTANT: Match this endpoint and buildRegistrationPayload to your AuthController.
// No admin role or ward ID is sent from the public registration form.
const REGISTRATION_ENDPOINT = "/Auth/register";
function buildRegistrationPayload(form) {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    phoneNumber: form.phoneNumber.trim(),
    password: form.password,
  };
}

const initial = { fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "", agreed: false };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9 ()-]{9,20}$/;

export default function JoinCommunity() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const from = typeof location.state?.from === "string" && location.state.from.startsWith("/") && !location.state.from.startsWith("//") ? location.state.from : "/report-issue";
  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); setError(""); };

  function next(event) {
    event.preventDefault();
    if (form.fullName.trim().length < 3) return setError("Please enter your full name (at least 3 characters).");
    if (!emailPattern.test(form.email.trim())) return setError("Enter a valid email address.");
    if (!phonePattern.test(form.phoneNumber.trim())) return setError("Enter a valid phone number, including country code where applicable.");
    setError(""); setStep(2);
  }

  async function register(event) {
    event.preventDefault();
    if (saving) return;
    if (form.password.length < 8) return setError("Choose a password with at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Your passwords do not match.");
    if (!form.agreed) return setError("Please confirm you understand how your report will be displayed.");
    setSaving(true); setError("");
    try {
      await apiRequest(REGISTRATION_ENDPOINT, { method: "POST", body: JSON.stringify(buildRegistrationPayload(form)) });
      setComplete(true);
      setForm(initial); // Don't retain the password after registration succeeds.
    } catch (err) {
      setError(err?.message || "We couldn't create your account. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="join-shell">
      <div className="join-layout">
        <aside className="join-story" aria-label="About Community Connect">
          <Link to="/" className="join-home-link">← Back to Community Connect</Link>
          <div className="join-story-content">
            <span className="join-eyebrow">NDENDERU WARD · COMMUNITY CONNECT</span>
            <div className="join-orbit" aria-hidden="true"><span className="join-orbit-center">✳</span><span className="join-orbit-pin one">⌖</span><span className="join-orbit-pin two">✦</span><span className="join-orbit-pin three">◈</span></div>
            <h1>Big change begins with <em>one voice.</em></h1>
            <p>Create your resident account to make issues visible, follow their progress and support concerns raised by your neighbors.</p>
            <div className="join-story-footer"><span className="join-pulse"/> YOUR WARD. YOUR VOICE. OUR FUTURE.</div>
          </div>
        </aside>

        <section className="join-panel" aria-labelledby="join-title">
          {complete ? (
            <div className="join-success" role="status">
              <div className="join-success-icon" aria-hidden="true">✓</div>
              <span className="join-overline">WELCOME TO THE COMMUNITY</span>
              <h2 id="join-title">You're part of the story.</h2>
              <p>Your account was created. Sign in to report an issue, see your reports and support your neighbors.</p>
              <button type="button" className="join-main-button" onClick={() => navigate("/login", { state: { from }, replace: true })}>Continue to sign in <span aria-hidden="true">→</span></button>
              <Link to="/explore-issues" className="join-soft-link">Explore community reports instead</Link>
            </div>
          ) : (
            <>
              <div className="join-panel-top"><span className="join-overline">A SEAT AT THE TABLE</span><span className="join-step-counter">{String(step).padStart(2,"0")} / 02</span></div>
              <div className="join-progress" aria-label={`Step ${step} of 2`}><span style={{ width: `${step * 50}%` }}/></div>
              <div className="join-heading"><h2 id="join-title">{step === 1 ? "Let's get to know you." : "Make it yours."}</h2><p>{step === 1 ? "Just a few details to start your Community Connect journey." : "Create a secure password and you're ready to participate."}</p></div>
              <form onSubmit={step === 1 ? next : register} noValidate>
                {step === 1 ? (
                  <div className="join-fields">
                    <label htmlFor="join-name">Full name <span>*</span></label>
                    <input id="join-name" value={form.fullName} onChange={e=>update("fullName",e.target.value)} placeholder="e.g. Jane Wanjiku" autoComplete="name" required maxLength={120}/>
                    <label htmlFor="join-email">Email address <span>*</span></label>
                    <input id="join-email" type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254}/>
                    <label htmlFor="join-phone">Phone number <span>*</span></label>
                    <input id="join-phone" type="tel" value={form.phoneNumber} onChange={e=>update("phoneNumber",e.target.value)} placeholder="e.g. +254 7XX XXX XXX" autoComplete="tel" required maxLength={20}/>
                    <div className="join-note"><span aria-hidden="true">◉</span><span>Your identity is used for your account. Public issue reports should display a resident label, not your personal details.</span></div>
                  </div>
                ) : (
                  <div className="join-fields">
                    <label htmlFor="join-password">Create password <span>*</span></label>
                    <div className="join-password-wrap"><input id="join-password" type={showPassword ? "text" : "password"} value={form.password} onChange={e=>update("password",e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required minLength={8}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button></div>
                    <div className="join-password-hint"><span className={form.password.length>=8?"good":""}>✓ At least 8 characters</span><span className={form.password&&form.password===form.confirmPassword?"good":""}>✓ Passwords match</span></div>
                    <label htmlFor="join-confirm">Confirm password <span>*</span></label>
                    <input id="join-confirm" type={showPassword?"text":"password"} value={form.confirmPassword} onChange={e=>update("confirmPassword",e.target.value)} placeholder="Type your password again" autoComplete="new-password" required/>
                    <label className="join-agreement"><input type="checkbox" checked={form.agreed} onChange={e=>update("agreed",e.target.checked)}/><span>I understand that reports I submit may be publicly visible, while my account details should remain private.</span></label>
                  </div>
                )}
                {error && <p className="join-error" role="alert">{error}</p>}
                <div className="join-actions">{step === 2 && <button type="button" className="join-back-button" onClick={()=>{setStep(1);setError("");}} disabled={saving}>← Back</button>}<button className="join-main-button" type="submit" disabled={saving}>{saving?"Creating your account...":step===1?"Continue to security":"Create my account"}<span aria-hidden="true">→</span></button></div>
              </form>
              <p className="join-signin">Already have an account? <Link to="/login" state={{ from }}>Sign in here</Link></p>
              <p className="join-disclaimer">Community Connect · Ndenderu Ward pilot experience</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

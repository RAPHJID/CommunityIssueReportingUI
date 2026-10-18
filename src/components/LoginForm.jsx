
import { useState } from "react";
import { apiRequest } from "../services/api";

function LoginForm({ onLogin, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response?.token) {
        throw new Error(
          "The server did not return an authentication token."
        );
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response));

      onLogin(response);
    } catch (err) {
      setError(
        err.message ||
          "We couldn't sign you in. Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="login-heading">
      {/* Left: distinctive welcome panel */}
      <aside className="login-visual">
        <div className="login-brand-mark" aria-hidden="true">
          <span>W</span>
          <span className="login-brand-dot" />
        </div>

        <p className="login-kicker">COMMUNITY · ACCOUNTABILITY · ACTION</p>

        <h2 className="login-visual-heading">
          Change begins
          <br />
          <span>closer to home.</span>
        </h2>

        <p className="login-visual-copy">
          Sign in to raise local concerns, follow community reports, and
          help make your ward a better place to live.
        </p>

        <div className="login-visual-art" aria-hidden="true">
          <div className="login-orbit login-orbit-one" />
          <div className="login-orbit login-orbit-two" />
          <div className="login-orbit login-orbit-three" />

          <div className="login-art-core">
            <span className="login-art-symbol">+</span>
          </div>

          <span className="login-art-point point-one" />
          <span className="login-art-point point-two" />
          <span className="login-art-point point-three" />
        </div>

        <div className="login-visual-footer">
          <span className="login-footer-line" />
          <span>Your ward. Your voice. Your community.</span>
        </div>
      </aside>

      {/* Right: sign-in form */}
      <div className="login-form-content">
        <div className="login-topline">
          <span className="login-secure-label">
            <span className="login-secure-dot" />
            RESIDENT ACCESS
          </span>

          <button
            type="button"
            className="login-close-button"
            onClick={onCancel}
            aria-label="Close sign-in form"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="login-intro">
          <p className="login-overline">WELCOME BACK</p>
          <h2 id="login-heading">
            Sign in<span className="login-heading-period">.</span>
          </h2>
          <p className="login-subtitle">
            Your community is worth showing up for.
            <br />
            Pick up where you left off.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>

            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                @
              </span>

              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={255}
              />
            </div>
          </div>

          <div className="login-field">
            <div className="login-label-row">
              <label htmlFor="login-password">Password</label>
              <span className="login-private-note">Keep it private</span>
            </div>

            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                ◈
              </span>

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={100}
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span className="login-error-symbol" aria-hidden="true">
                !
              </span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="login-submit-button"
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting ? "Signing you in..." : "Enter your account"}
            </span>
            {!isSubmitting && (
              <span className="login-submit-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>

          <p className="login-form-note">
            <span aria-hidden="true">◆</span>
            Your account helps us keep community reporting accountable.
          </p>
        </form>

        <div className="login-bottom">
          <span>COMMUNITY ISSUE REPORTING</span>
          <span className="login-bottom-number">01 / ACCESS</span>
        </div>
      </div>
    </section>
  );
}

export default LoginForm;

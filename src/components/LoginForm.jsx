import { useState } from "react";
import { apiRequest } from "../services/api";

function LoginForm({ onLogin, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiRequest("/Auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response?.token) {
        throw new Error("Login response did not contain an authentication token.");
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response));

      onLogin(response);
    } catch (err) {
      setError(
        err.message || "Unable to log in. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="login-heading">
      <div className="login-panel-header">
        <div>
          <h2 id="login-heading">Sign in</h2>
          <p className="muted">
            Sign in to submit a community report.
          </p>
        </div>

        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={255}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          maxLength={100}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}

export default LoginForm;
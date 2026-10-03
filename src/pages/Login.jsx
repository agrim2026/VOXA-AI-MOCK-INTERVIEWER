import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =========================================
     EMAIL / PASSWORD LOGIN
  ========================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      setMessage("Login successful!");

      /*
        Small delay so the success message
        can be seen before dashboard opens.
      */

      setTimeout(() => {
        navigate("/dashboard", {
          replace: true,
        });
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  /* =========================================
     GOOGLE LOGIN
  ========================================= */

  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google login failed. Please try again.");
      setLoading(false);
    }
  };

  /* =========================================
     GITHUB LOGIN
  ========================================= */

  const handleGithubLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error("GitHub login error:", err);
      setError("GitHub login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      {/* =====================================
          LEFT FORM
      ====================================== */}

      <div className="authLeft">
        <div className="authFormWrapper">
          {/* LOGO */}

          <Link to="/" className="authLogo">
            VOXA <span>AI</span>
          </Link>

          {/* HEADER */}

          <div className="authHeader">
            <h1>Welcome Back</h1>

            <p>Sign in to continue your journey</p>
          </div>

          {/* LOGIN FORM */}

          <form onSubmit={handleLogin}>
            {/* EMAIL */}

            <div className="inputGroup">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* PASSWORD */}

            <div className="inputGroup">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {/* REMEMBER / FORGOT */}

            <div className="formOptions">
              <label className="rememberMe">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={loading}
                />

                <span>Remember me</span>
              </label>

              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {/* ERROR */}

            {error && <div className="authMessage error">{error}</div>}

            {/* SUCCESS */}

            {message && <div className="authMessage success">{message}</div>}

            {/* LOGIN BUTTON */}

            <button type="submit" className="authSubmit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}

              {!loading && <span>→</span>}
            </button>
          </form>

          {/* DIVIDER */}

          <div className="authDivider">
            <span>OR</span>
          </div>

          {/* GOOGLE */}

          <button
            type="button"
            className="socialButton"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span className="googleIcon">G</span>
            Continue with Google
          </button>

          {/* GITHUB */}

          <button
            type="button"
            className="socialButton"
            onClick={handleGithubLogin}
            disabled={loading}
          >
            <span className="githubIcon">●</span>
            Continue with GitHub
          </button>

          {/* SIGNUP */}

          <div className="authFooter">
            <p>
              Don't have an account? <Link to="/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>

      {/* =====================================
          RIGHT IMAGE
      ====================================== */}

      <div className="authRight">
        <div className="imageOverlay"></div>

        <div className="quote">
          <span className="quoteMark">“</span>

          <h2>
            Discipline
            <br />
            today,
            <br />
            <strong>Dream job</strong>
            <br />
            tomorrow.
          </h2>

          <span className="quoteMark bottom">”</span>
        </div>
      </div>
    </div>
  );
}

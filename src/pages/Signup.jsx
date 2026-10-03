import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.user && !data.session) {
      setMessage(
        "Account created! Please check your email to verify your account.",
      );
    } else {
      setMessage("Account created successfully!");

      setTimeout(() => {
        navigate("/");
      }, 700);
    }
  };

  return (
    <div className="authPage">
      {/* LEFT FORM */}

      <div className="authLeft">
        <div className="authFormWrapper">
          <Link to="/" className="authLogo">
            VOXA <span>AI</span>
          </Link>

          <div className="authHeader">
            <h1>Create Account</h1>

            <p>Start your AI-powered career journey</p>
          </div>

          <form onSubmit={handleSignup}>
            {/* NAME */}

            <div className="inputGroup">
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            {/* EMAIL */}

            <div className="inputGroup">
              <label>Email</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* PASSWORD */}

            <div className="inputGroup">
              <label>Password</label>

              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="inputGroup">
              <label>Confirm Password</label>

              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <div className="authMessage error">{error}</div>}

            {message && <div className="authMessage success">{message}</div>}

            <button type="submit" className="authSubmit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}

              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="authDivider">
            <span>OR</span>
          </div>

          <button type="button" className="socialButton">
            <span className="googleIcon">G</span>
            Continue with Google
          </button>

          <button type="button" className="socialButton">
            <span className="githubIcon">●</span>
            Continue with GitHub
          </button>

          <div className="authFooter">
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT IMAGE */}

      <div className="authRight">
        <div className="imageOverlay"></div>

        <div className="quote">
          <span className="quoteMark">“</span>

          <h2>
            Build your
            <br />
            skills today,
            <br />
            <strong>Shape your future.</strong>
          </h2>

          <span className="quoteMark bottom">”</span>
        </div>
      </div>
    </div>
  );
}

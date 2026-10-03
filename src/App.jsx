import { useEffect, useRef } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import "./App.css";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Interview from "./pages/Interview";
import LiveInterview from "./pages/LiveInterview";

/* =====================================================
   LANDING PAGE
===================================================== */

function Landing() {
  const heroRef = useRef(null);
  const navigate = useNavigate();

  /* =====================================================
     MOUSE PARALLAX EFFECT
  ===================================================== */

  useEffect(() => {
    const move = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;

      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      if (heroRef.current) {
        heroRef.current.style.setProperty("--mx", `${x * 18}px`);

        heroRef.current.style.setProperty("--my", `${y * 18}px`);
      }
    };

    window.addEventListener("mousemove", move);

    return () => {
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return (
    <div className="app">
      {/* =================================================
          VFX BACKGROUND
      ================================================= */}

      <div className="vfx">
        <div className="grid"></div>

        <div className="glow glow1"></div>
        <div className="glow glow2"></div>
        <div className="glow glow3"></div>

        <div className="particles">
          {Array.from({ length: 35 }).map((_, i) => (
            <span key={i} className={`particle p${i + 1}`}></span>
          ))}
        </div>
      </div>

      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="navbar">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          VOXA <span>AI</span>
        </div>

        <nav>
          <a href="#products">Products</a>

          <a href="#courses">Courses</a>

          <a href="#about">About</a>

          <a href="#pricing">Pricing</a>
        </nav>

        <div className="navButtons">
          <button
            className="loginBtn"
            type="button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="getStarted"
            type="button"
            onClick={() => navigate("/signup")}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <main className="hero" ref={heroRef}>
        <div className="heroContent">
          <div className="badge">
            <span className="liveDot"></span>
            AI Interviewer with Vision & Voice
          </div>

          <h1>
            Prepare Smarter.
            <br />
            <span>Get Hired Faster.</span>
          </h1>

          <p>
            AI-powered career readiness platform with mock interviews, resume
            builder, learning resources and personalized career guidance.
          </p>

          <div className="heroButtons">
            <button
              className="primaryBtn"
              type="button"
              onClick={() => navigate("/signup")}
            >
              Get Started Free
              <span>→</span>
            </button>

            <button
              className="demoBtn"
              type="button"
              onClick={() => alert("VOXA AI Demo coming soon!")}
            >
              <span className="play">▶</span>
              Watch Demo
            </button>
          </div>

          <div className="stats">
            <div>
              <strong>10K+</strong>

              <span>Active Learners</span>
            </div>

            <div>
              <strong>95%</strong>

              <span>Success Rate</span>
            </div>

            <div>
              <strong>1M+</strong>

              <span>Interviews Taken</span>
            </div>
          </div>
        </div>

        {/* =================================================
            AI VISUAL
        ================================================= */}

        <div className="aiVisual">
          <div className="orbit orbit1"></div>
          <div className="orbit orbit2"></div>
          <div className="orbit orbit3"></div>

          <div className="aiCore">
            <div className="coreRing"></div>

            <div className="coreCircle">
              <span>✦</span>
            </div>
          </div>

          <div className="floatingCard card1">
            <span>✦</span>

            <div>
              <small>AI Analysis</small>

              <b>92% Match</b>
            </div>
          </div>

          <div className="floatingCard card2">
            <span>◉</span>

            <div>
              <small>Interview</small>

              <b>Live AI</b>
            </div>
          </div>

          <div className="floatingCard card3">
            <span>✓</span>

            <div>
              <small>Confidence</small>

              <b>Excellent</b>
            </div>
          </div>

          <div className="speechBubble">
            Practice Today.
            <br />
            <b>Succeed Tomorrow.</b>
          </div>
        </div>
      </main>

      {/* =================================================
          FEATURES
      ================================================= */}

      <section className="features">
        <div
          className="feature"
          onClick={() => navigate("/interview")}
          style={{
            cursor: "pointer",
          }}
        >
          <span>🎙️</span>

          <div>
            <h3>AI Mock Interviews</h3>

            <p>Practice with an intelligent AI interviewer.</p>
          </div>
        </div>

        <div
          className="feature"
          onClick={() => navigate("/login")}
          style={{
            cursor: "pointer",
          }}
        >
          <span>📄</span>

          <div>
            <h3>AI Resume Builder</h3>

            <p>Create an ATS-friendly professional resume.</p>
          </div>
        </div>

        <div
          className="feature"
          onClick={() => navigate("/login")}
          style={{
            cursor: "pointer",
          }}
        >
          <span>🎯</span>

          <div>
            <h3>Career Guidance</h3>

            <p>Get personalized career recommendations.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =====================================================
   APPLICATION ROUTES
===================================================== */

function App() {
  return (
    <Routes>
      {/* LANDING */}

      <Route path="/" element={<Landing />} />

      {/* AUTH */}

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      {/* DASHBOARD */}

      <Route path="/dashboard" element={<Dashboard />} />

      {/* ===============================================
          INTERVIEW SETUP
      =============================================== */}

      <Route path="/interview" element={<Interview />} />

      {/* ===============================================
          LIVE AI INTERVIEW
      =============================================== */}

      <Route path="/live-interview" element={<LiveInterview />} />

      {/* ===============================================
          FUTURE PAGES
      =============================================== */}

      {/*
      <Route
        path="/resume"
        element={<Resume />}
      />

      <Route
        path="/courses"
        element={<Courses />}
      />

      <Route
        path="/career-coach"
        element={<CareerCoach />}
      />

      <Route
        path="/assessments"
        element={<Assessments />}
      />

      <Route
        path="/reports"
        element={<Reports />}
      />
      */}

      {/* FALLBACK */}

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

export default App;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import {
  Home,
  Mic2,
  FileText,
  BookOpen,
  Bot,
  ClipboardCheck,
  BarChart3,
  Inbox,
  User,
  Settings,
  LogOut,
  Bell,
  MessageSquare,
  Search,
  ChevronRight,
  X,
  Sparkles,
  Target,
  GraduationCap,
  Award,
  TrendingUp,
  Play,
  ShieldCheck,
  FileCheck2,
  Menu,
} from "lucide-react";

import { FaInstagram, FaLinkedinIn } from "react-icons/fa";

import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* =========================================
     SUPABASE SESSION
  ========================================= */

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
        } else {
          navigate("/login", { replace: true });
        }

        setLoading(false);
      } catch (error) {
        console.error("Authentication error:", error);

        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        navigate("/login", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /* =========================================
     SIDEBAR
  ========================================= */

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const navigateAndClose = (path) => {
    navigate(path);
    closeSidebar();
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-orb">
          <Sparkles size={30} />
        </div>

        <h2>VOXA AI</h2>

        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  /* =========================================
     USER DETAILS
  ========================================= */

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Candidate";

  const firstLetter = displayName.charAt(0).toUpperCase();

  /* =========================================
     AI INTERVIEW NAVIGATION
  ========================================= */

  const openInterview = () => {
    navigateAndClose("/interview");
  };

  return (
    <div className="dashboard">
      {/* =====================================
          MOBILE SIDEBAR OVERLAY
      ====================================== */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        ></div>
      )}

      {/* =====================================
          SIDEBAR
      ====================================== */}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* LOGO */}

        <div className="sidebar-logo-row">
          <div className="sidebar-logo">
            VOXA <span>AI</span>
          </div>

          <button
            className="close-sidebar"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* PROFILE */}

        <button
          className="profile-sidebar profile-sidebar-button"
          onClick={() => navigateAndClose("/profile")}
        >
          <div className="big-avatar">{firstLetter}</div>

          <div className="profile-info">
            <strong>{displayName}</strong>
            <small>Candidate</small>
          </div>

          <ChevronRight size={17} className="profile-arrow" />
        </button>

        {/* WORKSPACE */}

        <div className="sidebar-title">WORKSPACE</div>

        <nav className="sidebar-nav">
          {/* DASHBOARD */}

          <button
            className="nav-item active"
            onClick={() => navigateAndClose("/dashboard")}
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>

          {/* =================================
              AI INTERVIEW
          ================================= */}

          <button className="nav-item" onClick={openInterview}>
            <Mic2 size={19} />
            <span>AI Interview</span>
          </button>

          {/* RESUME */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/resume")}
          >
            <FileText size={19} />
            <span>Resume Builder</span>
          </button>

          {/* COURSES */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/courses")}
          >
            <BookOpen size={19} />
            <span>Courses</span>
          </button>

          {/* CAREER COACH */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/career-coach")}
          >
            <Bot size={19} />
            <span>AI Career Coach</span>
          </button>

          {/* ASSESSMENTS */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/assessments")}
          >
            <ClipboardCheck size={19} />
            <span>Assessments</span>
          </button>

          {/* REPORTS */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/reports")}
          >
            <BarChart3 size={19} />
            <span>Reports</span>
          </button>

          {/* INBOX */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/inbox")}
          >
            <Inbox size={19} />
            <span>Inbox</span>
            <b className="nav-badge">2</b>
          </button>
        </nav>

        {/* BOTTOM MENU */}

        <div className="sidebar-bottom">
          {/* PROFILE */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/profile")}
          >
            <User size={19} />
            <span>Profile</span>
          </button>

          {/* SETTINGS */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          {/* TERMS */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/terms")}
          >
            <FileCheck2 size={18} />
            <span>Terms & Conditions</span>
          </button>

          {/* PRIVACY */}

          <button
            className="nav-item"
            onClick={() => navigateAndClose("/privacy")}
          >
            <ShieldCheck size={18} />
            <span>Privacy Policy</span>
          </button>

          {/* SOCIAL */}

          <div className="sidebar-social">
            <span>FOLLOW US</span>

            <div className="social-buttons">
              <button
                className="social-btn instagram"
                onClick={() =>
                  window.open(
                    "https://www.instagram.com/",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                aria-label="Instagram"
              >
                <FaInstagram size={17} />
              </button>

              <button
                className="social-btn linkedin"
                onClick={() =>
                  window.open(
                    "https://www.linkedin.com/",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                aria-label="LinkedIn"
              >
                <FaLinkedinIn size={17} />
              </button>
            </div>
          </div>

          {/* LOGOUT */}

          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =====================================
          MAIN CONTENT
      ====================================== */}

      <main className="main-content">
        {/* TOP NAVBAR */}

        <header className="top-navbar">
          <div className="top-left">
            <button
              className="mobile-avatar"
              onClick={openSidebar}
              aria-label="Open sidebar"
            >
              {firstLetter}
            </button>

            <button
              className="mobile-menu-btn"
              onClick={openSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={23} />
            </button>

            <div className="top-logo">
              VOXA <span>AI</span>
            </div>
          </div>

          <div className="top-right">
            <button className="top-icon whatsapp" aria-label="Messages">
              <MessageSquare size={19} />
            </button>

            <button className="top-icon" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>

            <button className="top-icon" aria-label="Chat">
              <MessageSquare size={20} />
            </button>

            <button className="top-icon" aria-label="Search">
              <Search size={20} />
            </button>

            <button
              className="desktop-profile"
              onClick={() => navigate("/profile")}
            >
              <div className="avatar-small">{firstLetter}</div>

              <div>
                <strong>{displayName}</strong>
                <small>{user.email}</small>
              </div>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="page-content">
          {/* =================================
              WELCOME
          ================================== */}

          <section className="welcome-area">
            <div>
              <span className="welcome-label">WELCOME BACK 👋</span>

              <h1>
                Build your career.
                <br />
                <span>Get interview ready.</span>
              </h1>

              <p>
                Practice interviews, build your resume and improve your career
                with AI-powered tools.
              </p>
            </div>

            <button
              className="welcome-profile"
              onClick={() => navigate("/profile")}
            >
              <div className="welcome-avatar">{firstLetter}</div>

              <div>
                <span>Hello,</span>
                <strong>{displayName}</strong>
              </div>
            </button>
          </section>

          {/* =================================
              FEATURED AI INTERVIEW
          ================================== */}

          <section className="featured-card">
            <div className="featured-content">
              <span className="recommended">RECOMMENDED</span>

              <h2>
                Start your
                <br />
                <span>AI Mock Interview</span>
              </h2>

              <p>
                Experience a realistic interview powered by Gemini AI and
                receive detailed performance feedback.
              </p>

              <button className="featured-button" onClick={openInterview}>
                Start Interview
                <ChevronRight size={20} />
              </button>
            </div>

            {/* AI VISUAL */}

            <div className="featured-visual">
              <div className="ai-circle">
                <Mic2 size={45} />
              </div>

              <div className="floating-icon icon-one">
                <Bot size={21} />
              </div>

              <div className="floating-icon icon-two">
                <Sparkles size={21} />
              </div>

              <div className="floating-icon icon-three">
                <BarChart3 size={21} />
              </div>
            </div>
          </section>

          {/* =================================
              CAREER PREPARATION
          ================================== */}

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Career Preparation</h2>
                <p>Everything you need to prepare for your career</p>
              </div>

              <button className="view-all" onClick={() => navigate("/courses")}>
                View all
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="feature-grid">
              {/* RESUME */}

              <div className="blue-card" onClick={() => navigate("/resume")}>
                <div className="card-top">
                  <div className="card-icon">
                    <FileText size={25} />
                  </div>

                  <div className="round-arrow">
                    <ChevronRight size={20} />
                  </div>
                </div>

                <h3>AI Resume Builder</h3>

                <p>Create an ATS-friendly professional resume.</p>

                <span className="card-link">Build Resume →</span>
              </div>

              {/* =================================
                  AI INTERVIEW CARD
              ================================== */}

              <div
                className="blue-card"
                onClick={openInterview}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    openInterview();
                  }
                }}
              >
                <div className="card-top">
                  <div className="card-icon">
                    <Mic2 size={25} />
                  </div>

                  <div className="round-arrow">
                    <ChevronRight size={20} />
                  </div>
                </div>

                <h3>AI Interviews</h3>

                <p>Practice job interviews with intelligent AI.</p>

                <span className="card-link">Practice Now →</span>
              </div>

              {/* CAREER COACH */}

              <div
                className="blue-card"
                onClick={() => navigate("/career-coach")}
              >
                <div className="card-top">
                  <div className="card-icon">
                    <Target size={25} />
                  </div>

                  <div className="round-arrow">
                    <ChevronRight size={20} />
                  </div>
                </div>

                <h3>AI Career Coach</h3>

                <p>Get personalized career recommendations.</p>

                <span className="card-link">Talk to AI →</span>
              </div>

              {/* COURSES */}

              <div className="blue-card" onClick={() => navigate("/courses")}>
                <div className="card-top">
                  <div className="card-icon">
                    <GraduationCap size={25} />
                  </div>

                  <div className="round-arrow">
                    <ChevronRight size={20} />
                  </div>
                </div>

                <h3>Expert Courses</h3>

                <p>Learn skills that improve your career.</p>

                <span className="card-link">Explore Courses →</span>
              </div>
            </div>
          </section>

          {/* =================================
              PROGRESS
          ================================== */}

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Your Progress</h2>
                <p>Track your career growth</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue-icon">
                  <Mic2 size={22} />
                </div>

                <div>
                  <span>Interviews</span>
                  <strong>0</strong>
                </div>

                <TrendingUp size={18} className="trend" />
              </div>

              <div className="stat-card">
                <div className="stat-icon purple-icon">
                  <Award size={22} />
                </div>

                <div>
                  <span>Average Score</span>
                  <strong>--</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green-icon">
                  <BookOpen size={22} />
                </div>

                <div>
                  <span>Courses</span>
                  <strong>0</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange-icon">
                  <Sparkles size={22} />
                </div>

                <div>
                  <span>Growth Streak</span>
                  <strong>0 Days</strong>
                </div>
              </div>
            </div>
          </section>

          {/* =================================
              RECENT ACTIVITY
          ================================== */}

          <section className="activity-card">
            <div className="section-heading">
              <div>
                <h2>Recent Activity</h2>
                <p>Your latest career activities</p>
              </div>
            </div>

            <div className="empty-activity">
              <div className="empty-icon">
                <Sparkles size={27} />
              </div>

              <h3>Your journey starts here</h3>

              <p>
                Complete your first AI interview and your progress will appear
                here.
              </p>

              <button className="secondary-button" onClick={openInterview}>
                <Play size={17} />
                Start First Interview
              </button>
            </div>
          </section>

          {/* =================================
              FOOTER
          ================================== */}

          <footer className="dashboard-footer">
            <div className="footer-brand">
              <strong>
                VOXA <span>AI</span>
              </strong>

              <p>Your AI-powered career companion.</p>
            </div>

            <div className="footer-links">
              <button onClick={() => navigate("/terms")}>Terms</button>

              <button onClick={() => navigate("/privacy")}>Privacy</button>

              <button onClick={() => navigate("/profile")}>Profile</button>
            </div>

            <div className="footer-social">
              <button
                onClick={() =>
                  window.open(
                    "https://www.instagram.com/",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                aria-label="Instagram"
              >
                <FaInstagram size={17} />
              </button>

              <button
                onClick={() =>
                  window.open(
                    "https://www.linkedin.com/",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                aria-label="LinkedIn"
              >
                <FaLinkedinIn size={17} />
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

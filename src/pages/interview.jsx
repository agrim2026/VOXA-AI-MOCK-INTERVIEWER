import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic2,
  Briefcase,
  Coffee,
  Globe2,
  FileText,
  Target,
  ChevronRight,
  ArrowLeft,
  Upload,
  Check,
  Sparkles,
} from "lucide-react";

import "./interview.css";

export default function Interview() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [interviewType, setInterviewType] = useState("");
  const [language, setLanguage] = useState("");
  const [resume, setResume] = useState(null);
  const [jobRole, setJobRole] = useState("");

  /* =========================================
     NEXT STEP
  ========================================= */

  const nextStep = () => {
    if (step === 1 && !interviewType) {
      alert("Please select an interview type.");
      return;
    }

    if (step === 2 && !language) {
      alert("Please select a language.");
      return;
    }

    if (step === 3 && interviewType === "Professional" && !resume) {
      alert("Please upload your resume.");
      return;
    }

    if (step === 4 && !jobRole) {
      alert("Please select a job role.");
      return;
    }

    setStep((previous) => previous + 1);
  };

  /* =========================================
     PREVIOUS STEP
  ========================================= */

  const previousStep = () => {
    setStep((previous) => Math.max(1, previous - 1));
  };

  /* =========================================
     RESUME
  ========================================= */

  const handleResume = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // 10 MB validation
    if (file.size > 10 * 1024 * 1024) {
      alert("Resume must be smaller than 10MB.");
      return;
    }

    setResume(file);
  };

  /* =========================================
     START LIVE INTERVIEW
  ========================================= */

  const startInterview = () => {
    if (!interviewType) {
      alert("Please select an interview type.");
      setStep(1);
      return;
    }

    if (!language) {
      alert("Please select a language.");
      setStep(2);
      return;
    }

    if (interviewType === "Professional" && !resume) {
      alert("Please upload your resume.");
      setStep(3);
      return;
    }

    if (!jobRole) {
      alert("Please select a job role.");
      setStep(4);
      return;
    }

    /*
      Selected interview information is sent
      to LiveInterview.jsx through React Router state.
    */

    navigate("/live-interview", {
      state: {
        interviewType,
        language,
        jobRole,
        resume: resume
          ? {
              name: resume.name,
              type: resume.type,
              size: resume.size,
            }
          : null,
      },
    });
  };

  /* =========================================
     PROGRESS
  ========================================= */

  const progressSteps = [
    { number: 1, label: "Type" },
    { number: 2, label: "Language" },
    { number: 3, label: "Resume" },
    { number: 4, label: "Job Role" },
    { number: 5, label: "Start" },
  ];

  return (
    <div className="interview-page">
      {/* =====================================
          HEADER
      ===================================== */}

      <header className="interview-header">
        <div>
          <span className="small-label">VOXA AI</span>

          <h1>AI Mock Interview</h1>

          <p>
            Practice real-world interviews with your AI-powered career
            assistant.
          </p>
        </div>

        <button
          className="back-dashboard-btn"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>
      </header>

      {/* =====================================
          PROGRESS
      ===================================== */}

      <div className="interview-progress">
        <div className="progress-wrapper">
          {progressSteps.map((item, index) => (
            <div className="progress-wrapper" key={item.number}>
              <div
                className={`progress-step ${
                  step >= item.number ? "active" : ""
                }`}
              >
                <span>
                  {step > item.number ? <Check size={15} /> : item.number}
                </span>

                <p>{item.label}</p>
              </div>

              {index !== progressSteps.length - 1 && (
                <div
                  className={`progress-line ${
                    step > item.number ? "active" : ""
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =====================================
          MAIN CARD
      ===================================== */}

      <main className="interview-card">
        {/* ===================================
            STEP 1
        =================================== */}

        {step === 1 && (
          <div className="interview-step">
            <div className="step-icon">
              <Mic2 size={30} />
            </div>

            <h2>Choose your interview type</h2>

            <p className="step-description">
              Select the type of interview you want to practice with VOXA AI.
            </p>

            <div className="option-grid">
              <button
                type="button"
                className={`option-card ${
                  interviewType === "Professional" ? "selected" : ""
                }`}
                onClick={() => setInterviewType("Professional")}
              >
                <div className="option-icon">
                  <Briefcase size={28} />
                </div>

                <div className="option-content">
                  <h3>Professional</h3>

                  <p>
                    Practice technical and behavioral job interview questions.
                  </p>
                </div>

                <span className="select-circle">
                  {interviewType === "Professional" && <Check size={13} />}
                </span>
              </button>

              <button
                type="button"
                className={`option-card ${
                  interviewType === "Casual" ? "selected" : ""
                }`}
                onClick={() => setInterviewType("Casual")}
              >
                <div className="option-icon">
                  <Coffee size={28} />
                </div>

                <div className="option-content">
                  <h3>Casual</h3>

                  <p>
                    Have a relaxed conversation to improve confidence and
                    communication.
                  </p>
                </div>

                <span className="select-circle">
                  {interviewType === "Casual" && <Check size={13} />}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===================================
            STEP 2
        =================================== */}

        {step === 2 && (
          <div className="interview-step">
            <div className="step-icon">
              <Globe2 size={30} />
            </div>

            <h2>Choose your language</h2>

            <p className="step-description">
              Select the language you are most comfortable speaking.
            </p>

            <div className="language-grid">
              {[
                {
                  name: "English",
                  icon: "🇬🇧",
                },
                {
                  name: "Hindi",
                  icon: "🇮🇳",
                },
                {
                  name: "Hinglish",
                  icon: "🗣️",
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`language-card ${
                    language === item.name ? "selected" : ""
                  }`}
                  onClick={() => setLanguage(item.name)}
                >
                  <span className="language-symbol">{item.icon}</span>

                  <span>{item.name}</span>

                  <span className="language-check">
                    {language === item.name && <Check size={15} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================================
            STEP 3
        =================================== */}

        {step === 3 && (
          <div className="interview-step">
            <div className="step-icon">
              <FileText size={30} />
            </div>

            <h2>Upload your resume</h2>

            <p className="step-description">
              {interviewType === "Professional"
                ? "Upload your resume so VOXA AI can create personalized questions."
                : "Resume upload is optional for a casual interview."}
            </p>

            <label className="resume-upload">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResume}
              />

              <div className="upload-icon">
                {resume ? <Check size={27} /> : <Upload size={27} />}
              </div>

              {resume ? (
                <>
                  <h3>{resume.name}</h3>

                  <p>Resume selected successfully</p>
                </>
              ) : (
                <>
                  <h3>Upload your resume</h3>

                  <p>PDF, DOC or DOCX • Max 10MB</p>
                </>
              )}
            </label>

            {interviewType === "Casual" && !resume && (
              <button
                type="button"
                className="skip-btn"
                onClick={() => setStep(4)}
              >
                Skip for now
              </button>
            )}
          </div>
        )}

        {/* ===================================
            STEP 4
        =================================== */}

        {step === 4 && (
          <div className="interview-step">
            <div className="step-icon">
              <Target size={30} />
            </div>

            <h2>Choose your job role</h2>

            <p className="step-description">
              Select the role you want VOXA AI to prepare you for.
            </p>

            <div className="role-grid">
              {[
                "Software Developer",
                "Frontend Developer",
                "Backend Developer",
                "Full Stack Developer",
                "Data Scientist",
                "AI / ML Engineer",
                "Cyber Security",
                "Other",
              ].map((role) => (
                <button
                  type="button"
                  key={role}
                  className={`role-card ${jobRole === role ? "selected" : ""}`}
                  onClick={() => setJobRole(role)}
                >
                  <span>{role}</span>

                  {jobRole === role && <Check size={17} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================================
            STEP 5
        =================================== */}

        {step === 5 && (
          <div className="interview-step start-step">
            <div className="ai-animation">
              <Sparkles size={36} />
            </div>

            <span className="ready-label">YOU'RE READY</span>

            <h2>Start your AI Mock Interview</h2>

            <p className="step-description">
              VOXA AI will use your preferences to create a personalized
              interview experience.
            </p>

            <div className="summary-grid">
              <div>
                <span>Interview</span>
                <strong>{interviewType}</strong>
              </div>

              <div>
                <span>Language</span>
                <strong>{language}</strong>
              </div>

              <div>
                <span>Job Role</span>
                <strong>{jobRole}</strong>
              </div>

              <div>
                <span>Resume</span>
                <strong>{resume ? "Uploaded" : "Not required"}</strong>
              </div>
            </div>

            <button
              type="button"
              className="start-interview-btn"
              onClick={startInterview}
            >
              <Sparkles size={18} />
              Start AI Interview
              <ChevronRight size={19} />
            </button>
          </div>
        )}

        {/* ===================================
            NAVIGATION
        =================================== */}

        {step < 5 && (
          <div className="step-navigation">
            {step > 1 ? (
              <button
                type="button"
                className="previous-btn"
                onClick={previousStep}
              >
                <ArrowLeft size={17} />
                Previous
              </button>
            ) : (
              <div />
            )}

            <button type="button" className="continue-btn" onClick={nextStep}>
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="interview-footer">
        <span>✦ Powered by VOXA AI</span>

        <span>🔒 Your interview data is securely handled</span>
      </footer>
    </div>
  );
}

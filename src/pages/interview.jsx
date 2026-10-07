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
  Loader2,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";

import "./interview.css";

/* =====================================================
   PDF WORKER
===================================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function Interview() {
  const navigate = useNavigate();

  /* =====================================================
     STEPS
  ===================================================== */

  const [step, setStep] = useState(1);

  /* =====================================================
     INTERVIEW SETTINGS
  ===================================================== */

  const [interviewType, setInterviewType] = useState("");
  const [language, setLanguage] = useState("");
  const [jobRole, setJobRole] = useState("");

  /* =====================================================
     RESUME
  ===================================================== */

  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  /* =====================================================
     NEXT STEP
  ===================================================== */

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

    if (
      step === 3 &&
      interviewType === "Professional" &&
      resume &&
      !resumeText.trim()
    ) {
      if (resumeLoading) {
        alert("Please wait while your resume is being processed.");
      } else {
        alert("Resume could not be read. Please upload it again.");
      }

      return;
    }

    if (step === 4 && !jobRole) {
      alert("Please select a job role.");
      return;
    }

    setStep((previous) => previous + 1);
  };

  /* =====================================================
     PREVIOUS STEP
  ===================================================== */

  const previousStep = () => {
    setStep((previous) => Math.max(1, previous - 1));
  };

  /* =====================================================
     EXTRACT PDF TEXT
  ===================================================== */

  const extractPdfText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);

      const content = await page.getTextContent();

      const pageText = content.items.map((item) => item.str || "").join(" ");

      extractedText += ` ${pageText}`;
    }

    return extractedText.replace(/\s+/g, " ").trim();
  };

  /* =====================================================
     EXTRACT DOCX TEXT
  ===================================================== */

  const extractDocxText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer,
    });

    return result.value.replace(/\s+/g, " ").trim();
  };

  /* =====================================================
     RESUME UPLOAD
  ===================================================== */

  const handleResume = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    /* -----------------------------------------------
       FILE SIZE
    ----------------------------------------------- */

    if (file.size > 10 * 1024 * 1024) {
      alert("Resume must be smaller than 10MB.");

      event.target.value = "";

      return;
    }

    const fileName = file.name.toLowerCase();

    /* -----------------------------------------------
       FILE TYPE
    ----------------------------------------------- */

    const isPdf = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx");
    const isDoc = fileName.endsWith(".doc");

    if (!isPdf && !isDocx && !isDoc) {
      alert("Please upload a PDF, DOC or DOCX resume.");

      event.target.value = "";

      return;
    }

    /* -----------------------------------------------
       OLD DOC FORMAT
    ----------------------------------------------- */

    if (isDoc) {
      alert(
        "Old .doc files cannot be read directly in the browser. Please save your resume as PDF or DOCX and upload it again.",
      );

      event.target.value = "";

      return;
    }

    try {
      setResumeLoading(true);

      setResume(null);
      setResumeText("");

      let extractedText = "";

      /* -----------------------------------------------
         PDF
      ----------------------------------------------- */

      if (isPdf) {
        extractedText = await extractPdfText(file);
      }

      /* -----------------------------------------------
         DOCX
      ----------------------------------------------- */

      if (isDocx) {
        extractedText = await extractDocxText(file);
      }

      /* -----------------------------------------------
         CHECK TEXT
      ----------------------------------------------- */

      if (!extractedText || extractedText.trim().length < 20) {
        throw new Error(
          "No readable text was found in this resume. If your resume is a scanned image, please upload a text-based PDF or DOCX.",
        );
      }

      /* -----------------------------------------------
         SAVE
      ----------------------------------------------- */

      setResume(file);
      setResumeText(extractedText);

      console.log("=================================");
      console.log("RESUME SUCCESSFULLY READ");
      console.log("=================================");
      console.log("File:", file.name);
      console.log("Characters:", extractedText.length);
      console.log("Resume text:", extractedText);
      console.log("=================================");
    } catch (error) {
      console.error("Resume extraction error:", error);

      setResume(null);
      setResumeText("");

      alert(
        error?.message ||
          "Unable to read your resume. Please upload another PDF or DOCX file.",
      );

      event.target.value = "";
    } finally {
      setResumeLoading(false);
    }
  };

  /* =====================================================
     START LIVE INTERVIEW
  ===================================================== */

  const startInterview = () => {
    /* -----------------------------------------------
       INTERVIEW TYPE
    ----------------------------------------------- */

    if (!interviewType) {
      alert("Please select an interview type.");

      setStep(1);

      return;
    }

    /* -----------------------------------------------
       LANGUAGE
    ----------------------------------------------- */

    if (!language) {
      alert("Please select a language.");

      setStep(2);

      return;
    }

    /* -----------------------------------------------
       PROFESSIONAL RESUME
    ----------------------------------------------- */

    if (interviewType === "Professional" && !resume) {
      alert("Please upload your resume.");

      setStep(3);

      return;
    }

    if (interviewType === "Professional" && resume && !resumeText.trim()) {
      if (resumeLoading) {
        alert("Please wait while your resume is being processed.");
      } else {
        alert("Resume text could not be extracted. Please upload it again.");
      }

      setStep(3);

      return;
    }

    /* -----------------------------------------------
       JOB ROLE
    ----------------------------------------------- */

    if (!jobRole) {
      alert("Please select a job role.");

      setStep(4);

      return;
    }

    /* -----------------------------------------------
       DEBUG
    ----------------------------------------------- */

    console.log("=================================");
    console.log("STARTING VOXA AI INTERVIEW");
    console.log("=================================");
    console.log("Interview Type:", interviewType);
    console.log("Language:", language);
    console.log("Job Role:", jobRole);
    console.log("Resume:", resume?.name || "None");
    console.log("Resume Text Length:", resumeText.length);
    console.log("Resume Text:", resumeText);
    console.log("=================================");

    /* -----------------------------------------------
       SEND EVERYTHING TO LIVE INTERVIEW
    ----------------------------------------------- */

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

        /*
         * IMPORTANT:
         * This is the actual text extracted
         * from the candidate's resume.
         */
        resumeText: resumeText || "",
      },
    });
  };

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progressSteps = [
    {
      number: 1,
      label: "Type",
    },
    {
      number: 2,
      label: "Language",
    },
    {
      number: 3,
      label: "Resume",
    },
    {
      number: 4,
      label: "Job Role",
    },
    {
      number: 5,
      label: "Start",
    },
  ];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="interview-page">
      {/* =================================================
          HEADER
      ================================================= */}

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

      {/* =================================================
          PROGRESS
      ================================================= */}

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

      {/* =================================================
          MAIN CARD
      ================================================= */}

      <main className="interview-card">
        {/* =================================================
            STEP 1
        ================================================= */}

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
              {/* PROFESSIONAL */}

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
                    Practice technical and behavioral job interview questions
                    using your resume.
                  </p>
                </div>

                <span className="select-circle">
                  {interviewType === "Professional" && <Check size={13} />}
                </span>
              </button>

              {/* CASUAL */}

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

        {/* =================================================
            STEP 2
        ================================================= */}

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

        {/* =================================================
            STEP 3
        ================================================= */}

        {step === 3 && (
          <div className="interview-step">
            <div className="step-icon">
              <FileText size={30} />
            </div>

            <h2>Upload your resume</h2>

            <p className="step-description">
              {interviewType === "Professional"
                ? "Upload your resume so VOXA AI can read it and create personalized questions."
                : "Resume upload is optional for a casual interview."}
            </p>

            <label
              className={`resume-upload ${resumeLoading ? "processing" : ""}`}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResume}
                disabled={resumeLoading}
              />

              <div className="upload-icon">
                {resumeLoading ? (
                  <Loader2 size={27} className="spin" />
                ) : resume ? (
                  <Check size={27} />
                ) : (
                  <Upload size={27} />
                )}
              </div>

              {resumeLoading ? (
                <>
                  <h3>Reading your resume...</h3>

                  <p>VOXA AI is extracting your resume information.</p>
                </>
              ) : resume ? (
                <>
                  <h3>{resume.name}</h3>

                  <p>
                    Resume read successfully •{" "}
                    {resumeText.length.toLocaleString()} characters
                  </p>
                </>
              ) : (
                <>
                  <h3>Upload your resume</h3>

                  <p>PDF, DOC or DOCX • Max 10MB</p>
                </>
              )}
            </label>

            {/* RESUME STATUS */}

            {resume && !resumeLoading && resumeText && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 15px",
                  borderRadius: "12px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  color: "#166534",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Check size={17} />

                <span>
                  Resume successfully processed. Gemini will use this
                  information for your Professional interview.
                </span>
              </div>
            )}

            {/* CASUAL SKIP */}

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

        {/* =================================================
            STEP 4
        ================================================= */}

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

        {/* =================================================
            STEP 5
        ================================================= */}

        {step === 5 && (
          <div className="interview-step start-step">
            <div className="ai-animation">
              <Sparkles size={36} />
            </div>

            <span className="ready-label">YOU'RE READY</span>

            <h2>Start your AI Mock Interview</h2>

            <p className="step-description">
              VOXA AI will use your preferences and resume to create a
              personalized interview experience.
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

                <strong>
                  {resume
                    ? resumeText
                      ? "Read & Ready"
                      : "Processing"
                    : "Not required"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="start-interview-btn"
              onClick={startInterview}
              disabled={
                interviewType === "Professional" &&
                (resumeLoading || !resumeText.trim())
              }
            >
              {resumeLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Processing Resume...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Start AI Interview
                  <ChevronRight size={19} />
                </>
              )}
            </button>
          </div>
        )}

        {/* =================================================
            NAVIGATION
        ================================================= */}

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

            <button
              type="button"
              className="continue-btn"
              onClick={nextStep}
              disabled={step === 3 && resumeLoading}
            >
              {step === 3 && resumeLoading ? "Reading Resume..." : "Continue"}

              {step === 3 && resumeLoading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          </div>
        )}
      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="interview-footer">
        <span>✦ Powered by VOXA AI</span>

        <span>🔒 Your interview data is securely handled</span>
      </footer>
    </div>
  );
}

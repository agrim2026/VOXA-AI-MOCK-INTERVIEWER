import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleGenAI, Modality } from "@google/genai";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Clock3,
  Brain,
  ShieldCheck,
  AlertTriangle,
  BriefcaseBusiness,
  Languages,
  Loader2,
  MessageCircle,
  FileText,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./liveinterview.css";

/* =====================================================
   GEMINI LIVE MODEL
===================================================== */

const LIVE_MODEL = "gemini-3.8-live";

/*
 * Maximum resume characters sent to Gemini.
 * This prevents extremely large resumes from
 * making the Live session unnecessarily huge.
 */
const MAX_RESUME_CHARS = 25000;

export default function LiveInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  /* =====================================================
     RECEIVE DATA FROM INTERVIEW.JSX
  ===================================================== */

  const interviewData = location.state || {};

  const receivedInterviewType = interviewData.interviewType || "Professional";

  const receivedLanguage = interviewData.language || "English";

  const receivedJobRole = interviewData.jobRole || "Software Developer";

  const receivedResume = interviewData.resume || null;

  const receivedResumeText =
    typeof interviewData.resumeText === "string"
      ? interviewData.resumeText
      : "";

  /*
   * Keep resume text in a ref so the Gemini connection
   * always gets the latest value.
   */
  const resumeTextRef = useRef(receivedResumeText.slice(0, MAX_RESUME_CHARS));

  /* =====================================================
     VIDEO / MEDIA
  ===================================================== */

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /* =====================================================
     GEMINI LIVE
  ===================================================== */

  const sessionRef = useRef(null);

  const audioContextRef = useRef(null);
  const micContextRef = useRef(null);

  const sourceRef = useRef(null);
  const processorRef = useRef(null);

  const nextPlayTimeRef = useRef(0);

  const connectingRef = useRef(false);

  /* =====================================================
     CANDIDATE
  ===================================================== */

  const [candidateName, setCandidateName] = useState("Candidate");

  const candidateNameRef = useRef("Candidate");

  /* =====================================================
     TRANSCRIPT REFS
  ===================================================== */

  const userTranscriptRef = useRef("");
  const aiTranscriptRef = useRef("");

  /* =====================================================
     SETTINGS
  ===================================================== */

  const [language, setLanguage] = useState(receivedLanguage);

  const [mode, setMode] = useState(receivedInterviewType);

  const [jobRole] = useState(receivedJobRole);

  /* =====================================================
     RESUME STATE
  ===================================================== */

  const [resumeText] = useState(receivedResumeText);

  const [resumeAvailable] = useState(
    receivedInterviewType === "Professional" &&
      receivedResumeText.trim().length > 0,
  );

  /* =====================================================
     MEDIA STATES
  ===================================================== */

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);

  /* =====================================================
     LIVE STATES
  ===================================================== */

  const [liveConnected, setLiveConnected] = useState(false);

  const [aiSpeaking, setAiSpeaking] = useState(false);

  const [userSpeaking, setUserSpeaking] = useState(false);

  const [connecting, setConnecting] = useState(false);

  const [aiError, setAiError] = useState("");

  /* =====================================================
     CONVERSATION
  ===================================================== */

  const [conversation, setConversation] = useState([]);

  const [userTranscript, setUserTranscript] = useState("");

  const [aiTranscript, setAiTranscript] = useState("");

  /* =====================================================
     TIMER
  ===================================================== */

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!liveConnected) return;

    const timer = setInterval(() => {
      setSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [liveConnected]);

  function formatTime() {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");

    const secs = (seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${secs}`;
  }

  /* =====================================================
     CHECK RECEIVED INTERVIEW DATA
  ===================================================== */

  useEffect(() => {
    console.log("=================================");
    console.log("VOXA AI INTERVIEW DATA");
    console.log("=================================");
    console.log("Interview Type:", receivedInterviewType);
    console.log("Language:", receivedLanguage);
    console.log("Job Role:", receivedJobRole);
    console.log("Resume:", receivedResume?.name || "No resume");
    console.log("Resume text length:", receivedResumeText.length);
    console.log("Resume available:", receivedResumeText.trim().length > 0);
    console.log("=================================");

    if (
      receivedInterviewType === "Professional" &&
      !receivedResumeText.trim()
    ) {
      console.warn("Professional interview started without resume text.");
    }
  }, [
    receivedInterviewType,
    receivedLanguage,
    receivedJobRole,
    receivedResume,
    receivedResumeText,
  ]);

  /* =====================================================
     GET CANDIDATE NAME FROM SUPABASE
  ===================================================== */

  useEffect(() => {
    loadCandidateName();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCandidateName() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.warn("Unable to get authenticated user:", error);
        return;
      }

      if (!user) {
        console.warn("No authenticated user found.");
        return;
      }

      const metadata = user.user_metadata || {};

      const name =
        metadata.full_name ||
        metadata.name ||
        metadata.display_name ||
        metadata.username ||
        user.email?.split("@")[0] ||
        "Candidate";

      const cleanName = String(name).trim();

      if (cleanName) {
        setCandidateName(cleanName);
        candidateNameRef.current = cleanName;
      }
    } catch (error) {
      console.error("Candidate name error:", error);
    }
  }

  /* =====================================================
     START MEDIA
  ===================================================== */

  useEffect(() => {
    startMedia();

    return () => {
      cleanupLive();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startMedia() {
    try {
      setAiError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera and microphone are not supported in this browser.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];

      const audioTrack = stream.getAudioTracks()[0];

      setCameraOn(videoTrack?.enabled ?? true);

      setMicOn(audioTrack?.enabled ?? true);
    } catch (error) {
      console.error("Media error:", error);

      setAiError(
        error?.message || "Camera and microphone permission is required.",
      );
    }
  }

  /* =====================================================
     GET SECURE EPHEMERAL TOKEN
  ===================================================== */

  async function getLiveToken() {
    const { data, error } = await supabase.functions.invoke(
      "gemini-live-token",
      {
        body: {},
      },
    );

    if (error) {
      console.error("Token function error:", error);

      throw new Error(error.message || "Unable to get Gemini Live token.");
    }

    if (!data?.success || !data?.token) {
      throw new Error(data?.error || "Gemini Live token was not returned.");
    }

    return data.token;
  }

  /* =====================================================
     AUDIO CONTEXTS
  ===================================================== */

  async function createAudioContexts() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({
        sampleRate: 24000,
      });
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    if (!micContextRef.current) {
      micContextRef.current = new AudioContext();
    }

    if (micContextRef.current.state === "suspended") {
      await micContextRef.current.resume();
    }
  }

  /* =====================================================
     BASE64 -> UINT8
  ===================================================== */

  function base64ToUint8Array(base64) {
    const binaryString = window.atob(base64);

    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  /* =====================================================
     PLAY GEMINI AUDIO
  ===================================================== */

  function playGeminiAudio(base64Audio) {
    if (!speakerOn) return;

    const audioContext = audioContextRef.current;

    if (!audioContext) return;

    try {
      const bytes = base64ToUint8Array(base64Audio);

      const int16 = new Int16Array(
        bytes.buffer,
        bytes.byteOffset,
        Math.floor(bytes.byteLength / 2),
      );

      const float32 = new Float32Array(int16.length);

      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = audioContext.createBuffer(1, float32.length, 24000);

      buffer.copyToChannel(float32, 0);

      const source = audioContext.createBufferSource();

      source.buffer = buffer;

      source.connect(audioContext.destination);

      const currentTime = audioContext.currentTime;

      const startTime = Math.max(currentTime + 0.02, nextPlayTimeRef.current);

      source.start(startTime);

      nextPlayTimeRef.current = startTime + buffer.duration;

      setAiSpeaking(true);

      source.onended = () => {
        if (audioContext.currentTime >= nextPlayTimeRef.current - 0.05) {
          setAiSpeaking(false);
        }
      };
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  }

  /* =====================================================
     STOP CURRENT AI AUDIO
  ===================================================== */

  function stopAIPlayback() {
    const audioContext = audioContextRef.current;

    if (!audioContext) return;

    nextPlayTimeRef.current = audioContext.currentTime;

    setAiSpeaking(false);
  }

  /* =====================================================
     FLOAT32 -> PCM16
  ===================================================== */

  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]));

      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return output;
  }

  /* =====================================================
     ARRAY BUFFER -> BASE64
  ===================================================== */

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);

    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));

      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  }

  /* =====================================================
     DOWNSAMPLE TO 16KHZ
  ===================================================== */

  function downsampleTo16k(buffer, inputSampleRate) {
    if (inputSampleRate === 16000) {
      return buffer;
    }

    const ratio = inputSampleRate / 16000;

    const newLength = Math.round(buffer.length / ratio);

    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);

      let accum = 0;
      let count = 0;

      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;

      offsetResult++;

      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /* =====================================================
     START MICROPHONE STREAM
  ===================================================== */

  async function startMicrophoneStreaming(session) {
    if (!streamRef.current) {
      throw new Error("Microphone stream not available.");
    }

    await createAudioContexts();

    const micContext = micContextRef.current;

    const audioTrack = streamRef.current.getAudioTracks()[0];

    if (!audioTrack) {
      throw new Error("Microphone track not found.");
    }

    const micStream = new MediaStream([audioTrack]);

    const source = micContext.createMediaStreamSource(micStream);

    const processor = micContext.createScriptProcessor(4096, 1, 1);

    sourceRef.current = source;
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const currentSession = sessionRef.current;

      if (!currentSession) return;

      const currentAudioTrack = streamRef.current?.getAudioTracks()[0];

      if (!currentAudioTrack || !currentAudioTrack.enabled) {
        setUserSpeaking(false);
        return;
      }

      if (currentSession.readyState && currentSession.readyState !== "OPEN") {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);

      let sum = 0;

      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i];
      }

      const rms = Math.sqrt(sum / input.length);

      setUserSpeaking(rms > 0.015);

      const downsampled = downsampleTo16k(input, micContext.sampleRate);

      const pcm16 = floatTo16BitPCM(downsampled);

      const base64Audio = arrayBufferToBase64(pcm16.buffer);

      try {
        currentSession.sendRealtimeInput({
          audio: {
            data: base64Audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch (error) {
        console.error("Audio send error:", error);
      }
    };

    const zeroGain = micContext.createGain();

    zeroGain.gain.value = 0;

    source.connect(processor);

    processor.connect(zeroGain);

    zeroGain.connect(micContext.destination);
  }

  /* =====================================================
     STOP MICROPHONE
  ===================================================== */

  function stopMicrophoneStreaming() {
    try {
      processorRef.current?.disconnect();

      sourceRef.current?.disconnect();
    } catch (error) {
      console.warn(error);
    }

    processorRef.current = null;
    sourceRef.current = null;

    setUserSpeaking(false);
  }

  /* =====================================================
     BUILD RESUME CONTEXT
  ===================================================== */

  function getResumeContext() {
    const text = resumeTextRef.current?.trim();

    if (mode !== "Professional" || !text) {
      return `
=====================================================
RESUME STATUS
=====================================================

No readable resume content is available.

Use the selected job role and candidate answers
to conduct the interview.
`;
    }

    return `
=====================================================
CANDIDATE RESUME — IMPORTANT
=====================================================

The candidate has uploaded a resume.

Resume file:
${receivedResume?.name || "Candidate Resume"}

The following is the TEXT EXTRACTED from the candidate's
actual resume:

---------------- RESUME START ----------------

${text}

----------------- RESUME END -----------------

=====================================================
RESUME-BASED INTERVIEW RULES
=====================================================

You MUST use the resume above as a primary source
for the Professional interview.

You have successfully received the candidate's
resume text.

DO NOT say:
"I cannot access your resume."
"I don't have your resume."
"Please upload your resume."
"I cannot read the resume."

The resume has already been provided to you.

Use information from the resume to ask questions
about:

1. Projects
2. Programming languages
3. Frameworks
4. Technologies
5. Internships
6. Work experience
7. Education
8. Certifications
9. Achievements
10. Skills
11. Tools
12. Responsibilities
13. Technical decisions
14. Problems solved

=====================================================
PROJECT QUESTIONS
=====================================================

If the resume contains a project, ask about
the ACTUAL project.

Example:

Resume:
"NovaCart — E-commerce website using React,
Node.js, Express and MongoDB."

Good question:

"You mentioned building NovaCart using React,
Node.js, Express and MongoDB. Can you explain
how you designed the backend architecture?"

Do NOT ask a completely unrelated generic question
when useful resume information is available.

=====================================================
TECHNOLOGY QUESTIONS
=====================================================

If the resume mentions React:

Ask about the candidate's actual React usage.

If the resume mentions Node.js:

Ask about their backend/API implementation.

If the resume mentions MongoDB:

Ask about schemas, queries, relationships,
indexing or database design relevant to their project.

If the resume mentions Python:

Ask about how they actually used Python.

Do NOT assume the candidate knows a technology
just because it appears on the resume.

Verify their actual understanding.

=====================================================
INTERNSHIP QUESTIONS
=====================================================

If the resume contains an internship:

Ask about:

- Responsibilities
- Tasks
- Technologies
- Problems
- Contributions
- What they learned

Questions should be specific to the internship
information present in the resume.

=====================================================
FOLLOW-UP QUESTIONS
=====================================================

Remember what the candidate says.

If the candidate gives an answer about a resume
project, ask a deeper follow-up about that answer.

Example:

Candidate:
"I used Express to create APIs."

Follow-up:

"How did you structure those APIs and handle
authentication or validation?"

If the candidate gives a strong technical answer,
increase difficulty.

If the candidate gives a weak answer,
ask a simpler clarification question.

=====================================================
IMPORTANT RESUME RULE
=====================================================

Do not read the entire resume aloud.

Do not summarize the resume to the candidate.

Use the resume silently as interview context.

Ask ONE question at a time.

`;
  }

  /* =====================================================
     SYSTEM INSTRUCTION
  ===================================================== */

  function getSystemInstruction() {
    const name = candidateNameRef.current || "Candidate";

    const resumeContext = getResumeContext();

    return `
You are VOXA AI, an advanced real-time AI interviewer.

You are conducting a LIVE voice-to-voice interview
with a candidate.

=====================================================
CANDIDATE INFORMATION
=====================================================

Candidate name:
${name}

Interview mode:
${mode}

Language:
${language}

Target job role:
${jobRole}

${resumeContext}

=====================================================
MOST IMPORTANT INTERVIEW RULE
=====================================================

You are the INTERVIEWER.

Your job is to ask questions.

The candidate is the person being interviewed.

Do not answer questions on behalf of the candidate.

Drive the interview yourself.

Ask ONE clear question at a time.

=====================================================
DO NOT INTRODUCE YOURSELF
=====================================================

NEVER say:

"Hi, I am VOXA AI."

"I am VOXA AI."

"I am an AI interviewer."

"I am an AI trained by Google."

"I am an artificial intelligence."

The candidate already knows this is VOXA AI.

Start the interview directly.

=====================================================
FIRST QUESTION
=====================================================

When the interview starts:

1. Address the candidate by name.
2. Give a short welcome.
3. Immediately ask the first question.

Do not ask:

"Where should we start?"

"How can I help you?"

"What would you like to discuss?"

"Shall we begin?"

You are the interviewer.

YOU decide what to ask.

=====================================================
LANGUAGE
=====================================================

Selected language:

${language}

If English:
Use natural professional English.

If Hindi:
Use natural Hindi.

If Hinglish:
Use natural Indian Hinglish.

Do not unnecessarily translate sentences.

=====================================================
PROFESSIONAL MODE
=====================================================

When mode is Professional:

Target role:
${jobRole}

Conduct a realistic job interview.

Use the candidate's resume as the PRIMARY
personalization source.

Cover relevant areas such as:

- Introduction
- Education
- Projects
- Technical skills
- Programming
- Frameworks
- Databases
- Problem solving
- Software development
- Internship/work experience
- Behavioural questions
- Role-specific knowledge

However, do not mechanically ask all categories.

Follow the natural conversation.

=====================================================
CASUAL MODE
=====================================================

When mode is Casual:

Be friendly and relaxed.

Focus on:

- Communication
- Confidence
- Background
- Goals
- General conversation

The interview should still feel structured.

=====================================================
DYNAMIC INTERVIEW
=====================================================

Do NOT follow a rigid fixed list.

Every question should depend on:

1. The resume
2. The job role
3. The candidate's previous answer
4. The candidate's demonstrated knowledge

If the candidate mentions a project:
Ask about that project.

If the candidate mentions React:
Ask about React usage.

If the candidate mentions Node.js:
Ask about their backend work.

If the candidate mentions MongoDB:
Ask about database design.

If the candidate describes a problem:
Ask how they solved it.

If the candidate gives a weak answer:
Ask a simpler follow-up.

If the candidate gives an excellent answer:
Ask a deeper follow-up.

=====================================================
REAL INTERVIEW BEHAVIOUR
=====================================================

After every candidate answer:

1. Understand the answer.
2. Give a short natural reaction when appropriate.
3. Ask the next relevant question.

Do not repeatedly say:

"Good answer."

"Excellent answer."

"That's a great answer."

Use natural reactions.

Do not give long explanations.

Normally keep your spoken response to
1–3 sentences.

=====================================================
ONE QUESTION AT A TIME
=====================================================

Never ask multiple interview questions together.

Bad:

"Tell me about React, your project and MongoDB."

Good:

"You mentioned using React in your project.
How did you structure the frontend?"

Then wait.

=====================================================
INTERRUPTION
=====================================================

If the candidate starts speaking while you are speaking:

Stop naturally.

Listen to the candidate.

Continue from what the candidate says.

=====================================================
INTERVIEW LENGTH
=====================================================

Continue the interview naturally.

Do not end randomly.

Do not repeatedly ask whether the candidate
wants to continue.

The user controls when the interview ends.

=====================================================
ENDING
=====================================================

When the user explicitly ends the interview:

Thank the candidate briefly.

Do not provide a long speech.

=====================================================
FINAL RULE
=====================================================

The candidate's resume is important.

For Professional mode, use the resume content
to personalize the interview.

Do not claim to have read information that is
not present in the resume.

Do not invent projects, technologies,
experience or qualifications.

Use ONLY information actually provided
in the resume and conversation.

Start the interview immediately.
`;
  }

  /* =====================================================
     CONNECT GEMINI LIVE
  ===================================================== */

  async function connectLive() {
    if (connectingRef.current) return;

    if (liveConnected) return;

    try {
      connectingRef.current = true;

      setConnecting(true);
      setAiError("");

      /* -----------------------------------------------
         PROFESSIONAL RESUME CHECK
      ----------------------------------------------- */

      if (mode === "Professional" && !resumeTextRef.current.trim()) {
        throw new Error("Professional interview requires a readable resume.");
      }

      /* -----------------------------------------------
         MEDIA
      ----------------------------------------------- */

      if (!streamRef.current) {
        await startMedia();
      }

      /* -----------------------------------------------
         CANDIDATE
         ----------------------------------------------- */

      await loadCandidateName();

      /* -----------------------------------------------
         TOKEN
      ----------------------------------------------- */

      const token = await getLiveToken();

      /* -----------------------------------------------
         AUDIO
      ----------------------------------------------- */

      await createAudioContexts();

      /* -----------------------------------------------
         GEMINI
      ----------------------------------------------- */

      const ai = new GoogleGenAI({
        apiKey: token,
      });

      /* -----------------------------------------------
         SYSTEM INSTRUCTION
      ----------------------------------------------- */

      const systemInstruction = getSystemInstruction();

      console.log("=================================");

      console.log("CONNECTING GEMINI WITH RESUME");

      console.log("Resume available:", !!resumeTextRef.current.trim());

      console.log("Resume characters:", resumeTextRef.current.length);

      console.log("Job role:", jobRole);

      console.log("=================================");

      /* -----------------------------------------------
         LIVE SESSION
      ----------------------------------------------- */

      const session = await ai.live.connect({
        model: LIVE_MODEL,

        callbacks: {
          onopen: () => {
            console.log("VOXA AI Live connected.");

            setLiveConnected(true);

            setConnecting(false);

            setAiError("");

            userTranscriptRef.current = "";

            aiTranscriptRef.current = "";

            setUserTranscript("");

            setAiTranscript("");
          },

          onmessage: (message) => {
            handleGeminiMessage(message);
          },

          onerror: (error) => {
            console.error("Gemini Live error:", error);

            setAiError(error?.message || "Gemini Live connection error.");
          },

          onclose: (event) => {
            console.log("Gemini Live closed:", event?.reason);

            setLiveConnected(false);

            setAiSpeaking(false);

            setUserSpeaking(false);
          },
        },

        config: {
          responseModalities: [Modality.AUDIO],

          systemInstruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },

          inputAudioTranscription: {},

          outputAudioTranscription: {},

          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Puck",
              },
            },
          },

          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              prefixPaddingMs: 300,
              silenceDurationMs: 700,
            },
          },

          sessionResumption: {},
        },
      });

      sessionRef.current = session;

      /* -----------------------------------------------
         START MIC
      ----------------------------------------------- */

      await startMicrophoneStreaming(session);

      /* -----------------------------------------------
         OPENING MESSAGE
      ----------------------------------------------- */

      setTimeout(() => {
        try {
          const name = candidateNameRef.current || "Candidate";

          let openingInstruction = "";

          if (language === "Hindi") {
            openingInstruction = `
Interview immediately start karo.

Candidate ka naam ${name} hai.

Target job role:
${jobRole}

${
  mode === "Professional" && resumeTextRef.current.trim()
    ? `
IMPORTANT:

Candidate ka resume tumhe system instructions
mein diya gaya hai.

Resume ko interview ke dauran use karo.

Introduction ke baad resume ke actual
projects, skills ya experience se question pucho.

Resume dobara upload karne ko mat bolo.
`
    : ""
}

Apna introduction bilkul mat dena.

"Main VOXA AI hoon" mat bolna.

Short welcome ke baad seedha pehla question pucho:

"Namaste ${name}, interview mein aapka swagat hai.
Sabse pehle, apne baare mein aur apne background
ke baare mein batayiye."

Uske baad candidate ke answer aur resume ke
basis par interview continue karo.

Ek time par sirf ONE question pucho.
`;
          } else if (language === "Hinglish") {
            openingInstruction = `
Start the interview immediately.

Candidate name:
${name}

Target job role:
${jobRole}

${
  mode === "Professional" && resumeTextRef.current.trim()
    ? `
The candidate's resume has already been provided.

Use the actual resume content to personalize
the interview.

After the introduction, ask about relevant
projects, skills, internship or experience
from the resume.

Do NOT ask the candidate to upload the resume again.
`
    : ""
}

DO NOT introduce yourself.

Do not say "I am VOXA AI."

Address the candidate by name.

Start with:

"Hi ${name}, thanks for joining. Chaliye interview
start karte hain. Sabse pehle, apne baare mein
aur apne background ke baare mein batayiye."

Then continue dynamically using the resume,
job role and candidate answers.

Ask only ONE question at a time.
`;
          } else {
            openingInstruction = `
Start the interview immediately.

Candidate name:
${name}

Target job role:
${jobRole}

${
  mode === "Professional" && resumeTextRef.current.trim()
    ? `
The candidate's actual resume has been provided
in your system instructions.

Use the resume as the primary source for
personalized Professional interview questions.

After the introduction, move into the
candidate's actual projects, skills,
internships and experience.

Do NOT ask the candidate to upload the resume again.
Do NOT say that you cannot access the resume.
`
    : ""
}

DO NOT introduce yourself.

Do not say "I am VOXA AI."

Address the candidate by name.

Start with:

"Hello ${name}, thanks for joining. Let's begin.
Could you briefly introduce yourself and tell me
about your background?"

Then continue the interview dynamically.

Use the resume, job role and previous answers.

Ask only ONE question at a time.
`;
          }

          session.sendRealtimeInput({
            text: openingInstruction,
          });
        } catch (error) {
          console.error("Initial interview message error:", error);
        }
      }, 700);
    } catch (error) {
      console.error("Gemini Live connection failed:", error);

      setAiError(error?.message || "Unable to connect to Gemini Live.");

      setConnecting(false);

      setLiveConnected(false);
    } finally {
      connectingRef.current = false;
    }
  }

  /* =====================================================
     HANDLE GEMINI MESSAGE
  ===================================================== */

  function handleGeminiMessage(message) {
    if (!message) return;

    /* -----------------------------------------------
       INTERRUPTION
    ----------------------------------------------- */

    if (message?.serverContent?.interrupted) {
      stopAIPlayback();
    }

    /* -----------------------------------------------
       AUDIO RESPONSE
    ----------------------------------------------- */

    const parts = message?.serverContent?.modelTurn?.parts || [];

    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "";

        if (mimeType.startsWith("audio/pcm")) {
          playGeminiAudio(part.inlineData.data);
        }
      }
    }

    /* -----------------------------------------------
       USER TRANSCRIPTION
    ----------------------------------------------- */

    const inputText = message?.serverContent?.inputTranscription?.text;

    if (inputText) {
      userTranscriptRef.current += inputText;

      setUserTranscript(userTranscriptRef.current);
    }

    /* -----------------------------------------------
       AI TRANSCRIPTION
    ----------------------------------------------- */

    const outputText = message?.serverContent?.outputTranscription?.text;

    if (outputText) {
      aiTranscriptRef.current += outputText;

      setAiTranscript(aiTranscriptRef.current);
    }

    /* -----------------------------------------------
       TURN COMPLETE
    ----------------------------------------------- */

    if (message?.serverContent?.turnComplete) {
      setUserSpeaking(false);

      const userText = userTranscriptRef.current.trim();

      const aiText = aiTranscriptRef.current.trim();

      if (userText || aiText) {
        setConversation((previous) => {
          const updated = [...previous];

          if (userText) {
            updated.push({
              role: "user",
              text: userText,
            });
          }

          if (aiText) {
            updated.push({
              role: "ai",
              text: aiText,
            });
          }

          return updated.slice(-20);
        });
      }

      userTranscriptRef.current = "";

      aiTranscriptRef.current = "";

      setUserTranscript("");

      setAiTranscript("");
    }
  }

  /* =====================================================
     TOGGLE MIC
  ===================================================== */

  function toggleMic() {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;

    setMicOn(audioTrack.enabled);

    if (!audioTrack.enabled) {
      setUserSpeaking(false);
    }
  }

  /* =====================================================
     TOGGLE CAMERA
  ===================================================== */

  function toggleCamera() {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;

    setCameraOn(videoTrack.enabled);
  }

  /* =====================================================
     TOGGLE SPEAKER
  ===================================================== */

  async function toggleSpeaker() {
    const newValue = !speakerOn;

    setSpeakerOn(newValue);

    if (newValue) {
      try {
        await audioContextRef.current?.resume();
      } catch (error) {
        console.warn(error);
      }
    }
  }

  /* =====================================================
     CHANGE LANGUAGE
  ===================================================== */

  function changeLanguage(newLanguage) {
    setLanguage(newLanguage);

    setAiError("Language changed. Start a new Live session to apply it.");
  }

  /* =====================================================
     CHANGE MODE
  ===================================================== */

  function changeMode(newMode) {
    setMode(newMode);

    setAiError("Interview mode changed. Start a new Live session to apply it.");
  }

  /* =====================================================
     CLEANUP LIVE
  ===================================================== */

  function cleanupLive() {
    stopMicrophoneStreaming();

    try {
      sessionRef.current?.close();
    } catch (error) {
      console.warn(error);
    }

    sessionRef.current = null;

    stopAIPlayback();

    try {
      audioContextRef.current?.close();
    } catch (error) {
      console.warn(error);
    }

    try {
      micContextRef.current?.close();
    } catch (error) {
      console.warn(error);
    }

    audioContextRef.current = null;
    micContextRef.current = null;

    setLiveConnected(false);
    setAiSpeaking(false);
    setUserSpeaking(false);
  }

  /* =====================================================
     END INTERVIEW
  ===================================================== */

  function endInterview() {
    cleanupLive();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    streamRef.current = null;

    navigate("/dashboard");
  }

  /* =====================================================
     STATUS
  ===================================================== */

  const statusText = connecting
    ? "Connecting to Gemini..."
    : liveConnected
      ? aiSpeaking
        ? "VOXA AI is speaking..."
        : userSpeaking
          ? "Listening to you..."
          : "Live • Speak naturally"
      : "Live interview not started";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="live-interview-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="live-header">
        <div className="live-brand">
          <div className="live-logo">
            VOXA <span>AI</span>
          </div>

          <div className="live-status">
            <span
              className={`recording-dot ${liveConnected ? "" : "offline"}`}
            />

            {liveConnected ? "LIVE INTERVIEW" : "READY"}
          </div>
        </div>

        <div className="live-header-right">
          <div className="interview-timer">
            <Clock3 size={16} />

            {formatTime()}
          </div>

          <div className="question-counter">
            {liveConnected ? "LIVE" : "NOT CONNECTED"}
          </div>
        </div>
      </header>

      {/* =================================================
          RESUME STATUS
      ================================================= */}

      {mode === "Professional" && (
        <div
          style={{
            margin: "12px 20px",
            padding: "10px 14px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: resumeAvailable
              ? "rgba(34,197,94,0.08)"
              : "rgba(239,68,68,0.08)",
            border: resumeAvailable
              ? "1px solid rgba(34,197,94,0.2)"
              : "1px solid rgba(239,68,68,0.2)",
            fontSize: "13px",
          }}
        >
          <FileText size={16} />

          {resumeAvailable
            ? `Resume loaded • ${resumeText.length.toLocaleString()} characters • Gemini will use your resume`
            : "Resume context is not available"}
        </div>
      )}

      {/* =================================================
          SETTINGS
      ================================================= */}

      <div className="interview-settings">
        {/* LANGUAGE */}

        <div className="setting-group">
          <div className="setting-title">
            <Languages size={16} />
            Language
          </div>

          <div className="setting-buttons">
            {["English", "Hindi", "Hinglish"].map((item) => (
              <button
                key={item}
                className={`setting-btn ${language === item ? "active" : ""}`}
                onClick={() => changeLanguage(item)}
                disabled={liveConnected}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* MODE */}

        <div className="setting-group">
          <div className="setting-title">
            <BriefcaseBusiness size={16} />
            Interview Mode
          </div>

          <div className="setting-buttons">
            <button
              className={`setting-btn ${
                mode === "Professional" ? "active" : ""
              }`}
              onClick={() => changeMode("Professional")}
              disabled={liveConnected}
            >
              Professional
            </button>

            <button
              className={`setting-btn ${mode === "Casual" ? "active" : ""}`}
              onClick={() => changeMode("Casual")}
              disabled={liveConnected}
            >
              Casual
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {aiError && (
        <div className="permission-error">
          <AlertTriangle size={18} />

          <span>{aiError}</span>
        </div>
      )}

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="live-interview-main">
        {/* =================================================
            AI PANEL
        ================================================= */}

        <section className="ai-interviewer-panel">
          <div className="ai-panel-header">
            <div className="ai-avatar">
              <Sparkles size={22} />
            </div>

            <div>
              <strong>VOXA AI Interviewer</strong>

              <span>
                Gemini Live • {mode} • {language}
              </span>
            </div>
          </div>

          {/* AI FACE */}

          <div className="ai-face">
            <div className="ai-glow"></div>

            <div className={`ai-face-core ${aiSpeaking ? "ai-speaking" : ""}`}>
              <Sparkles size={45} />
            </div>

            <div className="voice-waves">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          {/* STATUS */}

          <div className="ai-question">
            <div className="question-label">
              <MessageCircle size={13} />
              REAL-TIME AI
            </div>

            <h2>{statusText}</h2>

            <p>
              {language === "Hindi"
                ? `${candidateName}, आप सीधे बोलकर VOXA AI interview दे सकते हैं।`
                : language === "Hinglish"
                  ? `${candidateName}, aap directly bolkar VOXA AI interview de sakte ho.`
                  : `${candidateName}, speak naturally. VOXA AI will conduct your interview in real time.`}
            </p>

            {/* START */}

            {!liveConnected && (
              <button
                className="speak-button"
                onClick={connectLive}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 size={17} className="spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    Start Live AI
                  </>
                )}
              </button>
            )}

            {/* SPEAK */}

            {liveConnected && (
              <button
                className={`speak-button ${aiSpeaking ? "speaking" : ""}`}
                onClick={() => audioContextRef.current?.resume()}
              >
                {aiSpeaking ? (
                  <>
                    <Volume2 size={17} />
                    AI Speaking...
                  </>
                ) : (
                  <>
                    <MessageCircle size={17} />
                    Speak Now
                  </>
                )}
              </button>
            )}
          </div>

          {/* TRANSCRIPTS */}

          <div
            style={{
              marginTop: "18px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {userTranscript && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <small>You</small>

                <div>{userTranscript}</div>
              </div>
            )}

            {aiTranscript && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(120,80,255,0.08)",
                  border: "1px solid rgba(120,80,255,0.15)",
                }}
              >
                <small>VOXA AI</small>

                <div>{aiTranscript}</div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            CAMERA PANEL
        ================================================= */}

        <section className="camera-panel">
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={!cameraOn ? "camera-off" : ""}
            />

            {!cameraOn && (
              <div className="camera-disabled">
                <VideoOff size={40} />

                <span>Camera is off</span>
              </div>
            )}

            <div className="camera-top-info">
              <span
                className={`recording-dot ${liveConnected ? "" : "offline"}`}
              />

              {liveConnected ? "LIVE" : "Camera"}
            </div>

            <div className="camera-role">{candidateName}</div>

            <div className="camera-mic-indicator">
              {micOn ? <Mic size={15} /> : <MicOff size={15} />}
            </div>
          </div>

          {/* LIVE INFO */}

          <div className="ai-reaction-box">
            <div className="reaction-left">
              <div className="reaction-icon">
                <Brain size={17} />
              </div>

              <div>
                <strong>Gemini Live</strong>

                <span>{statusText}</span>
              </div>
            </div>

            <div
              className={liveConnected ? "reaction-good" : "reaction-neutral"}
            >
              {liveConnected ? "CONNECTED" : "OFFLINE"}
            </div>
          </div>

          {/* CONVERSATION */}

          {conversation.length > 0 && (
            <div className="ai-feedback-box">
              <div className="feedback-title">
                <MessageCircle size={16} />
                Live Conversation
              </div>

              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                }}
              >
                {conversation.slice(-6).map((item, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "10px",
                    }}
                  >
                    <small>
                      {item.role === "user" ? candidateName : "VOXA AI"}
                    </small>

                    <p
                      style={{
                        marginTop: "3px",
                      }}
                    >
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTROLS */}

          <div className="interview-controls">
            {/* MIC */}

            <button
              className={`control-btn ${!micOn ? "off" : ""}`}
              onClick={toggleMic}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic size={21} /> : <MicOff size={21} />}
            </button>

            {/* CAMERA */}

            <button
              className={`control-btn ${!cameraOn ? "off" : ""}`}
              onClick={toggleCamera}
              title={cameraOn ? "Camera Off" : "Camera On"}
            >
              {cameraOn ? <Video size={21} /> : <VideoOff size={21} />}
            </button>

            {/* SPEAKER */}

            <button
              className={`control-btn ${!speakerOn ? "off" : ""}`}
              onClick={toggleSpeaker}
              title={speakerOn ? "Speaker On" : "Speaker Off"}
            >
              {speakerOn ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>

            {/* END */}

            <button className="end-call-btn" onClick={endInterview}>
              <PhoneOff size={19} />
              End
            </button>
          </div>

          {/* SECURITY */}

          <div className="interview-security">
            <ShieldCheck size={15} />

            <span>
              VOXA AI uses your microphone only during the active Live interview
              session.
            </span>
          </div>
        </section>
      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="live-footer">
        <span>VOXA AI • Gemini Live</span>

        <span>
          {mode} • {language}
        </span>
      </footer>
    </div>
  );
}

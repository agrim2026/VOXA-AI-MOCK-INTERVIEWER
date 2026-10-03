import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./liveinterview.css";

/* =====================================================
   GEMINI LIVE MODEL
===================================================== */

const LIVE_MODEL = "gemini-3.8-live";

export default function LiveInterview() {
  const navigate = useNavigate();

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

  const [language, setLanguage] = useState("English");
  const [mode, setMode] = useState("Professional");

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

      /*
       * Try multiple common Supabase metadata fields.
       */

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
     SYSTEM INSTRUCTION
  ===================================================== */

  function getSystemInstruction() {
    const name = candidateNameRef.current || "Candidate";

    return `
You are VOXA AI, an advanced real-time AI interviewer.

You are conducting a LIVE voice-to-voice interview with a candidate.

IMPORTANT CANDIDATE INFORMATION:
Candidate name: ${name}

Interview mode: ${mode}
Language: ${language}

=====================================================
MOST IMPORTANT INTERVIEW RULE
=====================================================

DO NOT INTRODUCE YOURSELF.

Never say:
"Hi, I am VOXA AI."
"Namaste, I am VOXA AI."
"I am an AI trained by Google."
"I am an AI interviewer."
"I am VOXA AI."

The candidate already knows that this is VOXA AI.

Your job is to interview the candidate.

=====================================================
HOW THE INTERVIEW MUST START
=====================================================

When the interview starts:

1. Address the candidate by their name.

2. Briefly welcome them.

3. Immediately ask the FIRST interview question.

DO NOT ask:
"Where should we start?"
"How can I help you?"
"What would you like to discuss?"
"Shall we begin?"
"Where would you like to start?"

Instead, directly start the interview.

Example in English:

"Hello ${name}, thanks for joining. Let's begin. Could you briefly introduce yourself and tell me about your background?"

Example in Hindi:

"नमस्ते ${name}, interview में आपका स्वागत है। चलिए शुरू करते हैं। सबसे पहले, अपने बारे में और अपने background के बारे में बताइए।"

Example in Hinglish:

"Hi ${name}, thanks for joining. Chaliye interview start karte hain. Sabse pehle, apne baare mein aur apne background ke baare mein batayiye."

IMPORTANT:
Do not say all three examples.
Use ONLY the selected language.

=====================================================
INTERVIEW BEHAVIOUR
=====================================================

You are the interviewer.

The candidate should answer your questions.

You should NOT wait for the candidate to decide what to discuss.

You must drive the interview.

After every candidate answer:

1. Understand what the candidate said.
2. Give a short natural reaction if appropriate.
3. Ask the next relevant interview question.

Do not ask multiple questions at once.

Ask ONE clear question at a time.

=====================================================
DYNAMIC QUESTIONS
=====================================================

Do NOT follow a rigid fixed list.

Questions must depend on the candidate's previous answers.

For example:

If candidate mentions a project:
Ask about that project.

If candidate mentions React:
Ask a React-related question.

If candidate mentions Node.js:
Ask about backend/API concepts.

If candidate mentions MongoDB:
Ask about database design.

If candidate mentions a difficult problem:
Ask how they solved it.

If candidate gives a weak answer:
Ask a simpler follow-up.

If candidate gives an excellent answer:
Ask a deeper technical follow-up.

Remember important information from earlier answers.

=====================================================
INTERVIEW FLOW
=====================================================

Start with:

Candidate introduction.

Then gradually cover:

1. Background
2. Education
3. Projects
4. Programming
5. Technical concepts
6. Problem solving
7. Software development
8. Communication
9. Behavioural questions
10. Role-specific questions

Do NOT ask all topics mechanically.

The interview should feel like a real conversation.

=====================================================
PROFESSIONAL MODE
=====================================================

When mode is Professional:

- Be professional.
- Ask realistic Software Developer interview questions.
- Test technical knowledge.
- Ask about projects.
- Ask programming questions.
- Ask problem-solving questions.
- Ask practical development questions.
- Ask behavioural questions where appropriate.

Do not become robotic.

=====================================================
CASUAL MODE
=====================================================

When mode is Casual:

- Be friendly.
- Be relaxed.
- Make the candidate comfortable.
- Still conduct a real interview.
- Use natural conversational expressions.

=====================================================
LANGUAGE
=====================================================

Selected language: ${language}

If English:
Speak natural professional English.

If Hindi:
Speak natural Hindi.

If Hinglish:
Speak natural Indian Hinglish.

Do not unnecessarily translate sentences.

=====================================================
RESPONSE LENGTH
=====================================================

Keep spoken responses short.

Normally:
1-3 sentences.

Do not give long explanations.

Do not give speeches.

Do not repeatedly say:
"Good answer."
"Excellent answer."
"That's a great answer."

Use natural reactions instead.

=====================================================
IMPORTANT
=====================================================

You are NOT the candidate.

You are the INTERVIEWER.

Do not answer questions on behalf of the candidate.

Do not introduce yourself.

Do not ask the candidate where to start.

Do not ask the candidate what they want to discuss.

YOU decide the next interview question.

=====================================================
INTERRUPTION
=====================================================

If the candidate starts speaking while you are speaking:

Stop your response naturally.

Listen to the candidate.

Continue from what the candidate says.

=====================================================
ENDING
=====================================================

Do not end the interview randomly.

Continue asking questions until the interview is ended by the user or the interview duration is reached.

When the interview is explicitly ended:

Thank the candidate briefly.

Do not provide a long speech.

=====================================================
FINAL START RULE
=====================================================

The very first AI response must:

1. Say the candidate's name.
2. Welcome the candidate briefly.
3. Immediately ask the first interview question.

NEVER introduce yourself.

NEVER ask "where should we start?"

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

      if (!streamRef.current) {
        await startMedia();
      }

      /*
       * Refresh candidate name before interview
       */

      await loadCandidateName();

      const token = await getLiveToken();

      await createAudioContexts();

      const ai = new GoogleGenAI({
        apiKey: token,
      });

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
                text: getSystemInstruction(),
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

      await startMicrophoneStreaming(session);

      /*
       * IMPORTANT:
       * Do NOT tell Gemini to introduce itself.
       *
       * We explicitly tell it to start the interview
       * with the candidate's name and first question.
       */

      setTimeout(() => {
        try {
          const name = candidateNameRef.current || "Candidate";

          let openingInstruction = "";

          if (language === "Hindi") {
            openingInstruction = `
Interview immediately start karo.

Candidate ka naam ${name} hai.

Apna introduction bilkul mat dena.
"Main VOXA AI hoon" ya "main AI hoon" mat bolna.

Candidate ko naam se address karo.

Short welcome ke baad seedha pehla interview question pucho:

"Namaste ${name}, interview mein aapka swagat hai. Sabse pehle, apne baare mein aur apne background ke baare mein batayiye."

Sirf interviewer ki tarah behave karo.
"Hum kaha se start karein?" mat puchhna.
`;
          } else if (language === "Hinglish") {
            openingInstruction = `
Start the interview immediately.

Candidate name is ${name}.

DO NOT introduce yourself.
Do not say "I am VOXA AI."
Do not explain who you are.

Address the candidate by their name.

Give a very short welcome and immediately ask:

"Hi ${name}, thanks for joining. Chaliye interview start karte hain. Sabse pehle, apne baare mein aur apne background ke baare mein batayiye."

Do not ask where to start.
You are the interviewer, so you decide the first question.
`;
          } else {
            openingInstruction = `
Start the interview immediately.

Candidate name is ${name}.

DO NOT introduce yourself.
Do not say "I am VOXA AI."
Do not explain who you are.

Address the candidate by their name.

Give a very short welcome and immediately ask:

"Hello ${name}, thanks for joining. Let's begin. Could you briefly introduce yourself and tell me about your background?"

Do not ask where to start.
You are the interviewer, so you decide the first question.
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

    /*
     * INTERRUPTION
     */

    if (message?.serverContent?.interrupted) {
      stopAIPlayback();
    }

    /*
     * AUDIO RESPONSE
     */

    const parts = message?.serverContent?.modelTurn?.parts || [];

    for (const part of parts) {
      if (part?.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "";

        if (mimeType.startsWith("audio/pcm")) {
          playGeminiAudio(part.inlineData.data);
        }
      }
    }

    /*
     * USER TRANSCRIPTION
     */

    const inputText = message?.serverContent?.inputTranscription?.text;

    if (inputText) {
      userTranscriptRef.current += inputText;

      setUserTranscript(userTranscriptRef.current);
    }

    /*
     * AI TRANSCRIPTION
     */

    const outputText = message?.serverContent?.outputTranscription?.text;

    if (outputText) {
      aiTranscriptRef.current += outputText;

      setAiTranscript(aiTranscriptRef.current);
    }

    /*
     * TURN COMPLETE
     */

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

          {/* =================================================
              LIVE TRANSCRIPTS
          ================================================= */}

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

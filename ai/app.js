import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

(() => {
  const modes = {
    cambridge: {
      title: "Cambridge speaking practice",
      goal: "Give a clear answer and support it with reasons and examples.",
      first: "Let's practise giving a developed speaking answer. Describe a skill you would like to learn and explain why it matters to you. Try to give a reason and a real example.",
      follow: "Good start. Can you add one specific example and connect it to your main reason?",
      retry: "Try again. Use this simple structure: point → reason → example. Aim for two or three connected sentences.",
      short: "Your idea is clear. To develop a stronger answer, add a reason and a specific example rather than stopping after one sentence."
    },
    young: {
      title: "Young learner discovery · sample only",
      goal: "Use familiar vocabulary to describe something you can see, with a complete sentence.",
      first: "Welcome! Let's explore together. Imagine you are in a park. What can you see? Try one full sentence, such as “I can see a green tree.”",
      follow: "Lovely effort! Can you add a colour or describe what the thing is doing?",
      retry: "Try one more time. Start with “I can see…” and add one describing word.",
      short: "Well done for having a go. Let's make the sentence a little more complete by adding a colour, size or action."
    },
    business: {
      title: "Business English role-play",
      goal: "Give a clear, professional project update and explain the next action.",
      first: "You are in a short project meeting. A colleague asks: “Could you give us an update on the timeline and any current risks?” Reply as you would at work. Include the status and one next action.",
      follow: "That gives the team a useful update. What is the next action, who owns it, and when will it happen?",
      retry: "Try again using this structure: current status → impact → next action → owner or date.",
      short: "Your message is understandable. To sound more effective in a meeting, make the status explicit and finish with a concrete next action."
    }
  };

  const cfg = window.TEACHER_SARA_AI_CONFIG || {};
  const configured = cfg.configured === true && !!cfg.supabaseUrl && !!cfg.supabasePublishableKey;
  const supabase = configured
    ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const cards = [...document.querySelectorAll("[data-mode]")];
  const title = document.getElementById("session-title");
  const goal = document.getElementById("goal-text");
  const level = document.getElementById("level-select");
  const lengthSelect = document.getElementById("length-select");
  const sessionTimer = document.getElementById("session-timer");
  const sessionModeBadge = document.getElementById("session-mode-badge");
  const levelRating = document.getElementById("level-rating");
  const levelFeedback = document.getElementById("level-feedback");
  const chatArea = document.getElementById("chat-area");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const send = document.getElementById("send-button");
  const start = document.getElementById("start-button");
  const authCard = document.getElementById("auth-card");
  const accountCard = document.getElementById("account-card");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authName = document.getElementById("auth-name");
  const adultConsent = document.getElementById("adult-consent");
  const authStatus = document.getElementById("auth-status");
  const signInButton = document.getElementById("sign-in-button");
  const signUpButton = document.getElementById("sign-up-button");
  const signOutButton = document.getElementById("sign-out-button");
  const accountIdentity = document.getElementById("account-identity");
  const usageCount = document.getElementById("usage-count");
  const usageFill = document.getElementById("usage-fill");
  const planLabel = document.getElementById("plan-label");
  const upgradeButton = document.getElementById("upgrade-button");
  const manageBillingButton = document.getElementById("manage-billing-button");
  const billingNote = document.getElementById("billing-note");
  const voiceControls = document.getElementById("voice-controls");
  const voiceStartButton = document.getElementById("voice-start-button");
  const voiceStopButton = document.getElementById("voice-stop-button");
  const voiceStatus = document.getElementById("voice-status");

  let mode = "cambridge";
  let turn = 0;
  let session = null;
  let conversation = [];
  let selfRating = "right_level";
  let activeSessionId = null;
  let sessionStartedAt = null;
  let sessionTimerInterval = null;
  let sessionEndsAt = null;
  let paidPlanConfigured = false;
  let realtimeVoiceEnabled = false;
  let voicePeer = null;
  let voiceStream = null;
  let voiceChannel = null;
  let voiceAudio = null;
  let voiceLimitTimer = null;
  let voiceCloseTimer = null;
  let voiceCloseResolver = null;
  let voiceClosing = false;

  function setVoiceStatus(message, live = false) {
    if (!voiceStatus) return;
    voiceStatus.textContent = message;
    voiceStatus.classList.toggle("voice-live", live);
  }

  function setAuthMessage(message, isError = false) {
    if (!authStatus) return;
    authStatus.textContent = message;
    authStatus.style.color = isError ? "#9a4b3e" : "";
  }

  function setBillingMessage(message) {
    if (billingNote) billingNote.textContent = message;
  }

  function addMessage(kind, label, text) {
    const node = document.createElement("div");
    node.className = "message " + kind;
    const speaker = document.createElement("span");
    speaker.className = "speaker";
    speaker.textContent = label;
    const content = document.createElement("span");
    content.textContent = text;
    node.append(speaker, content);
    chatArea.append(node);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function addFeedback(original, correction, explanation) {
    const box = document.createElement("div");
    box.className = "feedback-card";
    const heading = document.createElement("strong");
    heading.textContent = "One useful improvement";
    const originalLine = document.createElement("span");
    originalLine.className = "phrase";
    originalLine.textContent = "You wrote: " + original;
    const correctionLine = document.createElement("span");
    correctionLine.className = "phrase";
    correctionLine.textContent = "Try: " + correction;
    const why = document.createElement("span");
    why.className = "phrase";
    why.textContent = "Why: " + explanation;
    box.append(heading, originalLine, correctionLine, why);
    chatArea.append(box);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function setSelfRating(value) {
    if (!["too_easy", "right_level", "too_difficult"].includes(value)) return;
    selfRating = value;
    levelRating?.querySelectorAll("[data-rating]").forEach(button => {
      const selected = button.dataset.rating === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (levelFeedback) {
      const messages = { too_easy: "Thanks. The next activity will be a little more demanding.", right_level: "Great. We will keep the practice around this level.", too_difficult: "Thanks. The next activity will use simpler language and more support." };
      levelFeedback.textContent = (!session || mode === "young")
        ? "This rating will guide the live tutor once you are signed in."
        : messages[value];
    }
  }

  function updateSessionTimer() {
    if (!sessionEndsAt || !sessionTimer) return;
    const remaining = Math.max(0, Math.ceil((sessionEndsAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60), seconds = remaining % 60;
    sessionTimer.textContent = minutes + ":" + String(seconds).padStart(2, "0") + " remaining";
    if (remaining > 0) return;
    window.clearInterval(sessionTimerInterval); sessionTimerInterval = null;
    input.disabled = true; send.disabled = true;
    addMessage("coach", "PRACTICE COMPLETE", "You have reached the end of this practice slot. Review your feedback, then start a fresh session when ready.");
    const restart = document.createElement("button");
    restart.type = "button"; restart.className = "button primary start-button"; restart.textContent = "Start another session →";
    restart.addEventListener("click", () => { resetSession(); startSession(); });
    chatArea.append(restart); chatArea.scrollTop = chatArea.scrollHeight;
  }

  function beginSessionClock() {
    if (sessionTimerInterval) window.clearInterval(sessionTimerInterval);
    const minutes = Number.parseInt(lengthSelect?.value || "8", 10) || 8;
    sessionStartedAt = Date.now(); sessionEndsAt = sessionStartedAt + minutes * 60000;
    updateSessionTimer(); sessionTimerInterval = window.setInterval(updateSessionTimer, 1000);
  }

  function selectMode(next) {
    mode = next;
    if (levelRating) levelRating.hidden = mode === "young";
    cards.forEach(card => {
      const active = card.dataset.mode === mode;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", String(active));
    });
    title.textContent = modes[mode].title;
    goal.textContent = modes[mode].goal;
    if (voiceControls) voiceControls.hidden = !realtimeVoiceEnabled || mode === "young";
    if (voicePeer) void stopVoiceSession("Practice track changed. The microphone has been disconnected.");
    if (mode === "young") {
      level.innerHTML = '<option value="Pre-A1">Pre-A1 · Starter</option><option value="A1">A1 · Beginner</option><option value="A2">A2 · Elementary</option>';
    } else if (mode === "business") {
      level.innerHTML = '<option value="B1">B1 · Intermediate</option><option value="B2">B2 · Upper intermediate</option><option value="C1">C1 · Advanced</option>';
    } else {
      level.innerHTML = '<option value="B1">B1 · Intermediate</option><option value="A2">A2 · Elementary</option><option value="B2">B2 · Upper intermediate</option><option value="C1">C1 · Advanced</option>';
    }
    resetSession();
  }

  function resetSession() {
    if (sessionTimerInterval) window.clearInterval(sessionTimerInterval);
    sessionTimerInterval = null; sessionEndsAt = null; sessionStartedAt = null; activeSessionId = null;
    turn = 0; conversation = [];
    if (sessionTimer) { const minutes = Number.parseInt(lengthSelect?.value || "8", 10) || 8; sessionTimer.textContent = "Ready · " + minutes + ":00"; }
    if (sessionModeBadge) sessionModeBadge.textContent = session ? "LIVE AI" : "SAMPLE";
    setSelfRating("right_level");
    chatArea.innerHTML = "";
    const state = document.createElement("div");
    state.className = "empty-state";
    const sparkle = document.createElement("div");
    sparkle.className = "empty-spark";
    sparkle.textContent = "✳";
    const strong = document.createElement("strong");
    strong.textContent = "Your coach is ready when you are.";
    const p = document.createElement("p");
    p.textContent = mode === "young"
      ? "This is a sample preview only. Real child accounts are not enabled until parent controls and safeguarding are complete."
      : "Start a structured lesson with a clear goal, useful feedback and a chance to try again.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button primary start-button";
    button.textContent = "Start sample lesson →";
    button.addEventListener("click", startSession);
    state.append(sparkle, strong, p, button);
    chatArea.append(state);
    input.disabled = true;
    send.disabled = true;
  }

  function startSession() {
    chatArea.innerHTML = "";
    activeSessionId = crypto.randomUUID(); beginSessionClock();
    if (sessionModeBadge) sessionModeBadge.textContent = mode === "young" || !session ? "SAMPLE" : "LIVE AI";
    conversation = [{ role: "assistant", content: modes[mode].first }];
    addMessage("coach", "TEACHER SARA AI · " + (mode === "young" ? "SAMPLE" : "COACH"), modes[mode].first);
    input.disabled = false;
    send.disabled = false;
    input.focus();
    if (mode === "young") {
      addMessage("coach", "PARENT & TEACHER SAFETY", "This child activity is a scripted demonstration only. Real child accounts and AI chat are disabled for the pilot.");
    } else if (session && supabase) {
      addMessage("coach", "LIVE AI", "Your next response will be handled by the secure Teacher Sara AI service. Your chat is kept in this browser session and is not saved as a transcript.");
    } else {
      addMessage("coach", "SAMPLE MODE", "You are using the scripted preview. Sign in after the secure account connection is configured to try live AI practice.");
    }
  }

  function sampleCorrection(text) {
    const lower = text.toLowerCase();
    if (/\bi am agree\b/.test(lower)) {
      return { correction: text.replace(/\bi am agree\b/i, "I agree"), explanation: "“Agree” is a verb. We say “I agree”, not “I am agree”." };
    }
    if (/\bdiscuss about\b/i.test(lower)) {
      return { correction: text.replace(/discuss about/i, "discuss"), explanation: "“Discuss” takes its object directly: “discuss the plan”, not “discuss about the plan”." };
    }
    if (/\binformations\b/i.test(lower)) {
      return { correction: text.replace(/informations/gi, "information"), explanation: "“Information” is uncountable in English, so it does not normally take a plural -s." };
    }
    if (/\byesterday\b/i.test(lower) && /\bgo\b/i.test(lower) && !/\bwent\b/i.test(lower)) {
      return { correction: text.replace(/\bgo\b/i, "went"), explanation: "For a completed action yesterday, use the past form “went”." };
    }
    return null;
  }

  async function showFunctionError(error) {
    if (!error) return "The service could not complete that request. Please try again.";
    let message = error.message || "The service could not complete that request.";
    try {
      if (error.context && typeof error.context.json === "function") {
        const payload = await error.context.json();
        if (payload?.message) message = payload.message;
        if (payload?.error === "monthly_limit_reached") message = "You've used this month's free practice allowance. Choose a plan in your account area to continue.";
        if (payload?.error === "ai_not_configured") message = "Your account is ready, but the AI service still needs its secure server configuration.";
        if (payload?.error === "child_mode_not_enabled") message = "Real child accounts are not enabled yet. This is a sample activity only.";
      }
    } catch (_) { /* Keep the original service message. */ }
    return message;
  }

  async function liveTutorReply() {
    const { data, error } = await supabase.functions.invoke("tutor", {
      body: {
        track: mode === "cambridge" ? "cambridge" : mode,
        level: level.value,
        messages: conversation.slice(-10),
        sessionId: activeSessionId,
        selfRating
      }
    });
    if (error) throw new Error(await showFunctionError(error));
    if (!data?.reply) throw new Error("The tutor returned an empty response. Please try again.");
    return data;
  }

  async function handleAnswer(text) {
    const clean = text.trim();
    if (!clean) return;
    addMessage("learner", "YOUR ANSWER", clean);

    if (mode !== "young" && session && supabase) {
      conversation.push({ role: "user", content: clean });
      input.disabled = true;
      send.disabled = true;
      addMessage("coach", "TEACHER SARA AI", "Thinking through your answer…");
      const pending = chatArea.lastElementChild;
      const requestSessionId = activeSessionId;
      try {
        const result = await liveTutorReply();
        if (requestSessionId !== activeSessionId) return;
        if (result.sessionId) activeSessionId = result.sessionId;
        if (pending?.parentNode) pending.remove();
        addMessage("coach", "TEACHER SARA AI", result.reply);
        if (result.encouragement) addMessage("coach", "WHAT WORKED", result.encouragement);
        if (result.correction) addFeedback(clean, result.correction, result.explanation || "");
        if (result.retryPrompt) addMessage("coach", "TRY IT AGAIN", result.retryPrompt);
        if (result.nextStep) addMessage("coach", "NEXT STEP", result.nextStep);
        if (Array.isArray(result.skillEvidence) && result.skillEvidence.length) {
          const skills = [...new Set(result.skillEvidence.map(item => item.skill).filter(Boolean))];
          if (skills.length) addMessage("coach", "SKILLS PRACTISED", skills.join(" · "));
        }
        const assistantContext = [
          result.reply,
          result.encouragement ? "What worked: " + result.encouragement : "",
          result.correction ? "Correction: " + result.correction + ". " + (result.explanation || "") : "",
          result.retryPrompt ? "Retry: " + result.retryPrompt : "",
          result.nextStep ? "Next step: " + result.nextStep : ""
        ].filter(Boolean).join("\n");
        conversation.push({ role: "assistant", content: assistantContext });
        turn += 1;
        await refreshAccountStatus();
      } catch (error) {
        if (requestSessionId === activeSessionId) {
          if (pending?.parentNode) pending.remove();
          const message = error?.message || "Something went wrong. Please try again.";
          addMessage("coach", "A QUICK NOTE", message);
          if (/monthly|allowance|plan|upgrade/i.test(message)) {
            setBillingMessage(message);
            upgradeButton.hidden = !paidPlanConfigured;
          }
        }
      } finally {
        if (requestSessionId === activeSessionId) {
          const practiceExpired = Boolean(sessionEndsAt && Date.now() >= sessionEndsAt);
          input.disabled = practiceExpired || !sessionStartedAt;
          send.disabled = practiceExpired || !sessionStartedAt;
          if (!practiceExpired && sessionStartedAt) input.focus();
        }
      }
      return;
    }

    const feedback = sampleCorrection(clean);
    if (feedback) addFeedback(clean, feedback.correction, feedback.explanation);
    else if (clean.split(/\s+/).length < 9) addMessage("coach", "SAMPLE COACH", modes[mode].short);
    else addMessage("coach", "SAMPLE COACH", modes[mode].follow);
    turn += 1;
    if (turn >= 2) {
      addMessage("coach", "NEXT STEP", modes[mode].retry);
      turn = 0;
    }
  }

  async function refreshAccountStatus() {
    if (!supabase || !session) return;
    try {
      const [{ data: statusData, error: statusError }, { data: planData, error: planError }] = await Promise.all([
        supabase.functions.invoke("billing", { body: { action: "status" } }),
        supabase.functions.invoke("billing", { body: { action: "plans" } })
      ]);
      if (statusError || !statusData) {
        usageCount.textContent = "—";
        usageFill.style.width = "0%";
        planLabel.textContent = "Account details unavailable";
        realtimeVoiceEnabled = false;
        if (voiceControls) voiceControls.hidden = true;
        upgradeButton.hidden = true;
        manageBillingButton.hidden = true;
        setBillingMessage("You're signed in, but we couldn't load your account details. Your sign-in is still active. Refresh this page to retry; no payment has been taken.");
        return;
      }

      {
        const used = Number(statusData.usage?.used ?? 0);
        const limit = Number(statusData.usage?.limit ?? 10);
        usageCount.textContent = used + " / " + limit;
        usageFill.style.width = Math.min(100, limit > 0 ? (used / limit) * 100 : 0) + "%";
        const plan = statusData.paid ? "Paid subscription" : "Free access";
        planLabel.textContent = plan;
        realtimeVoiceEnabled = statusData.voiceEnabled === true && statusData.paid === true;
        if (voiceControls) voiceControls.hidden = !realtimeVoiceEnabled || mode === "young";
        if (!realtimeVoiceEnabled) {
          voiceStartButton.hidden = true;
          voiceStopButton.hidden = true;
          setVoiceStatus("Live voice practice is available on eligible paid plans once enabled.");
        } else if (!voicePeer) {
          voiceStartButton.hidden = false;
          voiceStopButton.hidden = true;
          const voiceUsed = Number(statusData.voiceUsage?.used ?? 0);
          const voiceLimit = Number(statusData.voiceUsage?.limit ?? 12);
          setVoiceStatus("Voice practice ready · " + voiceUsed + " of " + voiceLimit + " monthly sessions used. Start only somewhere private.");
        }
        const hasBillingCustomer = statusData.hasBillingCustomer === true;
        paidPlanConfigured = statusData.checkoutConfigured === true && !statusData.paid && !hasBillingCustomer;
        upgradeButton.hidden = !paidPlanConfigured;
        manageBillingButton.hidden = !hasBillingCustomer;
        if (!statusData.aiConfigured) {
          setBillingMessage("Your account is connected, but the live AI tutor is waiting for its secure server key. The sample lesson still works; no payment can be taken.");
        } else if (statusData.subscription?.status === "past_due") {
          setBillingMessage("Your last payment needs attention. Open Manage billing to update your payment method or review the subscription.");
        } else if (statusData.paid) {
          setBillingMessage("Your subscription is active. You can manage or cancel it through Stripe's secure billing portal.");
        } else if (hasBillingCustomer) {
          setBillingMessage("A previous subscription is linked to this account. Open Manage billing to review it or update payment details.");
        } else if (!statusData.checkoutConfigured) {
          setBillingMessage("The live tutor is configured for the free allowance. Paid checkout will appear after the plan price is approved and Stripe is connected.");
        }
      }
      if (!planError && planData?.configured && Array.isArray(planData.plans) && planData.plans.length) {
        const p = planData.plans[0];
        const amount = new Intl.NumberFormat("es-ES", { style: "currency", currency: String(p.currency || "EUR").toUpperCase() })
          .format(Number(p.amount || 0) / 100);
        upgradeButton.textContent = "Upgrade · " + amount + " / " + (p.interval === "year" ? "year" : "month") + " →";
        const needsPaymentAttention = ["past_due", "unpaid"].includes(statusData?.subscription?.status);
        paidPlanConfigured = !statusData?.paid && !needsPaymentAttention;
        upgradeButton.hidden = !paidPlanConfigured;
      }
    } catch (error) {
      usageCount.textContent = "—";
      usageFill.style.width = "0%";
      planLabel.textContent = "Account details unavailable";
      realtimeVoiceEnabled = false;
      if (voiceControls) voiceControls.hidden = true;
      upgradeButton.hidden = true;
      manageBillingButton.hidden = true;
      setBillingMessage("You're signed in, but account details could not be loaded. Refresh this page to retry. Your access has not been changed and no payment has been taken.");
    }
  }

  async function updateAuthView(nextSession) {
    session = nextSession || null;
    if (session) {
      authCard.hidden = true;
      accountCard.hidden = false;
      if (sessionModeBadge) sessionModeBadge.textContent = mode === "young" ? "SAMPLE" : "LIVE AI";
      accountIdentity.textContent = session.user?.email || "Signed in";
      await refreshAccountStatus();
    } else {
      authCard.hidden = false;
      accountCard.hidden = true;
      if (sessionModeBadge) sessionModeBadge.textContent = "SAMPLE";
      paidPlanConfigured = false;
    }
  }

  async function signIn() {
    if (!supabase) {
      setAuthMessage("Secure account services are not connected yet. The sample lesson remains available.");
      return;
    }
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return setAuthMessage("Enter your email address and password.", true);
    signInButton.disabled = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await updateAuthView(data.session);
      setAuthMessage("Signed in successfully.");
    } catch (error) {
      setAuthMessage(error.message || "Unable to sign in. Check your details and try again.", true);
    } finally {
      signInButton.disabled = false;
    }
  }

  async function signUp() {
    if (!supabase) {
      setAuthMessage("The secure account service is not connected yet. No account or payment has been created.");
      return;
    }
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const displayName = authName.value.trim();
    if (!email || !password) return setAuthMessage("Enter your email address and choose a password.", true);
    if (!adultConsent?.checked) return setAuthMessage("This private pilot is for adults only. Please confirm that you are 18 or older.", true);
    if (password.length < 8) return setAuthMessage("Use a password with at least 8 characters.", true);
    signUpButton.disabled = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin + "/ai/"
        }
      });
      if (error) throw error;
      if (data.session) {
        await updateAuthView(data.session);
        setAuthMessage("Your account has been created.");
      } else {
        setAuthMessage("Check your email to confirm your account, then return here to sign in.");
      }
    } catch (error) {
      setAuthMessage(error.message || "Unable to create your account. Please try again.", true);
    } finally {
      signUpButton.disabled = false;
    }
  }

  async function startCheckout() {
    if (!supabase || !session) return setBillingMessage("Sign in first to choose a plan.");
    upgradeButton.disabled = true;
    try {
      const { data, error } = await supabase.functions.invoke("billing", { body: { action: "checkout", plan: "individual" } });
      if (error) throw new Error(await showFunctionError(error));
      if (!data?.checkoutUrl) throw new Error(data?.message || "Checkout is not configured yet.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setBillingMessage(error.message || "We couldn't start checkout. No payment has been taken.");
    } finally {
      upgradeButton.disabled = false;
    }
  }

  async function startVoiceSession() {
    if (!supabase || !session) {
      setVoiceStatus("Please sign in first.");
      return;
    }
    if (mode === "young") {
      setVoiceStatus("Live voice chat is disabled for the young learner track.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setVoiceStatus("This browser does not support secure microphone sessions. Try a recent browser over HTTPS.");
      return;
    }

    voiceStartButton.disabled = true;
    setVoiceStatus("Requesting a secure speaking session…");
    try {
      const { data, error } = await supabase.functions.invoke("realtime-token", {
        body: { track: mode === "cambridge" ? "cambridge" : mode, level: level.value }
      });
      if (error) throw new Error(await showFunctionError(error));
      if (!data?.value) throw new Error(data?.message || "A voice session could not be created.");

      voiceStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      voicePeer = new RTCPeerConnection();
      voiceAudio = new Audio();
      voiceAudio.autoplay = true;
      voiceAudio.playsInline = true;
      voicePeer.ontrack = async event => {
        if (event.streams?.[0]) {
          voiceAudio.srcObject = event.streams[0];
          try { await voiceAudio.play(); } catch (_) {
            setVoiceStatus("Allow audio playback in your browser to hear the tutor.", true);
          }
        }
      };

      voiceStream.getTracks().forEach(track => voicePeer.addTrack(track, voiceStream));
      voiceChannel = voicePeer.createDataChannel("oai-events");
      voiceChannel.onmessage = event => {
        let payload;
        try { payload = JSON.parse(event.data); } catch (_) { return; }
        if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript) {
          addMessage("learner", "YOU SAID", payload.transcript);
        }
        if (payload.type === "response.output_audio_transcript.done" && payload.transcript) {
          addMessage("coach", "TEACHER SARA AI · VOICE", payload.transcript);
        }
        if (payload.type === "session.closed") {
          if (voiceCloseResolver) voiceCloseResolver();
          return;
        }
        if (payload.type === "error") {
          setVoiceStatus("Voice service reported a problem. End this session and try again.", false);
        }
      };

      const offer = await voicePeer.createOffer();
      await voicePeer.setLocalDescription(offer);
      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + data.value,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });
      if (!answerResponse.ok) {
        const detail = await answerResponse.text();
        throw new Error("The voice connection could not be completed (" + answerResponse.status + ").");
      }
      await voicePeer.setRemoteDescription({ type: "answer", sdp: await answerResponse.text() });

      voiceStartButton.hidden = true;
      voiceStopButton.hidden = false;
      setVoiceStatus("You're connected. Speak naturally; press End session when finished. This session ends automatically after 8 minutes. Your microphone is live.", true);
      voicePeer.onconnectionstatechange = () => {
        if (!voicePeer) return;
        if (["failed", "closed"].includes(voicePeer.connectionState)) {
          void stopVoiceSession("The voice connection ended. Your microphone has been disconnected.");
        }
      };
      if (voiceChannel.readyState === "open") {
        voiceChannel.send(JSON.stringify({
          type: "response.create",
          response: { instructions: "Start with a short, friendly greeting and ask one opening question for this learner's selected practice track. Keep your spoken response brief." }
        }));
      } else {
        voiceChannel.addEventListener("open", () => {
          voiceChannel?.send(JSON.stringify({
            type: "response.create",
            response: { instructions: "Start with a short, friendly greeting and ask one opening question for this learner's selected practice track. Keep your spoken response brief." }
          }));
        }, { once: true });
      }
      voiceLimitTimer = window.setTimeout(() => stopVoiceSession("This voice session has reached its 8-minute limit."), 8 * 60 * 1000);
    } catch (error) {
      await stopVoiceSession();
      setVoiceStatus(error.message || "Unable to start the voice session. No further charge has been taken.");
    } finally {
      voiceStartButton.disabled = false;
    }
  }

  async function stopVoiceSession(message = "Voice session ended. Your microphone has been disconnected.") {
    if (voiceClosing) return;
    voiceClosing = true;
    if (voiceLimitTimer) {
      window.clearTimeout(voiceLimitTimer);
      voiceLimitTimer = null;
    }
    const channel = voiceChannel;
    if (channel && channel.readyState === "open") {
      setVoiceStatus("Closing the voice session safely…");
      await new Promise(resolve => {
        voiceCloseResolver = resolve;
        voiceCloseTimer = window.setTimeout(resolve, 12000);
        try {
          // Ask the Realtime service to close and emit its final usage event before disconnecting.
          channel.send(JSON.stringify({ type: "session.close" }));
        } catch (_) {
          resolve();
        }
      });
    }
    if (voiceCloseTimer) {
      window.clearTimeout(voiceCloseTimer);
      voiceCloseTimer = null;
    }
    voiceCloseResolver = null;
    try { channel?.close(); } catch (_) {}
    try { voicePeer?.close(); } catch (_) {}
    voiceStream?.getTracks().forEach(track => track.stop());
    if (voiceAudio) {
      voiceAudio.pause();
      voiceAudio.srcObject = null;
    }
    voiceChannel = null;
    voicePeer = null;
    voiceStream = null;
    voiceAudio = null;
    if (voiceStartButton) voiceStartButton.hidden = !realtimeVoiceEnabled;
    if (voiceStopButton) voiceStopButton.hidden = true;
    voiceClosing = false;
    if (message) setVoiceStatus(message);
    if (supabase && session) await refreshAccountStatus();
  }

  async function openBillingPortal() {
    if (!supabase || !session) return;
    manageBillingButton.disabled = true;
    try {
      const { data, error } = await supabase.functions.invoke("billing", { body: { action: "portal" } });
      if (error) throw new Error(await showFunctionError(error));
      if (!data?.portalUrl) throw new Error("The billing portal isn't available yet.");
      window.location.assign(data.portalUrl);
    } catch (error) {
      setBillingMessage(error.message || "We couldn't open billing management.");
    } finally {
      manageBillingButton.disabled = false;
    }
  }

  cards.forEach(card => card.addEventListener("click", () => selectMode(card.dataset.mode)));
  levelRating?.querySelectorAll("[data-rating]").forEach(button => button.addEventListener("click", () => setSelfRating(button.dataset.rating)));
  lengthSelect?.addEventListener("change", () => {
    if (!sessionEndsAt && sessionTimer) { const minutes = Number.parseInt(lengthSelect.value || "8", 10) || 8; sessionTimer.textContent = "Ready · " + minutes + ":00"; }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    await handleAnswer(value);
  });
  authForm?.addEventListener("submit", event => event.preventDefault());
  signInButton?.addEventListener("click", signIn);
  signUpButton?.addEventListener("click", signUp);
  signOutButton?.addEventListener("click", async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setBillingMessage("Unable to sign out. Please try again.");
    else {
      await stopVoiceSession("Signed out. The microphone is disconnected.");
      await updateAuthView(null);
      resetSession();
    }
  });
  upgradeButton?.addEventListener("click", startCheckout);
  manageBillingButton?.addEventListener("click", openBillingPortal);
  voiceStartButton?.addEventListener("click", startVoiceSession);
  voiceStopButton?.addEventListener("click", () => stopVoiceSession());

  if (supabase) {
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer Supabase calls until the auth callback releases its internal lock.
      window.setTimeout(() => { void updateAuthView(nextSession); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => updateAuthView(data.session));
  } else {
    authCard.hidden = false;
    accountCard.hidden = true;
    if (voiceControls) voiceControls.hidden = true;
    setAuthMessage("Secure accounts and paid subscriptions will activate after the Supabase server and Stripe products are configured.");
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    setAuthMessage("Payment returned successfully. Subscription access is confirmed by Stripe's secure webhook; sign in or refresh your account shortly.");
  } else if (params.get("checkout") === "cancel") {
    setAuthMessage("Checkout was cancelled. No subscription was created.");
  }

  selectMode("cambridge");
})();

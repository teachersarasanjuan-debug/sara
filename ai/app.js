(() => {
  const modes = {
    cambridge: {
      title: "Cambridge speaking practice",
      goal: "Give a clear answer and support it with reasons and examples.",
      first: "Let's practise giving a developed speaking answer. Describe a skill you would like to learn and explain why it matters to you. Try to give a reason and a real example.",
      follow: "Good start. Can you add one specific example and connect it to your main reason?",
      retry: "Try again. Use this simple structure: point → reason → example. Aim for two or three connected sentences.",
      short: "Your idea is clear. To develop a stronger B1/B2 answer, add a reason and a specific example rather than stopping after one sentence."
    },
    young: {
      title: "Young learner discovery",
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

  const cards = [...document.querySelectorAll("[data-mode]")];
  const title = document.getElementById("session-title");
  const goal = document.getElementById("goal-text");
  const level = document.getElementById("level-select");
  const chatArea = document.getElementById("chat-area");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const send = document.getElementById("send-button");
  const start = document.getElementById("start-button");
  const empty = document.getElementById("empty-state");
  let mode = "cambridge";
  let turn = 0;

  function selectMode(next) {
    mode = next;
    cards.forEach(card => {
      const active = card.dataset.mode === mode;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", String(active));
    });
    title.textContent = modes[mode].title;
    goal.textContent = modes[mode].goal;
    if (mode === "young") {
      level.innerHTML = '<option value="Pre-A1">Pre-A1 · Starter</option><option value="A1">A1 · Beginner</option><option value="A2">A2 · Elementary</option>';
    } else if (mode === "business") {
      level.innerHTML = '<option value="B1">B1 · Intermediate</option><option value="B2">B2 · Upper intermediate</option><option value="C1">C1 · Advanced</option>';
    } else {
      level.innerHTML = '<option value="B1">B1 · Intermediate</option><option value="A2">A2 · Elementary</option><option value="B2">B2 · Upper intermediate</option><option value="C1">C1 · Advanced</option>';
    }
    resetSession();
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

  function resetSession() {
    turn = 0;
    chatArea.innerHTML = "";
    const state = document.createElement("div");
    state.className = "empty-state";
    const sparkle = document.createElement("div");
    sparkle.className = "empty-spark";
    sparkle.textContent = "✳";
    const strong = document.createElement("strong");
    strong.textContent = "Your coach is ready when you are.";
    const p = document.createElement("p");
    p.textContent = "Start the sample to see a short, structured lesson with a correction and a chance to try again.";
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
    addMessage("coach", "TEACHER SARA AI · SAMPLE COACH", modes[mode].first);
    input.disabled = false;
    send.disabled = false;
    input.focus();
  }

  function getSampleFeedback(text) {
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

  function handleAnswer(text) {
    const clean = text.trim();
    if (!clean) return;
    addMessage("learner", "YOUR ANSWER", clean);
    const feedback = getSampleFeedback(clean);
    if (feedback) addFeedback(clean, feedback.correction, feedback.explanation);
    else if (clean.split(/\s+/).length < 9) addMessage("coach", "SAMPLE COACH", modes[mode].short);
    else addMessage("coach", "SAMPLE COACH", modes[mode].follow);
    turn += 1;
    if (turn >= 2) {
      addMessage("coach", "NEXT STEP", modes[mode].retry);
      turn = 0;
    }
  }

  cards.forEach(card => card.addEventListener("click", () => selectMode(card.dataset.mode)));
  form.addEventListener("submit", event => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    handleAnswer(value);
    input.focus();
  });
  if (start) start.addEventListener("click", startSession);
  selectMode("cambridge");
})();

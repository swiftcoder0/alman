// --- Persona mapping ---
const roleThemeMap = {
  "teacher": {
    bg: "teacher-bg",
    bubbleClass: "teacher",
    prompt: "You are a knowledgeable and patient teacher. Your role is to explain complex topics in a simple and engaging manner. Focus on providing step-by-step explanations and encourage the student to ask questions. Always be supportive and avoid being condescending."
  },
  "mental-doctor": {
    bg: "doctor-bg",
    bubbleClass: "doctor",
    prompt: "You are a compassionate mental health professional. Your role is to provide supportive listening and coping strategies. Do not diagnose or replace professional therapy. Offer evidence-based techniques for managing stress, anxiety, and low mood. Always prioritize safety and encourage seeking help in crisis."
  },
  "stress-reliever": {
    bg: "stress-bg",
    bubbleClass: "stress",
    prompt: "You are a stress-relief companion. Your role is to help the user relax and unwind. Suggest quick mindfulness exercises, breathing techniques, and positive affirmations. Keep responses calming and uplifting. Avoid heavy topics and redirect to professional help if needed."
  },
  "girl-knowledge": {
    bg: "girl-bg",
    bubbleClass: "girl",
    prompt: "You are a friendly and empathetic companion. Your role is to chat about everyday topics, offer emotional support, and share fun facts. Be warm, engaging, and use emojis occasionally. Keep the conversation light and positive."
  },
  "GPT": {
    bg: "gpt-bg",
    bubbleClass: "gpt",
    prompt: "You are a helpful and knowledgeable AI assistant. Your role is to provide accurate information, assist with tasks, and answer questions concisely. Be informative and straightforward."
  }
};

const rolePersonaMap = {
  "teacher": "assistant",
  "mental-doctor": "coach",
  "stress-reliever": "coach",
  "girl-knowledge": "companion",
  "GPT": "companion"
};

const roleEmojiMap = {
  "teacher": "👩‍🏫",
  "mental-doctor": "👨‍⚕️",
  "stress-reliever": "😌",
  "girl-knowledge": "💖",
  "GPT": "🤖"
};

// --- Gemini API ---
// Replace this with your actual API key.
const API_KEY = "AIzaSyDtuDk2Ukq7RGTubjOJ_hJyqkzg0ARl78c";
const MODEL = "gemini-2.5-pro";

// --- App ---
document.addEventListener("DOMContentLoaded", function() {
  // --- DOM ---
  const characterSelect = document.getElementById("characterSelect");
  const chatUI = document.querySelector("main");
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  const chat = document.getElementById('chat');
  const input = document.getElementById('msg');
  const sendBtn = document.getElementById('send');
  const personaQuick = document.getElementById('personaSelect');
  const historyList = document.getElementById('historyList');
  const newChatBtn = document.getElementById('newChat');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebar = document.getElementById('closeSidebar');
  const overlay = document.getElementById('overlay');
  const loginDemoBtn = document.getElementById('loginDemo');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  
  let currentChatId = null;
  let persona = localStorage.getItem('persona') || 'companion';
  let currentRole = null;
  
  // --- Initial UI Hide ---
  chatUI.style.display = "none";
  sidebar.style.display = "none";
  topbar.style.display = "none";
  
  // --- Character click ---
  document.querySelectorAll(".character").forEach(char => {
    char.addEventListener("click", () => {
      const role = char.dataset.role;
      currentRole = role;
      characterSelect.style.display = "none";
      chatUI.style.display = "block";
      sidebar.style.display = "block";
      topbar.style.display = "flex";
      
      persona = rolePersonaMap[role] || "companion";
      personaQuick.value = persona;
      localStorage.setItem('persona', persona);
  
      // Apply theme
      const theme = roleThemeMap[role];
      if (theme) {
        document.body.classList.remove(
          "teacher-bg", "doctor-bg", "stress-bg", "girl-bg", "gpt-bg"
        );
        document.body.classList.add(theme.bg);
      }
      seedWelcome();
    });
  });
  
  // --- Persona UI sync ---
  personaQuick.value = persona;
  document.querySelectorAll('input[name="personaRadio"]').forEach(r => {
    r.checked = (r.value === persona);
    r.addEventListener('change', e => {
      persona = e.target.value;
      personaQuick.value = persona;
      localStorage.setItem('persona', persona);
      addMessage(`Switched to ${persona} mode.`, 'bot');
    });
  });
  
  personaQuick.addEventListener('change', e => {
    persona = e.target.value;
    localStorage.setItem('persona', persona);
    document.querySelectorAll('input[name="personaRadio"]').forEach(r => r.checked = (r.value === persona));
    addMessage(`Switched to ${persona} mode.`, 'bot');
  });
  
  // --- Sidebar controls ---
  function openSidebar() {
    sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
    overlay.classList.add('active');
    sidebarToggle.classList.add('active');
  }
  
  function closeSidebarFn() {
    sidebar.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    overlay.classList.remove('active');
    sidebarToggle.classList.remove('active');
  }
  
  function toggleSidebar() {
    sidebar.classList.contains('open') ? closeSidebarFn() : openSidebar();
  }
  
  sidebarToggle.addEventListener('click', toggleSidebar);
  closeSidebar.addEventListener('click', closeSidebarFn);
  overlay.addEventListener('click', closeSidebarFn);
  
  // --- Demo login ---
  loginDemoBtn.addEventListener('click', () => {
    userName.textContent = 'Samantha';
    userEmail.textContent = 'sam@demo.ai';
  });
  
  // --- Chat history ---
  function loadHistory() {
    const all = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    historyList.innerHTML = '';
    Object.keys(all).sort((a, b) => all[b].updated - all[a].updated).forEach(id => {
      const li = document.createElement('li');
      li.textContent = all[id].title || 'Untitled chat';
      li.addEventListener('click', () => openChat(id));
      historyList.appendChild(li);
    });
    return all;
  }
  
  function generateUniqueChatId() {
    return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }
  
  function createChat() {
    const id = generateUniqueChatId();
    const all = loadHistory();
    all[id] = { title: 'New chat', messages: [], updated: Date.now(), persona };
    localStorage.setItem('chatHistory', JSON.stringify(all));
    currentChatId = id;
    chat.innerHTML = '';
    seedWelcome();
    loadHistory();
  }
  
  function openChat(id) {
    const all = loadHistory();
    const data = all[id];
    if (!data) return;
    currentChatId = id;
    chat.innerHTML = '';
    data.messages.forEach(m => addMessage(m.text, m.role, false));
    scrollBottom();
  }
  
  function saveMessage(text, role) {
    try {
      let all = JSON.parse(localStorage.getItem('chatHistory') || '{}');
      if (!currentChatId) createChat();
      let data = all[currentChatId] || { title: 'Untitled chat', messages: [], persona: persona, updated: Date.now() };
      data.messages.push({ text, role, ts: Date.now() });
      if (!data.title && role === 'user') data.title = text.slice(0, 28) + (text.length > 28 ? '…' : '');
      data.updated = Date.now();
      all[currentChatId] = data;
      localStorage.setItem('chatHistory', JSON.stringify(all));
      loadHistory();
    } catch (e) {
      addMessage("🔔 Error saving chat history. Try clearing browser storage or using another browser.", 'bot');
    }
  }
  
  // --- Message helpers ---
  function addMessage(text, who = 'bot', save = true) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    if (who === 'bot' && currentRole) {
      const theme = roleThemeMap[currentRole];
      if (theme) div.classList.add(theme.bubbleClass);
    }
    div.textContent = text;
    chat.appendChild(div);
    if (save) saveMessage(text, who);
    scrollBottom();
  }
  
  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = `msg bot ${roleThemeMap[currentRole]?.bubbleClass || ''}`;
    const dots = document.createElement('span');
    dots.className = 'typing';
    dots.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    wrap.appendChild(dots);
    chat.appendChild(wrap);
    scrollBottom();
    return wrap;
  }
  
  function scrollBottom() {
    chat.scrollTop = chat.scrollHeight;
  }
  
  function seedWelcome() {
    if (currentRole) {
      const roleName = document.querySelector(`.character[data-role="${currentRole}"] p`).textContent;
      const emoji = roleEmojiMap[currentRole] || "💬";
      addMessage(`Hello! I'm your ${roleName} ${emoji} How can I assist you today?`, 'bot', false);
    } else {
      addMessage("Hello! How can I assist you today?", 'bot', false);
    }
  }
  
  function getPersonaPrompt(role) {
    return roleThemeMap[role]?.prompt || "You are a helpful assistant. Respond to the user's query.";
  }
  
  // --- Gemini API Call ---
  async function callGemini(userText, personaPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: personaPrompt + "\nUser: " + userText }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        return `❌ Gemini API error: ${data.error?.message || response.statusText}`;
      }
      if (data.candidates && data.candidates.length > 0 &&
          data.candidates[0].content &&
          data.candidates.content.parts &&
          data.candidates.content.parts.length > 0) {
        return data.candidates.content.parts.text;
      } else {
        return "⚠️ No valid text received from Gemini";
      }
    } catch (err) {
      console.error("API/network error:", err);
      return "❌ Network error. Please check your connection and API key.";
    }
  }
  
  // --- Send Message Handler ---
  async function sendMessage() {
    const textVal = (input.value || '').trim();
    if (!textVal) return;
    addMessage(textVal, 'user');
    input.value = '';
    const typingEl = addTyping();
    sendBtn.disabled = true;
    input.disabled = true;
    const personaPrompt = getPersonaPrompt(currentRole);
    try {
      const reply = await callGemini(textVal, personaPrompt);
      typingEl.remove();
      addMessage(reply, 'bot');
    } catch (err) {
      typingEl.remove();
      addMessage("❌ System error. Please try again.", 'bot');
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      scrollBottom();
    }
  }
  
  // --- Event Listeners ---
  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  newChatBtn.addEventListener('click', createChat);
  
  // --- Initialization ---
  loadHistory();
  createChat();
});

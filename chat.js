console.log('chat.js loaded');

// Import system prompt
import { getSystemPrompt } from './systemPrompt.js';

// Chat functionality
window.addEventListener('load', function() {
  console.log("Window loaded - Initializing chat...");

  // Chat elements
  const chatToggleBtn = document.getElementById("chat-toggle-btn");
  const chatModal = document.getElementById("chat-modal");
  const closeChatBtn = document.getElementById("close-chat-btn");
  const chatBox = document.getElementById("chat-box");
  const chatInput = document.getElementById("chat-input");
  const sendChatBtn = document.getElementById("send-chat-btn");
  const newChatBtn = document.createElement("button");

  // Style and setup new chat button
  newChatBtn.id = "new-chat-btn";
  newChatBtn.innerHTML = '<i class="fas fa-plus"></i>';
  newChatBtn.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        width: 40px;
        height: 40px;
        background-color:rgb(76, 111, 175);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
  newChatBtn.onmouseover = () => {
    newChatBtn.style.backgroundColor = "#45a049";
    newChatBtn.style.transform = "scale(1.1)";
    newChatBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
  };
  newChatBtn.onmouseout = () => {
    newChatBtn.style.backgroundColor = "#rgb(76, 111, 175)";
    newChatBtn.style.transform = "scale(1)";
    newChatBtn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
  };

  // Add new chat button to modal
  if (chatModal) {
    chatModal.insertBefore(newChatBtn, chatBox);
  }

  // Debug log for all chat elements
  console.log("Chat elements status:", {
    chatToggleBtn: chatToggleBtn ? "Found" : "Not found",
    chatModal: chatModal ? "Found" : "Not found",
    closeChatBtn: closeChatBtn ? "Found" : "Not found",
    chatBox: chatBox ? "Found" : "Not found",
    chatInput: chatInput ? "Found" : "Not found",
    sendChatBtn: sendChatBtn ? "Found" : "Not found",
  });

  // Add initial welcome message
  if (chatBox) {
    console.log("Adding welcome message to chat box");
    const welcomeMessage = document.createElement("div");
    welcomeMessage.className = "message bot-message";
    welcomeMessage.style.cssText = `
            background-color: #e9e9eb;
            color: #333;
            padding: 10px;
            border-radius: 8px;
            max-width: 80%;
            align-self: flex-start;
            margin-right: auto;
            animation: fadeIn 0.3s ease;
        `;
    welcomeMessage.textContent =
      "ازيك! اقدر اساعدك ازي بخصوص مادة مهارات التواصل ";
    chatBox.appendChild(welcomeMessage);
  }

  // Toggle chat modal visibility
  if (chatToggleBtn && chatModal) {
    console.log("Setting up chat toggle button click handler");
    chatToggleBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Chat toggle button clicked");
      const isVisible = chatModal.style.display === "flex";
      console.log("Current visibility:", isVisible);
      chatModal.style.display = isVisible ? "none" : "flex";
      if (!isVisible) {
        chatInput.focus();
      }
    };
  } else {
    console.error("Chat toggle button or modal not found!", {
      chatToggleBtn: chatToggleBtn,
      chatModal: chatModal,
    });
  }

  // Close chat modal
  if (closeChatBtn && chatModal) {
    console.log("Setting up close button click handler");
    closeChatBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Close button clicked");
      chatModal.style.display = "none";
    };
  }

  // Function to add a message to the chat box
  function addMessage(message, isUser = true) {
    if (!chatBox) {
      console.error("Chat box not found!");
      return;
    }

    console.log("Adding message:", { message, isUser });

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;
    messageDiv.style.cssText = `
            background-color: ${isUser ? "#007bff" : "#e9e9eb"};
            color: ${isUser ? "white" : "#333"};
            padding: 10px;
            border-radius: 8px;
            max-width: 80%;
            margin: 5px 0;
            animation: fadeIn 0.3s ease;
            ${isUser ? "margin-left: auto;" : "margin-right: auto;"}
        `;
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Gemini API and local logic integration
  const API_KEY = "AIzaSyCoIIbDv5V0iSnTrFqtQ2G3GRnZepOGDYc"; // AIzaSyAUqr0Evo7kQCBUqKtEIONaa9I8-ob8bZg
  const MODEL_NAME = "gemini-1.5-flash-latest";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
  let conversationHistory = [];
  let previousMessages = new Set(); // لتخزين الرسائل السابقة
  // const departmentInfo = ... (تمت الإزالة بناءً على طلب المستخدم)
  // const developerInfoAnswer = ... (تمت الإزالة بناءً على طلب المستخدم)
  const sourceInfoAnswer =
    "  مرحبا     .";
  const developerKeywords = [
    "طورك",
    "مين عملك",
    "مين صممك",
    "المطور",
    "من هو جورج",
    "من هو المطور",
    "who developed you",
    "who created you",
  ];
  const sourceKeywords = [
    "مصدر معلوماتك",
    "كيف تحصل على المعلومات",
    "source of information",
    "where do you get info",
  ];

  // Send message function
  async function sendMessage() {
    if (!chatInput || !chatBox) {
      console.error("Chat input or box not found!");
      return;
    }
    const message = chatInput.value.trim();
    if (message) {
      console.log("Sending message:", message);

      // التحقق من تكرار الرسالة
      if (previousMessages.has(message)) {
        addMessage("لقد قلت هذا من قبل! هل تريد إعادة طرح نفس السؤال؟", false);
        conversationHistory.push({
          role: "assistant",
          text: "لقد قلت هذا من قبل! هل تريد إعادة طرح نفس السؤال؟",
        });
        chatInput.value = "";
        return;
      }

      // إضافة الرسالة إلى مجموعة الرسائل السابقة
      previousMessages.add(message);

      addMessage(message, true);
      chatInput.value = "";
      conversationHistory.push({ role: "user", text: message });

      // Check for رحمة first

      // Local keyword handling
      const lowerMsg = message.toLowerCase();
      // تم حذف الردود المحلية الخاصة بالمطور والقسم بناءً على طلب المستخدم
      if (sourceKeywords.some((k) => lowerMsg.includes(k.toLowerCase()))) {
        addMessage(sourceInfoAnswer, false);
        conversationHistory.push({ role: "assistant", text: sourceInfoAnswer });
        return;
      }

      // Gemini API call
      addMessage("... جاري التفكير ...", false);
      try {
        // استبدل departmentInfo بقيمة فارغة أو نص افتراضي
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: getSystemPrompt("", conversationHistory) + message,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 512,
            },
          }),
        });
        const data = await response.json();

        // Remove thinking message
        const botMsgs = chatBox.querySelectorAll(".bot-message");
        if (botMsgs.length > 0) {
          const lastBot = botMsgs[botMsgs.length - 1];
          if (lastBot.textContent === "... جاري التفكير ...") {
            chatBox.removeChild(lastBot);
          }
        }

        let botReply = "عذراً، لم أتمكن من فهم سؤالك.";
        if (
          data &&
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0].text
        ) {
          botReply = data.candidates[0].content.parts[0].text;
        }
        addMessage(botReply, false);
        conversationHistory.push({ role: "assistant", text: botReply });
      } catch (err) {
        // Remove thinking message
        const botMsgs = chatBox.querySelectorAll(".bot-message");
        if (botMsgs.length > 0) {
          const lastBot = botMsgs[botMsgs.length - 1];
          if (lastBot.textContent === "... جاري التفكير ...") {
            chatBox.removeChild(lastBot);
          }
        }
        addMessage("حدث خطأ أثناء الاتصال بالخدمة. حاول مرة أخرى.", false);
      }
    }
  }

  // Send message on button click
  if (sendChatBtn) {
    console.log("Setting up send button click handler");
    sendChatBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage();
    };
  }

  // Send message on Enter key
  if (chatInput) {
    console.log("Setting up input keypress handler");
    chatInput.onkeypress = function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    };
  }

  // Add click outside to close
  if (chatModal) {
    console.log("Setting up modal outside click handler");
    chatModal.onclick = function (e) {
      if (e.target === chatModal) {
        console.log("Clicked outside modal");
        chatModal.style.display = "none";
      }
    };
  }

  // Function to start new chat
  function startNewChat() {
    // Clear chat box
    if (chatBox) {
      chatBox.innerHTML = "";
      // Add welcome message
      const welcomeMessage = document.createElement("div");
      welcomeMessage.className = "message bot-message";
      welcomeMessage.style.cssText = `
                background-color: #e9e9eb;
                color: #333;
                padding: 10px;
                border-radius: 8px;
                max-width: 80%;
                align-self: flex-start;
                margin-right: auto;
                animation: fadeIn 0.3s ease;
            `;
      welcomeMessage.textContent =
        "مرحباً! كيف يمكنني مساعدتك في أسئلة المرجعات";
      chatBox.appendChild(welcomeMessage);
    }

    // Clear conversation history and previous messages
    conversationHistory = [];
    previousMessages.clear();

    // Clear input
    if (chatInput) {
      chatInput.value = "";
      chatInput.focus();
    }
  }

  // Add click handler for new chat button
  newChatBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    startNewChat();
  };

  console.log("Chat initialization completed");
});
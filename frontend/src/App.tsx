import { useState } from "react";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locStatus, setLocStatus] = useState("Location not detected");

  // Backend URL
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  
  // Detect Live Location

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("❌ Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocStatus("✅ Location detected");
      },
      () => setLocStatus("❌ Permission denied")
    );
  };

  // -----------------------------
  // 🔥 SOS Emergency Button
  // -----------------------------
  const sendSOS = async () => {
    if (!location.latitude) {
      alert("Please detect location before sending SOS!");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          message: "SOS! I need help immediately.",
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `🚨 SOS Sent! (${data.status})\nYour location was included.`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ SOS failed. Please check backend.",
          error: true,
        },
      ]);
    }
  };

  // -----------------------------
  // Send Message
  // -----------------------------
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");

    try {
      const res = await fetch(`${API_URL}/ask-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const data = await res.json();

      let botText = "🛡️ **Shakti AI Safety Guidance**\n\n";
      botText += `**Response:** ${data.reply}\n\n`;
      botText += `**Risk Level:** ${data.level}\n\n`;

      if (data.actions) {
        botText += "**Recommended Actions:**\n";
        data.actions.forEach((a) => (botText += `• ${a}\n`));
      }

      if (data.checklist) {
        botText += "\n**Checklist:**\n";
        data.checklist.forEach((c) => (botText += `• ${c}\n`));
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ No response from Shakti AI. Please check backend.",
          error: true,
        },
      ]);
    }
  };

  // -----------------------------
  // UI Layout
  // -----------------------------
  return (
    <div
      style={{
        width: "360px",
        height: "600px",
        padding: "12px",
        background: "#F3F4FD",
        fontFamily: "Arial, sans-serif",
        borderRadius: "12px",
        border: "1px solid #e0e3ff",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#1A237E",
          fontWeight: "900",
          marginBottom: "4px",
          fontSize: "22px",
        }}
      >
        SHAKTI AI
      </h2>

      <div
        style={{
          textAlign: "center",
          color: "#3949AB",
          marginBottom: "10px",
          fontSize: "13px",
        }}
      >
        Women Safety Agent
      </div>

      {/* Location */}
      <button
        onClick={detectLocation}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
          background: "#3949AB",
          color: "white",
          border: "none",
          marginBottom: "6px",
          cursor: "pointer",
        }}
      >
        Detect Live Location
      </button>

      <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "8px" }}>
        {locStatus}
      </div>

      {/* 🚨 SOS BUTTON */}
      <button
        onClick={sendSOS}
        style={{
          width: "100%",
          padding: "10px",
          background: "#B71C1C",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: "10px",
        }}
      >
        🚨 SEND SOS
      </button>

      {/* Chat Box */}
      <div
        style={{
          height: "340px",
          overflowY: "auto",
          background: "white",
          padding: "10px",
          borderRadius: "10px",
          marginBottom: "10px",
          border: "1px solid #cfd6ff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          whiteSpace: "pre-wrap",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: "8px 0", textAlign: msg.sender === "user" ? "right" : "left" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "8px",
                background: msg.sender === "user" ? "#1A237E" : msg.error ? "#ffebef" : "#E8EAF6",
                color: msg.sender === "user" ? "white" : msg.error ? "#B71C1C" : "#333",
                maxWidth: "80%",
                wordWrap: "break-word",
                lineHeight: "18px",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #b8c4ff",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 14px",
            background: "#1A237E",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
export default App;

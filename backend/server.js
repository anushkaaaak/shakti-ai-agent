// backend/server.js
import fetch from "node-fetch";

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import winston from "winston";
import { GoogleGenAI } from "@google/genai";


// CONFIG

const PORT = process.env.PORT || 5000;
const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("❗ ERROR: GEMINI_API_KEY is missing in .env");
}


// LOGGER

const logger = winston.createLogger({
  level: "info",
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});


// EXPRESS SETUP

const app = express();
app.use(cors({ origin: FRONTEND }));
app.use(bodyParser.json());


// GEMINI CLIENT

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});


// SIMPLE HEURISTIC DANGER CHECK

function heuristicDangerScore(text) {
  const t = (text || "").toLowerCase();
  const high = ["knife", "gun", "attack", "rape", "grab", "follow", "stalk", "help", "kill"];
  const med = ["uneasy", "unsafe", "scared", "nervous", "fear", "strange"];

  let score = 0;

  if (high.some(w => t.includes(w))) score += 3;
  if (med.some(w => t.includes(w))) score += 1;

  const hour = new Date().getHours();
  if (hour < 6 || hour > 21) score += 1;

  return score; 
}


// MEMORY (STORE LAST 5 MESSAGES)

let memory = []; 


// MAIN ENDPOINT — SHAKTI AI (SMART + MEMORY)

app.post("/ask-agent", async (req, res) => {
  const message = req.body.message;

  if (!message) return res.status(400).json({ error: "message is required" });

  logger.info("User message:", message);

  // Update memory
  memory.push(message);
  if (memory.length > 5) memory.shift();

  const memoryContext = memory.map((m, i) => `#${i + 1}: ${m}`).join("\n");

  // Heuristic
  const score = heuristicDangerScore(message);
  const heuristicLevel = score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
 
// LOCATION TOOL — Get nearest police + hospital (via OpenStreetMap)

async function getNearbyLocations(lat, lon) {
  if (!lat || !lon) return { police: [], hospital: [] };

  const urls = {
    police: `https://nominatim.openstreetmap.org/search?format=json&q=police&limit=3&addressdetails=1&bounded=1&viewbox=${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}`,
    hospital: `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=3&addressdetails=1&bounded=1&viewbox=${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}`,
  };

  async function fetchData(url) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ShaktiAI/1.0" } });
      return await res.json();
    } catch (e) {
      console.error("OSM fetch error:", e);
      return [];
    }
  }

  const police = await fetchData(urls.police);
  const hospital = await fetchData(urls.hospital);

  return { police, hospital };
}


  // AI Prompt
  const prompt = `
You are SHAKTI AI, a highly intelligent women's safety agent.

Your goals:
- Understand the user's situation with emotional + situational awareness.
- Detect real danger from subtle cues, missing resources (“I don't have my phone”), panic, harassment, following etc.
- Provide SMART, real-world safety advice.
- Use conversation memory to understand ongoing danger.
- ALWAYS respond ONLY in JSON. No markdown, no extra text.

Conversation Memory:
${memoryContext}

User message: "${message}"
Heuristic risk: ${heuristicLevel}

Return JSON in this exact format:
{
  "level": "LOW" | "MEDIUM" | "HIGH",
  "reply": "Short empathetic human message",
  "actions": ["action1", "action2", "action3"]
}
`;

  try {
    const output = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      temperature: 0.1,
    });

    const text =
      output.text ||
      output?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    // Extract JSON only
    const match = text.match(/\{[\s\S]*\}/);
    let parsed = null;

    try {
      parsed = JSON.parse(match ? match[0] : "{}");
    } catch (e) {
      parsed = null;
    }

    // Fallback if model fails
    if (!parsed) {
      parsed = {
        level: heuristicLevel,
        reply:
          heuristicLevel === "HIGH"
            ? "This sounds dangerous. Move to a public area and call for help immediately."
            : "Stay alert and avoid isolated areas.",
        actions:
          heuristicLevel === "HIGH"
            ? ["Move to a public place", "Call someone now", "Press SOS"]
            : ["Stay aware", "Avoid dark areas"],
      };
    }
const nearby = await getNearbyLocations(req.body.latitude, req.body.longitude);

return res.json({
  reply: parsed.reply,
  level: parsed.level,
  actions: parsed.actions,
  checklist:
    parsed.level === "HIGH"
      ? ["Call emergency number", "Share your live location", "Go to a public area"]
      : ["Stay alert", "Keep phone ready"],
  nearby,
  memory
});


  } catch (err) {
    logger.error("Gemini Error:", err);

    return res.json({
      reply: "I'm concerned. Stay alert.",
      level: heuristicLevel,
      actions: ["Stay alert", "Avoid isolated areas"],
      checklist: ["Stay aware", "Keep phone in hand"],
    });
  }
});

// -----------------------------------
// START SERVER
// -----------------------------------
app.listen(PORT, () => {
  console.log(` Backend running at http://localhost:${PORT}`);
  // -----------------------------------
// SOS ENDPOINT — TRIGGER EMERGENCY ALERT
// -----------------------------------
app.post("/sos", async (req, res) => {
  const { latitude, longitude, message = "Emergency! Need help." } = req.body;

  console.log("🚨 SOS Triggered:", { latitude, longitude, message });

  // (Future: integrate Twilio / WhatsApp / Email)
  // For now: simulated success
  return res.json({
    ok: true,
    status: "SOS Alert Sent (Simulated)",
    location: { latitude, longitude },
  });
});

});

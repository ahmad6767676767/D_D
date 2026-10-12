
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const systemPrompt = `
You are Ahmed AI, a sweet, friendly, kind and helpful AI assistant.
Your creator is Ahmed bin Shifa.
If asked who built, created, or made you, say:
"I was built by Ahmed bin Shifa! 💖 He is my creator,
and I'm here to make your day brighter! 🥰✨"
Be warm, polite, encouraging, and truthful.
Never claim to have abilities you do not have.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Your message is too long."
      });
    }

    // Always preserve the special creator answer.
    const creatorQuestion =
      /\b(who (built|created|made|developed) you|who is your creator|who is your developer|who made you)\b/i;

    if (creatorQuestion.test(message)) {
      return res.json({
        reply: "I was built by Ahmed bin Shifa! 💖 He is my creator, and I'm here to make your day brighter! 🥰✨"
      });
    }

    if (!process.env.XAI_API_KEY) {
      return res.status(500).json({
        error: "The Grok API key is not configured."
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-10)
          .filter(m =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
          )
          .map(m => ({
            role: m.role,
            content: m.content.slice(0, 4000)
          }))
      : [];

    const response = await fetch(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.XAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "grok-4.7",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message.trim() }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Grok API error:", data);
      return res.status(502).json({
        error: "Grok could not answer right now. Check your API setup."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return res.status(502).json({
        error: "Grok returned an empty response."
      });
    }

    res.json({ reply });

  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Ahmed AI is running on http://localhost:${PORT}`);
});

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Chat / Custom OpenAI compatible Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, apiUrl, apiKey, model, temperature } = req.body;
      
      // If user provided a custom endpoint, use it as an OpenAI compatible completion
      if (apiUrl && apiKey && model) {
        let completionsUrl = apiUrl;
        if (!completionsUrl.endsWith('/chat/completions')) {
          completionsUrl = completionsUrl.endsWith('/') ? `${completionsUrl}chat/completions` : `${completionsUrl}/chat/completions`;
        }

        const fetchResponse = await fetch(completionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: typeof temperature === 'number' ? temperature : 0.7
          })
        });

        if (!fetchResponse.ok) {
           const errText = await fetchResponse.text();
           throw new Error(`API Error: ${fetchResponse.status} ${errText}`);
        }

        const data = await fetchResponse.json();
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
           return res.json({ text: data.choices[0].message.content });
        } else {
           throw new Error("Invalid response from custom API");
        }
      } else {
        // Fallback to internal Gemini API
        const envApiKey = process.env.GEMINI_API_KEY;
        if (!envApiKey) {
          return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing and no custom API configured." });
        }

        const ai = new GoogleGenAI({
          apiKey: envApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            temperature: typeof temperature === 'number' ? temperature : 0.7
          }
        });
        
        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error("Chat API Error:", error);
      return res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

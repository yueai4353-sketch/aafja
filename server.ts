import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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

  // API Route for Vision (image recognition)
  app.post("/api/vision", async (req, res) => {
    try {
      const { image, prompt } = req.body;

      if (!image) {
        return res.status(400).json({ error: "缺少 image 参数" });
      }

      // 从 IndexedDB 设置中读取用户配置的 API 信息（前端会通过请求体传递）
      // 这里优先使用与 /api/chat 一致的策略：尝试用户自定义 API，否则 fallback Gemini
      const apiUrl = req.body.apiUrl;
      const apiKey = req.body.apiKey;
      const model = req.body.model || "gpt-4o";

      // 提取纯 base64 数据和 MIME 类型
      let base64Data = image;
      let mimeType = "image/png";
      const dataUrlMatch = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        base64Data = dataUrlMatch[2];
      }

      if (apiUrl && apiKey) {
        // 使用 OpenAI SDK 兼容接口
        // 规范化 baseURL：移除末尾的 /chat/completions 或 /，确保 SDK 能正确拼接路径
        let baseURL = apiUrl.trim();
        baseURL = baseURL.replace(/\/chat\/completions\/?$/, '');
        baseURL = baseURL.replace(/\/$/, '');

        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL,
        });

        // 多模型动态适配器：根据模型名称决定图片格式
        const modelLower = model.toLowerCase();
        const isClaude = modelLower.includes('claude');
        const promptText = prompt || "请描述这张图片的内容";
        const fullBase64WithPrefix = `data:${mimeType};base64,${base64Data}`;

        let userContent: any[];
        if (isClaude) {
          // Claude 原生格式
          userContent = [
            { type: "text", text: promptText },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Data,
              },
            },
          ];
        } else {
          // 行业通用标准格式 (兼容 GPT-4o, Gemini, 以及大多数 OpenAI 兼容代理)
          userContent = [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: fullBase64WithPrefix,
              },
            },
          ];
        }

        const completion = await openai.chat.completions.create({
          model: model,
          stream: false,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
          max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content || "无法识别图片内容";
        return res.json({ text });
      } else {
        // Fallback: 使用 Gemini 的视觉能力
        const envApiKey = process.env.GEMINI_API_KEY;
        if (!envApiKey) {
          return res.status(500).json({ error: "未配置 API Key，无法进行图片识别。请在设置中配置 API。" });
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
          model: "gemini-2.0-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt || "请描述这张图片的内容" },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        });

        return res.json({ text: response.text || "无法识别图片内容" });
      }
    } catch (error: any) {
      console.error("Vision API Error:", error);
      return res.status(500).json({ error: error?.message || "图片识别失败" });
    }
  });

  // Weather proxy route — avoids browser CORS restrictions with wttr.in
  app.get("/api/weather", async (req, res) => {
    const city = (req.query.city as string || '').trim();
    console.log('[Weather API] Request received for city:', city);
    
    if (!city) {
      console.log('[Weather API] Error: Missing city parameter');
      return res.status(400).json({ error: '缺少 city 参数' });
    }
    
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      console.log('[Weather API] Fetching from wttr.in:', url);
      
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'curl/7.68.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15秒超时
      });
      
      console.log('[Weather API] wttr.in response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[Weather API] wttr.in error response:', text.slice(0, 200));
        return res.status(response.status).json({ 
          error: `wttr.in 返回错误: ${response.status}`,
          details: text.slice(0, 200)
        });
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Weather API] Non-JSON response from wttr.in:', text.slice(0, 200));
        return res.status(500).json({ 
          error: '天气服务返回了非JSON格式的数据',
          details: text.slice(0, 200)
        });
      }
      
      const data = await response.json();
      console.log('[Weather API] Successfully fetched weather data for:', city);
      
      // 验证返回数据的基本结构
      if (!data.current_condition || !data.weather) {
        console.error('[Weather API] Invalid data structure:', JSON.stringify(data).slice(0, 200));
        return res.status(500).json({ 
          error: '天气数据格式异常',
          details: 'Missing required fields: current_condition or weather'
        });
      }
      
      res.json(data);
    } catch (err: any) {
      console.error('[Weather API] Exception:', err);
      
      // 区分不同类型的错误
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: '天气服务请求超时，请重试' });
      }
      
      if (err.message.includes('fetch')) {
        return res.status(503).json({ error: '无法连接到天气服务，请检查网络连接' });
      }
      
      res.status(500).json({ 
        error: err?.message || '天气代理请求失败',
        type: err?.name || 'Unknown'
      });
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
    // Only catch non-API routes for SPA fallback
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

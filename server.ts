import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// 辅助函数：安全文本
function safeText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

// 辅助函数：解析时间戳
function parseTimestamp(value: any): number {
  if (typeof value === 'number') return value > 0 ? value : 0;
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 ? num : 0;
  }
  return 0;
}

// 辅助函数：解析数字
function parseCount(value: any): number {
  if (typeof value === 'number') return value >= 0 ? value : 0;
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 ? num : 0;
  }
  return 0;
}

// 映射第三方数据到前端格式
function mapThirdPartyDataToFrontend(thirdPartyData: any, originalUrl: string, sourceText: string): any {
  const data = thirdPartyData || {};
  
  // 基础信息
  const url = safeText(data.url || originalUrl);
  const title = safeText(data.title || data.noteTitle || data.noteName);
  const description = safeText(data.desc || data.description || data.noteDesc || data.content);
  const authorName = safeText(data.authorName || data.author || data.nickname || data.userName);
  const ipLocation = safeText(data.ipLocation || data.ip_location);
  
  // 封面和图片
  const coverUrl = safeText(data.coverUrl || data.cover || data.imageUrl);
  const images = Array.isArray(data.images) ? data.images.map(safeText).filter(Boolean) : 
                 Array.isArray(data.imageList) ? data.imageList.map(safeText).filter(Boolean) : 
                 coverUrl ? [coverUrl] : [];
  
  // 类型判断
  let postType = 'unknown';
  const typeStr = safeText(data.type || data.noteType || data.postType).toLowerCase();
  if (typeStr === 'video' || data.video || data.videoUrl) {
    postType = 'video';
  } else if (typeStr === 'image' || images.length > 0) {
    postType = 'image';
  }
  
  // 统计数据
  const stats = {
    likedCount: safeText(data.likedCount || data.likeCount || data.likes || ''),
    collectedCount: safeText(data.collectedCount || data.collectCount || data.collects || ''),
    commentCount: safeText(data.commentCount || data.comments || ''),
    shareCount: safeText(data.shareCount || data.shares || '')
  };
  
  // 评论数据
  const comments = Array.isArray(data.comments) ? data.comments.map((comment: any) => ({
    authorName: safeText(comment.authorName || comment.author || comment.nickname),
    content: safeText(comment.content || comment.text || comment.comment),
    likeCount: safeText(comment.likeCount || comment.likes || ''),
    createdAtText: safeText(comment.createdAt || comment.time),
    ipLocation: safeText(comment.ipLocation || comment.ip),
    isNoteAuthor: comment.isAuthor === true || comment.isNoteAuthor === true,
    subComments: Array.isArray(comment.subComments) ? comment.subComments.map((sub: any) => ({
      authorName: safeText(sub.authorName || sub.author || sub.nickname),
      content: safeText(sub.content || sub.text),
      targetAuthorName: safeText(sub.targetAuthorName || sub.replyTo),
      likeCount: safeText(sub.likeCount || sub.likes || ''),
      createdAtText: safeText(sub.createdAt || sub.time),
      ipLocation: safeText(sub.ipLocation || sub.ip),
      isNoteAuthor: sub.isAuthor === true || sub.isNoteAuthor === true
    })) : []
  })) : [];
  
  // 标签
  const tags = Array.isArray(data.tags) ? data.tags.map(safeText).filter(Boolean) : [];
  
  // 时间信息
  const publishedAt = parseTimestamp(data.publishedAt || data.publishTime || data.createTime);
  const publishedAtText = safeText(data.publishedAtText || data.publishTimeText || data.createTimeText);
  const updatedAt = parseTimestamp(data.updatedAt || data.updateTime);
  const updatedAtText = safeText(data.updatedAtText || data.updateTimeText);
  
  // 视频信息
  const videoInfo: any = {
    coverUrl: safeText(data.videoCover || data.video?.cover || coverUrl),
    duration: safeText(data.videoDuration || data.video?.duration),
    durationSeconds: parseCount(data.videoDurationSeconds || data.video?.durationSeconds),
    width: safeText(data.videoWidth || data.video?.width),
    height: safeText(data.videoHeight || data.video?.height),
    videoUrl: safeText(data.videoUrl || data.video?.url),
    transcript: safeText(data.transcript || data.video?.transcript || data.subtitle),
    transcriptLanguage: safeText(data.transcriptLanguage || data.video?.transcriptLang),
    transcriptTruncated: false
  };
  
  // 主页信息（如果是主页分享）
  const profile: any = {
    userId: safeText(data.userId || data.user?.id),
    nickname: safeText(data.nickname || data.user?.nickname || authorName),
    redId: safeText(data.redId || data.user?.redId || data.xiaohongshuId),
    avatarUrl: safeText(data.avatar || data.avatarUrl || data.user?.avatar),
    description: safeText(data.userDesc || data.user?.description),
    ipLocation: safeText(data.userIpLocation || data.user?.ipLocation || ipLocation),
    verifiedInfo: safeText(data.verifiedInfo || data.user?.verified),
    stats: {
      followingCount: safeText(data.followingCount || data.user?.following || ''),
      followerCount: safeText(data.followerCount || data.user?.follower || data.fans || ''),
      likedAndCollectedCount: safeText(data.likedAndCollected || data.user?.likeCollect || ''),
      noteCount: safeText(data.noteCount || data.user?.notes || '')
    }
  };
  
  // 商品信息（如果是商品分享）
  const product: any = {
    productId: safeText(data.productId || data.goodsId || data.skuId),
    title: safeText(data.goodsName || data.productName || title),
    description: safeText(data.goodsDesc || data.productDesc || description),
    price: safeText(data.price || data.currentPrice),
    originalPrice: safeText(data.originalPrice || data.marketPrice),
    coverUrl: safeText(data.goodsCover || data.productCover || coverUrl),
    images: Array.isArray(data.goodsImages) ? data.goodsImages.map(safeText).filter(Boolean) : images,
    shopName: safeText(data.shopName || data.store),
    brandName: safeText(data.brandName || data.brand),
    salesText: safeText(data.sales || data.salesCount)
  };
  
  // 判断分享类型
  let shareKind = 'note';
  if (data.shareKind === 'profile' || data.type === 'user' || data.isUserProfile) {
    shareKind = 'profile';
  } else if (data.shareKind === 'product' || data.type === 'goods' || data.isProduct || product.productId) {
    shareKind = 'product';
  }
  
  // 组装返回数据
  return {
    platform: 'xiaohongshu',
    shareKind,
    postType,
    url,
    resolvedUrl: safeText(data.resolvedUrl || url),
    canonicalUrl: safeText(data.canonicalUrl || data.shareUrl || url),
    shareId: safeText(data.shareId || data.noteId || data.id),
    sourceText,
    title,
    description,
    authorName,
    ipLocation,
    coverUrl,
    images,
    videoFrames: Array.isArray(data.videoFrames) ? data.videoFrames.map(safeText).filter(Boolean) : [],
    comments,
    tags,
    stats,
    profile,
    profilePosts: Array.isArray(data.profilePosts) ? data.profilePosts : [],
    product,
    publishedAt,
    publishedAtText,
    updatedAt,
    updatedAtText,
    imageCount: parseCount(data.imageCount || images.length),
    imageSummary: {
      totalCount: parseCount(data.imageSummary?.totalCount || data.imageCount || images.length),
      parsedCount: parseCount(data.imageSummary?.parsedCount || images.length),
      hasMore: data.imageSummary?.hasMore === true
    },
    commentSummary: {
      totalCount: safeText(data.commentSummary?.totalCount || data.commentCount || stats.commentCount),
      topLevelCount: safeText(data.commentSummary?.topLevelCount || ''),
      parsedCount: parseCount(data.commentSummary?.parsedCount || comments.length),
      parsedReplyCount: parseCount(data.commentSummary?.parsedReplyCount || 0),
      hasMore: data.commentSummary?.hasMore === true
    },
    videoInfo,
    status: 'ready',
    fetchedAt: Date.now(),
    error: ''
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // CORS 配置 — 允许指定来源访问 API
  const allowedOrigins = [
    'https://aafja.pages.dev',
    'http://localhost:3000',
  ];
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

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

  // Xiaohongshu metadata proxy route
  app.get("/meta/xiaohongshu", async (req, res) => {
    try {
      const url = (req.query.url as string || '').trim();
      const sourceText = (req.query.sourceText as string || '').trim();
      
      console.log('[Xiaohongshu API] Request received for URL:', url);
      
      if (!url) {
        console.log('[Xiaohongshu API] Error: Missing url parameter');
        return res.status(400).json({ error: '缺少 url 参数', status: 'failed' });
      }
      
      // 调用第三方接口
      const thirdPartyUrl = `http://apis.ppt6.top?clientId=202037511&clientSecretKey=32A4FD9DCA2FEFF7CDF3A63E2C09B9016363FDD348E4537449&url=${encodeURIComponent(url)}`;
      console.log('[Xiaohongshu API] Fetching from third-party API...');
      
      const response = await fetch(thirdPartyUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(30000) // 30秒超时
      });
      
      console.log('[Xiaohongshu API] Third-party response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[Xiaohongshu API] Third-party error response:', text.slice(0, 200));
        return res.status(200).json({ 
          error: `第三方接口返回错误: ${response.status}`,
          status: 'failed',
          url,
          sourceText
        });
      }
      
      const thirdPartyData = await response.json();
      console.log('[Xiaohongshu API] Third-party data received, keys:', Object.keys(thirdPartyData || {}));
      
      // 数据映射转换逻辑
      const mappedData = mapThirdPartyDataToFrontend(thirdPartyData, url, sourceText);
      
      console.log('[Xiaohongshu API] Successfully mapped data, shareKind:', mappedData.shareKind);
      res.json(mappedData);
      
    } catch (err: any) {
      console.error('[Xiaohongshu API] Exception:', err);
      
      if (err.name === 'AbortError') {
        return res.status(200).json({ 
          error: '小红书解析请求超时',
          status: 'failed',
          url: req.query.url || '',
          sourceText: req.query.sourceText || ''
        });
      }
      
      res.status(200).json({ 
        error: err?.message || '小红书解析失败',
        status: 'failed',
        url: req.query.url || '',
        sourceText: req.query.sourceText || ''
      });
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

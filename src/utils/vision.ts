/**
 * 前端公共视觉服务
 * 将图片发送到后端 /api/vision 接口，调用大模型 Vision 能力识别图片内容。
 * 可被微信、相册、设置等多个 App 复用。
 */

export interface CompressImageOptions {
  /** 最大宽度（px），默认 800 */
  maxWidth?: number;
  /** 最大高度（px），默认 800 */
  maxHeight?: number;
  /** JPEG 压缩质量 0-1，默认 0.6 */
  quality?: number;
  /** 输出格式，默认 image/jpeg */
  outputType?: string;
}

/**
 * 基于 Canvas 的前端图片压缩函数
 * 将 File 或 Base64 字符串压缩为指定尺寸和质量的 Base64 字符串
 * @param input - File 对象或 data:image/... Base64 字符串
 * @param options - 压缩选项
 * @returns 压缩后的 Base64 字符串（含 data:image/jpeg;base64, 前缀）
 */
export function compressImage(
  input: File | string,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.6,
    outputType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // 按比例缩放，使宽高都不超过限制
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL(outputType, quality);
      console.log(
        `[compressImage] 原始: ${img.naturalWidth}x${img.naturalHeight} → 压缩后: ${width}x${height}, ` +
        `Base64 长度: ${compressedBase64.length} 字符 (≈${Math.round(compressedBase64.length / 1333)} tokens)`
      );
      resolve(compressedBase64);
    };
    img.onerror = () => reject(new Error('图片加载失败，无法压缩'));

    if (typeof input === 'string') {
      // 已经是 Base64 字符串
      img.src = input;
    } else {
      // File 对象，先转为 Object URL
      img.src = URL.createObjectURL(input);
    }
  });
}

/**
 * 将 File 对象转换为 Base64 字符串（含 data:image/xxx;base64, 前缀）
 * 注意：这是未压缩的原始 Base64，如需发送给大模型请使用 compressImage
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader 结果不是字符串'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface VisionResponse {
  text: string;
}

export interface AnalyzeImageOptions {
  /** 提示词，引导模型如何描述图片 */
  prompt?: string;
  /** 自定义 API 地址（OpenAI 兼容） */
  apiUrl?: string;
  /** API Key */
  apiKey?: string;
  /** 模型名称，如 gpt-4o */
  model?: string;
}

/**
 * 调用后端 /api/vision 接口，对图片进行识别
 * @param base64Str - 完整的 Base64 字符串（含 data:image/xxx;base64, 前缀）
 * @param options - 可选配置：prompt、apiUrl、apiKey、model
 * @returns 模型返回的识别文本
 */
export async function analyzeImage(base64Str: string, options: AnalyzeImageOptions = {}): Promise<string> {
  const { prompt = '请描述这张图片的内容', apiUrl, apiKey, model } = options;

  const response = await fetch('/api/vision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64Str,
      prompt,
      apiUrl,
      apiKey,
      model,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(errorData.error || `Vision API 请求失败: ${response.status}`);
  }

  const data: VisionResponse = await response.json();
  return data.text;
}

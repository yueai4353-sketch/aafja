// 藏叙资产生成工具 - 使用AI生成银行卡、房产、股份、车产等资产信息

import { buildWorldbookText } from './schedulePrompt';

/**
 * 构建资产生成的提示词
 */
export function buildAssetGenerationPrompt(params: {
  persona: any;
  generateOptions: {
    prompt: string;
    bank: boolean;
    property: boolean;
    shares: boolean;
    car: boolean;
  };
}): string {
  const { persona, generateOptions } = params;
  
  let prompt = '';
  
  // 1. 构建 AI 人设信息
  prompt += `【AI角色信息】\n`;
  prompt += `姓名：${persona.name || '未知'}\n`;
  if (persona.gender) prompt += `性别：${persona.gender}\n`;
  if (persona.age) prompt += `年龄：${persona.age}\n`;
  if (persona.identity) prompt += `身份：${persona.identity}\n`;
  if (persona.personality) prompt += `性格：${persona.personality}\n`;
  if (persona.background) prompt += `背景：${persona.background}\n`;
  if (persona.financial_status) prompt += `财务状况：${persona.financial_status}\n`;
  if (persona.social_status) prompt += `社会地位：${persona.social_status}\n`;
  prompt += '\n';
  
  // 2. 读取绑定在该AI人设的世界书
  const worldbookText = buildWorldbookText(persona);
  if (worldbookText) {
    prompt += `【世界书设定】\n${worldbookText}\n\n`;
  }
  
  // 3. 如果有填写生成要求，把要求也算进去
  if (generateOptions.prompt && generateOptions.prompt.trim()) {
    prompt += `【生成要求】\n${generateOptions.prompt.trim()}\n\n`;
  }
  
  // 4. 查看生成类型，明确要生成的资产类型
  const typesToGenerate: string[] = [];
  if (generateOptions.bank) typesToGenerate.push('银行卡');
  if (generateOptions.property) typesToGenerate.push('房产');
  if (generateOptions.shares) typesToGenerate.push('股份');
  if (generateOptions.car) typesToGenerate.push('车产');
  
  if (typesToGenerate.length === 0) {
    return ''; // 没有任何类型需要生成
  }
  
  prompt += `【任务说明】\n`;
  prompt += `请根据以上角色信息和设定，为该角色生成符合其身份和背景的私人资产信息。\n`;
  prompt += `需要生成的资产类型：${typesToGenerate.join('、')}\n`;
  prompt += `每种资产类型生成 2-5 条随机数量的记录（根据角色身份合理决定）。\n\n`;
  
  prompt += `【输出格式要求】\n`;
  prompt += `请严格按照以下格式输出，每种资产类型用标记分隔：\n\n`;
  
  if (generateOptions.bank) {
    prompt += `[银行卡开始]\n`;
    prompt += `所属银行|卡片类型|卡号|当前余额\n`;
    prompt += `示例：瑞士银行|百夫长黑金卡|**** **** **** 8888|50000000\n`;
    prompt += `[银行卡结束]\n\n`;
  }
  
  if (generateOptions.property) {
    prompt += `[房产开始]\n`;
    prompt += `房产名称|所在地|占地面积|估值\n`;
    prompt += `示例：半山海景别墅|香港太平山顶|800|120000000\n`;
    prompt += `[房产结束]\n\n`;
  }
  
  if (generateOptions.shares) {
    prompt += `[股份开始]\n`;
    prompt += `公司名称|持股比例|股份类型|市值估值\n`;
    prompt += `示例：靳寰集团|51|原始股|3000000000\n`;
    prompt += `[股份结束]\n\n`;
  }
  
  if (generateOptions.car) {
    prompt += `[车产开始]\n`;
    prompt += `车辆品牌|车型|车牌号|估值\n`;
    prompt += `示例：劳斯莱斯|幻影|京A·88888|8000000\n`;
    prompt += `[车产结束]\n\n`;
  }
  
  prompt += `注意事项：\n`;
  prompt += `1. 所有数据必须符合角色的身份、社会地位和财务状况\n`;
  prompt += `2. 银行卡余额、房产估值、股份估值、车辆估值均使用纯数字（不带符号）\n`;
  prompt += `3. 卡号可以部分遮蔽（用****表示），车牌号要符合地区规范\n`;
  prompt += `4. 每条记录用 | 分隔字段，每行一条记录\n`;
  prompt += `5. 必须严格遵循标记格式，如 [银行卡开始] 和 [银行卡结束]\n`;
  prompt += `6. 数量要合理：普通人1-2条，富人3-5条，顶级富豪4-5条\n`;
  
  return prompt;
}

/**
 * 解析AI返回的资产数据
 */
export function parseAssetGenerationResponse(response: string): {
  banks: any[];
  properties: any[];
  shares: any[];
  cars: any[];
} {
  const result = {
    banks: [] as any[],
    properties: [] as any[],
    shares: [] as any[],
    cars: [] as any[],
  };
  
  // 解析银行卡
  const bankMatch = response.match(/\[银行卡开始\]([\s\S]*?)\[银行卡结束\]/);
  if (bankMatch) {
    const lines = bankMatch[1].trim().split('\n').filter(l => l.trim() && !l.includes('所属银行|'));
    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        result.banks.push({
          id: Date.now() + Math.random(),
          bankName: parts[0],
          cardType: parts[1],
          cardNumber: parts[2],
          balance: parts[3],
        });
      }
    });
  }
  
  // 解析房产
  const propertyMatch = response.match(/\[房产开始\]([\s\S]*?)\[房产结束\]/);
  if (propertyMatch) {
    const lines = propertyMatch[1].trim().split('\n').filter(l => l.trim() && !l.includes('房产名称|'));
    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        result.properties.push({
          id: Date.now() + Math.random(),
          name: parts[0],
          location: parts[1],
          area: parts[2],
          valuation: parts[3],
        });
      }
    });
  }
  
  // 解析股份
  const sharesMatch = response.match(/\[股份开始\]([\s\S]*?)\[股份结束\]/);
  if (sharesMatch) {
    const lines = sharesMatch[1].trim().split('\n').filter(l => l.trim() && !l.includes('公司名称|'));
    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        result.shares.push({
          id: Date.now() + Math.random(),
          company: parts[0],
          ratio: parts[1],
          type: parts[2],
          valuation: parts[3],
        });
      }
    });
  }
  
  // 解析车产
  const carMatch = response.match(/\[车产开始\]([\s\S]*?)\[车产结束\]/);
  if (carMatch) {
    const lines = carMatch[1].trim().split('\n').filter(l => l.trim() && !l.includes('车辆品牌|'));
    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        result.cars.push({
          id: Date.now() + Math.random(),
          brand: parts[0],
          model: parts[1],
          plate: parts[2],
          valuation: parts[3],
        });
      }
    });
  }
  
  return result;
}

/**
 * 调用AI生成资产
 */
export async function generateAssetsWithAI(params: {
  persona: any;
  generateOptions: {
    prompt: string;
    bank: boolean;
    property: boolean;
    shares: boolean;
    car: boolean;
  };
}): Promise<{
  banks: any[];
  properties: any[];
  shares: any[];
  cars: any[];
}> {
  // 读取 API 配置
  const apiKey = (localStorage.getItem('os_api_key') || '').trim();
  const apiBaseUrl = (localStorage.getItem('os_api_url') || 'https://api.openai.com/v1').replace(/\/$/, '');
  const apiModel = (localStorage.getItem('os_api_model') || '').trim();
  
  if (!apiKey) {
    throw new Error('⚠️ 未配置 API Key，请先在设置中填写');
  }
  if (!apiModel) {
    throw new Error('⚠️ 未配置模型名称，请先在设置中填写');
  }
  
  // 构建提示词
  const prompt = buildAssetGenerationPrompt(params);
  if (!prompt) {
    throw new Error('没有选择任何资产类型进行生成');
  }
  
  console.log('[资产生成] 提示词:', prompt);
  
  // 调用 API
  let completionsUrl = apiBaseUrl;
  if (!completionsUrl.endsWith('/chat/completions')) {
    completionsUrl = completionsUrl.endsWith('/')
      ? `${completionsUrl}chat/completions`
      : `${completionsUrl}/chat/completions`;
  }
  
  // 校验 URL 合法性
  let validatedUrl: string;
  try {
    validatedUrl = new URL(completionsUrl).toString();
  } catch (_e) {
    throw new Error('API 地址格式不正确，请检查设置');
  }
  
  console.log('[资产生成] 发起 API 请求:', validatedUrl);
  
  const resp = await fetch(validatedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4096,
      stream: false,
    }),
  });
  
  if (!resp.ok) {
    let errDetail = '';
    try {
      errDetail = await resp.text();
    } catch (_e) {}
    throw new Error(`API 请求失败 (${resp.status}): ${errDetail.substring(0, 200)}`);
  }
  
  // 处理响应
  const contentType = resp.headers.get('content-type') || '';
  let fullText = '';
  
  if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
    // 流式 SSE 响应
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') fullText += delta;
          const directContent = parsed.choices?.[0]?.message?.content;
          if (typeof directContent === 'string') fullText += directContent;
        } catch (_e) {}
      }
    }
  } else {
    // 标准 JSON 响应
    const rawText = await resp.text();
    
    if (rawText.trimStart().startsWith('data:')) {
      // 伪装成 JSON 的 SSE
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') fullText += delta;
          const directContent = parsed.choices?.[0]?.message?.content;
          if (typeof directContent === 'string') fullText += directContent;
        } catch (_e) {}
      }
    } else {
      // 真正的 JSON
      try {
        const json = JSON.parse(rawText);
        fullText = json.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.error('[资产生成] JSON 解析失败:', e);
        throw new Error('API 返回格式错误');
      }
    }
  }
  
  console.log('[资产生成] AI 响应:', fullText);
  
  // 解析响应
  const result = parseAssetGenerationResponse(fullText);
  
  console.log('[资产生成] 解析结果:', result);
  
  return result;
}

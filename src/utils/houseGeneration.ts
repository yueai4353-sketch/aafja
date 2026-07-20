export interface RoomSpot {
  where: string;  // 位置描述
  what: string;   // 物品描述
}

export interface Room {
  name: string;
  decor: string;  // 装饰和布置描述
  items: string[];  // 可见物品列表
  spots: RoomSpot[];  // 可翻找的位置
  exits: Record<string, string>;  // 出口：方向 -> 房间名
}

import { AppDB } from '../db';

export interface HouseStructure {
  entry: string;  // 入口房间名
  rooms: Record<string, Room>;  // 房间映射
  charRoom?: string;  // 角色当前所在房间（可选）
}

export async function generateHouseStructure({
  persona,
  residents = [],
  worldBooks = [],
  existingHouse = null,
  designPrompt = ''
}: {
  persona: any;
  residents: string[];  // 住户ID列表
  worldBooks?: any[];
  existingHouse?: HouseStructure | null;
  designPrompt?: string;
}): Promise<HouseStructure> {
  
  // 获取所有入驻用户的完整人设信息（从 localStorage 读取花集人设）
  const personasStr = localStorage.getItem('os_personas');
  const allPersonas = personasStr ? JSON.parse(personasStr) : [];
  
  // 获取当前用户档案 (从DB读取)
  const userProfileRecord = await AppDB.appSettings.get('my_profile');
  const userProfile = userProfileRecord?.value || null;

  // 获取所有世界书
  const worldbooksStr = localStorage.getItem('os_worldbooks');
  const allWorldbooks = worldbooksStr ? JSON.parse(worldbooksStr) : [];

  // 识别主人（被选择作为住宅所有者的AI人设）
  const ownerPersona = allPersonas.find((p: any) => p.id === persona.id) || persona;

  // 读取主人绑定的世界书
  let ownerWorldbookContent = '';
  if (ownerPersona.linked_worldbooks && Array.isArray(ownerPersona.linked_worldbooks) && ownerPersona.linked_worldbooks.length > 0) {
    const linkedBooks = allWorldbooks.filter((wb: any) => ownerPersona.linked_worldbooks.includes(wb.id));
    linkedBooks.forEach((wb: any) => {
      if (wb.editMode === 'simple') {
        if (wb.content && wb.content.trim()) {
          ownerWorldbookContent += `\n[${wb.name}]: ${wb.content}`;
        }
      } else if (wb.entries && wb.entries.length > 0) {
        wb.entries.forEach((entry: any) => {
          if (entry.content && entry.content.trim()) {
            ownerWorldbookContent += `\n[${wb.name}] - ${entry.keys || '无关键词'}: ${entry.content}`;
          }
        });
      }
    });
  }

  // 构建住户信息描述
  let residentsInfo = '';
  let residentsNames: string[] = [];
  
  if (residents.length > 0) {
    residentsInfo = '\n\n【共同居住成员信息】\n';
    residents.forEach(id => {
      if (id === 'user') {
        if (userProfile) {
          // 优先使用真实姓名，其次微信昵称，最后默认名称
          const userName = userProfile.real_name || userProfile.name || '用户自己';
          residentsNames.push(userName);
          
          // 构建完整的用户人设信息
          const userPersonaDetails: string[] = [];
          if (userProfile.real_name) userPersonaDetails.push(`真实姓名：${userProfile.real_name}`);
          if (userProfile.name) userPersonaDetails.push(`微信昵称：${userProfile.name}`);
          if (userProfile.gender) userPersonaDetails.push(`性别：${userProfile.gender}`);
          if (userProfile.age) userPersonaDetails.push(`年龄：${userProfile.age}`);
          if (userProfile.identity) userPersonaDetails.push(`身份：${userProfile.identity}`);
          if (userProfile.nickname) userPersonaDetails.push(`昵称：${userProfile.nickname}`);
          if (userProfile.personality) userPersonaDetails.push(`性格：${userProfile.personality}`);
          if (userProfile.appearance) userPersonaDetails.push(`外貌：${userProfile.appearance}`);
          if (userProfile.communication_style) userPersonaDetails.push(`交流风格：${userProfile.communication_style}`);
          if (userProfile.lifestyle) userPersonaDetails.push(`生活方式：${userProfile.lifestyle}`);
          if (userProfile.background) userPersonaDetails.push(`背景：${userProfile.background}`);
          
          residentsInfo += `- [共同居住者(用户)] ${userName}\n`;
          residentsInfo += `  人设信息：${userPersonaDetails.join('，')}\n`;
          if (userProfile.avatar) {
            residentsInfo += `  用户头像：已设置（将在房屋物品描述中体现照片等物品）\n`;
          }
        } else {
          const userName = '用户自己';
          residentsNames.push(userName);
          residentsInfo += `- [共同居住者(用户)] ${userName}：暂无详细人设信息\n`;
        }
      } else {
        const residentPersona = allPersonas.find((p: any) => p.id === id);
        if (residentPersona) {
          const role = residentPersona.id === persona.id ? '房屋主人' : '共同居住者';
          if (residentPersona.id !== persona.id) {
            residentsNames.push(residentPersona.name);
          }
          
          // 构建完整的AI人设信息
          const aiPersonaDetails: string[] = [];
          if (residentPersona.name) aiPersonaDetails.push(`姓名：${residentPersona.name}`);
          if (residentPersona.wechatName) aiPersonaDetails.push(`微信昵称：${residentPersona.wechatName}`);
          if (residentPersona.gender) aiPersonaDetails.push(`性别：${residentPersona.gender}`);
          if (residentPersona.age) aiPersonaDetails.push(`年龄：${residentPersona.age}`);
          if (residentPersona.identity) aiPersonaDetails.push(`身份：${residentPersona.identity}`);
          if (residentPersona.nickname) aiPersonaDetails.push(`昵称：${residentPersona.nickname}`);
          if (residentPersona.personality) aiPersonaDetails.push(`性格：${residentPersona.personality}`);
          if (residentPersona.appearance) aiPersonaDetails.push(`外貌：${residentPersona.appearance}`);
          if (residentPersona.relationship) aiPersonaDetails.push(`与用户关系：${residentPersona.relationship}`);
          if (residentPersona.communication_style) aiPersonaDetails.push(`交流风格：${residentPersona.communication_style}`);
          if (residentPersona.lifestyle) aiPersonaDetails.push(`生活方式：${residentPersona.lifestyle}`);
          if (residentPersona.background) aiPersonaDetails.push(`背景：${residentPersona.background}`);
          if (residentPersona.bio) aiPersonaDetails.push(`简介：${residentPersona.bio}`);
          
          residentsInfo += `- [${role}] ${residentPersona.name}\n`;
          residentsInfo += `  人设信息：${aiPersonaDetails.join('，')}\n`;
          
          // 读取该住户绑定的世界书
          if (residentPersona.linked_worldbooks && Array.isArray(residentPersona.linked_worldbooks) && residentPersona.linked_worldbooks.length > 0) {
            const residentBooks = allWorldbooks.filter((wb: any) => residentPersona.linked_worldbooks.includes(wb.id));
            let residentWorldbookContent = '';
            residentBooks.forEach((wb: any) => {
              if (wb.editMode === 'simple') {
                if (wb.content && wb.content.trim()) {
                  residentWorldbookContent += `\n    [${wb.name}]: ${wb.content}`;
                }
              } else if (wb.entries && wb.entries.length > 0) {
                wb.entries.forEach((entry: any) => {
                  if (entry.content && entry.content.trim()) {
                    residentWorldbookContent += `\n    [${wb.name}] - ${entry.keys || '无关键词'}: ${entry.content}`;
                  }
                });
              }
            });
            if (residentWorldbookContent) {
              residentsInfo += `  绑定的世界书设定：${residentWorldbookContent}\n`;
            }
          }
          
          if (residentPersona.avatar || residentPersona.my_bound_avatar) {
            residentsInfo += `  人设头像：已设置（将在房屋物品描述中体现照片等物品）\n`;
          }
        }
      }
    });
  }

  // 构建现有房屋信息
  let existingHouseInfo = '';
  if (existingHouse && existingHouse.rooms) {
    existingHouseInfo = '\n\n【之前的住处结构供参考】\n' + JSON.stringify(existingHouse, null, 2);
  }

  const prompt = `你是一个专业的空间设计师和生活观察者。请根据以下信息，生成一处多人共同居住的私宅结构。

【房屋主人信息】（房屋的所有者，主要的风格奠定者）
姓名：${ownerPersona.name || '未知'}
性别：${ownerPersona.gender || '未知'}
年龄：${ownerPersona.age || '未知'}
身份：${ownerPersona.identity || '无'}
性格：${ownerPersona.personality || '无'}
外貌：${ownerPersona.appearance || '无'}
生活方式：${ownerPersona.lifestyle || '无'}
背景：${ownerPersona.background || '无'}
${residentsInfo}
${existingHouseInfo}

【任务要求】
这是一处由上述【房屋主人】和【共同居住成员】一起居住的私宅。
请仔细阅读并分析**所有居住者（包括主人、其他AI角色、以及用户）**的身份、职业、性格和世界观设定，为他们设计这处**共同生活**的私人居所。
在这处居所中，不仅要体现主人的审美品味和财力，更要**强烈体现出所有居住者在这里共同生活的痕迹、相互交织的生活状态**。
请注意：不要把坐标（如某大厦）和私居混淆，私居是他们生活起居、存放私人物品的实体室内空间。
${designPrompt ? `\n【特殊设计要求】\n用户对这次的房屋生成有特别的“设计思路”要求，请**务必**读取并严格按照以下要求在设计中体现出来：\n${designPrompt}\n（注意：如果这里有内容，你必须采纳这些设计思路；如果没有内容则忽略此条。）\n` : ''}

${existingHouse ? '【TA 最近的住处】已提供：如果他们还住在这里，请在原有空间基础上，根据目前入住的所有角色的人设和关系，更新屋内的物品、摆设和生活痕迹，不要随意改变整体结构；如果明显搬家了，则重新设计。' : '【TA 最近的住处】未提供：请根据所有入驻角色的性格和生活方式，从零开始设计这处住所。'}

【设计细节要求】
TA 这阵子住着、落脚的那处地方——长住的家也好，暂住的别处也好，TA 现在在哪儿住、在哪儿睡、把东西搁在哪儿，私居就是那处（跟坐标分开：坐标是此刻人在哪，私居是 TA 住的那处空间）。【TA 最近的住处】给了的话：TA 还住那儿就照那套空间来、别乱改、只更新此刻屋里的状态；不住那儿了（搬了或这阵子住到别处去了）就照 TA 现在住的地方来。没给（第一次看）就照 TA 这个人新建。先把这处住所有哪些房间一间不落地数清楚、全写出来——TA 是什么人、过什么日子，住的就是什么样、有几间房；实际有几间就写几间，从进门到最里头，每一间都要有，别漏掉任何一间（别硬凑也别漏）。每一间都连得通、能走一圈；每一间都仔细详细写出来、一处不落：里头有什么、东西怎么摆放的、是什么状态，看得见的都具体写，事无巨细，别给笼统印象。再翻翻每处收着的、不摆在明面上的东西。屋里的一切都得是 TA 这个人、过着这种日子会有的样子；越全越细，越能从这整个住处看清 TA 是个什么样的人、过着什么日子。房间之间标出朝哪个方向通向哪一间。

房间之间标出朝哪个方向通向哪一间（方向：up/down/left/right/upleft/upright/downleft/downright）。

请严格按照以下 JSON 格式输出，不要有任何其他文字：

{
  "entry": "玄关",
  "rooms": {
    "玄关": {
      "name": "玄关",
      "decor": "大理石地砖冰凉质感，黑色包角木质玄关墙面，深灰色真皮鞋凳，光洁干净，直排落地鞋柜收得严整洁净",
      "items": [
        "墨高大理石几",
        "B&O金属座地音箱",
        "一本未看完的英文原版金融杂志",
        "只晾微一侧帘幕换鞋凳"
      ],
      "spots": [
        {
          "where": "大理石茶几抽屉里",
          "what": "钥匙、墨镜、名片夹"
        }
      ],
      "exits": {
        "right": "客厅"
      }
    },
    "客厅": {
      "name": "客厅",
      "decor": "落地窗外城市夜景，深色木质地板，灰黑色皮质沙发组，玻璃茶几反射微光",
      "items": [
        "70寸OLED电视",
        "B&W钻石系列音响",
        "茶几上的威士忌酒瓶和两个空杯"
      ],
      "spots": [
        {
          "where": "沙发靠垫下",
          "what": "一本翻到一半的小说"
        }
      ],
      "exits": {
        "left": "玄关",
        "up": "厨房",
        "right": "卧室"
      }
    }
  }
}`;

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

  try {
    console.log('[房屋生成] 开始生成房屋结构...');
    
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
    
    console.log('[房屋生成] 发起 API 请求:', validatedUrl);
    
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
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('[房屋生成] API 请求失败:', errorText);
      throw new Error(`API 请求失败: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    const fullResponse = data.choices?.[0]?.message?.content || '';

    console.log('[房屋生成] AI返回内容:', fullResponse);

    // 尝试提取JSON
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回内容中未找到有效的JSON格式');
    }

    const houseData = JSON.parse(jsonMatch[0]) as HouseStructure;
    
    // 验证数据结构
    if (!houseData.entry || !houseData.rooms || Object.keys(houseData.rooms).length === 0) {
      throw new Error('生成的房屋结构数据不完整');
    }

    console.log('[房屋生成] 成功生成房屋结构:', houseData);
    return houseData;

} catch (error: any) {
    console.error('[房屋生成] 生成失败:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('网络请求失败。请检查 API URL 是否正确、服务是否正在运行，以及是否存在CORS跨域问题。');
    }
    throw new Error(`房屋结构生成失败: ${error.message}`);
  }
}

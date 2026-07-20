/**
 * 资产信息上下文构建工具
 * 用于在微信聊天中智能判断是否需要读取资产信息，以及读取哪些类型的资产
 * 优化版本：使用关键词匹配，无需额外API调用
 */

/**
 * 第一步：关键词匹配判断 - 无需AI调用，直接通过关键词判断是否涉及资产
 * @param recentMessages 最近的对话消息
 * @returns 判断结果，包含是否相关、相关的资产类型
 */
export function checkAssetRelevance(
  recentMessages: any[]
): {
  isRelevant: boolean;
  types: ('bank' | 'property' | 'shares' | 'car')[];
} {
  // 提取最近10条用户消息（扩大范围以捕捉更多上下文）
  const userTexts = recentMessages
    .filter(m => m.isMe && m.text && m.msgType !== 'system' && m.msgType !== 'narrator')
    .slice(-10)
    .map(m => m.text.toLowerCase())
    .join(' ');

  if (!userTexts.trim()) {
    return { isRelevant: false, types: [] };
  }

  const types: ('bank' | 'property' | 'shares' | 'car')[] = [];

  // 银行卡相关关键词（中英文混合）
  const bankKeywords = [
    '银行', '卡', '存款', '余额', '账户', '转账', '取款', '存钱',
    '储蓄', '工资卡', '信用卡', '借记卡', 'atm', '网银',
    '银行卡号', '卡号', '开户', '账号'
  ];
  if (bankKeywords.some(kw => userTexts.includes(kw))) {
    types.push('bank');
  }

  // 房产相关关键词
  const propertyKeywords = [
    '房', '别墅', '公寓', '住宅', '物业', '地产', '房产', '房子',
    '小区', '楼盘', '豪宅', '平方', '㎡', '平米', '户型',
    '房间', '卧室', '客厅', '装修', '房价', '房屋'
  ];
  if (propertyKeywords.some(kw => userTexts.includes(kw))) {
    types.push('property');
  }

  // 股份相关关键词
  const sharesKeywords = [
    '股', '股份', '股权', '持股', '股东', '投资', '公司股',
    '份额', '占股', '分红', '股票', '入股', '控股',
    '上市', '市值', '估值'
  ];
  if (sharesKeywords.some(kw => userTexts.includes(kw))) {
    types.push('shares');
  }

  // 车辆相关关键词
  const carKeywords = [
    '车', '汽车', '车牌', '座驾', '开车', '车辆', '轿车',
    '豪车', '跑车', 'suv', '越野', '车型', '驾驶',
    '奔驰', '宝马', '奥迪', '保时捷', '法拉利', '兰博基尼',
    '特斯拉', '停车', '车库'
  ];
  if (carKeywords.some(kw => userTexts.includes(kw))) {
    types.push('car');
  }

  return {
    isRelevant: types.length > 0,
    types
  };
}

/**
 * 第二步：读取指定类型的资产信息
 * @param personaId AI人设ID
 * @param types 需要读取的资产类型
 * @returns 格式化的资产信息文本
 */
export function loadAssetsByTypes(
  personaId: string,
  types: ('bank' | 'property' | 'shares' | 'car')[]
): string {
  if (!types || types.length === 0) {
    return '';
  }

  let assetInfo = '';

  // 读取银行卡信息
  if (types.includes('bank')) {
    const banksData = localStorage.getItem(`cangxu_banks_${personaId}`);
    if (banksData) {
      try {
        const banks = JSON.parse(banksData);
        if (banks.length > 0) {
          assetInfo += '\n【银行卡信息】\n';
          banks.forEach((bank: any, index: number) => {
            assetInfo += `${index + 1}. ${bank.bankName || '未知银行'} - ${bank.cardType || '普通卡'}\n`;
            assetInfo += `   卡号：${bank.cardNumber || '****'}\n`;
            assetInfo += `   余额：¥${bank.balance || '0'}\n`;
          });
        }
      } catch (e) {
        console.warn('[资产读取] 银行卡数据解析失败:', e);
      }
    }
  }

  // 读取房产信息
  if (types.includes('property')) {
    const propertiesData = localStorage.getItem(`cangxu_properties_${personaId}`);
    if (propertiesData) {
      try {
        const properties = JSON.parse(propertiesData);
        if (properties.length > 0) {
          assetInfo += '\n【房产信息】\n';
          properties.forEach((prop: any, index: number) => {
            assetInfo += `${index + 1}. ${prop.name || '未命名房产'}\n`;
            assetInfo += `   位置：${prop.location || '未知'}\n`;
            assetInfo += `   面积：${prop.area || '0'}㎡\n`;
            assetInfo += `   估值：¥${prop.valuation || '0'}\n`;
          });
        }
      } catch (e) {
        console.warn('[资产读取] 房产数据解析失败:', e);
      }
    }
  }

  // 读取股份信息
  if (types.includes('shares')) {
    const sharesData = localStorage.getItem(`cangxu_shares_${personaId}`);
    if (sharesData) {
      try {
        const shares = JSON.parse(sharesData);
        if (shares.length > 0) {
          assetInfo += '\n【股份信息】\n';
          shares.forEach((share: any, index: number) => {
            assetInfo += `${index + 1}. ${share.company || '未知公司'}\n`;
            assetInfo += `   持股比例：${share.ratio || '0'}%\n`;
            assetInfo += `   股份类型：${share.type || '普通股'}\n`;
            assetInfo += `   市值：¥${share.valuation || '0'}\n`;
          });
        }
      } catch (e) {
        console.warn('[资产读取] 股份数据解析失败:', e);
      }
    }
  }

  // 读取车产信息
  if (types.includes('car')) {
    const carsData = localStorage.getItem(`cangxu_cars_${personaId}`);
    if (carsData) {
      try {
        const cars = JSON.parse(carsData);
        if (cars.length > 0) {
          assetInfo += '\n【车产信息】\n';
          cars.forEach((car: any, index: number) => {
            assetInfo += `${index + 1}. ${car.brand || '未知品牌'} ${car.model || ''}\n`;
            assetInfo += `   车牌：${car.plate || '未上牌'}\n`;
            assetInfo += `   估值：¥${car.valuation || '0'}\n`;
          });
        }
      } catch (e) {
        console.warn('[资产读取] 车产数据解析失败:', e);
      }
    }
  }

  return assetInfo;
}

/**
 * 主入口：智能构建资产上下文（优化版 - 无需额外API调用）
 * @param personaId AI人设ID
 * @param persona AI人设对象
 * @param recentMessages 最近的对话消息
 * @returns 资产信息文本（如果不相关则返回空字符串）
 */
export async function buildAssetContext(
  personaId: string,
  persona: any,
  recentMessages: any[]
): Promise<string> {
  // 第一步：关键词匹配判断（无API调用）
  const relevance = checkAssetRelevance(recentMessages);
  
  if (!relevance.isRelevant) {
    // console.log('[资产上下文] 对话与资产无关，跳过读取');
    return '';
  }

  console.log('[资产上下文] 检测到资产相关对话，读取类型:', relevance.types);

  // 第二步：读取相关资产
  const assetInfo = loadAssetsByTypes(personaId, relevance.types);
  
  if (!assetInfo) {
    return '';
  }

  // 第三步：格式化输出
  return `\n【私人资产档案】${assetInfo}`;
}

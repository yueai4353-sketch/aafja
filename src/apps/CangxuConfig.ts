// 藏叙应用配置文件 - 存储所有文字、符号、函数等，便于后续调用和管理

export const CangxuConfig = {
  // 应用标题
  APP_TITLE: '藏叙',
  
  // 视图类型
  VIEW_TYPES: {
    MAIN: 'main' as const,
    LIST: 'list' as const,
    PRIVATE_PROPERTY: 'private_property' as const,
  },

  // 资产类型
  ASSET_TYPES: {
    BANK: 'bank' as const,
    PROPERTY: 'property' as const,
    SHARES: 'shares' as const,
    CAR: 'car' as const,
  },

  // 文字配置
  TEXT: {
    // 主界面
    MAIN: {
      TITLE: '藏叙',
      SELECT_PERSONA: '选择角色',
      UNSELECTED: '未选择',
      ENTER_BUTTON: '进入',
    },
    
    // 列表界面
    LIST: {
      PRIVATE_PROPERTY: '私人财产',
    },
    
    // 私人财产界面
    PRIVATE_PROPERTY: {
      BANK_CARD: '银行卡',
      PROPERTY: '房产',
      SHARES: '股份',
      CAR: '车产',
      
      // 提示文字
      PLACEHOLDER: {
        BANK: '请添加银行卡',
        PROPERTY: '请添加房产',
        SHARES: '请添加股份',
        CAR: '请添加车辆',
      },
    },
    
    // 编辑弹窗
    EDIT_MODAL: {
      TITLE: {
        ADD: '添加',
        EDIT: '编辑',
        BANK: '银行卡',
        PROPERTY: '房产',
        SHARES: '股份',
        CAR: '车辆',
      },
      
      // 银行卡字段
      BANK_FIELDS: {
        BANK_NAME: {
          LABEL: '所属银行',
          PLACEHOLDER: '例如：瑞士银行、花旗银行',
        },
        CARD_TYPE: {
          LABEL: '卡片类型',
          PLACEHOLDER: '例如：百夫长黑金卡',
        },
        CARD_NUMBER: {
          LABEL: '卡号',
          PLACEHOLDER: '**** **** **** ****',
        },
        BALANCE: {
          LABEL: '当前余额',
          PLACEHOLDER: '输入金额',
        },
      },
      
      // 房产字段
      PROPERTY_FIELDS: {
        NAME: {
          LABEL: '房产名称',
          PLACEHOLDER: '例如：半山海景别墅、汤臣一品',
        },
        LOCATION: {
          LABEL: '所在地',
          PLACEHOLDER: '例如：香港太平山顶',
        },
        AREA: {
          LABEL: '占地面积 (㎡)',
          PLACEHOLDER: '输入面积',
        },
        VALUATION: {
          LABEL: '估值',
          PLACEHOLDER: '当前市值',
        },
      },
      
      // 股份字段
      SHARES_FIELDS: {
        COMPANY: {
          LABEL: '公司/集团名称',
          PLACEHOLDER: '例如：靳寰集团、鼎盛资本',
        },
        RATIO: {
          LABEL: '持股比例 (%)',
          PLACEHOLDER: '例如：51',
        },
        TYPE: {
          LABEL: '股份类型',
          PLACEHOLDER: '原始股/干股等',
        },
        VALUATION: {
          LABEL: '市值估值',
          PLACEHOLDER: '输入估值',
        },
      },
      
      // 车产字段
      CAR_FIELDS: {
        BRAND: {
          LABEL: '车辆品牌',
          PLACEHOLDER: '例如：劳斯莱斯、宾利',
        },
        MODEL: {
          LABEL: '车型',
          PLACEHOLDER: '例如：幻影、飞驰',
        },
        PLATE: {
          LABEL: '车牌号',
          PLACEHOLDER: '例如：京A·88888',
        },
        VALUATION: {
          LABEL: '估值',
          PLACEHOLDER: '当前市值',
        },
      },
      
      SAVE_BUTTON: '保存',
    },
    
    // 生成弹窗
    GENERATE_MODAL: {
      TITLE: 'AI 生成资产',
      PROMPT_LABEL: '生成要求',
      PROMPT_PLACEHOLDER: '不写则随机生成。可输入：香港顶级富豪、低调隐形富豪等...',
      TYPE_LABEL: '生成类型',
      CANCEL_BUTTON: '取消',
      CONFIRM_BUTTON: '开始生成',
    },
    
    // 渲染项默认值
    DEFAULT_VALUES: {
      BANK: {
        BANK_NAME: '未知银行',
        CARD_TYPE: '普通卡',
        CARD_NUMBER: '**** **** **** ****',
        BALANCE: '0.00',
        CURRENT_BALANCE: 'CURRENT BALANCE',
        CARD_BRAND: 'VISA',
      },
      PROPERTY: {
        NAME: '未命名房产',
        LOCATION: '未知地点',
        AREA: '0',
        VALUATION: '0',
      },
      SHARES: {
        COMPANY: '未知公司',
        COMPANY_INITIAL: '公',
        TYPE: '普通股',
        RATIO: '0',
        VALUATION: '0',
        RATIO_LABEL: '持股比例',
        VALUATION_LABEL: '市值估值',
      },
      CAR: {
        BRAND: '未知品牌',
        MODEL: '',
        PLATE: '未上牌',
        VALUATION: '0',
      },
    },
  },

  // 符号配置
  SYMBOLS: {
    CURRENCY: '¥',
    SEPARATOR: '•',
    AREA_UNIT: '㎡',
    PERCENT: '%',
    PLACEHOLDER_PREFIX: '—',
    PLACEHOLDER_SUFFIX: '—',
  },

  // 样式类名配置
  STYLE_CLASSES: {
    // 卡片类型
    CARD: {
      WHITE: {
        BG: 'bg-white/10 border-white/20',
        BORDER: 'border-white/30 bg-gradient-to-br from-white/20 to-white/5',
        TEXT: 'text-white',
        LINE: 'bg-white/50',
      },
      BLACK: {
        BG: 'bg-black/40 border-white/10',
        BORDER: 'border-white/5 bg-gradient-to-br from-white/10 to-transparent',
        TEXT: 'text-white/80',
        LINE: 'bg-white/20',
      },
    },
  },

  // LocalStorage 键名配置
  STORAGE_KEYS: {
    SELECTED_PERSONA: 'cangxu_selected_persona',
    VIEW: 'cangxu_view',
    BANKS: (personaId: string) => `cangxu_banks_${personaId}`,
    PROPERTIES: (personaId: string) => `cangxu_properties_${personaId}`,
    SHARES: (personaId: string) => `cangxu_shares_${personaId}`,
    CARS: (personaId: string) => `cangxu_cars_${personaId}`,
  },

  // 星空配置
  STARFIELD: {
    STAR_COUNT: 800,
    LARGE_STAR_PROBABILITY: 0.15, // 15% 概率是大星星
    LARGE_STAR_SIZE: { MIN: 2.5, MAX: 5.5 },
    SMALL_STAR_SIZE: { MIN: 0.5, MAX: 2.5 },
    LARGE_STAR_OPACITY: { MIN: 0.6, MAX: 1.0 },
    SMALL_STAR_OPACITY: { MIN: 0.2, MAX: 0.8 },
    TWINKLE_SPEED: { MIN: 1, MAX: 5 },
    TWINKLE_DELAY: { MAX: 5 },
    POSITION_RANGE: { MIN: -100, MAX: 200 },
    BG_COLOR: '#040508',
  },

  // 动画配置
  ANIMATION: {
    CARD_HEIGHT: {
      COLLAPSED: 110,
      EXPANDED_BASE: 110,
      EXPANDED_ITEM_HEIGHT: 100,
      EXPANDED_MAX: 350,
    },
    DRAG_MULTIPLIER: 2.5,
    TRANSITION_DURATION: 300, // ms
  },

  // 工具函数
  UTILS: {
    // 格式化占位符文字
    formatPlaceholder: (text: string) => {
      return `${CangxuConfig.SYMBOLS.PLACEHOLDER_PREFIX} ${text} ${CangxuConfig.SYMBOLS.PLACEHOLDER_SUFFIX}`;
    },
    
    // 格式化货币
    formatCurrency: (amount: string | number) => {
      return `${CangxuConfig.SYMBOLS.CURRENCY} ${amount}`;
    },
    
    // 格式化面积
    formatArea: (area: string | number) => {
      return `${area} ${CangxuConfig.SYMBOLS.AREA_UNIT}`;
    },
    
    // 格式化百分比
    formatPercent: (value: string | number) => {
      return `${value}${CangxuConfig.SYMBOLS.PERCENT}`;
    },
    
    // 获取公司名首字母
    getCompanyInitial: (companyName: string) => {
      return companyName ? companyName.charAt(0) : CangxuConfig.TEXT.DEFAULT_VALUES.SHARES.COMPANY_INITIAL;
    },
    
    // 计算展开后的高度
    calculateExpandedHeight: (itemCount: number) => {
      const { COLLAPSED, EXPANDED_ITEM_HEIGHT, EXPANDED_MAX } = CangxuConfig.ANIMATION.CARD_HEIGHT;
      return itemCount > 0 
        ? Math.min(COLLAPSED + itemCount * EXPANDED_ITEM_HEIGHT, EXPANDED_MAX)
        : 200;
    },
    
    // 生成星星配置
    generateStarConfig: () => {
      const { LARGE_STAR_PROBABILITY, LARGE_STAR_SIZE, SMALL_STAR_SIZE, 
              LARGE_STAR_OPACITY, SMALL_STAR_OPACITY, TWINKLE_SPEED, 
              TWINKLE_DELAY, POSITION_RANGE } = CangxuConfig.STARFIELD;
      
      const isLargeStar = Math.random() > (1 - LARGE_STAR_PROBABILITY);
      const size = isLargeStar 
        ? Math.random() * (LARGE_STAR_SIZE.MAX - LARGE_STAR_SIZE.MIN) + LARGE_STAR_SIZE.MIN
        : Math.random() * (SMALL_STAR_SIZE.MAX - SMALL_STAR_SIZE.MIN) + SMALL_STAR_SIZE.MIN;
      
      const opacity = isLargeStar
        ? Math.random() * (LARGE_STAR_OPACITY.MAX - LARGE_STAR_OPACITY.MIN) + LARGE_STAR_OPACITY.MIN
        : Math.random() * (SMALL_STAR_OPACITY.MAX - SMALL_STAR_OPACITY.MIN) + SMALL_STAR_OPACITY.MIN;
      
      return {
        x: Math.random() * (POSITION_RANGE.MAX - POSITION_RANGE.MIN) + POSITION_RANGE.MIN,
        y: Math.random() * (POSITION_RANGE.MAX - POSITION_RANGE.MIN) + POSITION_RANGE.MIN,
        size,
        opacity,
        twinkleSpeed: Math.random() * (TWINKLE_SPEED.MAX - TWINKLE_SPEED.MIN) + TWINKLE_SPEED.MIN,
        twinkleDelay: Math.random() * TWINKLE_DELAY.MAX,
      };
    },
  },
} as const;

// 类型导出，便于 TypeScript 类型检查
export type AssetType = typeof CangxuConfig.ASSET_TYPES[keyof typeof CangxuConfig.ASSET_TYPES];
export type ViewType = typeof CangxuConfig.VIEW_TYPES[keyof typeof CangxuConfig.VIEW_TYPES];

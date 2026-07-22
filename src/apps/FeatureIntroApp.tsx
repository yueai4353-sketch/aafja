import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FeatureIntroAppProps {
  onBack: () => void;
}

interface FeatureItem {
  emoji: string;
  title: string;
  desc: string;
  detailContent?: string;
}

export const FeatureIntroApp: React.FC<FeatureIntroAppProps> = ({ onBack }) => {
  const [activeDetail, setActiveDetail] = useState<FeatureItem | null>(null);

  const features: FeatureItem[] = [
    {
      emoji: '⚙️',
      title: '设置',
      desc: '配置 API 接口、导入导出数据、查看声明和更新日志。',
      detailContent: `1. 填写API（填写主API就行，其他的分类还没做）

2. 导入导出功能（防止网站丢失，建议每天都导出备份一下）

3. 页面右上方保存旁边那个标点开有正版声明、免责声明、更新日志。`
    },
    {
      emoji: '🎨',
      title: '主题',
      desc: '更改桌面壁纸，打造专属界面风格。',
      detailContent: `1. 更改壁纸（本人不喜欢那种繁杂的ins风，所以不可以改图标图案）`
    },
    {
      emoji: '🌸',
      title: '花集',
      desc: '管理你的 AI 角色人设卡片，自定义性格、外貌、说话风格等详细设定。',
      detailContent: `1. 填写人设的地方。`
    },
    {
      emoji: '📖',
      title: '世界书',
      desc: '构建世界观条目，为对话注入背景设定和知识库，让角色更具深度。',
      detailContent: `1. 点击左上角加号可以添加世界书。
2. 点击左上角的三个横线可添加分类。
3. 新建世界书可以选择分类（建议你选一下，方便一点）。
4. 读取顺序可以理解为重要性，把破甲类选择强制，背景类选择先，其他放在后面。
5. 简单模式就是你输入的全读，建议破甲类背景类用这个模式。
6. 条目类就是只有AI检索到关键词才会读取，建议人物类地图类选这个。
7. 删除世界书是在主界面，随便长按一个世界书触发多选，选择你要删的就行。
请合理使用世界书调整token，不好好使用你的钱会像尿一样流走。`
    },
    {
      emoji: '💬',
      title: '微信',
      desc: '与 AI 角色进行沉浸式微信对话，支持语音通话、表情包、旁白等多种消息类型。',
      detailContent: `1. 能加好友，右上那个加号点开有。
2. 加了好友点开他，再点击发消息即可聊天。
3. 你的人设在"我"里面点击第一栏进入设置。
4. 支付点开进入钱包，右上三点点开可修改余额。银行卡没写好暂时不要用。
5. 聊天界面点击左下角加号可唤出功能栏。
6. 线下：点击开启线下（目前没有写自动线上线下只能通过这里切换）
7. 转账：顾名思义
8. 红包：暂时不要用没写好
9. 相册：文字描述图片发过去
10. 拍照：选择本地图片发过去（注意要选择能识别图片的模型）
11. 速切世界书：选择绑定在该人物身上的世界书。
12. 重回：目前有点bug，可能不读上下文。
13. 与你：此功能使用得先去"你我之间app"生成日程。点击左上的头像可以切换你和对方的日程。右边的月亮是一个开关，圆月在AI触发关键词（例如你在干什么之类的）会读取你和他的日程。点击圆月切换残月，只会读取他自己的日程。
14. 我控：道具功能，此功能是用在你对象身上的。具体自己摸索。
15. 视频：没写别用
16. 电话：能用但是有bug。
17. 梦境：没写
18. 位置：没写
19. 衣帽间：没写
20. 线上模式，点击输入框右边的话筒可以输入文字语音。笑脸是表情包。注意，在你输入的时候，爱心图标会变成小飞机，点击小飞机是发送消息。随便点个位置收回键盘小飞机会变成爱心，点击爱心触发AI回复。
21. 线下模式：表情包按钮会变成铅笔按钮，按钮显示粉色，你输入发出的消息会变成旁白，再次点击回复灰色发出去的是气泡。
22. 长按旁白或者气泡会弹出有很多功能的弹窗，自己摸索。其中插入是插入消息的意思。
23. 聊天界面右上三点点开是聊天设置，里面功能我讲一下重点：
24. 查看控制台还没写好别开。
25. Cher心声建议打开。
26. 线上思维链不要打开。
27. 停用时间感知顾名思义。
28. V2提示词引擎一定要打开。
29. AI记忆设置总结模块，只有总结下一批有用，建议你聊到100左右总结一下，总结的内容去记忆APP查看。
30. 字体颜色气泡大小懂得都懂。
31. 清空聊天记录与心声就是清除你的聊天记录。`
    },
    {
      emoji: '🧠',
      title: '记忆',
      desc: '自动总结和存储对话记忆，让 AI 角色记住你们之间的故事。',
      detailContent: `1. 选择你要查看的人进入。
2. 记忆海是管理记忆的地方，点进去。
3. 记忆海里目前就写了了解你和情节记忆，了解你就是和你有关、和他有关、和你们有关的。右上加号可自己添加摸索。情节记忆就是你聊天总结（发生了什么事）。`
    },
    {
      emoji: '🌤️',
      title: '天气',
      desc: '查看实时天气信息，融入角色扮演的生活场景。',
      detailContent: `1. 先点左上三个点进入设置好地点。
2. 三点旁边是刷新键，点击拉取天气（有bug，不知道修好没）`
    },
    {
      emoji: '📝',
      title: '藏叙',
      desc: '创作和管理剧情叙事，为角色互动提供故事线索和背景铺垫。',
      detailContent: `1. 点击头像选择人物，进入。可以看见私人财产和住宅。
2. 私人财产里面包含四条栏目，每一条栏目都能点开自行添加。也可以点击左上角刷新按钮填写生成要求、选择好类型要AI生成。
3. 有房产后，进入住宅界面，进入后先在左上角小人那选择入住人员，然后点右边刷新按钮，然后生成。最后会生成文字版的3D地图。

注意，私人财产接入了聊天，你问AI车什么的，提取到关键词他能读取到。`
    },
    {
      emoji: '💕',
      title: '你我之间',
      desc: '记录你和角色之间的日程、纪念日，管理双方的生活轨迹。',
      detailContent: `1. 看到左边不要笑，还没写好。
2. 左上选择你对象。
3. 只有右下角的日程能用。点开，弹窗点击左上"我的日程"可切换"对方日程"。点击右上刷新按钮可以生成日程。在生成你或者他的后，切换对方日程，选择生成会出现参考日程生成的按钮，打开的话，你/他的日程会关联起来。
4. 加号就是自行添加，删除就是全删了。
5. 单个删除修改长按生成的日程就行。`
    },
    {
      emoji: '📱',
      title: '查手机',
      desc: '模拟查看对方手机的互动体验，发现隐藏的聊天记录和秘密。',
      detailContent: `1. 点击人物进入输密码界面，等待密码生成，生成后会有一个提示词。根据提示词开锁。看提示词也不知道密码，去问你老公。或者右上角刷新重新生成。
2. 解锁后只有MissAV能用。点进去会自动生成限制级MV文字。长按生成的卡片可以分享给对方。右上清除清除生成，刷新会有一个生成要求（建议不要改，不然会破不开甲），点击确定生成。那怎么改你对象会看的什么，去花集里面改人设，就那个NSFW相关。`
    },
  ];

  // 详情界面
  if (activeDetail) {
    return (
      <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#fef7f8] to-[#fff0f3] flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 pt-12 pb-4">
          <button onClick={() => setActiveDetail(null)} className="flex items-center text-gray-600 active:text-gray-900 transition-colors">
            <ChevronLeft size={22} />
            <span className="text-[14px] ml-0.5">返回</span>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-bold text-gray-800 mr-8">{activeDetail.title}</h1>
        </div>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="mt-4 bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[28px]">{activeDetail.emoji}</span>
              <h2 className="text-[16px] font-bold text-gray-800">{activeDetail.title}</h2>
            </div>
            <div className="text-[14px] text-gray-700 leading-[1.8] whitespace-pre-line">
              {activeDetail.detailContent || activeDetail.desc}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#fef7f8] to-[#fff0f3] flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <button onClick={onBack} className="flex items-center text-gray-600 active:text-gray-900 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-[14px] ml-0.5">返回</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-gray-800 mr-8">功能介绍</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Hero Section */}
        <div className="text-center mb-6 mt-2">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#e87a90] to-[#f4a7b5] flex items-center justify-center shadow-lg shadow-[#e87a90]/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" fill="white" fillOpacity="0.9" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[15px] font-bold text-gray-800">春锦梨</h2>
          <p className="text-[12px] text-gray-500 mt-1">目前已写功能（没说的都不能用）</p>
        </div>

        {/* Feature List */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${feature.detailContent ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
              onClick={() => {
                if (feature.detailContent) {
                  setActiveDetail(feature);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-[22px] mt-0.5 shrink-0">{feature.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-gray-800 mb-1">{feature.title}</h3>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
                {feature.detailContent && (
                  <ChevronRight size={16} className="text-gray-400 mt-1 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Tips */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-gray-400">长按桌面图标可拖拽排序</p>
          <p className="text-[11px] text-gray-400 mt-1">所有数据存储在本地，保护你的隐私</p>
        </div>
      </div>
    </div>
  );
};

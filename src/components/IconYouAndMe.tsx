import React from 'react';

export const IconYouAndMe = ({ className = "" }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 日历外框 */}
    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* 顶部挂钩 */}
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    {/* 分割线 */}
    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    {/* 左侧人物（我） */}
    <circle cx="9" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M6 18.5C6 17 7.34 15.5 9 15.5C10.66 15.5 12 17 12 18.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    {/* 右侧人物（你），透明度略低以示区分 */}
    <circle cx="15" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
    <path d="M12 18.5C12 17 13.34 15.5 15 15.5C16.66 15.5 18 17 18 18.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
  </svg>
);

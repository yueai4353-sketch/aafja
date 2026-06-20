import React, { useState, useEffect } from 'react';

export function useCurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return time;
}

export function CurrentTime({ format = 'time', className = "" }: { format?: 'time' | 'date', className?: string }) {
  const time = useCurrentTime();
  
  if (format === 'time') {
    return <span className={className}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>;
  }
  
  // Custom date logic for App.tsx (05/31)
  const month = (time.getMonth() + 1).toString().padStart(2, '0');
  const date = time.getDate().toString().padStart(2, '0');
  return <span className={className}>{`${month}/${date}`}</span>;
}

export const BackgroundLines = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute left-[15%] top-[10%] w-px h-16 bg-gradient-to-b from-transparent to-gray-400/40"></div>
      <div className="absolute left-[45%] top-[30%] w-px h-24 bg-gradient-to-b from-transparent to-gray-400/30"></div>
      <div className="absolute left-[80%] top-[20%] w-px h-12 bg-gradient-to-b from-transparent to-gray-400/40"></div>
      
      <div className="absolute left-[25%] top-[60%] w-px h-20 bg-gradient-to-b from-transparent to-gray-400/30"></div>
      <div className="absolute left-[65%] top-[70%] w-px h-16 bg-gradient-to-b from-transparent to-gray-400/40"></div>
      <div className="absolute left-[85%] top-[50%] w-px h-32 bg-gradient-to-b from-transparent to-gray-400/20"></div>
      
      <div className="absolute left-6 top-0 w-px h-full bg-gradient-to-b from-gray-300/10 via-gray-300/30 to-gray-300/10"></div>
      <div className="absolute right-6 top-0 w-px h-full bg-gradient-to-b from-gray-300/10 via-gray-300/30 to-gray-300/10"></div>
    </div>
  );
};

export const IconWechat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 15C10.7614 15 13 13.2091 13 11C13 8.79086 10.7614 7 8 7C5.23858 7 3 8.79086 3 11C3 12.0622 3.49007 13.027 4.29177 13.7381L3 16L5.61719 15.3457C6.34789 15.7533 7.15174 16 8 16V15Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M13.2918 16.7381C14.0935 17.4492 15.0835 17.9142 16.1457 18.0645L18.7629 18.7188L17.4711 16.4569C18.2728 15.7458 18.7629 14.7811 18.7629 13.7188C18.7629 11.5097 16.5243 9.71884 13.7629 9.71884C13.5654 9.71884 13.3718 9.73491 13.183 9.76562" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <circle cx="8" cy="11" r="1.5" fill="currentColor"/>
    <circle cx="15.5" cy="13.5" r="1.2" fill="currentColor"/>
  </svg>
);

export const IconWeather = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4"/>
    <path d="M12 2V4.5M12 19.5V22M4.5 12H2M22 12H19.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4.92871 4.92871L7.04987 7.04987M16.95 16.95L19.0712 19.0712M4.92871 19.0712L7.04987 16.95M16.95 7.04987L19.0712 4.92871" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const IconCalendar = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4 10H20" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="15" cy="15" r="1.5" fill="currentColor"/>
    <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const IconHuaji = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4.5C12 4.5 14 7.5 15 10C16 12.5 19 12 19 12C19 12 15.5 13 14 15.5C12.5 18 12 20 12 20C12 20 11.5 17.5 10 15C8.5 12.5 5 12 5 12C5 12 8 11.5 9.5 9.5C11 7.5 12 4.5 12 4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3"/>
  </svg>
);

export const IconWorldbook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M6 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M6 13H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M15 9H18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M15 13H18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export const IconDevice = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="3" width="12" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M10 3V4H14V3" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
    <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1 2"/>
  </svg>
);

export const IconCompanion = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 14C17.6569 14 19 12.6569 19 11C19 9.34315 17.6569 8 16 8C14.3431 8 13 9.34315 13 11C13 12.6569 14.3431 14 16 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 12C12.1046 12 13 11.1046 13 10C13 8.89543 12.1046 8 11 8C9.89543 8 9 8.89543 9 10C9 11.1046 9.89543 12 11 12Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 20C19 17.2386 16.7614 15 14 15H13C10.2386 15 8 17.2386 8 20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 14C11.3431 14 10 12.6569 10 11H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 2"/>
  </svg>
);

export const IconSettings = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 15C19.7 14.1 19.9 13.1 19.9 12C19.9 10.9 19.7 9.9 19.4 9L21.4 7L17 5L15 7C14.1 6.7 13.1 6.5 12 6.5C10.9 6.5 9.9 6.7 9 7L7 5L2.6 7L4.6 9C4.3 9.9 4.1 10.9 4.1 12C4.1 13.1 4.3 14.1 4.6 15L2.6 17L7 19L9 17C9.9 17.3 10.9 17.5 12 17.5C13.1 17.5 14.1 17.3 15 17L17 19L21.4 17L19.4 15Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconAccounting = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 8V16M9 10.5H15M9 13.5H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconSecret = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 11V8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 11V8C16 6.89543 16.8954 6 18 6C19.1046 6 20 6.89543 20 8V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="2" y="11" width="20" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="15.5" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="15.5" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="15.5" r="1.5" fill="currentColor"/>
  </svg>
);

export const IconPeriod = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4 C15 7, 20 11, 20 15 C20 19, 16 22, 12 22 C8 22, 4 19, 4 15 C4 11, 9 7, 12 4 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M12 12 Q14 15, 12 18 Q10 15, 12 12 Z" fill="currentColor"/>
  </svg>
);

export const IconMessage = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 10.5C20 14.6421 16.4183 18 12 18C10.6616 18 9.39706 17.7001 8.28312 17.1645C6.0122 18.2435 4.54924 18.261 4.54924 18.261C4.54924 18.261 5.37893 17.0601 5.56736 15.656C4.5828 14.1957 4 12.4172 4 10.5C4 6.35786 7.58172 3 12 3C16.4183 3 20 6.35786 20 10.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10.5C9 10.7761 8.77614 11 8.5 11C8.22386 11 8 10.7761 8 10.5C8 10.2239 8.22386 10 8.5 10C8.77614 10 9 10.2239 9 10.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
    <path d="M12.5 10.5C12.5 10.7761 12.2761 11 12 11C11.7239 11 11.5 10.7761 11.5 10.5C11.5 10.2239 11.7239 10 12 10C12.2761 10 12.5 10.2239 12.5 10.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
    <path d="M16 10.5C16 10.7761 15.7761 11 15.5 11C15.2239 11 15 10.7761 15 10.5C15 10.2239 15.2239 10 15.5 10C15.7761 10 16 10.2239 16 10.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
);

export const IconTheme = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.5 4 14.5 5.5 14.5H7.5C8.5 14.5 9 15 9 16V17.5C9 19.5 10 21 12 21Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7.5" cy="10.5" r="1" fill="currentColor"/>
    <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
    <circle cx="16.5" cy="9.5" r="1" fill="currentColor"/>
    <circle cx="16.5" cy="14.5" r="1" fill="currentColor"/>
  </svg>
);

export function AppIcon({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick?: () => void, className?: string }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center gap-1 sm:gap-1.5 w-[13vw] sm:w-[10vw] md:w-[8vw] lg:w-[7vw] max-w-[56px] sm:max-w-[72px] md:max-w-[86px] lg:max-w-[96px] mx-auto group ${className}`}>
      <div className="w-full aspect-square rounded-[24%] bg-white/10 backdrop-blur-md backdrop-saturate-150 shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_1px_rgba(0,0,0,0.02)] border border-white/20 flex items-center justify-center text-gray-700 relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent pointer-events-none"></div>
        <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg pointer-events-none rotate-45 transform translate-x-[-100%] group-hover:translate-x-[100%] ease-in-out"></div>
        <div className="relative z-10 flex items-center justify-center scale-[1.05] sm:scale-[1.15] md:scale-[1.3] drop-shadow-sm text-[#3b414e]">
          {icon}
        </div>
      </div>
      <span className="text-[10px] sm:text-[12px] md:text-[13px] text-gray-700 font-medium tracking-wide whitespace-nowrap drop-shadow-sm">{label}</span>
    </div>
  );
}

export * from './SortableAppIcon';

export const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-12 h-[26px] rounded-full p-[2px] cursor-pointer transition-colors duration-200 ease-in-out ${checked ? 'bg-[#07C160]' : 'bg-[#e5e5e5]'}`}
  >
    <div className={`w-[22px] h-[22px] bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
  </div>
);

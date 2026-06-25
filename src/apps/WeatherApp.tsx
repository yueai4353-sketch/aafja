import React, { useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, MoreVertical, CloudSun, Droplets, Wind, ThermometerSun, Eye } from 'lucide-react';
import { AppDB } from '../db';

// wttr.in 返回的单日天气结构
interface WttrDay {
  weather: string;
  icon: string;
  high: number;
  low: number;
  humidity: number;
  windspeed: number;
  feelslike: number;
  visibility: number;
}

// wttr.in JSON v2 原始结构（仅声明用到的字段）
interface WttrRaw {
  current_condition: {
    temp_C: string;
    FeelsLikeC: string;
    humidity: string;
    windspeedKmph: string;
    visibility: string;
    weatherDesc: { value: string }[];
    weatherIconUrl?: { value: string }[];
  }[];
  weather: {
    maxtempC: string;
    mintempC: string;
    hourly: {
      FeelsLikeC: string;
      humidity: string;
      windspeedKmph: string;
      visibility: string;
      weatherDesc: { value: string }[];
    }[];
  }[];
}

// 天气描述 → emoji icon
function weatherToIcon(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('sunny') || d.includes('clear')) return '☀️';
  if (d.includes('partly cloudy') || d.includes('overcast')) return '⛅';
  if (d.includes('cloudy') || d.includes('cloud')) return '☁️';
  if (d.includes('thunder') || d.includes('storm')) return '⛈️';
  if (d.includes('snow') || d.includes('blizzard')) return '❄️';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return '🌧️';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️';
  if (d.includes('wind')) return '💨';
  return '🌤️';
}

// 英文天气描述 → 中文
function weatherToCN(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('sunny')) return '晴';
  if (d.includes('clear')) return '晴';
  if (d.includes('partly cloudy')) return '多云';
  if (d.includes('overcast')) return '阴';
  if (d.includes('cloudy')) return '多云';
  if (d.includes('thunder')) return '雷雨';
  if (d.includes('blizzard')) return '暴雪';
  if (d.includes('snow')) return '雪';
  if (d.includes('heavy rain') || d.includes('heavy shower')) return '大雨';
  if (d.includes('moderate rain')) return '中雨';
  if (d.includes('shower')) return '阵雨';
  if (d.includes('drizzle')) return '小雨';
  if (d.includes('rain')) return '雨';
  if (d.includes('fog')) return '大雾';
  if (d.includes('mist')) return '薄雾';
  if (d.includes('haze')) return '霾';
  if (d.includes('wind')) return '大风';
  return desc;
}

// 星期几文本
function dayLabel(offsetDays: number): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return offsetDays === 0 ? '今天' : offsetDays === 1 ? '明天' : days[d.getDay()];
}

export const WeatherApp = ({ onBack }: { onBack: () => void }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [useRealWeather, setUseRealWeather] = useState(true);
  const [cityName, setCityName] = useState('合肥');
  const [virtualCityName, setVirtualCityName] = useState('香港');

  // 天气数据
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentDesc, setCurrentDesc] = useState<string>('');
  const [currentIcon, setCurrentIcon] = useState<string>('');
  const [humidity, setHumidity] = useState<number | null>(null);
  const [windspeed, setWindspeed] = useState<number | null>(null);
  const [feelslike, setFeelslike] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<number | null>(null);
  const [forecast, setForecast] = useState<WttrDay[]>([]);

  // 初始化时从 DB 读取设置和缓存天气
  useEffect(() => {
    const loadSettings = async () => {
      const cityRec = await AppDB.appSettings.get('my_city');
      if (cityRec?.value && cityRec.value !== '---' && cityRec.value !== '未设置') {
        setCityName(cityRec.value);
      }
      const vcityRec = await AppDB.appSettings.get('weather_virtual_city');
      if (vcityRec?.value) setVirtualCityName(vcityRec.value);

      const realRec = await AppDB.appSettings.get('weather_use_real');
      if (realRec !== undefined && realRec !== null) setUseRealWeather(realRec.value !== false);

      // 加载缓存天气数据
      const cachedRaw = await AppDB.appSettings.get('weather_display_data');
      if (cachedRaw?.value) {
        applyDisplayData(cachedRaw.value);
      }
    };
    loadSettings();
  }, []);

  function applyDisplayData(data: any) {
    if (!data) return;
    setCurrentTemp(data.currentTemp ?? null);
    setCurrentDesc(data.currentDesc ?? '');
    setCurrentIcon(data.currentIcon ?? '');
    setHumidity(data.humidity ?? null);
    setWindspeed(data.windspeed ?? null);
    setFeelslike(data.feelslike ?? null);
    setVisibility(data.visibility ?? null);
    setForecast(data.forecast ?? []);
  }

  // 调用 wttr.in 获取天气
  const fetchWeather = async (city: string) => {
    if (!city || city.trim() === '') {
      setError('请先在设置中填写城市名称');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/weather?city=${encodeURIComponent(city.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }
      const json: WttrRaw = await res.json();

      const cur = json.current_condition?.[0];
      if (!cur) throw new Error('返回数据异常');

      const descRaw = cur.weatherDesc?.[0]?.value || '';
      const descCN = weatherToCN(descRaw);
      const icon = weatherToIcon(descRaw);
      const temp = parseInt(cur.temp_C, 10);
      const fl = parseInt(cur.FeelsLikeC, 10);
      const hum = parseInt(cur.humidity, 10);
      const wind = parseInt(cur.windspeedKmph, 10);
      const vis = parseInt(cur.visibility, 10);

      setCurrentTemp(temp);
      setCurrentDesc(descCN);
      setCurrentIcon(icon);
      setHumidity(hum);
      setWindspeed(wind);
      setFeelslike(fl);
      setVisibility(vis);

      // 解析预报（最多7天）
      const forecastDays: WttrDay[] = (json.weather || []).slice(0, 7).map((day, i) => {
        const noon = day.hourly?.[4] || day.hourly?.[0];
        const fDescRaw = noon?.weatherDesc?.[0]?.value || '';
        return {
          weather: weatherToCN(fDescRaw),
          icon: weatherToIcon(fDescRaw),
          high: parseInt(day.maxtempC, 10),
          low: parseInt(day.mintempC, 10),
          humidity: parseInt(noon?.humidity || '0', 10),
          windspeed: parseInt(noon?.windspeedKmph || '0', 10),
          feelslike: parseInt(noon?.FeelsLikeC || '0', 10),
          visibility: parseInt(noon?.visibility || '0', 10),
        };
      });
      setForecast(forecastDays);

      // 持久化显示数据
      const displayData = {
        currentTemp: temp,
        currentDesc: descCN,
        currentIcon: icon,
        humidity: hum,
        windspeed: wind,
        feelslike: fl,
        visibility: vis,
        forecast: forecastDays,
      };
      await AppDB.appSettings.put({ key: 'weather_display_data', value: displayData });

      // 持久化 AI 预报数据（供 aiContext.ts 使用）
      const aiForecast = forecastDays.map(d => ({
        weather: d.weather,
        icon: d.icon,
        high: d.high,
        low: d.low,
      }));
      await AppDB.appSettings.put({ key: 'weather_ai_forecast', value: JSON.stringify(aiForecast) });
      await AppDB.appSettings.put({ key: 'my_city', value: city.trim() });

    } catch (e: any) {
      setError(e?.message || '获取天气失败，请检查城市名称或网络');
    } finally {
      setLoading(false);
    }
  };

  // 保存设置并立即刷新
  const handleSave = async () => {
    await AppDB.appSettings.put({ key: 'my_city', value: cityName.trim() });
    await AppDB.appSettings.put({ key: 'weather_virtual_city', value: virtualCityName });
    await AppDB.appSettings.put({ key: 'weather_use_real', value: useRealWeather });
    setShowSettings(false);
    if (useRealWeather) {
      await fetchWeather(cityName);
    }
  };

  const displayCity = virtualCityName || cityName;

  if (showSettings) {
    return (
      <div className="absolute inset-0 bg-gray-50 flex flex-col z-[101] animate-in slide-in-from-right duration-300">
        {/* Settings Header */}
        <div className="flex items-center px-4 pt-12 pb-4 bg-white sticky top-0 z-10">
          <button onClick={() => setShowSettings(false)} className="p-2 -ml-2 text-gray-800 absolute left-4">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-medium text-gray-800 mx-auto">天气设置</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {/* Data Source Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-[14px] text-gray-600 font-medium border-b border-gray-100">
              天气数据源
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] text-gray-800">真实天气</span>
                <button
                  onClick={() => setUseRealWeather(!useRealWeather)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${useRealWeather ? 'bg-gray-800' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${useRealWeather ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="text-[12px] text-gray-400 text-center leading-relaxed">
                开启后将获取真实天气数据，关闭则使用AI模拟天气
              </div>
            </div>
          </div>

          {/* City Settings Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-[14px] text-gray-600 font-medium border-b border-gray-100">
              城市设置
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[14px] text-gray-800 mb-2">城市名称</div>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="如：合肥、Beijing、Tokyo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <div className="text-[14px] text-gray-800 mb-2">虚拟城市名</div>
                <input
                  type="text"
                  value={virtualCityName}
                  onChange={(e) => setVirtualCityName(e.target.value)}
                  placeholder="天气页和AI对话中显示的名称"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div className="text-[12px] text-gray-400 text-center leading-relaxed pt-2">
                填写后天气页和AI对话将使用此名称，天气数据仍取自真实城市
              </div>
            </div>
          </div>

          {/* API Config Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-[14px] text-gray-600 font-medium border-b border-gray-100">
              天气API配置（可选）
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[14px] text-gray-800 mb-2">API服务商</div>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-[15px] text-gray-800 outline-none focus:border-gray-400 transition-colors pr-10"
                    defaultValue="wttr"
                  >
                    <option value="wttr">wttr.in（免费，无需Key）</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-blue-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              <div className="text-[12px] text-gray-400 text-center leading-relaxed pt-2">
                默认使用wttr.in免费服务，如需更精确数据可配置付费API
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 pb-2">
            <button
              onClick={handleSave}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white text-[15px] font-medium py-3 rounded-xl transition-colors"
            >
              保存设置
            </button>
            <div className="text-[12px] text-gray-400 text-center mt-3">
              保存后将获取该城市的真实天气数据
            </div>
          </div>

          {/* Dynamic Weather Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] text-gray-800">主屏动态天气</span>
                <button
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out bg-gray-800`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 translate-x-5`} />
                </button>
              </div>
              <div className="text-[12px] text-gray-400 text-center leading-relaxed mt-4">
                开启后将在主屏显示实时天气动画效果
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-col z-[100] animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-medium text-gray-800">天气</h1>
        <div className="flex gap-4">
          <button
            className={`text-gray-800 transition-transform ${loading ? 'animate-spin' : ''}`}
            onClick={() => fetchWeather(cityName)}
            disabled={loading}
            title="刷新天气"
          >
            <RotateCcw size={20} />
          </button>
          <button onClick={() => setShowSettings(true)} className="text-gray-800 -mr-2">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-[13px] text-red-500 text-center">
            {error}
          </div>
        )}

        {/* Main Weather Card */}
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <div className="text-[14px] text-gray-400">正在获取天气…</div>
            </div>
          ) : (
            <>
              {currentIcon ? (
                <div className="text-[48px] mb-4 leading-none">{currentIcon}</div>
              ) : (
                <CloudSun size={32} className="text-yellow-400 mb-6" strokeWidth={1.5} />
              )}
              <div className="text-[72px] font-light text-gray-800 leading-none mb-4">
                {currentTemp !== null ? `${currentTemp}°` : '--°'}
              </div>
              <div className="text-[18px] text-gray-600 mb-2">
                {currentDesc || '暂无数据'}
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 text-gray-500 text-[14px]">
                  <span className="w-4 h-4 flex items-center justify-center bg-gray-400 text-white rounded-full text-[10px]">📍</span>
                  {displayCity}
                </div>
                {virtualCityName && virtualCityName !== cityName && (
                  <div className="text-[12px] text-gray-400">数据来源：{cityName}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 2x2 Grid Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Humidity */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <Droplets size={16} className="text-gray-400 mb-3" strokeWidth={1.5} />
            <div className="text-[12px] text-gray-500 mb-1">湿度</div>
            <div className="text-[20px] font-medium text-gray-800">
              {humidity !== null ? `${humidity}%` : '--'}
            </div>
          </div>
          {/* Wind */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <Wind size={16} className="text-gray-400 mb-3" strokeWidth={1.5} />
            <div className="text-[12px] text-gray-500 mb-1">风速</div>
            <div className="text-[20px] font-medium text-gray-800">
              {windspeed !== null ? `${windspeed} km/h` : '--'}
            </div>
          </div>
          {/* Feels like */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <ThermometerSun size={16} className="text-gray-400 mb-3" strokeWidth={1.5} />
            <div className="text-[12px] text-gray-500 mb-1">体感</div>
            <div className="text-[20px] font-medium text-gray-800">
              {feelslike !== null ? `${feelslike}°` : '--'}
            </div>
          </div>
          {/* Visibility */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <Eye size={16} className="text-gray-400 mb-3" strokeWidth={1.5} />
            <div className="text-[12px] text-gray-500 mb-1">能见度</div>
            <div className="text-[20px] font-medium text-gray-800">
              {visibility !== null ? `${visibility} km` : '--'}
            </div>
          </div>
        </div>

        {/* Forecast */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="text-[15px] font-medium text-gray-800 mb-4">
            {forecast.length > 0 ? `未来${forecast.length}天预报` : '未来天气预报'}
          </div>
          {forecast.length > 0 ? (
            <div className="space-y-4">
              {forecast.map((day, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="w-12 text-[14px] text-gray-600">{dayLabel(i)}</div>
                  <div className="text-[20px]">{day.icon}</div>
                  <div className="text-[13px] text-gray-500 w-16 text-center">{day.weather}</div>
                  <div className="text-[14px] text-gray-600">{day.high}°/{day.low}°</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-gray-400 text-center py-4">
              点击右上角刷新按钮获取天气预报
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

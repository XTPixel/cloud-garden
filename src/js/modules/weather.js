import { elements } from '../dom.js';
import { storageKeys } from '../config.js';
import { readStorage, writeStorage } from '../utils/storage.js';

function formatPlaceName(place) {
  const parts = [
    place.city, place.locality,
    place.principalSubdivision, place.countryName
  ].filter(Boolean);
  return [...new Set(parts)].slice(0, 2).join(' · ') || '当前位置';
}

function formatCoordinates(latitude, longitude) {
  return `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'} · ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
}

function getWeatherInfo(code = 0) {
  if (code === 0) return { text: '晴朗', icon: '☀', theme: 'sunny' };
  if ([1, 2].includes(code)) return { text: '少云', icon: '⛅', theme: 'partly' };
  if (code === 3) return { text: '多云', icon: '☁', theme: 'cloudy' };
  if ([45, 48].includes(code)) return { text: '有雾', icon: '≋', theme: 'foggy' };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: '毛毛雨', icon: '☂', theme: 'drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: '下雨', icon: '☔', theme: 'rainy' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: '下雪', icon: '❄', theme: 'snowy' };
  if ([95, 96, 99].includes(code)) return { text: '雷雨', icon: 'ϟ', theme: 'stormy' };
  return { text: '天气', icon: '◌', theme: 'fallback' };
}

function setWeatherState(theme) {
  const weatherWidget = document.querySelector('.weather-widget');
  if (weatherWidget) weatherWidget.dataset.weather = theme;
}

function normalizeWeather(data, latitude, longitude, placeName) {
  const current = data.current || {};
  const weatherInfo = getWeatherInfo(current.weather_code);
  return {
    temperature: Math.round(current.temperature_2m),
    apparent: Math.round(current.apparent_temperature),
    humidity: current.relative_humidity_2m,
    wind: Math.round(current.wind_speed_10m),
    code: current.weather_code,
    text: weatherInfo.text,
    icon: weatherInfo.icon,
    theme: weatherInfo.theme,
    placeName,
    latitude,
    longitude,
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
}

function renderWeather(weather) {
  elements.weatherIcon.textContent = weather.icon;
  elements.weatherTemp.textContent = `${weather.temperature}°`;
  elements.weatherText.textContent = `${weather.text} · 体感 ${weather.apparent}°`;
  elements.weatherPlace.textContent = `📍 ${weather.placeName || '当前位置'}\n湿度 ${weather.humidity}% · 风 ${weather.wind}km/h · ${weather.updatedAt}`;
  setWeatherState(weather.theme);
}

function renderWeatherError(message, cached) {
  if (cached) {
    renderWeather(cached);
    elements.weatherText.textContent = `${cached.text || '上次天气'} · 定位未更新`;
    elements.weatherPlace.textContent = `📍 ${cached.placeName || '上次位置'}\n${message} · 点击 ↻ 重试`;
    return;
  }
  elements.weatherIcon.textContent = '◌';
  elements.weatherTemp.textContent = '--°';
  elements.weatherText.textContent = message;
  elements.weatherPlace.textContent = '允许定位后可显示本地天气 · 点击 ↻ 重试';
  setWeatherState('fallback');
}

async function fetchPlaceName(latitude, longitude) {
  try {
    const placeUrl = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    placeUrl.search = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      localityLanguage: 'zh'
    });
    const response = await fetch(placeUrl);
    if (!response.ok) throw new Error('place request failed');
    const place = await response.json();
    return formatPlaceName(place);
  } catch {
    return formatCoordinates(latitude, longitude);
  }
}

async function fetchWeather(latitude, longitude, onLoaded) {
  try {
    setWeatherState('loading');
    elements.weatherText.textContent = '正在获取天气...';
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.search = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
      timezone: 'auto'
    });
    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error('weather request failed');
    const [weatherData, placeName] = await Promise.all([
      response.json(),
      fetchPlaceName(latitude, longitude)
    ]);
    const weather = normalizeWeather(weatherData, latitude, longitude, placeName);
    writeStorage(storageKeys.weather, weather);
    renderWeather(weather);
    onLoaded?.();
  } catch {
    renderWeatherError('天气获取失败', readStorage(storageKeys.weather, null));
  }
}

export function loadWeather(onLoaded) {
  const cached = readStorage(storageKeys.weather, null);
  if (cached) renderWeather(cached);
  if (!navigator.geolocation) return renderWeatherError('浏览器不支持定位', cached);

  setWeatherState('loading');
  elements.weatherText.textContent = '正在定位...';
  elements.weatherPlace.textContent = '请求当前位置';
  navigator.geolocation.getCurrentPosition(
    (position) => fetchWeather(position.coords.latitude, position.coords.longitude, onLoaded),
    () => renderWeatherError('定位暂不可用', cached),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 30 }
  );
}

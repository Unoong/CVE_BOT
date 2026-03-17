/**
 * API 서버 설정
 * 
 * 외부 접속을 위해서는 아래 API_URL을 서버의 실제 IP로 변경하세요.
 * 예: export const API_URL = 'http://192.168.0.100:32577/api';
 * 
 * 서버 시작 시 표시되는 "외부 접속" 주소를 사용하면 됩니다.
 */

/**
 * 사이트(서비스) 표시명
 *
 * - Vite 환경변수로 오버라이드 가능: VITE_SITE_NAME
 * - 기본값: "AI보안위협관리시스템"
 */
export const SITE_NAME = (import.meta?.env?.VITE_SITE_NAME || 'AI보안위협관리시스템');

// 현재 호스트 기반으로 API URL 자동 설정
const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  // Caddy 리버스프록시(3000) 사용 시: 같은 origin의 /api 사용
  if (port === '3000') {
    return `${protocol}//${hostname}:${port}/api`;
  }
  // 직접 접속 시: 백엔드 포트 사용
  const backendPort = protocol === 'https:' ? '32578' : '32577';
  return `${protocol}//${hostname}:${backendPort}/api`;
};

export const API_URL = getApiUrl();

console.log('🌐 API URL:', getApiUrl());

// 또는 수동으로 고정 설정하려면 아래 줄의 주석을 해제하고 IP를 변경하세요
// export const API_URL = 'http://192.168.0.100:32577/api';


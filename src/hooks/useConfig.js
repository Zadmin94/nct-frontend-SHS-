// src/hooks/useConfig.js
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@api/axios';
import { mapDataToState } from '@utils/common';

const defaultValues = {
  pageTitle   : '',
  logoText    : '에누리컷',
  curRegion   : {},
  curRegionEn : '',
  curRegionKr : '',
  theme       : 'light',
  user        : {},       // 인증 여부는 useAuth의 isAuthenticated(!!user)로 판단
  profile     : null,
  footer: {
    zipCode         : '00000',
    address         : '서울특별시 강남구 테헤란로 123',
    // @ai_generated: 화면(Footer/LoginPage)에 실제 노출 중인 값으로 통일. 기존 '02-1234-5678'은
    // 어디서도 읽히지 않던 죽은 값이었다(260818_2230 항목7).
    phone           : '070-1234-5678',
    businessHours   : '평일 10:00 - 18:00\n(점심시간 12:00 - 13:00 제외 · 주말/공휴일 제외)',
    fax             : '02-1234-5679',
    slogan          : '실시간 경매와 생활 서비스를 한 화면에서',
    subSlogan       : '누구나 쉽게 이용하는 C2C 마켓플레이스',
    copyright       : '© 2026 에누리컷. All rights reserved.',
    portfolioNotice : '본 사이트는 실서비스가 아닌 포트폴리오용 프로젝트이며, 실제 거래·결제·서비스 이용을 위한 사이트가 아닙니다.',
    devTeam         : [],
  },
};

export const useConfig = () => {
  const queryClient = useQueryClient();
  const queryKey    = ['siteConfig'];

  // TanStack Query를 전역 상태 저장소로 활용 (staleTime: Infinity → 새로고침 전까지 유지)
  const { data: siteConfig = defaultValues } = useQuery({
    queryKey,
    queryFn    : () => defaultValues,
    staleTime  : Infinity,
    initialData: defaultValues,
  });

  /**
   * 점(.) 표기법으로 중첩 값 조회
   * @example getConfig('user.nickname') → '홍길동'
   * @example getConfig('footer.address')
   */
  const getConfig = (path, defaultValue = null) => {
    if (!path) return siteConfig;
    const value = path.split('.').reduce((acc, key) => acc?.[key], siteConfig);
    return value ?? defaultValue;
  };

  /**
   * 점(.) 표기법으로 중첩 값 업데이트
   * 객체 타입이면 기존 값과 merge, 그 외는 덮어쓰기
   * @example setConfig('user', { id: 1, nickname: '홍길동' })
   * @example setConfig('profile', { name: '홍길동', ... })
   */
  const setConfig = (path, value) => {
    queryClient.setQueryData(queryKey, (prev = defaultValues) => {
      const newConfig = { ...prev };
      const keys      = path.split('.');
      let current     = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = current[key] && typeof current[key] === 'object'
          ? { ...current[key] }
          : {};
        current = current[key];
      }

      const lastKey       = keys[keys.length - 1];
      const existingValue = current[lastKey];

      // 양쪽 모두 일반 객체(배열·null 제외)이면 merge
      if (
        existingValue !== null && typeof existingValue === 'object' && !Array.isArray(existingValue) &&
        value         !== null && typeof value         === 'object' && !Array.isArray(value)
      ) {
        current[lastKey] = { ...existingValue, ...value };
      } else {
        current[lastKey] = value;
      }

      return newConfig;
    });
  };

  /**
   * 서버에서 전체 프로필을 다시 불러와 config에 반영
   * 백엔드 응답 구조: { status, httpCode, data: { id, email, name, ... } }
   */
  const fetchFullProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      // response.data = { status, httpCode, data: {...} }
      const raw  = response.data?.data ?? response.data;
      const data = mapDataToState('profile', raw);
      setConfig('profile', data);
    } catch {
      setConfig('profile', null);
    }
  };

  return {
    getConfig,
    setConfig,
    saveConfig  : setConfig, // 하위 호환 alias
    updateConfig: setConfig, // 하위 호환 alias
    fetchFullProfile,
  };
};

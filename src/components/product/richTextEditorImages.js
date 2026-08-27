// src/components/product/richTextEditorImages.js
// RichTextEditor.jsx의 상수·유틸을 별도 파일로 분리 — 컴포넌트 파일이 컴포넌트만
// export해야 Fast Refresh가 정상 동작한다(react-refresh/only-export-components).
//
// 에디터의 이미지 삽입 기능은 제거됐지만(2026-08-05), 예전에 이미지가 포함된 채로 저장된
// 설명을 계속 보여줘야 해서 SANITIZE_OPTS의 img 허용과 resolveDescriptionImagesForDisplay는 남겨둔다.
import { toImageUrl } from '@api/fileApi';

export const SANITIZE_OPTS = {
  // ul/ol/li는 목록 버튼 제거 후에도 과거 저장된 설명에 남아있을 수 있어 허용 태그에서 빼지 않는다.
  // img도 과거에 삽입된 이미지가 있는 기존 설명을 위해 계속 허용한다(신규 삽입 기능은 제거됨).
  ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'img', 'div', 'span'],
  ALLOWED_ATTR: ['src', 'style'],
};

// 백엔드 ProductRegisterRequest.prdCn의 @Size(max=4000)과 반드시 같은 값을 유지해야 한다.
export const DEFAULT_MAX_LENGTH = 4000;

// 저장된 상대경로(/api/attachment/...) 이미지를 현재 실행 환경의 백엔드 origin에 맞춰
// 절대경로로 변환해 화면에 그린다. 이미 절대경로(http...)나 blob:이면 toImageUrl이 그대로 통과시킨다.
// prdCn을 dangerouslySetInnerHTML로 렌더링하는 곳에서 sanitize 전에 호출한다.
export function resolveDescriptionImagesForDisplay(html) {
  if (!html) return html;

  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src) img.setAttribute('src', toImageUrl(src));
  });
  return container.innerHTML;
}

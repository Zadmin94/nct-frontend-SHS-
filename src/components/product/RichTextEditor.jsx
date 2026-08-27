// src/components/product/RichTextEditor.jsx
// 상품 설명용 경량 리치텍스트 에디터 — 굵게·기울임·밑줄
// contentEditable 기반, 결과물은 HTML 문자열 (value/onChange)
// Props: value(HTML string), onChange(html), placeholder, maxLength
//
// 이미지 삽입 기능은 제거됨(2026-08-05, 황희준 지적) — 중고 경매 특성상 상품 사진(F-AUC-002,
// 최대 5장)으로 충분해 본문 내 이미지 삽입은 불필요하다는 판단. 다만 이전에 이미지가 포함된 채로
// 저장된 기존 설명은 그대로 보여줘야 해서, 표시(sanitize) 쪽은 img 태그를 계속 허용한다.
import { useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { SANITIZE_OPTS, DEFAULT_MAX_LENGTH } from './richTextEditorImages';

export default function RichTextEditor({ value, onChange, placeholder = '상품 설명을 입력하세요', maxLength = DEFAULT_MAX_LENGTH }) {
  const editorRef = useRef(null);
  // null = 아직 DOM에 한 번도 반영 안 됨 — 마운트 시점의 value가 이전과 우연히 같아도
  // (예: 스텝 전환 후 재마운트라 prop은 이미 최신인 경우) 반드시 한 번은 채워야 한다.
  const lastValueRef = useRef(null);
  const [length, setLength] = useState((value || '').length);

  // 외부에서 value가 바뀐 경우(마운트 시 최초 1회 포함, 수정 모드 로드, 스텝 전환 후 재마운트)에만 DOM을 다시 채운다.
  // 매 입력마다 innerHTML을 다시 쓰면 커서 위치가 튄다.
  useEffect(() => {
    if (!editorRef.current) return;
    if (lastValueRef.current === null || (value !== lastValueRef.current && document.activeElement !== editorRef.current)) {
      const sanitized = DOMPurify.sanitize(value || '', SANITIZE_OPTS);
      editorRef.current.innerHTML = sanitized;
      lastValueRef.current = value || '';
      setLength(sanitized.length);
    }
  }, [value]);

  // 글자수 제한을 넘기는 입력은 반영하지 않고 직전 상태로 되돌린다 — 백엔드 @Size(max=4000) 방어.
  const emitChange = () => {
    const html = DOMPurify.sanitize(editorRef.current.innerHTML, SANITIZE_OPTS);
    if (html.length > maxLength) {
      editorRef.current.innerHTML = lastValueRef.current;
      return;
    }
    lastValueRef.current = html;
    setLength(html.length);
    onChange(html);
  };

  const exec = (command) => {
    editorRef.current.focus();
    document.execCommand(command);
    emitChange();
  };

  // 다른 사이트에서 복사해온 글을 붙여넣으면 원본의 폰트·크기·정렬 등 서식이 그대로 딸려 들어와
  // 에디터 안에서만 쓰는 굵게/기울임/정렬과 뒤섞여 버린다. 그래서 서식은 버리고 텍스트만 붙여넣는다.
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emitChange();
  };

  return (
    <div style={{ border: '1px solid #e2e1dc', borderRadius: 5, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid #e2e1dc', background: '#fafaf8' }}>
        <button type="button" onClick={() => exec('bold')} className="btn btn-ghost btn-sm" style={{ fontWeight: 700, padding: '0 12px' }}>B</button>
        <button type="button" onClick={() => exec('italic')} className="btn btn-ghost btn-sm" style={{ fontStyle: 'italic', padding: '0 12px' }}>I</button>
        <button type="button" onClick={() => exec('underline')} className="btn btn-ghost btn-sm" style={{ textDecoration: 'underline', padding: '0 12px' }}>U</button>
        <span style={{ width: 1, alignSelf: 'stretch', background: '#e2e1dc', margin: '0 2px' }} />
        <button type="button" onClick={() => exec('justifyLeft')} className="btn btn-ghost btn-sm" style={{ padding: '0 10px' }} title="왼쪽 정렬"><AlignLeft size={16} /></button>
        <button type="button" onClick={() => exec('justifyCenter')} className="btn btn-ghost btn-sm" style={{ padding: '0 10px' }} title="가운데 정렬"><AlignCenter size={16} /></button>
        <button type="button" onClick={() => exec('justifyRight')} className="btn btn-ghost btn-sm" style={{ padding: '0 10px' }} title="오른쪽 정렬"><AlignRight size={16} /></button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 13, color: length >= maxLength ? '#c0392b' : '#969696' }}>
          {length.toLocaleString()}/{maxLength.toLocaleString()}
        </span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="rich-text-editor-body"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', fontSize: 16, lineHeight: 1.7, outline: 'none' }}
      />
    </div>
  );
}

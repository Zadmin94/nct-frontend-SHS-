// src/pages/service/ServiceRequestFormPage.jsx
// 서비스 요청서 작성 — 아코디언 위저드 (F-SVC-001~004)
// 라우트: /services/requests/new (신규), location.state.svcReqSn로 임시저장 수정
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Truck, BrushCleaning, Wrench, Armchair, GraduationCap } from 'lucide-react';
import { getCategories } from '@api/categoryApi';
import {
  getEditableServiceRequest,
  getServiceRequestForm,
  getServiceRequestForms,
  registerServiceRequest,
  updateServiceRequest,
} from '@api/serviceRequestApi';
import DaumPostcode from 'react-daum-postcode';
import ErrorMessage from '@components/common/ErrorMessage';
import AlertModal from '@components/common/AlertModal';
import ConfirmModal from '@components/common/ConfirmModal';
import { ActionButton } from '@components/common/ui';
import ServiceRequestImageUpload from '@components/service/ServiceRequestImageUpload';
import { toImageUrl, uploadImage } from '@api/fileApi';
import DateRangePicker from '@components/product/DateRangePicker';
import RegionSelector from '@components/common/RegionSelector';
import { formatPoint, formatPointUnitText } from '@utils/common';
import { getServiceRequestDetailPath } from '@/routes/serviceRequestRoutes';
import { buildServiceRequestWizardCatalog } from './serviceRequestFormAdapter';

const MAX_IMAGES = 5;
const MAX_BUDGET_AMT = 1000000000; // 희망 예산 상한 — 1,000,000,000P (사용자 확정, 260810)

const SERVICE_DOMAIN_CD = 'CATC0002';
const ETC = '기타';
const STEP_LABELS = ['요청 정보 입력', '요청 확인'];

const formatFieldAnswerDisplay = (step, label, value) => {
  const field = step?.fields?.find(candidate => candidate.key === label);
  if (!field) return value;
  if (field.type === 'amount-toggle' && value !== '미정') {
    const amount = Number(String(value).replaceAll(',', ''));
    return Number.isFinite(amount) ? formatPoint(amount) : value;
  }
  if (field.optionDefs?.some(option => option.label === value)) {
    return formatPointUnitText(value);
  }
  return value;
};

const formatStepAnswerDisplay = (step, answerText) => {
  if (!step || typeof answerText !== 'string') return answerText;
  if (step.type === 'single' || step.type === 'multi') {
    return answerText.split(', ').map((value) => {
      if (value.startsWith(`${ETC}(`)) return value;
      return step.options.some(option => option.label === value)
        ? formatPointUnitText(value)
        : value;
    }).join(', ');
  }
  if (step.type !== 'form' || !answerText.includes(': ')) return answerText;
  return answerText.split(' / ').map((part) => {
    const parsed = parseFieldPart(part);
    if (!parsed.label) return part;
    return `${parsed.label}: ${formatFieldAnswerDisplay(step, parsed.label, parsed.value)}`;
  }).join(' / ');
};

// 한글 단어 끝음절 받침 유무에 따라 "을/를" 조사를 붙인다 (유효성 검증 문구용)
function withEulReul(word) {
  const last = word[word.length - 1];
  const code = last.charCodeAt(0) - 0xac00;
  const hasBatchim = code < 0 || code > 11171 ? true : code % 28 !== 0;
  return `${word}${hasBatchim ? '을' : '를'}`;
}

const CATEGORY_ICON = {
  '이사': Truck,
  '청소': BrushCleaning,
  '설치·수리': Wrench,
  '인테리어': Armchair,
  '레슨': GraduationCap,
};

function CategoryIcon({ name, className, style }) {
  const Icon = CATEGORY_ICON[name];
  if (!Icon) return null;
  return <Icon size={32} strokeWidth={1.7} className={className} style={style} />;
}

// 확인 탭 "상세 내용" 표에서 "출발지 주소: 서울.. / 출발지 상세주소: 105 / ..."처럼
// " / "로 이어붙인 답변을 필드별로 나눠서 2열 그리드로 보여줄 때 쓴다
function parseFieldPart(raw) {
  const idx = raw.indexOf(': ');
  if (idx === -1) return { label: null, value: raw };
  return { label: raw.slice(0, idx), value: raw.slice(idx + 2) };
}

// 확인 탭 "상세 내용" 표에서 필드가 1개뿐인 단계는 왼쪽 칸에 이미 단계 제목(예: "특이사항
// 메모 (선택)", "희망일")이 있는데, 오른쪽 칸에도 같은 필드 라벨("메모: ...", "희망일: ...")이
// 그대로 찍혀 같은 단어가 반복돼 보인다. 필드 라벨이 단계 제목과 겹칠 때만 라벨을 떼고 값만
// 보여준다 — 단계 제목만으로는 안 드러나는 다른 정보를 담은 라벨은 그대로 유지한다.
function stripRedundantFieldLabel(stepTitle, raw) {
  const { label, value } = parseFieldPart(raw);
  if (!label) return raw;
  const normalizedTitle = stepTitle.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const overlaps = normalizedTitle.includes(label) || label.includes(normalizedTitle);
  return overlaps ? value : raw;
}

// "과목 (복수 선택)", "특이사항 메모 (선택)"처럼 뒤에 괄호 안내문이 붙는 제목은 어중간하게
// 줄바꿈되지 않도록 "제목" / "(안내문)" 두 줄로 자연스럽게 나눠 보여준다
function renderStepTitle(title) {
  const match = title.match(/^(.+) (\([^)]*\))$/);
  if (!match) return title;
  return (
    <>
      {match[1]}
      <br />
      {match[2]}
    </>
  );
}

// 카테고리 진행률 분모 — 실제 chain은 답변할 때마다 늘어나 분모로 못 씀.
// 분기 중 가장 긴 경로 기준으로 해당 카테고리의 전체 단계 수를 고정 계산한다.
function getCategoryMaxSteps(steps, stepId, visited = new Set()) {
  if (!stepId || !steps[stepId] || visited.has(stepId)) return 0;
  const step = steps[stepId];
  const nextVisited = new Set(visited);
  nextVisited.add(stepId);
  let maxNext = 0;
  if (step.type === 'single') {
    step.options.forEach(opt => {
      maxNext = Math.max(maxNext, getCategoryMaxSteps(steps, opt.next || step.next, nextVisited));
    });
  } else {
    maxNext = getCategoryMaxSteps(steps, step.next, nextVisited);
  }
  return 1 + maxNext;
}

// 분기 단계에서 "기본값(첫 번째 선택지)"을 따라갔을 때의 다음 단계 — 미리보기 카드 자리 계산용
function getDefaultNextStep(steps, stepId) {
  const step = steps[stepId];
  if (!step) return null;
  return step.type === 'single' ? (step.options[0]?.next || step.next) : step.next;
}

// 아직 답변 전이라 실제 다음 단계를 알 수 없는 구간을, 기본 선택지를 따라간 경로로 미리 보여주기
// 위한 미리보기 단계 id 목록 (실제로 답변하면 이 자리들이 진짜 카드로 교체된다)
function buildPreviewSteps(steps, startStepId, excludeIds) {
  const preview = [];
  const visited = new Set(excludeIds);
  let cur = startStepId;
  while (cur && steps[cur] && !visited.has(cur)) {
    visited.add(cur);
    preview.push(cur);
    cur = getDefaultNextStep(steps, cur);
  }
  return preview;
}

export default function ServiceRequestFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const editSvcReqSn = location.state?.svcReqSn ?? null;

  const [categories, setCategories] = useState([]);
  const [formCatalog, setFormCatalog] = useState(() => buildServiceRequestWizardCatalog([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef(null);

  const [title, setTitle] = useState('');
  // [{ id, flSn, url, file }] — SERVICE_REQUEST_FILE 연결 테이블·업로드 API 정본요청 전까지는
  // 로컬 미리보기만 유지한다. API 확정되면 submit 시점에 업로드·연결 호출만 추가하면 됨.
  const [images, setImages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFormTemplateSn, setSelectedFormTemplateSn] = useState(null);
  const [chain, setChain] = useState([]);
  const [answers, setAnswers] = useState({});
  const [stepDraft, setStepDraft] = useState({});
  const [isComplete, setIsComplete] = useState(false);
  const [freeTextDraft, setFreeTextDraft] = useState({});
  const [addressDraft, setAddressDraft] = useState({});
  const [pendingEtcStep, setPendingEtcStep] = useState(null);

  // 경매등록과 같은 2단계 구성: 0=요청 정보 입력, 1=요청 확인
  const [step, setStep] = useState(0);
  const [confirmPhotoIndex, setConfirmPhotoIndex] = useState(0); // 요청 확인 탭 사진 박스 슬라이드 인덱스
  const [agreed, setAgreed] = useState(false); // 확인 탭 최종 동의
  const [policyAgreed, setPolicyAgreed] = useState(false); // 요청 정보 입력 탭 — 견적 요청 정책 동의
  const policyRef = useRef(null);
  const agreedRef = useRef(null);
  const detailSectionRef = useRef(null);

  // 아코디언 상태 — 단계 카드는 한 번에 하나만 펼쳐진다(진행 중인 카드든 재편집하려는
  // 완료 카드든 동일하게 이 값 하나로 표현)
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(false); // 카테고리 재선택 중
  const [confirmPending, setConfirmPending] = useState(null); // { msg, action } | null
  const [fieldErrors, setFieldErrors] = useState({}); // { 'stepId:fieldKey': 에러 메시지 }
  const [addressSearchKey, setAddressSearchKey] = useState(null); // 주소 검색 중인 'stepId:fieldKey'

  const titleSectionRef = useRef(null);
  const categorySectionRef = useRef(null);

  const {
    steps: wizardSteps,
    categoryNextStep,
    categoryMeta,
    formByCategorySn,
    formByTemplateSn,
  } = formCatalog;

  const scrollToStep = (stepId) => {
    document.getElementById(`service-request-step-${stepId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  function restoreFromExisting(cat, s, catalog) {
    const steps = catalog.steps;
    const storedForm = s.formTemplateSn
      ? catalog.formByTemplateSn[String(s.formTemplateSn)]
      : null;
    const form = storedForm || catalog.formByCategorySn[String(cat.catSn)];
    const firstStepId = form?.firstStepId;
    if (!firstStepId || !steps[firstStepId]) {
      throw new Error('FORM_TEMPLATE_NOT_FOUND');
    }
    setSelectedCategory({ catSn: cat.catSn, catNm: cat.catNm });
    setSelectedFormTemplateSn(form.formTemplateSn);

    if (s.formTemplateSn && Array.isArray(s.structuredAnswers)) {
      const groupedAnswers = s.structuredAnswers.reduce((acc, answer) => {
        (acc[answer.stepKey] ||= []).push(answer);
        return acc;
      }, {});
      const groupedAddresses = (s.addressList || []).reduce((acc, address) => {
        (acc[address.stepKey] ||= []).push(address);
        return acc;
      }, {});
      const newChain = [];
      const newAnswers = {};
      const newDraft = {};
      const newFreeText = {};
      const newAddressDraft = {};
      const visited = new Set();
      let stepId = firstStepId;

      while (stepId && steps[stepId] && !visited.has(stepId)) {
        visited.add(stepId);
        const current = steps[stepId];
        const stored = groupedAnswers[current.stepKey] || [];
        const storedAddresses = groupedAddresses[current.stepKey] || [];
        newChain.push(stepId);

        if (current.type === 'single') {
          const item = stored.find(answer => !answer.fieldKey);
          if (!item) break;
          const option = current.options.find(candidate => candidate.value === item.optionValue);
          if (!option) break;
          const display = item.otherText ? `${option.label}(${item.otherText})` : option.label;
          newAnswers[stepId] = display;
          if (item.otherText) newFreeText[`${stepId}:${ETC}`] = item.otherText;
          stepId = option.next || current.next;
          continue;
        }

        if (current.type === 'multi') {
          const items = stored.filter(answer => !answer.fieldKey);
          if (items.length === 0) break;
          const labels = items.map(item => {
            const option = current.options.find(candidate => candidate.value === item.optionValue);
            if (!option) return null;
            if (item.otherText) newFreeText[`${stepId}:${ETC}`] = item.otherText;
            return item.otherText ? `${option.label}(${item.otherText})` : option.label;
          }).filter(Boolean);
          newDraft[stepId] = labels.map(label => label.startsWith(`${ETC}(`) ? ETC : label);
          newAnswers[stepId] = labels.join(', ');
          stepId = current.next;
          continue;
        }

        const draft = {};
        current.fields.forEach(field => {
          if (field.type === 'address') {
            const address = storedAddresses.find(item => item.addressFieldKey === field.fieldKey);
            if (!address) return;
            draft[field.key] = address.address || '';
            newAddressDraft[`${stepId}:${field.key}`] = {
              address: address.address || '',
              zonecode: address.zonecode || '',
              sido: address.sido || '',
              sigungu: address.sigungu || '',
            };
            if (address.detailFieldKey) {
              const detailField = current.fields.find(item => item.fieldKey === address.detailFieldKey);
              if (detailField) draft[detailField.key] = address.detailAddress || '';
            }
            return;
          }
          if (storedAddresses.some(address => address.detailFieldKey === field.fieldKey)) return;
          const item = stored.find(answer => answer.fieldKey === field.fieldKey);
          if (!item) return;
          if (item.optionValue != null) {
            const option = field.optionDefs?.find(candidate => candidate.value === item.optionValue);
            if (!option) return;
            draft[field.key] = option.label;
            if (item.otherText) newFreeText[`${stepId}:${field.key}`] = item.otherText;
          } else {
            draft[field.key] = item.value ?? '';
          }
        });

        const vals = current.fields
          .map(field => {
            let value = String(draft[field.key] ?? '').trim();
            if (value === ETC && newFreeText[`${stepId}:${field.key}`]) {
              value = `${ETC}(${newFreeText[`${stepId}:${field.key}`]})`;
            }
            return value ? `${field.key}: ${value}` : null;
          })
          .filter(Boolean);
        const hasRequiredInput = current.fields.some(field => field.required && !draft[field.key]);
        if (vals.length === 0 && hasRequiredInput) break;
        newDraft[stepId] = draft;
        newAnswers[stepId] = vals.length ? vals.join(' / ') : '(입력 없음)';
        stepId = current.next;
      }

      setChain(newChain);
      setAnswers(newAnswers);
      setStepDraft(newDraft);
      setFreeTextDraft(newFreeText);
      setAddressDraft(newAddressDraft);
      const lastId = newChain[newChain.length - 1];
      setIsComplete(Boolean(lastId && newAnswers[lastId] !== undefined && !steps[lastId]?.next));
      // 이어서 작성 시 마지막 카드가 아직 미답변 상태면(임시저장 시점에 답변 전이었던 단계)
      // 새로 시작할 때(handleCategorySelect)처럼 그 카드를 자동으로 펼쳐서, 사용자가 직접
      // 스크롤해서 다음에 뭘 눌러야 할지 찾지 않아도 되게 한다
      if (lastId && newAnswers[lastId] === undefined) {
        setExpandedStepId(lastId);
      }
      setImages((s.imageList ?? []).map(img => ({ id: img.flSn, flSn: img.flSn, url: img.url, file: null })));
      if (newChain.length > 0) setPolicyAgreed(true);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const loadForm = async () => {
      const [categoryResponse, formResponse] = await Promise.all([
        getCategories(SERVICE_DOMAIN_CD),
        getServiceRequestForms(),
      ]);
      const children = categoryResponse.data.filter(c => c.catParentSn !== null);
      const forms = [...(formResponse.data || [])];
      let existing = null;

      if (editSvcReqSn) {
        const response = await getEditableServiceRequest(editSvcReqSn);
        existing = response.data;
        const hasStoredVersion = !existing.formTemplateSn
          || forms.some(form => String(form.formTemplateSn) === String(existing.formTemplateSn));
        if (!hasStoredVersion) {
          const storedFormResponse = await getServiceRequestForm(existing.formTemplateSn);
          forms.push(storedFormResponse.data);
        }
      }

      if (cancelled) return;
      const catalog = buildServiceRequestWizardCatalog(forms);
      setCategories(children);
      setFormCatalog(catalog);

      if (existing) {
        setTitle(existing.svcReqTtl ?? '');
        const cat = children.find(c => String(c.catSn) === String(existing.catSn));
        if (!cat) throw new Error('CATEGORY_NOT_FOUND');
        restoreFromExisting(cat, existing, catalog);
      }
    };

    loadForm()
      .catch(() => {
        if (cancelled) return;
        setError(editSvcReqSn
          ? '기존 요청서 또는 동적 폼 정보를 불러오지 못했습니다.'
          : '카테고리별 요청 양식을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  useEffect(() => {
    const lastId = chain[chain.length - 1];
    if (!lastId || answers[lastId]) return; // 새로 추가된 미답변 단계만 스크롤
    scrollToStep(lastId);
  }, [chain, answers]);

  // 요청 정보 입력(0)↔요청 확인(1) 탭 전환 시 맨 위로 스크롤한다.
  // 안 그러면 스크롤이 한참 내려간 채로 탭만 바뀌어서, 화면이 짧아진 쪽으로 넘어갈 때
  // 아무 반응이 없는 것처럼 보인다(예: 맨 아래 특이사항 메모 카드에서 "다음" 클릭).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  // ── 기존 헬퍼 ───────────────────────────────────────────────────────────────

  const truncateAfter = (stepId) => {
    const idx = chain.indexOf(stepId);
    const kept = idx === -1 ? [] : chain.slice(0, idx + 1);
    const removed = chain.slice(kept.length);
    if (removed.length) {
      setAnswers(prev => { const n = { ...prev }; removed.forEach(id => delete n[id]); return n; });
      setStepDraft(prev => { const n = { ...prev }; removed.forEach(id => delete n[id]); return n; });
      setFreeTextDraft(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(key => { if (removed.some(id => key.startsWith(`${id}:`))) delete n[key]; });
        return n;
      });
      setAddressDraft(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(key => { if (removed.some(id => key.startsWith(`${id}:`))) delete n[key]; });
        return n;
      });
      setPendingEtcStep(prev => (removed.includes(prev) ? null : prev));
      setFieldErrors(prev => {
        const n = { ...prev };
        Object.keys(n).forEach(key => { if (removed.some(id => key.startsWith(`${id}:`))) delete n[key]; });
        return n;
      });
    }
    setIsComplete(false);
    return kept;
  };

  const proceed = (kept, nextId) => {
    if (nextId) {
      setChain([...kept, nextId]);
      setExpandedStepId(nextId);
    } else {
      setChain(kept);
      setIsComplete(true);
      setExpandedStepId(null);
    }
  };

  // ── 카테고리 ────────────────────────────────────────────────────────────────

  const handleCategoryCardHeaderClick = () => {
    if (!selectedCategory) return;
    if (editingCategory) { setEditingCategory(false); return; } // 접기 토글
    const hasAnsweredDownstream = chain.some(id => answers[id] !== undefined);
    if (hasAnsweredDownstream) {
      setConfirmPending({
        msg: '카테고리를 변경하면 이후 입력한 내용이 모두 초기화됩니다.',
        action: () => {
          setSelectedCategory(null);
          setSelectedFormTemplateSn(null);
          setChain([]);
          setAnswers({});
          setStepDraft({});
          setFreeTextDraft({});
          setAddressDraft({});
          setPendingEtcStep(null);
          setExpandedStepId(null);
          setIsComplete(false);
          setEditingCategory(false);
        },
      });
    } else {
      setEditingCategory(true);
    }
  };

  const handleCategorySelect = (cat) => {
    const form = formByCategorySn[String(cat.catSn)];
    if (!form) {
      setAlertMsg('이 카테고리의 요청 양식을 불러올 수 없습니다.');
      return;
    }
    setSelectedCategory({ catSn: cat.catSn, catNm: cat.catNm });
    setSelectedFormTemplateSn(form.formTemplateSn);
    setAnswers({});
    setStepDraft({});
    setFreeTextDraft({});
    setAddressDraft({});
    setPendingEtcStep(null);
    setIsComplete(false);
    setEditingCategory(false);
    setFieldErrors({});
    setError('');
    const firstStep = form.firstStepId;
    setChain(firstStep ? [firstStep] : []);
    setExpandedStepId(firstStep || null);
    // 카테고리를 고르면 바로 다음 입력할 항목인 제목 쪽으로 포커스를 옮겨준다.
    // 제목을 이미 써둔 상태면 굳이 스크롤로 방해하지 않는다.
    // 카테고리 선택 즉시 펼쳐진 카드가 요약 카드로 접히며 레이아웃이 줄어드는데, 그 리렌더링이
    // 반영되기 전(펼쳐진 상태) 기준으로 스크롤 위치를 계산하면 목표를 지나쳐버리므로,
    // 접히는 리렌더링이 화면에 반영된 다음 프레임에 스크롤한다.
    if (!title.trim()) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          titleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
  };

  // ── 단계 카드 헤더 클릭 (토글) — 카드는 한 번에 하나만 펼쳐진다 ─────────────────

  const handleStepCardHeaderClick = (stepId) => {
    setExpandedStepId(prev => (prev === stepId ? null : stepId));
  };

  // 진행률의 완료된(done) 배지를 클릭하면 해당 단계 카드를 펼치고 그 위치로 스크롤한다
  const handleProgressBadgeClick = (stepIndex) => {
    const stepId = chain[stepIndex];
    if (!stepId) return;
    setExpandedStepId(stepId);
    requestAnimationFrame(() => {
      scrollToStep(stepId);
    });
  };

  // 편집 중이던 분기 단계의 답변을 교체할 때 공통으로 쓰는 로직 —
  // 새 답변이 이어지는 다음 단계가 기존과 같으면 하위 입력을 그대로 유지하고,
  // 다르면 하위 입력이 있을 때만 확인 후 초기화한다.
  const applyEditedBranchAnswer = (stepId, answerText, newNext, afterApply) => {
    const stepIdx = chain.indexOf(stepId);
    const currentNextId = chain[stepIdx + 1] ?? null;

    if (newNext === currentNextId) {
      // 하위 단계 구성은 그대로라 지우지 않되, 이어지는 다음 카드를 계속 볼 수 있게 펼쳐둔다
      setAnswers(prev => ({ ...prev, [stepId]: answerText }));
      setExpandedStepId(currentNextId);
      afterApply?.();
      return;
    }

    const hasDownstream = chain.slice(stepIdx + 1).some(id => answers[id] !== undefined);
    const applyChange = () => {
      const kept = truncateAfter(stepId);
      setAnswers(prev => ({ ...prev, [stepId]: answerText }));
      afterApply?.();
      proceed(kept, newNext);
    };

    if (hasDownstream) {
      setConfirmPending({ msg: '이 항목을 변경하면 이후 입력한 내용이 초기화됩니다.', action: applyChange });
    } else {
      applyChange();
    }
  };

  // ── single 선택 ─────────────────────────────────────────────────────────────

  const handleSingleSelect = (stepId, option) => {
    if (fieldErrors[`${stepId}:single`]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[`${stepId}:single`]; return n; });
    }
    if (option.label === ETC) {
      setPendingEtcStep(stepId);
      return;
    }
    setPendingEtcStep(prev => (prev === stepId ? null : prev));

    const step = wizardSteps[stepId];
    const newNext = option.next || step.next;

    if (answers[stepId] !== undefined) {
      applyEditedBranchAnswer(stepId, option.label, newNext);
      return;
    }

    const kept = truncateAfter(stepId);
    setAnswers(prev => ({ ...prev, [stepId]: option.label }));
    proceed(kept, newNext);
  };

  const handleEtcSingleConfirm = (stepId) => {
    if (fieldErrors[`${stepId}:single`]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[`${stepId}:single`]; return n; });
    }
    const step = wizardSteps[stepId];
    const text = (freeTextDraft[`${stepId}:${ETC}`] || '').trim();
    if (!text) {
      setAlertMsg('기타 내용을 입력해 주세요.');
      scrollToStep(stepId);
      return;
    }
    const option = step.options.find(o => o.label === ETC);
    const newNext = option?.next || step.next;

    if (answers[stepId] !== undefined) {
      applyEditedBranchAnswer(stepId, `${ETC}(${text})`, newNext, () => setPendingEtcStep(null));
      return;
    }

    const kept = truncateAfter(stepId);
    setAnswers(prev => ({ ...prev, [stepId]: `${ETC}(${text})` }));
    setPendingEtcStep(null);
    proceed(kept, newNext);
  };

  // ── multi 선택 ──────────────────────────────────────────────────────────────

  // "없음"/"해당없음"처럼 "이 항목엔 해당하는 게 없다"는 뜻의 선택지는 다른 선택지와 동시에
  // 고를 수 없는 독립 항목으로 취급한다
  const isNoneLabel = label => label === '없음' || label === '해당없음';
  const handleMultiToggle = (stepId, label) => {
    setStepDraft(prev => {
      const cur = prev[stepId] || [];
      if (isNoneLabel(label)) {
        // "없음"류 선택 → 다른 선택지 전부 해제, 이것만 남김 (토글)
        const next = cur.includes(label) ? [] : [label];
        return { ...prev, [stepId]: next };
      }
      // 일반 선택지 → "없음"류 전부 해제 후 토글
      const withoutNone = cur.filter(l => !isNoneLabel(l));
      const next = withoutNone.includes(label) ? withoutNone.filter(l => l !== label) : [...withoutNone, label];
      return { ...prev, [stepId]: next };
    });
    if (fieldErrors[`${stepId}:multi`]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[`${stepId}:multi`]; return n; });
    }
  };

  const handleMultiConfirm = (stepId) => {
    const step = wizardSteps[stepId];
    const picked = stepDraft[stepId] || [];
    if (picked.length === 0) {
      const cleanTitle = step.title.replace(/\s*\(복수 선택\)$/, '');
      const msg = `${withEulReul(cleanTitle)} 선택해 주세요.`;
      setAlertMsg(msg);
      setFieldErrors(prev => ({ ...prev, [`${stepId}:multi`]: msg }));
      scrollToStep(stepId);
      return;
    }
    if (picked.includes(ETC) && !(freeTextDraft[`${stepId}:${ETC}`] || '').trim()) {
      setAlertMsg('기타 내용을 입력해 주세요.');
      scrollToStep(stepId);
      return;
    }
    setFieldErrors(prev => { const n = { ...prev }; delete n[`${stepId}:multi`]; return n; });
    const labels = picked.map(l => (l === ETC ? `${ETC}(${freeTextDraft[`${stepId}:${ETC}`].trim()})` : l));

    if (answers[stepId] !== undefined) {
      setAnswers(prev => ({ ...prev, [stepId]: labels.join(', ') }));
      // 재편집 성공 — 하위 단계 구성은 그대로라 이어지는 다음 카드를 계속 볼 수 있게 펼쳐둔다
      setExpandedStepId(chain[chain.indexOf(stepId) + 1] ?? null);
      return;
    }

    const kept = truncateAfter(stepId);
    setAnswers(prev => ({ ...prev, [stepId]: labels.join(', ') }));
    proceed(kept, step.next);
  };

  // ── form 입력 ───────────────────────────────────────────────────────────────

  const handleFormFieldChange = (stepId, key, value) => {
    setStepDraft(prev => ({ ...prev, [stepId]: { ...(prev[stepId] || {}), [key]: value } }));
    const errKey = `${stepId}:${key}`;
    setFieldErrors(prev => {
      if (!prev[errKey]) return prev;
      const n = { ...prev };
      delete n[errKey];
      return n;
    });
  };

  // form 단계의 필수·숫자포함·기타텍스트 검증 — 실패 시 알림+포커스 이동+인라인 에러를 설정하고
  // false를 반환한다. 카드 안의 "다음" 버튼과 화면 하단 전체 "다음" 버튼(goNext) 양쪽에서 재사용
  const validateFormStep = (stepId) => {
    const step = wizardSteps[stepId];
    const values = stepDraft[stepId] || {};
    // hideWhen 조건에 걸려 화면에 안 보이는 필드(예: 온라인·화상 레슨의 지역)와,
    // 같은 단계 안 다른 필드가 채워져 비활성화된 필드(예: 예상 금액대 선택 시 예산)는 검증에서도 뺀다
    const visibleFields = step.fields.filter(f =>
      (!f.hideWhen || answers[f.hideWhen.step] !== f.hideWhen.equals)
      && (!f.disabledWhenFilled || !(values[f.disabledWhenFilled] || '').toString().trim())
    );

    // 필드를 하나씩 순서대로 확인해서, 앞선 필드의 숫자 검증이 뒤에 있는 다른 필드의
    // 필수 입력 검증보다 먼저 걸리도록 한다 (필수/숫자를 전체 필드 두 번 훑지 않음)
    for (const f of visibleFields) {
      const raw = (values[f.key] || '').toString().trim();
      if (f.required && !raw && f.type !== 'amount-toggle') {
        const errKey = `${stepId}:${f.key}`;
        const verb = f.type === 'choice' || f.type === 'select' || f.type === 'calendar' ? '선택' : '입력';
        const msg = `${withEulReul(f.key)} ${verb}해 주세요.`;
        setFieldErrors(prev => ({ ...prev, [errKey]: msg }));
        setAlertMsg(msg);
        scrollToStep(stepId);
        return false;
      }
      if (f.requireDigit && raw && !/\d/.test(raw)) {
        const errKey = `${stepId}:${f.key}`;
        const msg = `${f.key}에 숫자를 포함해 입력해 주세요.`;
        setFieldErrors(prev => ({ ...prev, [errKey]: msg }));
        setAlertMsg(msg);
        scrollToStep(stepId);
        return false;
      }
      if (f.type === 'amount-toggle' && raw && Number(raw.replace(/,/g, '')) > MAX_BUDGET_AMT) {
        const errKey = `${stepId}:${f.key}`;
        const msg = `${f.key}은(는) ${MAX_BUDGET_AMT.toLocaleString('ko-KR')}P 이하로 입력해 주세요.`;
        setFieldErrors(prev => ({ ...prev, [errKey]: msg }));
        setAlertMsg(msg);
        scrollToStep(stepId);
        return false;
      }
    }
    const etcFieldMissingText = visibleFields.some(
      f => f.type === 'choice' && values[f.key] === ETC && !(freeTextDraft[`${stepId}:${f.key}`] || '').trim()
    );
    if (etcFieldMissingText) {
      setAlertMsg('기타 내용을 입력해 주세요.');
      scrollToStep(stepId);
      return false;
    }
    return true;
  };

  const handleFormConfirm = (stepId) => {
    if (!validateFormStep(stepId)) return;
    const step = wizardSteps[stepId];
    const values = stepDraft[stepId] || {};
    // hideWhen 조건에 걸려 숨겨졌거나 disabledWhenFilled로 비활성화된 필드는
    // 값이 남아있어도 저장하지 않는다
    const visibleFields = step.fields.filter(f =>
      (!f.hideWhen || answers[f.hideWhen.step] !== f.hideWhen.equals)
      && (!f.disabledWhenFilled || !(values[f.disabledWhenFilled] || '').toString().trim())
    );

    // 통과 시 이 단계 에러 전부 제거
    setFieldErrors(prev => {
      const n = { ...prev };
      step.fields.forEach(f => delete n[`${stepId}:${f.key}`]);
      return n;
    });

    const vals = visibleFields
      .map(f => {
        let v = (values[f.key] || '').toString().trim();
        if (f.type === 'choice' && v === ETC) {
          const text = (freeTextDraft[`${stepId}:${f.key}`] || '').trim();
          if (text) v = `${ETC}(${text})`;
        }
        return { k: f.key, v };
      })
      .filter(x => x.v)
      .map(x => `${x.k}: ${x.v}`);

    if (answers[stepId] !== undefined) {
      setAnswers(prev => ({ ...prev, [stepId]: vals.length ? vals.join(' / ') : '(입력 없음)' }));
      // 재편집 성공 — 하위 단계 구성은 그대로라 이어지는 다음 카드를 계속 볼 수 있게 펼쳐둔다
      setExpandedStepId(chain[chain.indexOf(stepId) + 1] ?? null);
      return;
    }

    const kept = truncateAfter(stepId);
    setAnswers(prev => ({ ...prev, [stepId]: vals.length ? vals.join(' / ') : '(입력 없음)' }));
    proceed(kept, step.next);
  };

  // ── 제출 ────────────────────────────────────────────────────────────────────

  const validateBasic = () => {
    setSubmitted(true);
    if (!selectedCategory) {
      setAlertMsg('카테고리를 선택해 주세요.');
      categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (!title.trim()) {
      setAlertMsg('요청 제목을 입력해 주세요.');
      titleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (!selectedFormTemplateSn) {
      setAlertMsg('서비스 요청 양식을 불러오지 못했습니다. 카테고리를 다시 선택해 주세요.');
      categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const buildStructuredSubmission = () => {
    const structuredAnswers = [];
    const addressList = [];

    chain.forEach(stepId => {
      const current = wizardSteps[stepId];
      if (!current) return;

      if (current.type === 'single') {
        const selected = answers[stepId];
        if (selected === undefined) return;
        const label = selected.startsWith(`${ETC}(`) ? ETC : selected;
        const option = current.options.find(candidate => candidate.label === label);
        if (!option) return;
        structuredAnswers.push({
          stepKey: current.stepKey,
          optionValue: option.value,
          otherText: label === ETC ? (freeTextDraft[`${stepId}:${ETC}`] || '').trim() || null : null,
        });
        return;
      }

      if (current.type === 'multi') {
        (stepDraft[stepId] || []).forEach(label => {
          const option = current.options.find(candidate => candidate.label === label);
          if (!option) return;
          structuredAnswers.push({
            stepKey: current.stepKey,
            optionValue: option.value,
            otherText: label === ETC ? (freeTextDraft[`${stepId}:${ETC}`] || '').trim() || null : null,
          });
        });
        return;
      }

      const values = stepDraft[stepId] || {};
      const visibleFields = current.fields.filter(field =>
        (!field.hideWhen || answers[field.hideWhen.step] !== field.hideWhen.equals)
        && (!field.disabledWhenFilled || !String(values[field.disabledWhenFilled] || '').trim())
      );
      const detailFieldKeys = new Set();

      visibleFields.filter(field => field.type === 'address').forEach(field => {
        const address = String(values[field.key] || '').trim();
        if (!address) return;
        const detailField = visibleFields.find(candidate =>
          candidate.fieldKey !== field.fieldKey
          && candidate.type === 'text'
          && candidate.sensitiveYn === 'Y'
          && candidate.row
          && candidate.row === field.row
          && candidate.key.includes('상세주소')
        );
        if (detailField) detailFieldKeys.add(detailField.fieldKey);
        const metadata = addressDraft[`${stepId}:${field.key}`] || {};
        addressList.push({
          stepKey: current.stepKey,
          addressFieldKey: field.fieldKey,
          detailFieldKey: detailField?.fieldKey || null,
          sequence: 1,
          address,
          detailAddress: detailField ? String(values[detailField.key] || '').trim() || null : null,
          zonecode: metadata.zonecode || null,
          sido: metadata.sido || null,
          sigungu: metadata.sigungu || null,
        });
      });

      visibleFields.forEach(field => {
        if (field.type === 'address' || detailFieldKeys.has(field.fieldKey)) return;
        const rawValue = String(values[field.key] || '').trim();
        if (!rawValue) return;

        if (field.type === 'choice' || field.type === 'select') {
          const option = field.optionDefs?.find(candidate => candidate.label === rawValue);
          if (!option) return;
          structuredAnswers.push({
            stepKey: current.stepKey,
            fieldKey: field.fieldKey,
            optionValue: option.value,
            otherText: rawValue === ETC
              ? (freeTextDraft[`${stepId}:${field.key}`] || '').trim() || null
              : null,
          });
          return;
        }

        structuredAnswers.push({
          stepKey: current.stepKey,
          fieldKey: field.fieldKey,
          value: rawValue,
        });
      });
    });

    return { structuredAnswers, addressList };
  };

  const buildPayload = (statusCd, flSnList) => {
    const budgetStepId = chain.find(stepId => wizardSteps[stepId]?.stepKey === 'budget');
    const memoStepId = chain.find(stepId => wizardSteps[stepId]?.stepKey === 'memo');
    const budgetDraft = (budgetStepId && stepDraft[budgetStepId]) || {};
    const budgetRaw = budgetDraft['예산'];
    const budgetAmount = budgetRaw ? Number(String(budgetRaw).replace(/[^0-9]/g, '')) : null;
    const hasBudget = budgetAmount != null && budgetAmount > 0;
    const memoText = ((memoStepId && stepDraft[memoStepId]?.['메모']) || '').trim() || null;
    const { structuredAnswers, addressList } = buildStructuredSubmission();
    return {
      catSn: Number(selectedCategory.catSn),
      formTemplateSn: Number(selectedFormTemplateSn),
      svcReqTtl: title.trim(),
      svcReqCn: memoText,
      svcReqBdgtAmt: hasBudget ? budgetAmount : null,
      svcReqStatusCd: statusCd,
      structuredAnswers,
      addressList,
      flSnList,
    };
  };

  const submit = async (statusCd) => {
    setLoading(true);
    try {
      // 사진은 선택 시점엔 로컬 blob 미리보기만 두고, 제출 시점에 한 번에 업로드한다
      // (상품등록 handleSubmit과 동일한 패턴) — 이미 업로드된(수정 모드) 이미지는 재업로드하지 않는다.
      const uploadedImages = await Promise.all(images.map(async img => {
        if (img.flSn) return img;
        const res = await uploadImage(img.file, 'service-request');
        URL.revokeObjectURL(img.url);
        return { ...img, flSn: res.data.flSn, url: res.data.url };
      }));
      const flSnList = uploadedImages.map(img => img.flSn);

      const payload = buildPayload(statusCd, flSnList);
      const result = editSvcReqSn
        ? await updateServiceRequest(editSvcReqSn, payload)
        : await registerServiceRequest(payload);
      const svcReqSn = result.data?.svcReqSn ?? editSvcReqSn;
      // 목록으로 돌아갔을 때 방금 임시저장·등록한 내용이 바로 반영되게 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['serviceRequests', 'my'] });
      navigate(getServiceRequestDetailPath(svcReqSn));
    } catch (err) {
      setAlertMsg(err.response?.data?.message || (editSvcReqSn ? '요청서 수정에 실패했습니다.' : '요청서 등록에 실패했습니다.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = () => { if (validateBasic()) submit('SVCC0001'); };

  const goNext = () => {
    if (!validateBasic()) { console.log('[goNext] blocked: validateBasic 실패(제목/카테고리)'); return; }

    if (!policyAgreed) {
      console.log('[goNext] blocked: 정책 미동의');
      setAlertMsg('견적 요청 정책을 확인하고 동의해 주세요.');
      policyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 이미 답변된 단계를 다시 열어 편집하는 중이면, 그 초안이 지금 유효한지부터 확인한다.
    // 안 그러면 체인 맨 끝(재편집 중인 단계와 무관한 이후 단계)이 엉뚱하게 지목된다.
    if (expandedStepId && answers[expandedStepId] !== undefined) {
      const editingStep = wizardSteps[expandedStepId];
      console.log('[goNext] 재편집 중인 카드 검증:', expandedStepId, editingStep?.type);
      if (editingStep?.type === 'multi') {
        const picked = stepDraft[expandedStepId] || [];
        if (picked.length === 0) {
          console.log('[goNext] blocked: 재편집 중 multi 미선택', expandedStepId);
          const cleanTitle = editingStep.title.replace(/\s*\(복수 선택\)$/, '');
          const msg = `${withEulReul(cleanTitle)} 선택해 주세요.`;
          setAlertMsg(msg);
          setFieldErrors(prev => ({ ...prev, [`${expandedStepId}:multi`]: msg }));
          scrollToStep(expandedStepId);
          return;
        }
      } else if (editingStep?.type === 'form') {
        const ok = validateFormStep(expandedStepId);
        console.log('[goNext] 재편집 중 form 검증 결과:', expandedStepId, ok);
        if (!ok) { console.log('[goNext] blocked: 재편집 중 form 검증 실패', expandedStepId); return; }
      }
    }

    // isComplete는 상태값이라 재편집 흐름(같은 분기로 재선택 등)에서 실제 진행 상황과 어긋날 수 있어,
    // 여기서는 체인 끝 단계가 실제로 답변됐고 다음 단계가 없는지를 그 자리에서 다시 계산해 사용한다.
    const lastId = chain[chain.length - 1];
    const lastStep = lastId ? wizardSteps[lastId] : null;
    const actuallyComplete = !!lastId && answers[lastId] !== undefined && !lastStep?.next;
    console.log('[goNext] lastId:', lastId, 'lastStep.type:', lastStep?.type, 'lastStep.next:', lastStep?.next, 'answers[lastId] 존재:', lastId ? answers[lastId] !== undefined : null, 'actuallyComplete:', actuallyComplete);

    if (!actuallyComplete) {
      console.log('[goNext] 미완료 처리 진입, lastId:', lastId, 'type:', lastStep?.type);
      if (lastStep?.type === 'form') {
        // 카드 안 "다음" 버튼과 동일한 검증(알림+포커스+인라인 에러)을 그대로 재사용.
        const ok = validateFormStep(lastId);
        console.log('[goNext] 마지막 form 카드 검증 결과:', lastId, ok);
        if (!ok) { console.log('[goNext] blocked: 마지막 form 카드 검증 실패', lastId); return; }
        // 필수 항목이 하나도 없는 단계(예: 특이사항 메모)는 안내 문구로 막을 이유가 없으니
        // 카드 안 버튼을 누른 것과 동일하게 바로 확정 처리한다.
        if (!lastStep.fields.some(f => f.required)) {
          console.log('[goNext] 필수 없는 form 자동 확정:', lastId, '다음단계 없음?', !lastStep.next);
          handleFormConfirm(lastId);
          // 이 단계가 마지막(다음 단계 없음)이면 확정과 동시에 완료된 것이므로 바로 확인 탭으로 넘어간다.
          // isComplete는 handleFormConfirm 내부 setState라 이 시점엔 아직 반영 전이라 여기서 직접 판단한다.
          if (!lastStep.next) { console.log('[goNext] setStep(1) 호출 (자동확정 경로)'); setStep(1); }
          return;
        }
        console.log('[goNext] 필수 있는 form 카드, 자동확정 안 하고 아래 공용 안내로 진행:', lastId);
        // 필수 항목은 다 채웠지만 카드 안 버튼을 아직 안 눌러 확정 안 된 경우엔 여기서
        // return하지 않고 아래 공용 안내 문구로 이어지게 한다.
      }
      if (lastStep?.type === 'multi') {
        const picked = stepDraft[lastId] || [];
        if (picked.length === 0) {
          console.log('[goNext] blocked: 마지막 multi 카드 미선택', lastId);
          const cleanTitle = lastStep.title.replace(/\s*\(복수 선택\)$/, '');
          const msg = `${withEulReul(cleanTitle)} 선택해 주세요.`;
          setAlertMsg(msg);
          setFieldErrors(prev => ({ ...prev, [`${lastId}:multi`]: msg }));
          scrollToStep(lastId);
          return;
        }
      }

      console.log('[goNext] blocked: 공용 안내 문구(모든 단계를 마쳐야) 표시, lastId:', lastId, 'type:', lastStep?.type);
      const msg = lastStep?.type === 'single'
        ? `${withEulReul(lastStep.title)} 선택해 주세요.`
        : '모든 단계를 마쳐야 다음으로 진행할 수 있어요. \n진행 중이라면 임시저장을 이용해 주세요.';
      setAlertMsg(msg);
      if (lastId) {
        scrollToStep(lastId);
        if (lastStep?.type === 'single') {
          setFieldErrors(prev => ({ ...prev, [`${lastId}:single`]: msg }));
        }
      }
      return;
    }
    console.log('[goNext] setStep(1) 호출 (완료 경로)');
    setStep(1);
  };

  const handlePublish = () => {
    if (!validateBasic()) return;
    if (!isComplete) {
      setAlertMsg('모든 단계를 마쳐야 요청서를 공개할 수 있어요. \n진행 중이라면 임시저장을 이용해 주세요.');
      return;
    }
    if (!agreed) {
      setAlertMsg('요청 내용 확인 및 동의가 필요합니다.');
      agreedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    submit('SVCC0002');
  };

  const handleConfirmOk = () => { confirmPending?.action(); setConfirmPending(null); };
  const handleConfirmCancel = () => setConfirmPending(null);

  const handleAddressComplete = (data) => {
    if (!addressSearchKey) return;
    const colonIdx = addressSearchKey.indexOf(':');
    const stepId = addressSearchKey.slice(0, colonIdx);
    const fieldKey = addressSearchKey.slice(colonIdx + 1);
    const address = data.roadAddress || data.jibunAddress || '';
    handleFormFieldChange(stepId, fieldKey, address);
    setAddressDraft(prev => ({
      ...prev,
      [addressSearchKey]: {
        address,
        zonecode: data.zonecode || '',
        sido: data.sido || '',
        sigungu: data.sigungu || '',
      },
    }));
    if (fieldErrors[addressSearchKey]) setFieldErrors(prev => { const n = { ...prev }; delete n[addressSearchKey]; return n; });
    setAddressSearchKey(null);
  };

  // ── 파생 상태 ────────────────────────────────────────────────────────────────

  const isCategoryExpanded = !selectedCategory || editingCategory;
  const isStepExpanded = (stepId) => expandedStepId === stepId;
  // 이미 답변된 이전 단계를 재편집하는 중이면, 그 이후(다운스트림) 단계들은 값은 그대로 둔 채
  // 비활성화한다 — 재편집이 성공(그대로 유지 또는 다음 답변으로 교체)하거나 실패(계속 편집 중)
  // 하는 동안 expandedStepId가 자연스럽게 이 조건을 갱신하므로 별도 해제 로직이 필요 없다.
  const editingStepIndex = expandedStepId && answers[expandedStepId] !== undefined ? chain.indexOf(expandedStepId) : -1;
  // 카테고리별 전체 단계 수(분기 중 가장 긴 경로 기준) — chain.length 대신 진행률 분모로 사용
  const categoryMaxSteps = selectedCategory
    ? getCategoryMaxSteps(
        wizardSteps,
        formByTemplateSn[String(selectedFormTemplateSn)]?.firstStepId
          || categoryNextStep[selectedCategory.catNm],
      )
    : 0;
  const answeredStepCount = chain.filter(id => answers[id] !== undefined).length;
  // 현재 진행 중인(맨 마지막) 단계 다음부터 기본 경로를 따라간 미리보기 카드 — 아직 실제로 답변하지 않은 구간
  const previewStepIds = selectedCategory && chain.length > 0
    ? buildPreviewSteps(wizardSteps, getDefaultNextStep(wizardSteps, chain[chain.length - 1]), chain)
    : [];
  // 희망일 달력에서 최대 6개월 뒤까지만 넘겨볼 수 있게 제한
  const maxCalendarNavDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white pb-14 text-base leading-[1.6] text-[#1d1d1f]">
      <div className="container">
        <div className="pt-9 pb-4">
          <h1 className="text-[28px] font-bold">
            {editSvcReqSn ? '전문가 견적 요청서 수정' : '전문가 견적 요청서 작성'}
          </h1>
        </div>

        {/* ── 스텝 인디케이터 (경매등록과 동일한 2단계 구성: 입력 → 확인) ── */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-[#e8e8e8]">
          <div className="flex bg-[#eef2fb] px-5 py-3.5">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`flex flex-1 items-center justify-center gap-2 border-b-[3px] p-3 text-lg ${
                  i === step ? 'border-primary font-bold text-primary'
                  : i < step ? 'border-[#e5efff] text-[#5f5e5a]'
                  : 'border-[#f0efec] text-[#888780]'
                }`}
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current text-sm font-bold">
                  {i + 1}
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div ref={errorRef}><ErrorMessage message={error} /></div>

        {/* ── STEP 0: 요청 정보 입력 ── */}
        {step === 0 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {/* 왼쪽: 요청 정보 (제목 + 카테고리 하나로 묶음) — 오른쪽 카드 높이와 억지로 맞추지 않고
                자기 콘텐츠만큼만 자연스럽게 높이를 가짐 */}
            <section className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
              <div className="border-b border-[#e8e8e8] bg-[#eef2fb] px-6 py-4">
                <h2 className="text-lg font-bold">요청 정보</h2>
              </div>

              {/* 1. 카테고리 */}
              <div ref={categorySectionRef} className="border-b border-[#e8e8e8]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={handleCategoryCardHeaderClick}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5efff] text-xs font-bold text-[#0048bf]">
                      1
                    </span>
                    <h3 className="text-base font-semibold text-[#5f5e5a]">카테고리</h3>
                  </div>
                  {selectedCategory && (
                    <div className="flex items-center gap-2">
                      {isCategoryExpanded
                        ? <ChevronUp size={16} className="shrink-0 text-[#5f5e5a]" />
                        : <ChevronDown size={16} className="shrink-0 text-[#5f5e5a]" />
                      }
                    </div>
                  )}
                </button>

                {/* 선택된 카테고리 요약 배너 — 접힌 상태에서 아이콘·이름·설명을 크게 보여줌 */}
                {!isCategoryExpanded && selectedCategory && (
                  <div className="px-6 pb-5">
                    <button
                      type="button"
                      onClick={handleCategoryCardHeaderClick}
                      className="flex w-full cursor-pointer items-center gap-4 rounded-xl p-4 text-left text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: (categoryMeta[selectedCategory.catNm] || {}).color || '#5f5e5a' }}
                    >
                      <CategoryIcon name={selectedCategory.catNm} />
                      <div>
                        <p className="m-0 text-lg font-bold leading-tight">{selectedCategory.catNm}</p>
                        {(categoryMeta[selectedCategory.catNm] || {}).sub && (
                          <p className="m-0 mt-1 text-sm opacity-90">{categoryMeta[selectedCategory.catNm].sub}</p>
                        )}
                      </div>
                    </button>
                  </div>
                )}

                {isCategoryExpanded && (
                  <div className="border-t border-[#e8e8e8] px-6 py-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {categories.map(cat => {
                        const meta = categoryMeta[cat.catNm] || {};
                        const active = selectedCategory?.catSn === cat.catSn;
                        const color = meta.color || '#5f5e5a';
                        return (
                          <button
                            key={cat.catSn}
                            type="button"
                            onClick={() => handleCategorySelect(cat)}
                            className="relative cursor-pointer rounded-xl p-4 text-left text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: color, outline: active ? '3px solid #1a1a18' : 'none', outlineOffset: 2 }}
                          >
                            {active && (
                              <span
                                className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold"
                                style={{ color }}
                              >✓</span>
                            )}
                            <CategoryIcon name={cat.catNm} className="mb-2" />
                            <p className="m-0 text-base font-bold leading-tight">{cat.catNm}</p>
                            {meta.sub && <p className="m-0 mt-1 text-xs opacity-80">{meta.sub}</p>}
                          </button>
                        );
                      })}
                    </div>
                    {submitted && !selectedCategory && (
                      <p className="mt-3 text-xs font-semibold text-red-600">카테고리를 선택해 주세요.</p>
                    )}
                    {editingCategory && selectedCategory && (
                      <div className="mt-4 flex justify-end">
                        <ActionButton
                          onClick={() => setEditingCategory(false)}
                          size="sm"
                          tone="neutral"
                        >
                          취소
                        </ActionButton>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. 제목 */}
              <div ref={titleSectionRef} className="px-6 py-5">
                <div className="mb-1.5 flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5efff] text-xs font-bold text-[#0048bf]">
                    2
                  </span>
                  <label className="text-base font-semibold text-[#5f5e5a]">제목</label>
                  <span className="ml-auto text-xs text-[#888780]">{title.length}/200</span>
                </div>
                <input
                  className="w-full rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm text-[#1d1d1f] outline-none transition-colors focus:border-primary"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="예) 성수동 원룸 이사 운반"
                />
                {submitted && !title.trim() && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600">제목을 입력해 주세요.</p>
                )}
              </div>

              {/* 3. 사진 첨부 */}
              <div className="border-t border-[#e8e8e8] px-6 py-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5efff] text-xs font-bold text-[#0048bf]">
                    3
                  </span>
                  <h3 className="text-base font-semibold text-[#5f5e5a]">사진 첨부</h3>
                  <span className="text-xs text-[#888780]">(선택)</span>
                </div>
                <ServiceRequestImageUpload images={images} onChange={setImages} maxImages={MAX_IMAGES} />
              </div>

              {/* 견적 요청 정책 안내 — 경매등록 정책 안내와 동일한 스타일 */}
              <div ref={policyRef} className="border-t border-[#e8e8e8] px-6 py-5">
                <div className="rounded-[10px] bg-[#e5efff] p-5">
                  <h4 className="mb-2 font-bold text-[#0048bf]">
                    견적 요청 정책 안내 <span className="text-[#c0392b]">*</span>
                  </h4>
                  <ul className="list-disc space-y-2 pl-[18px] text-[15px] leading-[1.7] text-[#1d1d1f]">
                    <li>요청서 등록 후에는 본문을 수정할 수 없으며, 변경사항은 별도로 최대 3회까지 추가할 수 있습니다</li>
                    <li>포인트 홀딩은 제공자의 견적을 선택한 시점부터 시작됩니다</li>
                    <li>임시저장 상태의 요청서만 삭제할 수 있습니다</li>
                    <li>요청서는 등록(공개) 후 5일이 지나면 자동으로 마감됩니다<br />(희망일이 5일보다 먼저면 희망일 기준으로 더 일찍 마감)</li>
                    <li>견적 선택은 마감 전에 완료해야 하며, 마감 이후에는 도착한 견적을 선택할 수 없습니다</li>
                  </ul>
                  <div className="mt-3 rounded-lg border border-[#f0efec] bg-white px-3.5 py-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d1d1f]">
                      <input
                        type="checkbox"
                        checked={policyAgreed}
                        // 체크 직후 자동으로 화면을 옮기면(스크롤 애니메이션 도중 다시 탭하는 경우 등)
                        // 오히려 탭이 씹히거나 엉뚱한 곳이 눌리는 문제가 있어 자동 스크롤은 하지 않는다.
                        // 포커스 이동은 "다음" 클릭 시 정책 미동의 검증(goNext)에서만 한다.
                        onChange={e => setPolicyAgreed(e.target.checked)}
                      />
                      위 견적 요청 정책을 확인하였습니다.
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* 오른쪽: 요청 상세 설정 — 정책 미동의 시 비활성화 */}
            <section
              ref={detailSectionRef}
              className={`overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm transition-opacity ${
                policyAgreed ? '' : 'pointer-events-none opacity-50'
              }`}
            >
              <div className="border-b border-[#e8e8e8] bg-[#eef2fb] px-6 py-4">
                <h2 className="text-lg font-bold">요청 상세 설정</h2>
              </div>
              <div className="px-6 py-5">
                {!policyAgreed ? (
                  <p className="py-16 text-center text-sm text-[#888780]">견적 요청 정책에 동의하면 상세 항목을 입력할 수 있습니다.</p>
                ) : !selectedCategory ? (
                  <p className="py-16 text-center text-sm text-[#888780]">카테고리를 선택하면 상세 항목이 나타납니다.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* 상세 항목 진행률 — 아래 단계 카드들의 답변 진행 상황을 점-연결선 형태로 표시 */}
                    {categoryMaxSteps > 0 && (
                      <div className="rounded-2xl border border-[#e8e8e8] bg-white px-6 py-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="font-semibold text-[#5f5e5a]">상세 항목 진행률</span>
                          <span className="font-bold text-primary">{answeredStepCount}/{categoryMaxSteps}</span>
                        </div>
                        {/* 모바일 카드 폭에 11개 원을 다 욱여넣으면 연결선이 실처럼 얇아져서, 원·연결선 크기는
                            고정해 두고 넘치는 만큼은 가로 스크롤로 보게 한다(데스크탑은 폭이 넉넉해 스크롤 없이 그대로 보임) */}
                        <div className="scrollbar-hide -mx-1 flex w-full items-center overflow-x-auto px-1 py-1">
                          {Array.from({ length: categoryMaxSteps }, (_, i) => {
                            const state = i < answeredStepCount ? 'done' : i === answeredStepCount ? 'current' : 'upcoming';
                            return (
                              <div key={i} className="flex shrink-0 items-center last:flex-none">
                                {state === 'done' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleProgressBadgeClick(i)}
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition-opacity hover:opacity-80"
                                  >
                                    {i + 1}
                                  </button>
                                ) : (
                                  <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                      state === 'current' ? 'bg-[#e5efff] text-primary ring-2 ring-primary'
                                      : 'bg-[#eceae4] text-[#9f9e9a]'
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                )}
                                {i < categoryMaxSteps - 1 && (
                                  <span className={`h-[2px] w-8 shrink-0 ${i < answeredStepCount ? 'bg-primary' : 'bg-[#e2e1dc]'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {isComplete && (
                          <p className="mt-3 text-xs font-semibold text-primary">모든 항목을 입력했어요!</p>
                        )}
                      </div>
                    )}
                    {chain.map((stepId, index) => {
            const step = wizardSteps[stepId];
            if (!step) return null;
            const expanded = isStepExpanded(stepId);
            const stepNum = index + 1;
            const disabledByEdit = editingStepIndex !== -1 && index > editingStepIndex;

            return (
              <section
                key={stepId}
                id={`service-request-step-${stepId}`}
                className={`overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm ${disabledByEdit ? 'pointer-events-none opacity-50' : ''}`}
              >
                {/* 카드 헤더 */}
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left"
                  onClick={() => handleStepCardHeaderClick(stepId)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5efff] text-xs font-bold text-[#0048bf]">
                      {stepNum}
                    </span>
                    <h2 className="shrink-0 whitespace-nowrap text-lg font-bold">{step.title}</h2>
                  </div>
                  {answers[stepId] && (
                    <div className="flex items-center gap-3">
                      {!expanded && (
                        <span className="max-w-[220px] truncate text-right text-[15px] font-semibold text-primary">
                          {formatStepAnswerDisplay(step, answers[stepId])}
                        </span>
                      )}
                      {expanded
                        ? <ChevronUp size={16} className="shrink-0 text-[#5f5e5a]" />
                        : <ChevronDown size={16} className="shrink-0 text-[#5f5e5a]" />
                      }
                    </div>
                  )}
                </button>

                {/* 펼쳐진 내용 */}
                {expanded && (
                  <div className="border-t border-[#e8e8e8] px-6 py-5">
                    {step.desc && (
                      <p className="mb-3 ml-9 text-sm text-[#5f5e5a]">{step.desc}</p>
                    )}

                    {/* single · multi */}
                    {(step.type === 'single' || step.type === 'multi') && (
                      <>
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                          {step.options.map(opt => {
                            const active = step.type === 'single'
                              ? (answers[stepId] === opt.label
                                  || (opt.label === ETC && (answers[stepId]?.startsWith(`${ETC}(`) || pendingEtcStep === stepId)))
                              : (stepDraft[stepId] || []).includes(opt.label);
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => step.type === 'single'
                                  ? handleSingleSelect(stepId, opt)
                                  : handleMultiToggle(stepId, opt.label)
                                }
                                className={`flex flex-col items-start rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition-colors ${
                                  active
                                    ? 'border-primary bg-[#e5efff] font-semibold text-[#0048bf]'
                                    : 'border-[#e2e1dc] bg-white text-[#1d1d1f] hover:border-primary'
                                }`}
                              >
                                {opt.icon && <span className="mb-1.5 text-xl leading-none">{opt.icon}</span>}
                                <span className="font-medium leading-snug">{formatPointUnitText(opt.label)}</span>
                                {opt.sub && <span className="mt-0.5 text-xs text-[#888780]">{opt.sub}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {step.type === 'single' && fieldErrors[`${stepId}:single`] && (
                          <p className="mt-2 text-xs font-semibold text-red-600">{fieldErrors[`${stepId}:single`]}</p>
                        )}

                        {/* 기타 텍스트 입력 — multi */}
                        {step.type === 'multi' && (stepDraft[stepId] || []).includes(ETC) && (
                          <input
                            className="mt-3 w-full rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                            placeholder="기타 내용을 입력해 주세요"
                            value={freeTextDraft[`${stepId}:${ETC}`] || ''}
                            onChange={e => setFreeTextDraft(prev => ({ ...prev, [`${stepId}:${ETC}`]: e.target.value }))}
                          />
                        )}

                        {/* 기타 텍스트 입력 — single */}
                        {step.type === 'single' && pendingEtcStep === stepId && (
                          <div className="mt-3 flex gap-2">
                            <input
                              className="flex-1 rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                              placeholder="기타 내용을 입력해 주세요"
                              value={freeTextDraft[`${stepId}:${ETC}`] || ''}
                              onChange={e => setFreeTextDraft(prev => ({ ...prev, [`${stepId}:${ETC}`]: e.target.value }))}
                            />
                            <ActionButton
                              onClick={() => handleEtcSingleConfirm(stepId)}
                              size="sm"
                            >다음</ActionButton>
                          </div>
                        )}

                        {/* 다음 버튼 — multi */}
                        {step.type === 'multi' && (
                          <>
                          {fieldErrors[`${stepId}:multi`] && (
                            <p className="mt-2 text-xs font-semibold text-red-600">{fieldErrors[`${stepId}:multi`]}</p>
                          )}
                          <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-[#888780]">해당하는 항목을 모두 선택한 뒤 다음을 눌러 주세요.</p>
                            <ActionButton
                              className="shrink-0"
                              onClick={() => handleMultiConfirm(stepId)}
                              size="sm"
                            >
                              다음
                            </ActionButton>
                          </div>
                          </>
                        )}
                      </>
                    )}

                    {/* form */}
                    {step.type === 'form' && (() => {
                      // f.row 키가 같은 연속 필드를 하나의 그룹으로 묶음
                      // calendar 필드의 embed 목록에 든 필드는 달력 박스 안에서 같이 렌더링되므로
                      // 별도 그룹으로 다시 만들지 않는다
                      // hideWhen 조건에 걸리는 필드(예: 온라인·화상 레슨일 땐 지역 불필요)는 아예 뺀다
                      const visibleFields = step.fields.filter(f => !f.hideWhen || answers[f.hideWhen.step] !== f.hideWhen.equals);
                      const embeddedKeys = new Set(visibleFields.flatMap(f => f.embed || []));
                      const groups = [];
                      visibleFields.forEach(f => {
                        if (embeddedKeys.has(f.key)) return;
                        if (f.row) {
                          const last = groups[groups.length - 1];
                          if (last?.rowKey === f.row) last.fields.push(f);
                          else groups.push({ rowKey: f.row, fields: [f] });
                        } else {
                          groups.push({ rowKey: null, fields: [f] });
                        }
                      });

                      // 그룹(row) 필드와 나란히 있을 땐 짧은 입력칸(예: 평수·방 개수)이 좁게 표시되는데,
                      // 같은 유형 필드가 혼자 한 줄을 차지할 때도(예: 화장실 개수) 동일한 폭으로 맞춰
                      // 입력칸이 늘어나지 않고 오른쪽에 여백이 남도록 한다. select/choice/calendar 등
                      // 자체 UI가 있는 필드는 이미 적절한 폭으로 그려지므로 대상에서 뺀다.
                      const getSoloFieldWidthClass = (f) => {
                        const isPlainInputField = !['choice', 'select', 'calendar', 'amount-toggle', 'address', 'textarea'].includes(f.type || '');
                        if (step.layout === 'row' || !isPlainInputField) return '';
                        return f.compact ? ' sm:w-20' : f.narrow ? ' sm:w-48' : ' sm:w-32';
                      };

                      const renderNormalField = (f) => (
                        <div key={f.key} className={`${step.layout === 'row' ? '' : 'mb-4 last:mb-0'}${getSoloFieldWidthClass(f)}`}>
                          <label className="mb-1.5 block text-base font-semibold text-[#5f5e5a]">
                            <span className="flex items-center gap-1">
                              {f.key}{f.required && <span className="text-red-600"> *</span>}
                              {f.tooltip && (
                                <span className="group/tip relative inline-flex cursor-default">
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#9f9e9a] text-[10px] font-bold leading-none text-[#9f9e9a]">?</span>
                                  <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 whitespace-nowrap rounded-lg border border-[#e2e1dc] bg-white px-3 py-1.5 text-xs font-normal text-[#3b3a36] shadow-md opacity-0 transition-opacity group-hover/tip:opacity-100">
                                    {f.tooltip}
                                  </span>
                                </span>
                              )}
                            </span>
                          </label>
                          {f.type === 'choice' ? (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {f.options.map(o => (
                                  <button key={o} type="button"
                                    className={`rounded-lg border px-3 py-1.5 text-[15px] transition-colors ${stepDraft[stepId]?.[f.key] === o ? 'border-primary bg-[#e5efff] font-semibold text-[#0048bf]' : 'border-[#e2e1dc] bg-white text-[#5f5e5a] hover:border-primary'}`}
                                    onClick={() => handleFormFieldChange(stepId, f.key, f.toggleable && stepDraft[stepId]?.[f.key] === o ? '' : o)}
                                  >{formatPointUnitText(o)}</button>
                                ))}
                              </div>
                              {stepDraft[stepId]?.[f.key] === ETC && (
                                <input className="mt-2 w-full rounded-lg border border-[#e2e1dc] px-3 py-2.5 text-sm outline-none focus:border-primary"
                                  placeholder="기타 내용을 입력해 주세요"
                                  value={freeTextDraft[`${stepId}:${f.key}`] || ''}
                                  onChange={e => setFreeTextDraft(prev => ({ ...prev, [`${stepId}:${f.key}`]: e.target.value }))}
                                />
                              )}
                            </>
                          ) : f.type === 'select' ? (
                            <>
                              <select
                                className="w-full rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                                value={stepDraft[stepId]?.[f.key] || ''}
                                onChange={e => handleFormFieldChange(stepId, f.key, e.target.value)}
                              >
                                <option value="" disabled>선택</option>
                                {f.options.map(o => <option key={o} value={o}>{formatPointUnitText(o)}</option>)}
                              </select>
                              {fieldErrors[`${stepId}:${f.key}`] && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                              )}
                            </>
                          ) : f.type === 'calendar' ? (
                            <DateRangePicker
                              fixedStart
                              maxNavDate={maxCalendarNavDate}
                              endDate={stepDraft[stepId]?.[f.key] || null}
                              onChange={({ end }) => handleFormFieldChange(stepId, f.key, end)}
                              hideStatus={!!f.embed}
                              gridPadding="24px 16px 8px"
                              footer={f.embed && (
                                <div className="flex flex-col gap-3">
                                  {f.embed.map(embedKey => {
                                    const embedField = step.fields.find(ef => ef.key === embedKey);
                                    if (!embedField) return null;
                                    return (
                                      <div key={embedKey}>
                                        <label className="mb-1.5 block text-sm font-semibold text-[#5f5e5a]">{embedField.key}</label>
                                        <div className="flex flex-wrap gap-2">
                                          {embedField.options.map(o => (
                                            <button key={o} type="button"
                                              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${stepDraft[stepId]?.[embedKey] === o ? 'border-primary bg-[#e5efff] font-semibold text-[#0048bf]' : 'border-[#e2e1dc] bg-white text-[#5f5e5a] hover:border-primary'}`}
                                              onClick={() => handleFormFieldChange(stepId, embedKey, o)}
                                            >{formatPointUnitText(o)}</button>
                                          ))}
                                        </div>
                                        {fieldErrors[`${stepId}:${embedKey}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${embedKey}`]}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {(() => {
                                    const dateVal = stepDraft[stepId]?.[f.key];
                                    const parts = [];
                                    if (dateVal) {
                                      const [y, m, d] = dateVal.split('-').map(Number);
                                      parts.push(`${y}년 ${m}월 ${d}일`);
                                    }
                                    f.embed.forEach(embedKey => {
                                      const v = stepDraft[stepId]?.[embedKey];
                                      if (v) parts.push(v);
                                    });
                                    if (parts.length === 0) return null;
                                    return (
                                      <div className="rounded-lg bg-[#f5f7ff] px-3 py-2.5 text-sm">
                                        <span className="text-[#5f5e5a]">선택한 일정: </span>
                                        <span className="font-semibold text-primary">{parts.join(' · ')}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            />
                          ) : f.type === 'amount-toggle' ? (
                            (() => {
                              const disabledByOther = f.disabledWhenFilled && !!(stepDraft[stepId]?.[f.disabledWhenFilled] || '').toString().trim();
                              return (
                                <>
                                  <div className="relative">
                                    <input
                                      className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-8 text-sm outline-none transition-colors focus:border-primary disabled:bg-[#f8f8f6] disabled:text-[#9f9e9a] ${fieldErrors[`${stepId}:${f.key}`] ? 'border-red-500' : 'border-[#e2e1dc]'}`}
                                      placeholder={formatPointUnitText(f.placeholder)}
                                      disabled={disabledByOther}
                                      value={stepDraft[stepId]?.[f.key] || ''}
                                      onChange={e => {
                                        const digits = e.target.value.replace(/[^0-9]/g, '');
                                        handleFormFieldChange(stepId, f.key, digits ? Number(digits).toLocaleString('ko-KR') : '');
                                      }}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888780]">P</span>
                                  </div>
                                  <p className="mt-1 text-sm text-[#9f9e9a]">
                                    미입력 또는 0원 입력 시 예산 협의 후 결정으로 처리됩니다.
                                  </p>
                                  {fieldErrors[`${stepId}:${f.key}`] && (
                                    <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                  )}
                                </>
                              );
                            })()
                          ) : f.type === 'address' ? (
                            <>
                              <div className="flex gap-2">
                                <input
                                  readOnly
                                  onClick={() => setAddressSearchKey(`${stepId}:${f.key}`)}
                                  onFocus={(e) => e.target.blur()}
                                  className={`min-w-0 flex-1 cursor-pointer rounded-lg border bg-[#f8f8f6] px-3 py-2.5 text-sm outline-none ${fieldErrors[`${stepId}:${f.key}`] ? 'border-red-500' : 'border-[#e2e1dc]'}`}
                                  placeholder={formatPointUnitText(f.placeholder)}
                                  value={stepDraft[stepId]?.[f.key] || ''}
                                />
                                <ActionButton
                                  className="shrink-0"
                                  onClick={() => setAddressSearchKey(`${stepId}:${f.key}`)}
                                  size="sm"
                                  tone="outline"
                                >주소 검색</ActionButton>
                              </div>
                              {fieldErrors[`${stepId}:${f.key}`] && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                              )}
                            </>
                          ) : f.type === 'textarea' ? (
                            <textarea
                              className="w-full resize-none overflow-y-auto rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                              rows={3} placeholder={formatPointUnitText(f.placeholder)}
                              value={stepDraft[stepId]?.[f.key] || ''}
                              onChange={e => handleFormFieldChange(stepId, f.key, e.target.value)}
                            />
                          ) : (
                            <>
                              <input
                                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary ${fieldErrors[`${stepId}:${f.key}`] ? 'border-red-500' : 'border-[#e2e1dc]'}`}
                                type={f.type} placeholder={formatPointUnitText(f.placeholder)}
                                value={stepDraft[stepId]?.[f.key] || ''}
                                onChange={e => handleFormFieldChange(stepId, f.key, e.target.value)}
                              />
                              {fieldErrors[`${stepId}:${f.key}`] && (
                                <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                              )}
                            </>
                          )}
                        </div>
                      );

                      return (
                        <>
                          <div
                            className={step.layout === 'row' ? 'grid gap-3' : ''}
                            style={step.layout === 'row' ? { gridTemplateColumns: `repeat(${step.fields.length}, 1fr)` } : undefined}
                          >
                            {groups.map(group => group.rowKey ? (
                              <div key={group.rowKey} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                                {group.fields.map(f => (
                                  <div key={f.key} className={f.type === 'address' || f.type === 'region' ? 'w-full sm:flex-[6]' : f.wide ? 'w-full sm:flex-[4]' : f.compact ? 'w-full sm:w-20 sm:shrink-0' : f.type === 'text' ? 'w-full sm:w-32 sm:shrink-0' : f.type === 'select' ? 'w-full sm:w-36 sm:shrink-0' : f.narrow ? 'w-full sm:w-48 sm:shrink-0' : 'w-full sm:flex-1'}>
                                    {f.type !== 'region' && (
                                      <label className="mb-1.5 block text-base font-semibold text-[#5f5e5a]">{f.key}</label>
                                    )}
                                    {f.type === 'choice' ? (
                                      <>
                                        <div className="flex gap-2">
                                          {f.options.map(o => (
                                            <button key={o} type="button"
                                              className={`flex-1 rounded-lg border px-3 py-2.5 text-[15px] transition-colors ${stepDraft[stepId]?.[f.key] === o ? 'border-primary bg-[#e5efff] font-semibold text-[#0048bf]' : 'border-[#e2e1dc] bg-white text-[#5f5e5a] hover:border-primary'}`}
                                              onClick={() => handleFormFieldChange(stepId, f.key, o)}
                                            >{formatPointUnitText(o)}</button>
                                          ))}
                                        </div>
                                        {fieldErrors[`${stepId}:${f.key}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                        )}
                                      </>
                                    ) : f.type === 'select' ? (
                                      <>
                                        <select
                                          className="w-full rounded-lg border border-[#e2e1dc] bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                                          value={stepDraft[stepId]?.[f.key] || ''}
                                          onChange={e => handleFormFieldChange(stepId, f.key, e.target.value)}
                                        >
                                          <option value="" disabled>선택</option>
                                          {f.options.map(o => <option key={o} value={o}>{formatPointUnitText(o)}</option>)}
                                        </select>
                                        {fieldErrors[`${stepId}:${f.key}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                        )}
                                      </>
                                    ) : f.type === 'address' ? (
                                      <>
                                        <div className="flex gap-2">
                                          <input readOnly
                                            className={`min-w-0 flex-1 rounded-lg border bg-[#f8f8f6] px-3 py-2.5 text-sm outline-none ${fieldErrors[`${stepId}:${f.key}`] ? 'border-red-500' : 'border-[#e2e1dc]'}`}
                                            placeholder={formatPointUnitText(f.placeholder)}
                                            value={stepDraft[stepId]?.[f.key] || ''}
                                          />
                                          <ActionButton
                                            className="shrink-0"
                                            onClick={() => setAddressSearchKey(`${stepId}:${f.key}`)}
                                            size="sm"
                                            tone="outline"
                                          >주소 검색</ActionButton>
                                        </div>
                                        {fieldErrors[`${stepId}:${f.key}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                        )}
                                      </>
                                    ) : f.type === 'region' ? (
                                      <>
                                        <RegionSelector
                                          label={f.key}
                                          placeholder={formatPointUnitText(f.placeholder)}
                                          size="sm"
                                          multiple
                                          maxSelections={f.maxSelections}
                                          value={stepDraft[stepId]?.[f.key] ? stepDraft[stepId][f.key].split(', ') : []}
                                          onChange={sel => handleFormFieldChange(stepId, f.key, sel.map(s => s.label).join(', '))}
                                        />
                                        {f.desc && <p className="mt-1 text-sm text-[#888780]">{f.desc}</p>}
                                        {fieldErrors[`${stepId}:${f.key}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary ${fieldErrors[`${stepId}:${f.key}`] ? 'border-red-500' : 'border-[#e2e1dc]'}`}
                                          placeholder={formatPointUnitText(f.placeholder)}
                                          value={stepDraft[stepId]?.[f.key] || ''}
                                          onChange={e => handleFormFieldChange(stepId, f.key, e.target.value)}
                                        />
                                        {fieldErrors[`${stepId}:${f.key}`] && (
                                          <p className="mt-1 text-xs text-red-600">{fieldErrors[`${stepId}:${f.key}`]}</p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : renderNormalField(group.fields[0]))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <ActionButton
                              onClick={() => {
                                if (!validateFormStep(stepId)) return;
                                handleFormConfirm(stepId);
                                // 마지막 카드(다음 단계 없음)는 이 카드만 확정하고 끝내지 않고,
                                // 화면 하단 "다음" 버튼과 동일하게 요청 확인 탭까지 바로 넘어간다.
                                if (!step.next) setStep(1);
                              }}
                              size="sm"
                            >
                              {step.next ? '다음' : '입력 완료'}
                            </ActionButton>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </section>
            );
                    })}

                    {/* 아직 답변하지 않은 다음 단계들 — 자리만 미리 보여주고 클릭 비활성 */}
                    {previewStepIds.map((stepId, i) => {
                      const previewStep = wizardSteps[stepId];
                      if (!previewStep) return null;
                      return (
                        <section
                          key={`preview-${stepId}`}
                          className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-[#fafaf8] opacity-60"
                        >
                          <div className="flex w-full items-center gap-3 px-6 py-4">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eceae4] text-xs font-bold text-[#9f9e9a]">
                              {chain.length + i + 1}
                            </span>
                            <h2 className="text-lg font-bold text-[#9f9e9a]">{previewStep.title}</h2>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── STEP 1: 요청 확인 (경매등록 RegisterConfirmStep과 동일한 표 스타일) ── */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
              <section className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
                <div className="border-b border-[#e8e8e8] bg-[#eef2fb] px-6 py-4">
                  <h2 className="text-lg font-bold">요청 정보</h2>
                </div>
                <div className="flex-1 p-6">
                  <table className="w-full overflow-hidden rounded-[10px] border border-[#d8d6cf] text-sm">
                    <tbody>
                      {[
                        ['요청 제목', title || '—'],
                        ['카테고리', selectedCategory?.catNm || '—'],
                        ['사진', images.length > 0 ? `${images.length}장 등록됨` : '없음'],
                      ].map(([k, v], i, arr) => (
                        <tr key={k}>
                          <th
                            className={`w-28 break-keep px-3 py-2.5 text-left font-semibold border-r border-[#d8d6cf] ${i === arr.length - 1 ? '' : 'border-b border-[#d8d6cf]'}`}
                            style={{ verticalAlign: 'middle', backgroundColor: '#eef2fb', color: '#5f5e5a' }}
                          >
                            {k}
                          </th>
                          <td className={`px-3 py-2.5 text-[#1d1d1f] ${i === arr.length - 1 ? '' : 'border-b border-[#d8d6cf]'}`}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 등록한 사진 — 정사각형 큰 박스, 여러 장이면 좌우로 넘겨볼 수 있음. 없으면 빈 상자 */}
                  <div className="mt-5 flex-1">
                    <p className="mb-2 text-sm font-semibold text-[#5f5e5a]">등록한 사진</p>
                    {images.length > 0 ? (
                      (() => {
                        const photoIndex = Math.min(confirmPhotoIndex, images.length - 1);
                        const current = images[photoIndex];
                        return (
                          <div className="relative aspect-square w-full overflow-hidden rounded-[10px] border border-[#d8d6cf] bg-[#fafaf8]">
                            <img
                              src={toImageUrl(current.url)}
                              alt={`요청 사진 ${photoIndex + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {images.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmPhotoIndex(i => (i - 1 + images.length) % images.length)}
                                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1a1a18]/60 text-white hover:bg-[#1a1a18]/80"
                                  aria-label="이전 사진"
                                >
                                  <ChevronLeft size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmPhotoIndex(i => (i + 1) % images.length)}
                                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1a1a18]/60 text-white hover:bg-[#1a1a18]/80"
                                  aria-label="다음 사진"
                                >
                                  <ChevronRight size={18} />
                                </button>
                                <span className="absolute bottom-2 right-2 rounded-full bg-[#1a1a18]/60 px-2 py-0.5 text-xs text-white">
                                  {photoIndex + 1} / {images.length}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-[10px] border border-dashed border-[#d8d6cf] bg-[#fafaf8]">
                        <p className="text-sm text-[#888780]">등록된 사진이 없습니다</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-5">
                <section className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
                  <div className="border-b border-[#e8e8e8] bg-[#eef2fb] px-6 py-4">
                    <h2 className="text-lg font-bold">상세 내용</h2>
                  </div>
                  <div className="p-6">
                    <table className="w-full overflow-hidden rounded-[10px] border border-[#d8d6cf] text-sm">
                      <tbody>
                        {chain.map((stepId, i, arr) => {
                          const answerText = answers[stepId] || '';
                          const parts = answerText.includes(' / ') ? answerText.split(' / ').map(parseFieldPart) : null;
                          return (
                            <tr key={stepId}>
                              <th
                                className={`w-32 break-keep px-3 py-2.5 text-left font-semibold border-r border-[#d8d6cf] ${i === arr.length - 1 ? '' : 'border-b border-[#d8d6cf]'}`}
                                style={{ verticalAlign: 'middle', backgroundColor: '#eef2fb', color: '#5f5e5a' }}
                              >
                                {renderStepTitle(wizardSteps[stepId].title)}
                              </th>
                              <td className={`px-3 py-2.5 text-[#1d1d1f] ${i === arr.length - 1 ? '' : 'border-b border-[#d8d6cf]'}`}>
                                {parts ? (
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {parts.map((item, j) => (
                                      <div key={j}>
                                        {item.label && <span className="block text-xs text-[#888780]">{item.label}</span>}
                                        <span>{formatFieldAnswerDisplay(wizardSteps[stepId], item.label, item.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : stripRedundantFieldLabel(wizardSteps[stepId].title, formatStepAnswerDisplay(wizardSteps[stepId], answerText))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section ref={agreedRef} className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white px-6 py-4 shadow-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5f5e5a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                    />
                    위 요청 내용을 확인하였으며, 등록 후 본문 수정이 불가능함에 동의합니다.
                  </label>
                </section>
              </div>
            </div>
          </>
        )}

        {/* ── 하단 버튼 — 화면에 고정해서 스크롤 중에도 항상 같은 위치를 클릭할 수 있게 함
             (스크롤 애니메이션 중 버튼 위치가 흔들려서 클릭이 빗나가는 문제 방지) ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[#e8e8e8] bg-white pb-4 pt-4">
          {step > 0 ? (
            <ActionButton
              onClick={() => setStep(0)}
              disabled={loading}
              tone="neutral"
            >이전</ActionButton>
          ) : <div />}

          <div className="flex gap-3">
            <ActionButton
              onClick={handleDraft}
              disabled={loading}
              tone="neutral"
            >임시저장</ActionButton>
            {step === 0 ? (
              <ActionButton
                onClick={goNext}
              >다음</ActionButton>
            ) : (
              <ActionButton
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? '등록 중...' : '요청서 공개'}
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg('')} />

      {/* 주소 검색 모달 — MyPageProfileEdit·SignupPage와 동일한 패턴 */}
      {addressSearchKey && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onClick={() => setAddressSearchKey(null)}
        >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-3">
              <p className="text-base font-bold">주소 검색</p>
              <ActionButton
                onClick={() => setAddressSearchKey(null)}
                size="sm"
                tone="neutral"
              >
                닫기
              </ActionButton>
            </div>
            <DaumPostcode autoClose={false} onComplete={handleAddressComplete} />
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmPending}
        message={confirmPending?.msg || ''}
        subMessage="이 작업은 되돌릴 수 없습니다."
        confirmLabel="변경"
        onConfirm={handleConfirmOk}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}

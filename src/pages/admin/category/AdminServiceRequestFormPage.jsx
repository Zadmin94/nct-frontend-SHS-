import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Eye,
  FileInput,
  ListChecks,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import PageMeta from '@components/admin/PageMeta';
import { useSaveAdminCategory } from '@hooks/useAdminCategories';
import {
  useAdminServiceRequestForm,
  useDiscardAdminServiceRequestFormDraft,
  usePublishAdminServiceRequestForm,
  useSaveAdminServiceRequestFormDraft,
} from '@hooks/useAdminServiceRequestForm';
import { confirm, formatPointUnitText, toast } from '@utils/common';
import {
  changeFieldType,
  changeStepType,
  createField,
  createOption,
  createStep,
  FIELD_TYPE_OPTIONS,
  toDraftPayload,
  toEditorModel,
} from './serviceRequestFormEditorModel';
import '../notice/adminContentPages.css';
import './adminServiceRequestFormPage.css';

const SERVICE_DOMAIN = 'CATC0002';
const clone = (value) => JSON.parse(JSON.stringify(value));

const nullableText = (value) => {
  const trimmed = value?.trim();
  return trimmed || null;
};

const canonicalJson = (value) => {
  if (!value?.trim()) return null;
  try {
    const sortObject = (target) => {
      if (Array.isArray(target)) return target.map(sortObject);
      if (!target || typeof target !== 'object') return target;
      return Object.keys(target).sort().reduce((result, key) => ({
        ...result,
        [key]: sortObject(target[key]),
      }), {});
    };
    return sortObject(JSON.parse(value));
  } catch {
    return value.trim();
  }
};

const normalizedFormPayload = (model) => {
  const payload = toDraftPayload(model);
  const option = (item, fieldOption = false) => ({
    optionKey: item.optionKey.trim(),
    value: item.value.trim(),
    label: item.label.trim(),
    subtitle: fieldOption ? null : nullableText(item.subtitle),
    nextStepKey: fieldOption ? null : nullableText(item.nextStepKey),
  });
  return {
    subtitle: nullableText(payload.subtitle),
    uiMetaJson: canonicalJson(payload.uiMetaJson),
    steps: payload.steps.map((step) => ({
      stepKey: step.stepKey.trim(),
      title: step.title.trim(),
      description: nullableText(step.description),
      type: step.type,
      nextStepKey: nullableText(step.nextStepKey),
      options: step.options.map((item) => option(item)),
      fields: step.fields.map((field) => ({
        fieldKey: field.fieldKey.trim(),
        label: field.label.trim(),
        type: field.type,
        placeholder: nullableText(field.placeholder),
        description: nullableText(field.description),
        required: field.required,
        requireDigit: field.requireDigit,
        sensitive: field.sensitive,
        maxSelections: field.maxSelections,
        uiMetaJson: canonicalJson(field.uiMetaJson),
        options: field.options.map((item) => option(item, true)),
        rules: field.rules.map((rule) => ({
          sourceStepKey: nullableText(rule.sourceStepKey),
          sourceFieldKey: nullableText(rule.sourceFieldKey),
          compareValue: nullableText(rule.compareValue),
          operator: rule.operator,
          action: rule.action,
        })),
      })),
    })),
  };
};

const formPayloadSignature = (model) => JSON.stringify(normalizedFormPayload(model));

const NextStepSelect = ({ currentStepKey, label, onChange, steps, value }) => (
  <label className="admin-form-designer__next">
    <span>{label}</span>
    <select onChange={(event) => onChange(event.target.value)} value={value || ''}>
      <option value="">여기서 종료</option>
      {steps
        .filter((step) => step.stepKey !== currentStepKey)
        .map((step, index) => (
          <option key={step.stepKey} value={step.stepKey}>
            {index + 1}. {step.title || '제목 없는 질문'}
          </option>
        ))}
    </select>
  </label>
);

const OptionEditor = ({ currentStepKey, onChange, onRemove, option, steps }) => (
  <div className="admin-form-designer__option">
    <div className="admin-form-designer__option-copy">
      <label>
        <span>선택지 이름</span>
        <input
          maxLength="500"
          onChange={(event) => onChange({ label: event.target.value })}
          value={option.label}
        />
      </label>
      <label>
        <span>부가 설명</span>
        <input
          maxLength="1000"
          onChange={(event) => onChange({ subtitle: event.target.value })}
          placeholder="선택지를 이해하기 위한 짧은 설명"
          value={option.subtitle}
        />
      </label>
    </div>
    <NextStepSelect
      currentStepKey={currentStepKey}
      label="선택 후 이동"
      onChange={(nextStepKey) => onChange({ nextStepKey })}
      steps={steps}
      value={option.nextStepKey}
    />
    <button aria-label="선택지 삭제" className="icon-button is-danger" onClick={onRemove} type="button">
      <Trash2 />
    </button>
  </div>
);

const FieldEditor = ({ field, onChange, onRemove }) => {
  const choiceField = field.type === 'CHOICE' || field.type === 'SELECT';
  const addressField = field.type === 'ADDRESS';

  return (
    <div className="admin-form-designer__field">
      <div className="admin-form-designer__field-head">
        <strong>입력 항목</strong>
        <button aria-label="입력 항목 삭제" className="icon-button is-danger" onClick={onRemove} type="button">
          <Trash2 />
        </button>
      </div>
      <div className="admin-form-designer__field-grid">
        <label>
          <span>항목 이름</span>
          <input
            maxLength="200"
            onChange={(event) => onChange((target) => { target.label = event.target.value; })}
            value={field.label}
          />
        </label>
        <label>
          <span>입력 방식</span>
          <select
            onChange={(event) => onChange((target) => changeFieldType(target, event.target.value))}
            value={field.type}
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>입력 안내</span>
          <input
            maxLength="500"
            onChange={(event) => onChange((target) => { target.placeholder = event.target.value; })}
            placeholder="입력창 안에 표시할 예시"
            value={field.placeholder}
          />
        </label>
        <label>
          <span>도움말</span>
          <input
            maxLength="1000"
            onChange={(event) => onChange((target) => { target.description = event.target.value; })}
            placeholder="사용자에게 보여 줄 설명"
            value={field.description}
          />
        </label>
      </div>
      <div className="admin-form-designer__checks">
        <label>
          <input
            checked={field.required}
            onChange={(event) => onChange((target) => { target.required = event.target.checked; })}
            type="checkbox"
          />
          필수 입력
        </label>
      </div>
      {addressField && (
        <p className="admin-form-designer__privacy-note">
          정확한 주소는 서버가 암호화하며 제공자에게는 시·군·구까지만 표시합니다.
        </p>
      )}
      {field.type === 'REGION' && (
        <label className="admin-form-designer__max-select">
          <span>최대 선택 개수</span>
          <input
            min="1"
            onChange={(event) => onChange((target) => {
              target.maxSelections = Number(event.target.value) || null;
            })}
            type="number"
            value={field.maxSelections || ''}
          />
        </label>
      )}
      {choiceField && (
        <div className="admin-form-designer__field-options">
          <div className="admin-form-designer__subhead">
            <strong>선택지</strong>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onChange((target) => { target.options.push(createOption()); })}
              type="button"
            >
              <Plus /> 선택지 추가
            </button>
          </div>
          {field.options.map((option, optionIndex) => (
            <div className="admin-form-designer__field-option" key={option.optionKey}>
              <input
                aria-label={`선택지 ${optionIndex + 1} 이름`}
                maxLength="500"
                onChange={(event) => onChange((target) => {
                  target.options[optionIndex].label = event.target.value;
                })}
                value={option.label}
              />
              <button
                aria-label="선택지 삭제"
                className="icon-button is-danger"
                disabled={field.options.length <= 1}
                onClick={() => onChange((target) => { target.options.splice(optionIndex, 1); })}
                type="button"
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      )}
      {field.rules.length > 0 && (
        <p className="admin-form-designer__rule-note">
          기존 표시 조건 {field.rules.length}개가 그대로 유지됩니다.
        </p>
      )}
    </div>
  );
};

const StepEditor = ({
  index,
  onChange,
  onMove,
  onRemove,
  open,
  setOpen,
  step,
  steps,
}) => {
  const choiceStep = step.type === 'SINGLE' || step.type === 'MULTI';
  return (
    <article className="admin-form-designer__step">
      <header className="admin-form-designer__step-head">
        <button
          aria-expanded={open}
          className="admin-form-designer__step-toggle"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span>{index + 1}</span>
          <div>
            <strong>{step.title || '제목 없는 질문'}</strong>
            <small>{choiceStep ? '선택형 질문' : '입력형 질문'}</small>
          </div>
          {open ? <ChevronUp /> : <ChevronDown />}
        </button>
        <div className="admin-form-designer__step-actions">
          <button aria-label="위로 이동" className="icon-button" disabled={index === 0} onClick={() => onMove(-1)} type="button">
            <ArrowUp />
          </button>
          <button aria-label="아래로 이동" className="icon-button" disabled={index === steps.length - 1} onClick={() => onMove(1)} type="button">
            <ArrowDown />
          </button>
          <button aria-label="질문 삭제" className="icon-button is-danger" disabled={steps.length <= 1} onClick={onRemove} type="button">
            <Trash2 />
          </button>
        </div>
      </header>
      {open && (
        <div className="admin-form-designer__step-body">
          <div className="admin-form-designer__step-grid">
            <label>
              <span>질문 제목</span>
              <input
                maxLength="200"
                onChange={(event) => onChange((target) => { target.title = event.target.value; })}
                value={step.title}
              />
            </label>
            <label>
              <span>질문 방식</span>
              <select
                onChange={(event) => onChange((target) => changeStepType(target, event.target.value))}
                value={step.type}
              >
                <option value="SINGLE">하나 선택</option>
                <option value="MULTI">여러 개 선택</option>
                <option value="FORM">직접 입력</option>
              </select>
            </label>
            <label className="is-wide">
              <span>질문 설명</span>
              <input
                maxLength="1000"
                onChange={(event) => onChange((target) => { target.description = event.target.value; })}
                placeholder="질문 아래에 표시할 안내"
                value={step.description}
              />
            </label>
          </div>
          {choiceStep && (
            <div className="admin-form-designer__options">
              <div className="admin-form-designer__subhead">
                <div>
                  <strong>선택지</strong>
                  <small>카드 이름과 설명을 사용자 화면에 그대로 표시합니다.</small>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onChange((target) => { target.options.push(createOption()); })}
                  type="button"
                >
                  <Plus /> 선택지 추가
                </button>
              </div>
              {step.options.map((option, optionIndex) => (
                <OptionEditor
                  currentStepKey={step.stepKey}
                  key={option.optionKey}
                  onChange={(patch) => onChange((target) => {
                    Object.assign(target.options[optionIndex], patch);
                  })}
                  onRemove={() => onChange((target) => {
                    if (target.options.length > 1) target.options.splice(optionIndex, 1);
                  })}
                  option={option}
                  steps={steps}
                />
              ))}
            </div>
          )}
          {!choiceStep && (
            <div className="admin-form-designer__fields">
              <div className="admin-form-designer__subhead">
                <div>
                  <strong>입력 항목</strong>
                  <small>한 화면에 필요한 입력 항목을 함께 묶을 수 있습니다.</small>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onChange((target) => { target.fields.push(createField()); })}
                  type="button"
                >
                  <Plus /> 입력 항목 추가
                </button>
              </div>
              {step.fields.map((field, fieldIndex) => (
                <FieldEditor
                  field={field}
                  key={field.fieldKey}
                  onChange={(mutator) => onChange((target) => mutator(target.fields[fieldIndex]))}
                  onRemove={() => onChange((target) => {
                    if (target.fields.length > 1) target.fields.splice(fieldIndex, 1);
                  })}
                />
              ))}
            </div>
          )}
          <NextStepSelect
            currentStepKey={step.stepKey}
            label="기본 다음 질문"
            onChange={(nextStepKey) => onChange((target) => { target.nextStepKey = nextStepKey; })}
            steps={steps}
            value={step.nextStepKey}
          />
        </div>
      )}
    </article>
  );
};

const PreviewField = ({ field }) => {
  if (field.type === 'TEXTAREA') return <textarea disabled placeholder={formatPointUnitText(field.placeholder)} />;
  if (field.type === 'CHOICE') {
    return <div className="admin-form-preview__mini-options">
      {field.options.map((option) => <span key={option.optionKey}>{formatPointUnitText(option.label)}</span>)}
    </div>;
  }
  if (field.type === 'SELECT') {
    return <select disabled><option>{formatPointUnitText(field.placeholder) || '선택해 주세요'}</option></select>;
  }
  if (field.type === 'AMOUNT_TOGGLE') {
    return <input disabled placeholder={formatPointUnitText(field.placeholder) || 'P 단위 금액을 입력해 주세요'} />;
  }
  return <input disabled placeholder={formatPointUnitText(field.placeholder) || '입력해 주세요'} />;
};

const FormPreview = ({ model }) => (
  <aside className="card admin-form-preview">
    <div className="admin-form-preview__title">
      <Eye />
      <div>
        <strong>사용자 화면 미리보기</strong>
        <small>실제 요청서에서는 한 단계씩 표시됩니다.</small>
      </div>
    </div>
    <div className="admin-form-preview__category">
      <strong>{model.categoryName || '서비스 카테고리'}</strong>
      <span>{model.subtitle || '필요한 내용을 단계별로 알려주세요.'}</span>
    </div>
    <div className="admin-form-preview__steps">
      {model.steps.length === 0 && <p>질문을 추가하면 이곳에 미리보기가 표시됩니다.</p>}
      {model.steps.map((step, index) => (
        <section key={step.stepKey}>
          <header><span>{index + 1}</span><strong>{step.title || '제목 없는 질문'}</strong></header>
          {step.description && <p>{step.description}</p>}
          {(step.type === 'SINGLE' || step.type === 'MULTI') && (
            <div className="admin-form-preview__options">
              {step.options.map((option) => (
                <div key={option.optionKey}>
                  <strong>{formatPointUnitText(option.label) || '선택지'}</strong>
                  {option.subtitle && <small>{option.subtitle}</small>}
                </div>
              ))}
            </div>
          )}
          {step.type === 'FORM' && (
            <div className="admin-form-preview__fields">
              {step.fields.map((field) => (
                <label key={field.fieldKey}>
                  <span>{field.label || '입력 항목'}{field.required && <em>*</em>}</span>
                  <PreviewField field={field} />
                </label>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  </aside>
);

/** 담당자 7 · F-COM-003/F-SVC-002: 카테고리별 서비스 요청 폼을 초안·발행 버전으로 관리합니다. */
const AdminServiceRequestFormEditor = ({ categorySn, initialResponse }) => {
  const navigate = useNavigate();
  const categoryMutation = useSaveAdminCategory();
  const saveMutation = useSaveAdminServiceRequestFormDraft(categorySn);
  const discardMutation = useDiscardAdminServiceRequestFormDraft(categorySn);
  const publishMutation = usePublishAdminServiceRequestForm(categorySn);
  const [model, setModel] = useState(() => toEditorModel(initialResponse));
  const [categoryForm, setCategoryForm] = useState(() => ({
    active: Boolean(initialResponse.categoryActive),
    name: initialResponse.categoryName || '',
  }));
  const [categoryFeedback, setCategoryFeedback] = useState('');
  const [baselinePayload, setBaselinePayload] = useState(() => (
    formPayloadSignature(toEditorModel(initialResponse))
  ));
  const [feedback, setFeedback] = useState('');
  const [openSteps, setOpenSteps] = useState(() => (
    model.steps[0] ? { [model.steps[0].stepKey]: true } : {}
  ));

  const update = (mutator) => {
    setModel((current) => {
      const next = clone(current);
      mutator(next);
      return next;
    });
    setFeedback('');
  };

  const updateStep = (stepIndex, mutator) => update((next) => mutator(next.steps[stepIndex]));

  const addStep = (kind) => update((next) => {
    const step = createStep(kind);
    const previous = next.steps.at(-1);
    if (previous && !previous.nextStepKey) previous.nextStepKey = step.stepKey;
    next.steps.push(step);
    setOpenSteps((current) => ({ ...current, [step.stepKey]: true }));
  });

  const removeStep = (stepIndex) => update((next) => {
    if (next.steps.length <= 1) return;
    const [removed] = next.steps.splice(stepIndex, 1);
    next.steps.forEach((step) => {
      if (step.nextStepKey === removed.stepKey) step.nextStepKey = '';
      step.options.forEach((option) => {
        if (option.nextStepKey === removed.stepKey) option.nextStepKey = '';
      });
      step.fields.forEach((field) => {
        field.rules = field.rules.filter((rule) => rule.sourceStepKey !== removed.stepKey);
      });
    });
  });

  const moveStep = (stepIndex, direction) => update((next) => {
    const destination = stepIndex + direction;
    if (destination < 0 || destination >= next.steps.length) return;
    const [moved] = next.steps.splice(stepIndex, 1);
    next.steps.splice(destination, 0, moved);
    next.steps.forEach((step, index) => {
      step.nextStepKey = next.steps[index + 1]?.stepKey || '';
    });
  });

  const saveCategory = async (event) => {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      setCategoryFeedback('카테고리 이름을 입력해 주세요.');
      return;
    }
    setCategoryFeedback('');
    try {
      const saved = await categoryMutation.mutateAsync({
        domainCode: SERVICE_DOMAIN,
        categorySn,
        payload: {
          name,
          professional: true,
          active: categoryForm.active,
        },
      });
      setCategoryForm({ name: saved.name, active: saved.active });
      setModel((current) => ({
        ...current,
        categoryName: saved.name,
        categoryActive: saved.active,
      }));
      toast({ icon: 'success', title: '카테고리 정보를 저장했습니다.', timer: 1800 });
    } catch (error) {
      setCategoryFeedback(
        error.response?.data?.message
          || '카테고리 정보를 저장하지 못했습니다. 이름과 노출 상태를 확인해 주세요.',
      );
    }
  };

  const saveDraft = async () => {
    if (!dirty) {
      setFeedback('변경된 내용이 없어 새 초안을 저장하지 않았습니다.');
      return;
    }
    if (!model?.steps.length) {
      setFeedback('질문을 한 개 이상 추가해 주세요.');
      return;
    }
    setFeedback('');
    try {
      const saved = await saveMutation.mutateAsync({
        categorySn,
        payload: toDraftPayload(model),
      });
      const savedModel = toEditorModel(saved);
      setModel(savedModel);
      setBaselinePayload(formPayloadSignature(savedModel));
      toast({ icon: 'success', title: '새 버전 초안을 저장했습니다.', timer: 1800 });
    } catch (error) {
      setFeedback(error.response?.data?.message || '초안을 저장하지 못했습니다. 질문 연결과 입력값을 확인해 주세요.');
    }
  };

  const publish = async () => {
    if (dirty) {
      setFeedback('변경 내용을 초안으로 저장한 뒤 발행해 주세요.');
      return;
    }
    if (!model?.draft || !model.formTemplateSn) {
      setFeedback('발행할 초안이 없습니다. 내용을 수정하고 초안을 먼저 저장해 주세요.');
      return;
    }
    const confirmed = await confirm({
      title: '이 초안을 발행할까요?',
      text: '발행하면 사용자 견적 요청서에 적용됩니다.',
      icon: 'question',
      confirmButtonText: '발행',
      confirmTone: 'primary',
    });
    if (!confirmed) return;
    setFeedback('');
    try {
      const published = await publishMutation.mutateAsync({
        categorySn,
        formTemplateSn: model.formTemplateSn,
      });
      const publishedModel = toEditorModel(published);
      setModel(publishedModel);
      setBaselinePayload(formPayloadSignature(publishedModel));
      toast({ icon: 'success', title: '견적 요청 폼을 발행했습니다.', timer: 1800 });
    } catch (error) {
      setFeedback(error.response?.data?.message || '폼을 발행하지 못했습니다.');
    }
  };

  const discardDraft = async () => {
    if (!model?.draft || !model.formTemplateSn) {
      setFeedback('폐기할 초안이 없습니다.');
      return;
    }
    const message = dirty
      ? '저장하지 않은 변경 내용과 현재 초안을 함께 폐기하시겠습니까?'
      : `초안 v${model.formVersion}을 폐기하시겠습니까? 발행 중인 버전은 유지됩니다.`;
    const confirmed = await confirm({
      title: '초안을 폐기할까요?',
      text: message,
      confirmButtonText: '폐기',
    });
    if (!confirmed) return;
    setFeedback('');
    try {
      const discarded = await discardMutation.mutateAsync({
        categorySn,
        formTemplateSn: model.formTemplateSn,
      });
      const discardedModel = toEditorModel(discarded);
      setModel(discardedModel);
      setBaselinePayload(formPayloadSignature(discardedModel));
      toast({ icon: 'success', title: '초안을 폐기했습니다.', timer: 1800 });
    } catch (error) {
      setFeedback(error.response?.data?.message || '초안을 폐기하지 못했습니다.');
    }
  };

  const dirty = formPayloadSignature(model) !== baselinePayload;
  const pending = saveMutation.isPending
    || discardMutation.isPending
    || publishMutation.isPending;
  return (
    <div className="admin-content-page admin-form-designer">
      <PageMeta title={`${categoryForm.name} 서비스 카테고리 수정`} />
      <AdminPageHeader
        action={(
          <button className="btn btn-outline" onClick={() => navigate('/admin/categories')} type="button">
            <ArrowLeft /> 카테고리 목록
          </button>
        )}
        title="서비스 카테고리 수정"
      />

      <section className="card admin-form-designer__summary">
        <div className="admin-form-designer__category">
          <span>서비스 카테고리</span>
          <form className="admin-form-designer__category-form" onSubmit={saveCategory}>
            <input
              aria-label="카테고리 이름"
              maxLength="100"
              onChange={(event) => {
                setCategoryForm((current) => ({ ...current, name: event.target.value }));
                setCategoryFeedback('');
              }}
              required
              value={categoryForm.name}
            />
            <label className="admin-form-designer__category-active">
              <input
                checked={categoryForm.active}
                onChange={(event) => {
                  setCategoryForm((current) => ({ ...current, active: event.target.checked }));
                  setCategoryFeedback('');
                }}
                type="checkbox"
              />
              사용자 화면에 노출
            </label>
            <button
              className="btn btn-outline"
              disabled={categoryMutation.isPending}
              type="submit"
            >
              <Save /> {categoryMutation.isPending ? '저장 중' : '정보 저장'}
            </button>
          </form>
          <p>선택형 질문과 직접 입력 항목을 조합해 요청서를 구성합니다.</p>
          {categoryFeedback && (
            <em className="admin-form-designer__category-feedback" role="alert">
              {categoryFeedback}
            </em>
          )}
        </div>
        <div className="admin-form-designer__version">
          <AdminStatusBadge tone={model.draft ? 'warning' : 'success'}>
            {model.draft ? `초안 v${model.formVersion}` : model.formVersion ? `발행 v${model.formVersion}` : '폼 미등록'}
          </AdminStatusBadge>
          <span>현재 활성 버전 {model.activeVersion || '-'}</span>
          {dirty && <em>저장하지 않은 변경 있음</em>}
        </div>
        <div className="admin-form-designer__save-actions">
          {model.draft && model.formTemplateSn && (
            <button className="btn btn-danger" disabled={pending} onClick={discardDraft} type="button">
              <Trash2 /> {discardMutation.isPending ? '폐기 중' : '초안 폐기'}
            </button>
          )}
          <button className="btn btn-outline" disabled={pending || !dirty} onClick={saveDraft} type="button">
            <Save /> {saveMutation.isPending ? '저장 중' : '초안 저장'}
          </button>
          <button className="btn btn-primary" disabled={pending || !model.draft || dirty} onClick={publish} type="button">
            <Send /> {publishMutation.isPending ? '발행 중' : '발행하기'}
          </button>
        </div>
      </section>

      {feedback && <p className="admin-form-designer__feedback" role="alert">{feedback}</p>}

      <div className="admin-form-designer__layout">
        <main className="admin-form-designer__editor">
          <section className="card admin-form-designer__meta">
            <label>
              <span>카테고리 안내 문구</span>
              <input
                maxLength="300"
                onChange={(event) => update((next) => { next.subtitle = event.target.value; })}
                placeholder="예: 필요한 내용을 단계별로 알려주세요."
                value={model.subtitle}
              />
            </label>
          </section>

          <div className="admin-form-designer__toolbar">
            <div>
              <strong>질문 구성</strong>
              <span>총 {model.steps.length}단계</span>
            </div>
            <div>
              <button className="btn btn-outline" onClick={() => addStep('SINGLE')} type="button">
                <ListChecks /> 선택형 질문
              </button>
              <button className="btn btn-outline" onClick={() => addStep('FORM')} type="button">
                <FileInput /> 입력형 질문
              </button>
            </div>
          </div>

          {model.steps.length === 0 && (
            <div className="card admin-form-designer__empty">
              <CirclePlus />
              <strong>첫 질문을 추가해 주세요.</strong>
              <p>카드 중 하나를 고르는 질문이나 직접 내용을 입력하는 질문으로 시작할 수 있습니다.</p>
            </div>
          )}
          <div className="admin-form-designer__steps">
            {model.steps.map((step, stepIndex) => (
              <StepEditor
                index={stepIndex}
                key={step.stepKey}
                onChange={(mutator) => updateStep(stepIndex, mutator)}
                onMove={(direction) => moveStep(stepIndex, direction)}
                onRemove={() => removeStep(stepIndex)}
                open={Boolean(openSteps[step.stepKey])}
                setOpen={(open) => setOpenSteps((current) => ({ ...current, [step.stepKey]: open }))}
                step={step}
                steps={model.steps}
              />
            ))}
          </div>

          <div className="card admin-form-designer__guide">
            <CheckCircle2 />
            <div>
              <strong>발행 전 확인</strong>
              <p>초안 저장 시 질문 분기, 순환 연결, 중복 키와 주소 보호 정책을 서버에서 다시 검사합니다.</p>
            </div>
          </div>
        </main>
        <FormPreview model={{ ...model, categoryName: categoryForm.name }} />
      </div>
      <AdminHistoryTimeline referenceSn={categorySn} referenceType="CATEGORY" />
    </div>
  );
};

const AdminServiceRequestFormPage = () => {
  const { categorySn } = useParams();
  const formQuery = useAdminServiceRequestForm(categorySn);

  if (formQuery.isLoading) {
    return <div className="admin-content-page"><div className="admin-content-state">폼 구성을 불러오는 중입니다.</div></div>;
  }
  if (formQuery.isError || !formQuery.data) {
    return <div className="admin-content-page"><div className="admin-content-state is-error">견적 요청 폼을 불러오지 못했습니다.</div></div>;
  }

  const response = formQuery.data;
  const editorKey = [
    response.form?.formTemplateSn || 'new',
    response.form?.formVersion || 0,
    response.activeVersion || 0,
    response.draft ? 'draft' : 'active',
  ].join('-');
  return (
    <AdminServiceRequestFormEditor
      categorySn={categorySn}
      initialResponse={response}
      key={editorKey}
    />
  );
};

export default AdminServiceRequestFormPage;

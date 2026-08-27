// 담당자 7: F-SVC-002 서버 동적 폼 응답을 기존 아코디언 위저드 구조로 변환한다.

function parseMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function toFieldType(type) {
  return String(type || '').toLowerCase().replaceAll('_', '-');
}

// 단계 고정키는 템플릿 안에서만 유일하다. 화면 상태에서는 템플릿 번호를 붙여
// 여러 카테고리의 budget/memo 단계나 과거 폼 버전이 서로 덮어쓰지 않게 한다.
function toStepId(formTemplateSn, stepKey) {
  return `${formTemplateSn}__${stepKey}`;
}

export function buildServiceRequestWizardCatalog(forms = []) {
  const steps = {};
  const categoryNextStep = {};
  const categoryMeta = {};
  const formByCategorySn = {};
  const formByTemplateSn = {};

  forms.forEach(form => {
    const catKey = String(form.catSn);
    const firstStepId = toStepId(form.formTemplateSn, form.firstStepKey);
    const mappedForm = { ...form, firstStepId };
    formByTemplateSn[String(form.formTemplateSn)] = mappedForm;

    // 활성 폼 목록을 먼저 전달하므로 같은 카테고리의 과거 버전은 신규 작성용 맵을 덮지 않는다.
    if (!formByCategorySn[catKey]) {
      categoryNextStep[form.catNm] = firstStepId;
      categoryMeta[form.catNm] = {
        sub: form.subtitle,
        color: parseMeta(form.uiMetaJson).color,
        formTemplateSn: form.formTemplateSn,
      };
      formByCategorySn[catKey] = mappedForm;
    }

    (form.steps || []).forEach(step => {
      const stepId = toStepId(form.formTemplateSn, step.stepKey);
      const fields = (step.fields || []).map(field => {
        const meta = parseMeta(field.uiMetaJson);
        const options = (field.options || []).map(option => ({
          optionSn: option.optionSn,
          optionKey: option.optionKey,
          value: option.value,
          label: option.label,
        }));
        return {
          ...meta,
          fieldSn: field.fieldSn,
          fieldKey: field.fieldKey,
          key: field.label,
          type: toFieldType(field.type),
          placeholder: field.placeholder,
          desc: field.description,
          tooltip: field.description,
          required: field.requiredYn === 'Y',
          requireDigit: field.requireDigitYn === 'Y',
          sensitiveYn: field.sensitiveYn,
          publicYn: field.publicYn,
          maxSelections: field.maxSelections,
          options: options.map(option => option.label),
          optionDefs: options,
          rules: field.rules || [],
        };
      });

      steps[stepId] = {
        formTemplateSn: form.formTemplateSn,
        stepSn: step.stepSn,
        stepKey: step.stepKey,
        title: step.title,
        desc: step.description,
        type: String(step.type || '').toLowerCase(),
        next: step.nextStepKey
          ? toStepId(form.formTemplateSn, step.nextStepKey)
          : null,
        // 기존 화면의 평수·거주 인원 2열 배치는 표시 규칙이며 질문 데이터와 분리해 유지한다.
        layout: step.stepKey === 'mv_size' ? 'row' : undefined,
        publicYn: step.publicYn,
        sensitiveYn: step.sensitiveYn,
        options: (step.options || []).map(option => ({
          optionSn: option.optionSn,
          optionKey: option.optionKey,
          value: option.value,
          label: option.label,
          sub: option.subtitle,
          next: option.nextStepKey
            ? toStepId(form.formTemplateSn, option.nextStepKey)
            : undefined,
        })),
        fields,
      };
    });
  });

  Object.values(steps).forEach(step => {
    step.fields.forEach(field => {
      field.rules.forEach(rule => {
        if (rule.action === 'HIDE' && rule.operator === 'EQUALS' && rule.sourceStepKey) {
          const sourceStepId = toStepId(step.formTemplateSn, rule.sourceStepKey);
          const sourceOption = steps[sourceStepId]?.options
            ?.find(option => option.value === rule.compareValue);
          if (sourceOption) {
            field.hideWhen = { step: sourceStepId, equals: sourceOption.label };
          }
        }
        if (rule.action === 'DISABLE' && rule.operator === 'NOT_EMPTY' && rule.sourceFieldLabel) {
          field.disabledWhenFilled = rule.sourceFieldLabel;
        }
      });
    });
  });

  return {
    steps,
    categoryNextStep,
    categoryMeta,
    formByCategorySn,
    formByTemplateSn,
  };
}

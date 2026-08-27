let sequence = 0;

const nextKey = (prefix) => {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}`;
};

const yn = (value) => value === 'Y';

export const FIELD_TYPE_OPTIONS = [
  { value: 'TEXT', label: '짧은 답변' },
  { value: 'NUMBER', label: '숫자 입력' },
  { value: 'TEXTAREA', label: '긴 답변' },
  { value: 'CHOICE', label: '선택 카드' },
  { value: 'SELECT', label: '목록 선택' },
  { value: 'ADDRESS', label: '주소 검색' },
  { value: 'REGION', label: '지역 선택' },
  { value: 'AMOUNT_TOGGLE', label: '금액 입력' },
];

export const createOption = () => ({
  optionKey: nextKey('option'),
  value: nextKey('value'),
  label: '새 선택지',
  subtitle: '',
  nextStepKey: '',
});

export const createField = () => ({
  fieldKey: nextKey('field'),
  label: '새 입력 항목',
  type: 'TEXT',
  placeholder: '',
  description: '',
  required: true,
  requireDigit: false,
  sensitive: false,
  maxSelections: null,
  uiMetaJson: '',
  options: [],
  rules: [],
});

export const createStep = (kind) => {
  const stepKey = nextKey('step');
  if (kind === 'FORM') {
    return {
      stepKey,
      title: '새 입력 질문',
      description: '',
      type: 'FORM',
      nextStepKey: '',
      options: [],
      fields: [createField()],
    };
  }
  return {
    stepKey,
    title: '새 선택 질문',
    description: '',
    type: 'SINGLE',
    nextStepKey: '',
    options: [createOption()],
    fields: [],
  };
};

const mapRule = (rule = {}) => ({
  sourceStepKey: rule.sourceStepKey || rule.sourceFieldStepKey || '',
  sourceFieldKey: rule.sourceFieldKey || '',
  compareValue: rule.compareValue || '',
  operator: rule.operator || 'EQUALS',
  action: rule.action || 'HIDE',
});

const mapOption = (option = {}) => ({
  optionKey: option.optionKey || nextKey('option'),
  value: option.value || nextKey('value'),
  label: option.label || '',
  subtitle: option.subtitle || '',
  nextStepKey: option.nextStepKey || '',
});

const mapField = (field = {}) => ({
  fieldKey: field.fieldKey || nextKey('field'),
  label: field.label || '',
  type: field.type === 'TEXT' && field.requireDigitYn === 'Y' ? 'NUMBER' : field.type,
  placeholder: field.placeholder || '',
  description: field.description || '',
  required: yn(field.requiredYn),
  requireDigit: yn(field.requireDigitYn),
  sensitive: yn(field.sensitiveYn),
  maxSelections: field.maxSelections ?? null,
  uiMetaJson: field.uiMetaJson || '',
  options: (field.options || []).map(mapOption),
  rules: (field.rules || []).map(mapRule),
});

const mapStep = (step = {}) => ({
  stepKey: step.stepKey || nextKey('step'),
  title: step.title || '',
  description: step.description || '',
  type: step.type || 'SINGLE',
  nextStepKey: step.nextStepKey || '',
  options: (step.options || []).map(mapOption),
  fields: (step.fields || []).map(mapField),
});

export const toEditorModel = (response) => ({
  categorySn: response?.categorySn,
  categoryName: response?.categoryName || '',
  categoryActive: Boolean(response?.categoryActive),
  activeVersion: response?.activeVersion || 0,
  draft: Boolean(response?.draft),
  formTemplateSn: response?.form?.formTemplateSn || null,
  formVersion: response?.form?.formVersion || null,
  subtitle: response?.form?.subtitle || '',
  uiMetaJson: response?.form?.uiMetaJson || '',
  steps: (response?.form?.steps || []).map(mapStep),
});

const payloadOption = (option) => ({
  optionKey: option.optionKey,
  value: option.value,
  label: option.label,
  subtitle: option.subtitle || null,
  nextStepKey: option.nextStepKey || null,
});

const payloadField = (field) => ({
  fieldKey: field.fieldKey,
  label: field.label,
  type: field.type === 'NUMBER' ? 'TEXT' : field.type,
  placeholder: field.placeholder || null,
  description: field.description || null,
  required: Boolean(field.required),
  requireDigit: field.type === 'NUMBER' || Boolean(field.requireDigit),
  sensitive: field.type === 'ADDRESS' || Boolean(field.sensitive),
  maxSelections: field.type === 'REGION' ? field.maxSelections || null : null,
  uiMetaJson: field.uiMetaJson || null,
  options: (field.options || []).map(payloadOption),
  rules: (field.rules || []).map((rule) => ({
    sourceStepKey: rule.sourceStepKey || null,
    sourceFieldKey: rule.sourceFieldKey || null,
    compareValue: rule.compareValue || null,
    operator: rule.operator,
    action: rule.action,
  })),
});

export const toDraftPayload = (model) => ({
  subtitle: model.subtitle || null,
  uiMetaJson: model.uiMetaJson || null,
  steps: model.steps.map((step) => ({
    stepKey: step.stepKey,
    title: step.title,
    description: step.description || null,
    type: step.type,
    nextStepKey: step.nextStepKey || null,
    options: (step.options || []).map(payloadOption),
    fields: (step.fields || []).map(payloadField),
  })),
});

export const changeFieldType = (field, nextType) => {
  field.type = nextType;
  field.requireDigit = nextType === 'NUMBER';
  if (nextType === 'CHOICE' || nextType === 'SELECT') {
    if (!field.options.length) field.options.push(createOption());
  } else {
    field.options = [];
  }
  if (nextType === 'ADDRESS') {
    field.sensitive = true;
  }
  field.maxSelections = nextType === 'REGION' ? (field.maxSelections || 3) : null;
};

export const changeStepType = (step, nextType) => {
  step.type = nextType;
  if (nextType === 'FORM') {
    step.options = [];
    if (!step.fields.length) step.fields.push(createField());
  } else {
    step.fields = [];
    if (!step.options.length) step.options.push(createOption());
  }
};

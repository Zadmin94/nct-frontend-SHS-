// 담당자 7: 원장 영속 문구는 정본 계약을 유지하고 화면 단위만 P로 통일한다.
export const formatPointLedgerReason = (reason) => {
  if (typeof reason !== 'string') return reason;
  return reason.replaceAll('(수수료 0원)', '(수수료 0P)');
};

export const reasonSummary = (reason) => {
  const displayReason = formatPointLedgerReason(reason);
  if (!displayReason) return displayReason;
  const colonIndex = displayReason.indexOf(':');
  const truncated = colonIndex === -1 ? displayReason : displayReason.slice(0, colonIndex);
  return truncated.replace(/\s*\(정산번호\s*\d+\)/g, '').trim();
};

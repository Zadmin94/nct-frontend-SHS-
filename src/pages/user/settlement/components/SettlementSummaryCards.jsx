// src/pages/user/settlement/components/SettlementSummaryCards.jsx

/**
 * 정산 요약 카드 3종 (대기 / 보류 / 완료) — 목업 18_settlement.html의 grid-3 기준
 * 집계는 백엔드에 별도 API 없이 목록 응답을 그대로 합산해서 화면에서 계산한다
 */
const SettlementSummaryCards = ({ rows }) => {
  const summarize = (statusName) => {
    const filtered = rows.filter((r) => r.statusName === statusName);
    return {
      count: filtered.length,
      amount: filtered.reduce((sum, r) => sum + r.amount, 0),
    };
  };

  const cards = [
    { label: '정산 대기', ...summarize('대기'), bg: 'bg-amber-50', text: 'text-amber-700' },
    { label: '정산 보류', ...summarize('보류'), bg: 'bg-red-50', text: 'text-red-700' },
    { label: '정산 완료', ...summarize('완료'), bg: 'bg-blue-50', text: 'text-blue-700' },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} border border-gray-100 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)]`}
        >
          <h3 className="text-base font-bold text-gray-900 m-0">{card.label}</h3>
          <p className={`text-2xl font-bold mt-2 mb-0 ${card.text}`}>
            {card.count}건 / {card.amount.toLocaleString()}P
          </p>
        </div>
      ))}
    </section>
  );
};

export default SettlementSummaryCards;

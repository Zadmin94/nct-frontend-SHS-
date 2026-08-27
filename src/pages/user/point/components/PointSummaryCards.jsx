// src/pages/user/point/components/PointSummaryCards.jsx
import iconPoint from '@assets/img/icon_point.png';

// 담당자 7: 렌더링마다 컴포넌트가 다시 생성되지 않도록 파일 수준에 둔다.
const InfoTooltip = ({ text, compact = false }) => (
  <span className="group/tip relative inline-flex shrink-0 cursor-default">
    <span
      className={
        compact
          ? 'flex h-3 w-3 items-center justify-center rounded-full border border-white/70 text-[8px] font-bold leading-none text-white/90'
          : 'flex h-4 w-4 items-center justify-center rounded-full border border-white/70 text-[10px] font-bold leading-none text-white/90'
      }
    >
      ?
    </span>
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-[220px] -translate-x-1/2 whitespace-normal rounded-lg border border-[#e2e1dc] bg-white px-3 py-1.5 text-xs font-normal text-[#3b3a36] shadow-md opacity-0 transition-opacity group-hover/tip:opacity-100">
      {text}
    </span>
  </span>
);

/**
 * 포인트 잔액 요약 카드 4종 — 총 보유 + 실제 버킷 3개(사용가능/홀딩/정산가능) (2026-08-04 재정리)
 * 예전엔 총보유/사용가능/전환가능(정산가능)/환전가능(사용가능+정산가능 합) 조합이었는데,
 * 환전가능이 이미 다른 카드에 들어간 값을 또 합친 파생값이라 "왜 겹쳐 보이지" 혼란을 줬다.
 * 이제 4칸은 겹치지 않는다 — 총 보유 하나만 나머지 3개(사용가능+홀딩+정산가능)의 합이고,
 * 나머지 3개는 서로 배타적인 실제 버킷이다. 라벨도 포인트 내역 표의 "유형" 배지와 같은
 * 이름(사용가능/홀딩/정산가능)을 그대로 써서 화면마다 같은 돈을 다른 이름으로 부르지 않게 했다.
 * "전환 가능"이라는 문구는 뺐다 — 그 동작은 옆의 전환 버튼이 이미 말해주고 있어 카드까지
 * 반복할 필요가 없었고, 결국 부제 문구 자체를 4칸 다 빼는 게 여백도 맞고 더 깔끔했다(사용자 결정).
 * 환전 가능(파생 합계)은 요약 카드에서 빠졌다 — 필요하면 환전 버튼/모달 쪽에 다시 붙일 수 있다.
 * 총 보유는 서버가 내려준 total을 그대로 쓴다 — 헤더와 같은 출처(서버 원장 SUM 단일 진실)라
 * "총 보유"의 정의가 바뀌어도 화면끼리 숫자가 어긋날 수 없다 (프론트 재계산 제거, 2026-07-20)
 * 카드 스타일은 마이페이지 대시보드(MyPageDashboard StatCard)와 톤을 맞췄다 (2026-07-24)
 * 홀딩/정산가능은 부제 문구 없이는 뜻이 안 와닿는다는 지적(2026-08-13)으로, 라벨 옆에 "?" 아이콘
 * + 호버 툴팁을 붙였다 — 카드 여백은 그대로 유지하면서 필요할 때만 설명이 뜨게 한다. 아이콘
 * 스타일은 ServiceRequestFormPage.jsx의 필드 툴팁 패턴을 재사용했다(카드 배경이 항상 색이 있는
 * 진한 톤이라 배지 테두리/글자만 흰색 계열로 바꿈, 팝업 박스 자체는 원본처럼 흰 배경 유지).
 */
const PointSummaryCards = ({ balance }) => {
  const cards = [
    {
      label: '총 보유 포인트',
      value: balance.total,
      color: '#0064ff',
      tooltip: '사용 가능·홀딩·정산가능 포인트를 모두 합한 전체 보유량입니다.',
    },
    {
      label: '사용 가능 포인트',
      value: balance.available,
      color: '#005eb5',
      tooltip: '충전·전환 등을 통해 지금 바로 사용할 수 있는 포인트입니다.',
    },
    {
      label: '홀딩 포인트',
      value: balance.hold,
      color: '#776bf8',
      tooltip: '입찰 등으로 묶여 있어 아직 사용할 수 없는 포인트입니다.',
    },
    {
      label: '정산가능 포인트',
      value: balance.settleable,
      color: '#d97706',
      tooltip: '판매대금으로 받았지만, 아직 사용 가능 포인트로 전환하지 않은 금액입니다.',
    },
  ];

  const [hero, ...rest] = cards;

  return (
    <section>
      {/* 모바일: 총 보유만 큰 히어로 카드로, 나머지 3개는 작은 타일로 — 첫 화면이 카드 4개로
          다 차서 스크롤이 길어진다는 지적에 따라 위계를 나눔 (사용자 결정, 2026-08-03) */}
      <div className="sm:hidden">
        <div className="rounded-[10px] text-white p-5 mb-2.5" style={{ backgroundColor: hero.color }}>
          <div className="flex items-start gap-3">
            <img src={iconPoint} alt="" className="size-[36px] object-contain shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-[14px] opacity-90 leading-tight m-0 flex items-center gap-1">
                {hero.label}
                {hero.tooltip && <InfoTooltip text={hero.tooltip} compact />}
              </p>
              <p className="font-bold text-[26px] leading-tight mt-0.5 mb-0">{hero.value.toLocaleString()} P</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {rest.map((card) => (
            <div key={card.label} className="rounded-xl text-white p-3" style={{ backgroundColor: card.color }}>
              <p className="font-bold text-[11px] opacity-85 leading-tight whitespace-nowrap m-0 flex items-center gap-1">
                {card.label.replace(' 포인트', '').replace(' 가능', '가능')}
                {card.tooltip && <InfoTooltip text={card.tooltip} compact />}
              </p>
              <p className="font-bold text-[16px] leading-tight mt-1 mb-0">{card.value.toLocaleString()}P</p>
            </div>
          ))}
        </div>
      </div>

      {/* sm 이상(태블릿·데스크톱)은 기존처럼 4개 균등 카드 그리드 그대로 유지 */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[10px] text-white p-5"
            style={{ backgroundColor: card.color }}
          >
            <div className="flex items-start gap-3">
              <img src={iconPoint} alt="" className="size-[40px] object-contain shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-[16px] opacity-90 leading-tight m-0 flex items-center gap-1.5">
                  {card.label}
                  {card.tooltip && <InfoTooltip text={card.tooltip} />}
                </p>
                <p className="font-bold text-[30px] leading-tight mt-0.5 mb-0">{card.value.toLocaleString()} P</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PointSummaryCards;

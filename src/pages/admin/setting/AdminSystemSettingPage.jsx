// Claude Code 작성 (BJN, 2026-07-18)
// 관리자 시스템 설정 화면 (담당자6 BJN, F-OPS-024 — 목업 30_system_settings 기준)
// - SYSTEM_SETTING 단일 행을 조회해 폼에 채우고, 저장 시 전체 덮어쓰기로 보낸다
// - 허용 범위 검증은 서버가 최종 판정 — 실패하면 서버 메시지를 그대로 보여주고 아무것도 저장되지 않는다
// - 저장 성공 시 "무엇이 바뀌었는지" 감사로그가 자동으로 남는다 (감사 로그 화면에서 확인 가능)
// - 카테고리 승인방식은 seed 고정 기준이라 이 화면에서 다루지 않는다 (정본 규칙)
import { useState } from 'react';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import FormSkeleton from '@components/skeleton/FormSkeleton';
import { useSystemSetting, useUpdateSystemSetting } from '@hooks/useAdminSystemSetting';
import { toast } from '@utils/common';
import '../audit/adminAuditPage.css';

// datetime-local 입력이 받는 형식(YYYY-MM-DDTHH:mm)으로 서버 일시 값을 자른다
const toLocalInput = (value) => (value ? value.slice(0, 16) : '');

const AdminSystemSettingPage = () => {
  const settingQuery = useSystemSetting();
  const updateSetting = useUpdateSystemSetting();

  // 사용자가 고친 값만 상태로 두고, 화면 값은 "편집값 → 서버값" 순서로 그때그때 계산한다
  // (알림 설정 화면과 같은 파생 방식 — 서버값을 상태로 복사하는 useEffect를 두지 않는다)
  const [edits, setEdits] = useState({});
  const setting = settingQuery.data;
  const view = { ...setting, ...edits };

  const change = (name, value) => setEdits((prev) => ({ ...prev, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    updateSetting.mutate({
      ...view,
      // 숫자 입력은 문자열로 들어오므로 서버 계약 타입에 맞춰 변환한다
      aucExtMin: Number(view.aucExtMin),
      aucExtMaxCnt: Number(view.aucExtMaxCnt),
      trdCfmnDays: Number(view.trdCfmnDays),
      minChrgAmt: Number(view.minChrgAmt),
      maxChrgAmt: Number(view.maxChrgAmt),
      svcFeeRate: Number(view.svcFeeRate),
      qutExpDays: Number(view.qutExpDays),
      // 담당자 7 · REQ-OPS-011: 자동 위험 이벤트 생성 기준
      riskTradeReportCount: Number(view.riskTradeReportCount),
      riskTradeReportWindowMinutes: Number(view.riskTradeReportWindowMinutes),
      riskSettlementHoldDays: Number(view.riskSettlementHoldDays),
      riskRepeatReportCount: Number(view.riskRepeatReportCount),
      riskRepeatReportWindowDays: Number(view.riskRepeatReportWindowDays),
      riskAdminLoginFailCount: Number(view.riskAdminLoginFailCount),
      riskAdminLoginFailWindowMinutes: Number(view.riskAdminLoginFailWindowMinutes),
      // 점검 모드를 끄면 기간은 보내지 않는다 (서버는 Y일 때만 기간을 요구한다)
      mntncBgngDt: view.mntncYn === 'Y' ? view.mntncBgngDt || null : null,
      mntncEndDt: view.mntncYn === 'Y' ? view.mntncEndDt || null : null,
    }, {
      onSuccess: () => {
        setEdits({});
        toast({ icon: 'success', title: '시스템 설정이 저장되었습니다.', timer: 1800 });
      }, // 저장 성공 — 이후 화면 값은 재조회된 서버값을 따른다
    });
  };

  if (settingQuery.isLoading) {
    return <div className="admin-bjn-page"><FormSkeleton fields={18} /></div>;
  }
  if (settingQuery.isError || !setting) {
    return <div className="admin-bjn-page"><div className="admin-bjn-state is-error">설정 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.</div></div>;
  }

  return (
    <div className="admin-bjn-page">
      <AdminPageHeader
        title="시스템 설정"
      />

      <form className="admin-bjn-setting-form" onSubmit={submit}>
        <section className="admin-bjn-setting-section">
          <h3>경매 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              자동연장 기준 (분)
              <input type="number" min="1" value={view.aucExtMin ?? ''} onChange={(e) => change('aucExtMin', e.target.value)} />
            </label>
            <label>
              자동연장 최대횟수
              <input type="number" min="0" value={view.aucExtMaxCnt ?? ''} onChange={(e) => change('aucExtMaxCnt', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="admin-bjn-setting-section">
          <h3>거래 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              거래 상대방 확인 기한 (일)
              <input type="number" min="1" value={view.trdCfmnDays ?? ''} onChange={(e) => change('trdCfmnDays', e.target.value)} />
            </label>
            <label>
              자동 완료 처리 여부
              <select value={view.autoCmplYn ?? 'Y'} onChange={(e) => change('autoCmplYn', e.target.value)}>
                <option value="Y">사용</option>
                <option value="N">사용 안 함</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-bjn-setting-section">
          <h3>견적 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              견적 기본 유효기간 (일)
              <input type="number" min="1" value={view.qutExpDays ?? ''} onChange={(e) => change('qutExpDays', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="admin-bjn-setting-section">
          <h3>포인트 / 수수료 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              최소 충전 포인트 (P)
              <input type="number" min="1" value={view.minChrgAmt ?? ''} onChange={(e) => change('minChrgAmt', e.target.value)} />
            </label>
            <label>
              최대 충전 포인트 (P)
              <input type="number" min="1" value={view.maxChrgAmt ?? ''} onChange={(e) => change('maxChrgAmt', e.target.value)} />
            </label>
            <label>
              서비스 수수료율 (0~1, 예: 0.03 = 3%)
              <input type="number" min="0" max="1" step="0.0001" value={view.svcFeeRate ?? ''} onChange={(e) => change('svcFeeRate', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="admin-bjn-setting-section">
          <h3>리스크 판정 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              거래 신고 급증 기준 (건)
              <input type="number" min="1" value={view.riskTradeReportCount ?? ''} onChange={(e) => change('riskTradeReportCount', e.target.value)} />
            </label>
            <label>
              거래 신고 집계 구간 (분)
              <input type="number" min="1" value={view.riskTradeReportWindowMinutes ?? ''} onChange={(e) => change('riskTradeReportWindowMinutes', e.target.value)} />
            </label>
            <label>
              정산 장기보류 기준 (일)
              <input type="number" min="1" value={view.riskSettlementHoldDays ?? ''} onChange={(e) => change('riskSettlementHoldDays', e.target.value)} />
            </label>
            <label>
              반복 신고 기준 신고자 수 (명)
              <input type="number" min="1" value={view.riskRepeatReportCount ?? ''} onChange={(e) => change('riskRepeatReportCount', e.target.value)} />
            </label>
            <label>
              반복 신고 집계 구간 (일)
              <input type="number" min="1" value={view.riskRepeatReportWindowDays ?? ''} onChange={(e) => change('riskRepeatReportWindowDays', e.target.value)} />
            </label>
            <label>
              관리자 로그인 실패 기준 (회)
              <input type="number" min="1" value={view.riskAdminLoginFailCount ?? ''} onChange={(e) => change('riskAdminLoginFailCount', e.target.value)} />
            </label>
            <label>
              관리자 로그인 실패 집계 구간 (분)
              <input type="number" min="1" value={view.riskAdminLoginFailWindowMinutes ?? ''} onChange={(e) => change('riskAdminLoginFailWindowMinutes', e.target.value)} />
            </label>
          </div>
        </section>

        <section className="admin-bjn-setting-section">
          <h3>운영 설정</h3>
          <div className="admin-bjn-setting-grid">
            <label>
              이메일 발송 활성화
              <select value={view.emailYn ?? 'Y'} onChange={(e) => change('emailYn', e.target.value)}>
                <option value="Y">사용</option>
                <option value="N">사용 안 함</option>
              </select>
            </label>
            <label>
              점검 모드
              <select value={view.mntncYn ?? 'N'} onChange={(e) => change('mntncYn', e.target.value)}>
                <option value="N">꺼짐</option>
                <option value="Y">켜짐</option>
              </select>
            </label>
            {view.mntncYn === 'Y' && (
              <>
                <label>
                  점검 시작 일시
                  <input type="datetime-local" value={toLocalInput(view.mntncBgngDt)} onChange={(e) => change('mntncBgngDt', e.target.value)} />
                </label>
                <label>
                  점검 종료 일시
                  <input type="datetime-local" value={toLocalInput(view.mntncEndDt)} onChange={(e) => change('mntncEndDt', e.target.value)} />
                </label>
              </>
            )}
          </div>
        </section>

        <div className="admin-bjn-setting-actions">
          <button type="submit" disabled={updateSetting.isPending}>
            {updateSetting.isPending ? '저장 중…' : '설정 저장'}
          </button>
          {updateSetting.isError && (
            <span className="is-error">
              {updateSetting.error?.response?.data?.message ?? '저장에 실패했습니다.'}
            </span>
          )}
        </div>
      </form>
      <AdminHistoryTimeline referenceSn={setting.sysSetSn} referenceType="SYSTEM_SETTING" />
    </div>
  );
};

export default AdminSystemSettingPage;

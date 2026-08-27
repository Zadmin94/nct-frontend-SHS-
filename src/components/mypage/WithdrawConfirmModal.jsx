// src/components/mypage/WithdrawConfirmModal.jsx
// @ai_generated: F-AUTH-011/POL-AUTH-013 - 마이페이지 프로필 화면에서 여는 활성 계정 탈퇴
// 확인 모달. 비밀번호 재확인 후 기존 withdrawActive API를 호출한다. 백엔드가 하드 차단
// 조건(포인트 잔액·진행 중 거래·경매·신고)에 걸리면 WITHDRAWAL_BLOCKED(409)와 함께 사유를
// 하나의 문자열 메시지로 내려주므로, 그 메시지를 그대로 보여준다(별도 파싱 없음).
import { useState } from "react";
import { withdrawActive } from "@api/memberApi";
import { useAuth } from "@hooks/useAuth";
import { ActionButton } from "@components/common/ui";

// @ai_generated: passwordChangeable=false(소셜 전용 계정)면 비밀번호 입력란 없이 확인만 받고
// 바로 진행한다(A안, 2026-08-12 사용자 결정) - 백엔드가 시스템 생성 로그인ID면 비밀번호
// 검증 자체를 건너뛰므로 빈 문자열을 그대로 보낸다.
export default function WithdrawConfirmModal({ open, onClose, passwordChangeable = true }) {
  const { localLogout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (submitting) return;
    setPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordChangeable && !password) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await withdrawActive(passwordChangeable ? password : "");
      // 서버가 리프레시 토큰을 무효화했으므로 로그아웃 API 호출 없이 로컬 상태만 정리한다
      // (ChangePassword 성공 흐름과 동일 패턴).
      localLogout();
    } catch (err) {
      const msg = err?.response?.data?.message || "탈퇴 처리에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal open"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal-box">
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          회원 탈퇴
        </h2>
        <p style={{ fontSize: 14, color: "#767676", marginBottom: 16, textAlign: "center", wordBreak: "keep-all" }}>
          탈퇴 시 계정이 즉시 비활성화되며 되돌릴 수 없습니다.
          {passwordChangeable ? (
            <>
              <br />계속하려면 현재 비밀번호를 입력해주세요.
            </>
          ) : (
            <>
              <br />소셜 로그인 계정입니다. 계속하려면 아래 버튼을 눌러주세요.
            </>
          )}
        </p>
        <form onSubmit={handleSubmit}>
          {passwordChangeable && (
            <input
              type="password"
              autoFocus
              className="w-full h-[40px] rounded-[5px] border border-[#d9d9d9] bg-white px-3 text-[14px] text-[#404040] focus:outline-none focus:border-[#0064ff]"
              placeholder="현재 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          )}
          {error && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#a32d2d", whiteSpace: "pre-line", wordBreak: "keep-all" }}>
              {error}
            </p>
          )}
          <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 20 }}>
            <ActionButton onClick={handleClose} disabled={submitting} tone="neutral">
              취소
            </ActionButton>
            <ActionButton type="submit" disabled={submitting} tone="danger">
              {submitting ? "처리 중..." : "탈퇴하기"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}

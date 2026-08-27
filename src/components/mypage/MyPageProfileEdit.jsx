// src/components/mypage/MyPageProfileEdit.jsx
// Figma: mypage_01일반_프로필수정(node 28:12) CONTENTS 구간("프로필수정" 탭).
// - 절대좌표 → 반응형 전환.
//   메인 폼(좌)/소셜+알림(우) → xl 이상 가로 배치, 그 이하 세로 스택.
//   폼 내부 필드: sm 이상 2열 그리드, 그 이하 단일 열.
import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import DaumPostcode from "react-daum-postcode";
import { toast, confirm } from "@utils/common";
import { formatPhoneNumber, toPhoneDigits } from "@utils/phoneNumber";
import AlertModal from "@components/common/AlertModal";
import { ActionButton } from "@components/common/ui";
import { assets } from "@components/mypage/assets";
import { updateProfile, changePassword, getOauthLinks, unlinkOauth } from "@api/memberApi";
import { uploadImage, toImageUrl } from "@api/fileApi";
import { useAuth } from "@hooks/useAuth";
import { isValidNewPassword, PASSWORD_POLICY_GUIDE } from "@utils/passwordPolicy";
import { MEMBER_PROFILE_QUERY_KEY, useMemberProfile } from "@hooks/useMemberProfile";
import { useNotificationSettings, useSaveNotificationSettings } from "@hooks/useNotification";
import MyPageContentHeader from "@components/mypage/MyPageContentHeader";
import MyPagePanel from "@components/mypage/MyPagePanel";
import ProfileDeliveryAddressManager from "@components/mypage/ProfileDeliveryAddressManager";
import WithdrawConfirmModal from "@components/mypage/WithdrawConfirmModal";

const DOMAIN_LABELS = [
  { key: 'AUCTION', label: '경매' },
  { key: 'TRADE',   label: '거래' },
  { key: 'CHAT',    label: '채팅' },
  { key: 'SERVICE', label: '서비스' },
  { key: 'OPS',     label: '운영' },
];

const FIELD_CLASS =
  "w-full h-[40px] rounded-[5px] border border-[#d9d9d9] bg-white px-3 text-[14px] text-[#404040] focus:outline-none focus:border-[#0064ff]";

// 백엔드 friendly key(OAuthProviderParser)와 1:1 대응. 연동 시작 URL은 로그인용과 동일한
// registrationId에 "-link" 접미사만 붙는다(SecurityConfig.oauthLinkFilterChain).
const SOCIAL_PROVIDERS = [
  { key: "google", label: "구글" },
  { key: "naver", label: "네이버" },
  { key: "kakao", label: "카카오" },
];

const MYPAGE_LINK_RETURN_KEY = "mypageLinkReturn";

export default function MyPageProfileEdit({ user, showHeader = true }) {
  const queryClient = useQueryClient();
  const { localLogout } = useAuth();
  const [form, setForm] = useState({
    nickname: user?.nickname || "",
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
    phone: "",
    zip: "",
    address: "",
    addressDetail: "",
    profileFileSn: null,
    bankName: "",
    accountNo: "",
  });
  const [passwordVisibility, setPasswordVisibility] = useState({ currentPassword: false, newPassword: false, newPasswordConfirm: false });
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const photoInputRef = useRef(null);
  const notifyQuery = useNotificationSettings();
  const notifyMutation = useSaveNotificationSettings();
  const [notifyEdits, setNotifyEdits] = useState(null);
  const [openDomains, setOpenDomains] = useState(new Set());
  const [saveAlertOpen, setSaveAlertOpen] = useState(false);
  const [profileSaveAlertOpen, setProfileSaveAlertOpen] = useState(false);
  const [photoUploadAlertOpen, setPhotoUploadAlertOpen] = useState(false);
  // @ai_generated: F-AUTH-011/POL-AUTH-013 - 회원 탈퇴 버튼 신설(ISS-026)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const serverEvents = notifyQuery.data?.events ?? [];
  const notifyEvents = notifyEdits ?? serverEvents;

  // ISS-022: 전화번호·주소는 로그인 응답(user)에 없어 마이페이지 전용 조회 API로 초기값을 채운다.
  const profileQuery = useMemberProfile();
  useEffect(() => {
    if (!profileQuery.data) return;
    // 편집 가능한 폼을 비동기 조회 결과로 1회 초기화하는 표준 패턴이다(값 자체를 렌더링에 쓰는
    // 게 아니라 이후 사용자 입력의 시작값으로만 씀).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      phone: formatPhoneNumber(profileQuery.data.phone || ""),
      zip: profileQuery.data.zip || "",
      address: profileQuery.data.address || "",
      addressDetail: profileQuery.data.addressDetail || "",
      profileFileSn: profileQuery.data.profileFileSn ?? null,
      bankName: profileQuery.data.bankName || "",
      accountNo: profileQuery.data.accountNo || "",
    }));
  }, [profileQuery.data]);

  // ISS-022: 소셜 로그인 전용 계정(백엔드 getProfile의 passwordChangeable)은 실제 아는 비밀번호가
  // 없어 변경이 불가능하다. 데이터 도착 전 깜빡임을 피하려고 로딩 중엔 기본 true로 둔다.
  const passwordChangeable = profileQuery.data?.passwordChangeable ?? true;

  const handlePasswordFieldBlocked = () => {
    if (passwordChangeable) return;
    toast({ icon: "info", title: "소셜 로그인으로 가입한 계정은 비밀번호를 생성·저장할 수 없습니다." });
  };

  const oauthLinksQuery = useQuery({
    queryKey: ["member", "oauthLinks"],
    queryFn: () => getOauthLinks().then((res) => res.data),
  });
  const linkedProviders = new Set((oauthLinksQuery.data ?? []).map((link) => link.provider));

  const unlinkMutation = useMutation({
    mutationFn: (provider) => unlinkOauth(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", "oauthLinks"] });
      toast({ icon: "success", title: "연동이 해제되었습니다." });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "연동 해제에 실패했습니다.";
      toast({ icon: "error", title: msg });
    },
  });

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // 회원가입 화면(SignupPage)과 동일한 카카오 우편번호 API 연동 - 도로명/지번 주소와 우편번호를 함께 받는다.
  const handleAddressComplete = (data) => {
    const address = data.roadAddress || data.jibunAddress || "";
    const zip = data.zonecode || "";
    if (!address || !zip) return;
    setForm((prev) => ({ ...prev, address, zip }));
    setAddressSearchOpen(false);
  };

  // ISS-022: 파일 업로드(FileController, service='profile')만 먼저 하고 flSn을 폼에 담아둔다.
  // 실제 USERS.USR_PRFL_FL_SN 반영은 다른 필드와 함께 "저장" 버튼을 눌러야 확정된다.
  const handlePhotoButtonClick = () => photoInputRef.current?.click();

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 선택해도 change가 발생하도록 초기화
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadImage(file, "profile");
      setForm((prev) => ({ ...prev, profileFileSn: res.data.flSn }));
      setPreviewImageUrl(toImageUrl(res.data.url));
      setPhotoUploadAlertOpen(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "사진 업로드에 실패했습니다.";
      toast({ icon: "error", title: msg });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: "환전계좌를 삭제할까요?",
      text: "저장된 은행명·계좌번호가 삭제됩니다.",
      icon: "warning",
      confirmButtonText: "삭제",
    });
    if (!ok) return;
    try {
      // 담당자 7 · F-AUTH-010: 두 값을 함께 비워 보내면 서버가 암호화된 빈값이 아니라
      // 실제 미등록(NULL) 상태로 정리한다. 필수 프로필 값은 현재 저장값을 유지한다.
      await updateProfile({
        nickname: profileQuery.data?.nickname || form.nickname,
        email: profileQuery.data?.email || user?.email,
        phone: profileQuery.data?.phone || toPhoneDigits(form.phone),
        bankName: "",
        accountNo: "",
      });
      setForm((prev) => ({ ...prev, bankName: "", accountNo: "" }));
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY });
      toast({ icon: "success", title: "환전계좌가 삭제되었습니다." });
    } catch (err) {
      const msg = err?.response?.data?.message || "삭제에 실패했습니다.";
      toast({ icon: "error", title: msg });
    }
  };

  // ISS-022: 비밀번호는 나머지 필드(저장 버튼)와 별개의 독립 동작이다 - 검증 규칙이 다르고
  // 성공 시 서버가 리프레시 토큰을 무효화해 다른 필드 저장과 같은 흐름에 묶으면 혼란스럽다.
  const handleChangePassword = async () => {
    if (!passwordChangeable) {
      handlePasswordFieldBlocked();
      return;
    }
    if (!form.currentPassword || !form.newPassword || !form.newPasswordConfirm) {
      toast({ icon: "error", title: "비밀번호 항목을 모두 입력해주세요." });
      return;
    }
    if (form.newPassword !== form.newPasswordConfirm) {
      toast({ icon: "error", title: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (!isValidNewPassword(form.newPassword)) {
      toast({ icon: "error", title: PASSWORD_POLICY_GUIDE });
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        newPasswordConfirm: form.newPasswordConfirm,
      });
      toast({ icon: "success", title: "비밀번호가 변경되었습니다. 다시 로그인해주세요." });
      // 서버가 리프레시 토큰을 무효화했으므로 로그아웃 API 호출 없이 로컬 상태만 정리하고 나간다.
      setTimeout(localLogout, 1200);
    } catch (err) {
      const msg = err?.response?.data?.message || "비밀번호 변경에 실패했습니다.";
      toast({ icon: "error", title: msg });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 연동은 OAuth 핸드셰이크(리다이렉트)가 필요해 REST 호출이 아니라 페이지 이동으로 시작한다.
  // 완료 후 어디로 돌아올지는 OAuthRedirectHandler가 이 값을 읽어 사용한다.
  const handleLink = (provider) => {
    sessionStorage.setItem(MYPAGE_LINK_RETURN_KEY, "/user/mypage/profile");
    // 전체 페이지 이동(OAuth 리다이렉트)이라 useAuth.js의 로그아웃 리다이렉트와 동일한 패턴이다.
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `${import.meta.env.VITE_API_URL}/api/oauth2/authorization/${provider}-link`;
  };

  const handleUnlink = async (provider, label) => {
    const ok = await confirm({
      title: `${label} 연동을 해제할까요?`,
      text: "해제 후 다시 사용하려면 마이페이지에서 재연동해야 합니다.",
      icon: "warning",
      confirmButtonText: "해제",
    });
    if (!ok) return;
    unlinkMutation.mutate(provider);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // @ai_generated: ISS-023 - 전화번호가 선택에서 필수로 전환됐다.
    if (!form.phone.trim()) {
      toast({ icon: "error", title: "전화번호를 입력해주세요." });
      return;
    }
    const bankName = form.bankName.trim();
    const accountNo = form.accountNo.trim();
    if (Boolean(bankName) !== Boolean(accountNo)) {
      toast({ icon: "error", title: "은행명과 계좌번호를 모두 입력하거나 모두 비워주세요." });
      return;
    }
    try {
      // email은 이 화면에서 수정하지 않지만 백엔드가 필수값으로 요구해 현재 값을 그대로 함께 보낸다.
      await updateProfile({
        nickname: form.nickname,
        email: user?.email,
        phone: toPhoneDigits(form.phone),
        zip: form.zip.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim(),
        profileFileSn: form.profileFileSn,
        bankName,
        accountNo,
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      queryClient.invalidateQueries({ queryKey: MEMBER_PROFILE_QUERY_KEY });
      setPreviewImageUrl(null); // 저장 완료 후엔 서버가 내려준 profileImageUrl을 그대로 신뢰한다
      setProfileSaveAlertOpen(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "저장에 실패했습니다.";
      toast({ icon: "error", title: msg });
    }
  };

  const toggleNotify = (eventCode, channel) =>
    setNotifyEdits(notifyEvents.map((e) => e.eventCode === eventCode ? { ...e, [channel]: !e[channel] } : e));

  const isDomainAllChecked = (domainKey, channel) => {
    const evs = notifyEvents.filter((e) => e.domain === domainKey);
    return evs.length > 0 && evs.every((e) => e[channel]);
  };

  const toggleDomain = (domainKey, channel) => {
    const allChecked = isDomainAllChecked(domainKey, channel);
    setNotifyEdits(notifyEvents.map((e) =>
      e.domain === domainKey ? { ...e, [channel]: !allChecked } : e
    ));
  };

  const handleSaveNotify = () => {
    notifyMutation.mutate(
      { events: notifyEvents.map(({ eventCode, inapp, email }) => ({ eventCode, inapp, email })) },
      {
        onSuccess: () => setSaveAlertOpen(true),
        onError: (err) => {
          const msg = err?.response?.data?.message || '저장에 실패했습니다.';
          toast({ icon: 'error', title: msg });
        },
      }
    );
  };

  return (
    <>
      {showHeader && <MyPageContentHeader title="프로필" />}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
      {/* ── 메인 정보수정 카드 ── */}
      <MyPagePanel
        title="정보수정"
        className="min-w-0 flex-1"
        bodyClassName="p-0"
        variant="profile"
        headerPaddingClassName="px-6"
      >
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* 프로필 사진 */}
          <div className="flex items-center gap-4">
            <div className="size-20 rounded-full overflow-hidden bg-[#e6f0ff] shrink-0">
              <img
                src={previewImageUrl || toImageUrl(profileQuery.data?.profileImageUrl) || assets.profile}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={handlePhotoButtonClick}
              disabled={isUploadingPhoto}
              className="btn btn-ghost btn-sm"
            >
              <img src={assets.iconPhoto} alt="" className="size-3.25" />
              {isUploadingPhoto ? "업로드 중..." : "프로필 사진 변경"}
            </button>
          </div>

          {/* 닉네임 */}
          <div>
            <label className="block font-bold text-[14px] text-[#404040] mb-0.5">닉네임</label>
            <input className={FIELD_CLASS} value={form.nickname} onChange={handleChange("nickname")} />
          </div>

          {/* 이메일 / 전화번호 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[14px] text-[#404040] mb-0.5">이메일</label>
              <input
                className={FIELD_CLASS + " bg-[#f5f5f5] text-[#707070] cursor-default"}
                type="email"
                value={profileQuery.data?.email || user?.email || ""}
                readOnly
              />
            </div>
            <div>
              <label className="block font-bold text-[14px] text-[#404040] mb-0.5">
                전화번호<span className="ml-1 text-[#a32d2d]">*</span>
              </label>
              <input
                className={FIELD_CLASS}
                type="tel"
                placeholder="01012345678"
                required
                maxLength={13}
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              />
            </div>
          </div>

          {/* 비밀번호 */}
          {passwordChangeable ? (
            <>
              <div>
                <label className="block font-bold text-[14px] text-[#404040] mb-0.5">현재 비밀번호</label>
                <div className="relative">
                  <input type={passwordVisibility.currentPassword ? "text" : "password"} className={`${FIELD_CLASS} pr-11`} value={form.currentPassword} onChange={handleChange("currentPassword")} placeholder="현재 비밀번호" />
                  <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, currentPassword: !previous.currentPassword }))} aria-label={passwordVisibility.currentPassword ? "현재 비밀번호 숨기기" : "현재 비밀번호 보기"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                    {passwordVisibility.currentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[14px] text-[#404040] mb-0.5">새 비밀번호</label>
                <div className="relative">
                  <input type={passwordVisibility.newPassword ? "text" : "password"} className={`${FIELD_CLASS} pr-11`} value={form.newPassword} onChange={handleChange("newPassword")} placeholder="8~64자, 2종 이상 조합" />
                  <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, newPassword: !previous.newPassword }))} aria-label={passwordVisibility.newPassword ? "새 비밀번호 숨기기" : "새 비밀번호 보기"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                    {passwordVisibility.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[14px] text-[#404040] mb-0.5">새 비밀번호 확인</label>
                <div className="relative">
                  <input type={passwordVisibility.newPasswordConfirm ? "text" : "password"} className={`${FIELD_CLASS} pr-11`} value={form.newPasswordConfirm} onChange={handleChange("newPasswordConfirm")} placeholder="새 비밀번호를 다시 입력해주세요" />
                  <button type="button" onClick={() => setPasswordVisibility((previous) => ({ ...previous, newPasswordConfirm: !previous.newPasswordConfirm }))} aria-label={passwordVisibility.newPasswordConfirm ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 보기"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                    {passwordVisibility.newPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <ActionButton
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  size="sm"
                  tone="outline"
                >
                  {isChangingPassword ? "변경 중..." : "비밀번호 변경"}
                </ActionButton>
              </div>
            </>
          ) : (
            <div>
              <label className="block font-bold text-[14px] text-[#404040] mb-0.5">비밀번호</label>
              <div className="rounded-[5px] border border-[#e8e9ec] bg-[#f5f7fc] px-3.5 py-3">
                <p className="m-0 text-[13px] text-[#767676]">
                  소셜 로그인(카카오·네이버·구글)으로 가입한 계정은 비밀번호가 없어 변경할 수 없습니다.
                </p>
              </div>
            </div>
          )}

          {/* 주소 */}
          <div>
            <label className="block font-bold text-[14px] text-[#404040] mb-0.5">주소</label>
            <div className="flex gap-2">
              <input
                className={FIELD_CLASS + " flex-1 cursor-pointer"}
                onClick={() => setAddressSearchOpen(true)}
                onFocus={(e) => e.target.blur()}
                placeholder="주소 검색을 눌러주세요."
                readOnly
                value={form.address}
              />
              <ActionButton
                onClick={() => setAddressSearchOpen(true)}
                size="sm"
                tone="neutral"
              >
                주소검색
              </ActionButton>
            </div>
            {form.zip && <p className="mt-1 text-[12px] text-[#969696]">우편번호 {form.zip}</p>}
          </div>
          <div>
            <label className="block font-bold text-[14px] text-[#404040] mb-0.5">상세주소</label>
            <input
              className={FIELD_CLASS}
              disabled={!form.address}
              placeholder={form.address ? "동·호수 등 상세주소" : "주소 검색 후 입력할 수 있습니다."}
              value={form.addressDetail}
              onChange={handleChange("addressDetail")}
            />
          </div>

          <ProfileDeliveryAddressManager />

          {/* 환전계좌 */}
          <div>
            <label className="block font-bold text-[14px] text-[#404040] mb-0.5">환전계좌</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className={FIELD_CLASS}
                placeholder="은행명"
                value={form.bankName}
                onChange={handleChange("bankName")}
              />
              <div className="flex gap-2">
                <input
                  className={FIELD_CLASS + " flex-1"}
                  placeholder="계좌번호"
                  value={form.accountNo}
                  onChange={handleChange("accountNo")}
                />
                <ActionButton
                  onClick={handleDeleteAccount}
                  disabled={!form.bankName && !form.accountNo}
                  size="sm"
                  tone="danger"
                >
                  삭제
                </ActionButton>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              className="text-[13px] text-[#969696] underline hover:text-[#a32d2d]"
            >
              회원 탈퇴
            </button>
            <ActionButton
              type="submit"
            >
              저장
            </ActionButton>
          </div>
        </form>
      </MyPagePanel>

      {/* ── 우측: 소셜 로그인 + 알림설정 ── */}
      <div className="w-full xl:w-75 shrink-0 flex flex-col gap-4">
        {/* 소셜 로그인 연동 */}
        <MyPagePanel title="소셜 로그인 연동" bodyClassName="p-5" variant="profile" titleClassName="text-black">
            <img
              src={assets.loginIcon}
              alt="구글/네이버/카카오"
              className="w-full h-15 object-contain mb-5"
            />
            <div className="flex justify-around">
              {SOCIAL_PROVIDERS.map((social) => {
                const linked = linkedProviders.has(social.key);
                return (
                  <div key={social.key} className="flex flex-col items-center gap-2">
                    <p className="text-[13px] text-black font-medium">{social.label}</p>
                    <ActionButton
                      onClick={() =>
                        linked ? handleUnlink(social.key, social.label) : handleLink(social.key)
                      }
                      disabled={oauthLinksQuery.isLoading || unlinkMutation.isPending}
                      size="sm"
                      tone={linked ? "neutral" : "outline"}
                    >
                      {linked ? "연동됨" : "연동하기"}
                    </ActionButton>
                  </div>
                );
              })}
            </div>
        </MyPagePanel>

        {/* 알림설정 */}
        <MyPagePanel
          title="알림설정"
          variant="profile"
          titleClassName="text-black"
          action={(
            <button
              type="button"
              onClick={handleSaveNotify}
              disabled={notifyQuery.isLoading || notifyMutation.isPending}
              className="btn btn-sm"
              style={{ height: 28, padding: "0 8px", fontSize: 13, background: "#fff", border: "1px solid #d9d9d9", color: "#1a1a1a" }}
            >
              {notifyMutation.isPending ? "저장 중..." : "✓저장"}
            </button>
          )}
          bodyClassName="px-5 pb-4"
        >
            {/* 컬럼 헤더 */}
            <div className="flex items-center h-9 text-[14px] font-medium text-[#969696] border-b border-[#f0f0f0]">
              <span className="flex-1 pl-5">카테고리</span>
              <span className="w-11 text-center shrink-0">인앱</span>
              <span className="w-11 text-center shrink-0">이메일</span>
            </div>
            {DOMAIN_LABELS.map(({ key: domainKey, label: domainLabel }) => {
              const domainEvents = notifyEvents.filter((e) => e.domain === domainKey);
              if (domainEvents.length === 0) return null;
              const isOpen = openDomains.has(domainKey);
              const toggleOpen = () => setOpenDomains((prev) => {
                const next = new Set(prev);
                next.has(domainKey) ? next.delete(domainKey) : next.add(domainKey);
                return next;
              });
              return (
                <div key={domainKey} className="border-b border-[#f0f0f0] last:border-b-0">
                  {/* 아코디언 헤더 행 */}
                  <div className="flex items-center h-10.5">
                    <button
                      type="button"
                      onClick={toggleOpen}
                      className="flex-1 flex items-center gap-1.5 h-full text-left min-w-0"
                    >
                      {isOpen
                        ? <ChevronUp   size={14} className="text-primary shrink-0" />
                        : <ChevronDown size={14} className="text-primary shrink-0" />
                      }
                      <span>
                        <span className="text-[15px] font-semibold text-[#1a1a1a]">{domainLabel}</span>
                        <span className="text-[12px] text-[#aaa] ml-0.5">({domainEvents.length})</span>
                      </span>
                    </button>
                    {/* 도메인 전체 선택 체크박스 */}
                    <div className="w-11 flex justify-center shrink-0">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary cursor-pointer"
                        checked={isDomainAllChecked(domainKey, "inapp")}
                        onChange={() => toggleDomain(domainKey, "inapp")}
                        aria-label={`${domainLabel} 인앱 전체`}
                      />
                    </div>
                    <div className="w-11 flex justify-center shrink-0">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary cursor-pointer"
                        checked={isDomainAllChecked(domainKey, "email")}
                        onChange={() => toggleDomain(domainKey, "email")}
                        aria-label={`${domainLabel} 이메일 전체`}
                      />
                    </div>
                  </div>
                  {/* 아코디언 본문 — 개별 이벤트 행 */}
                  {isOpen && (
                    <div className="bg-[#f8f9fc] border-t border-[#f0f0f0]">
                      {domainEvents.map((e) => (
                        <div
                          key={e.eventCode}
                          className="flex items-center h-9.5 border-b border-[#f0f0f0] last:border-b-0"
                        >
                          <span className="flex-1 min-w-0 text-[14px] text-[#404040] pl-6">{e.label}</span>
                          <div className="w-11 flex justify-center shrink-0">
                            <input
                              type="checkbox"
                              className="size-3.5 accent-primary cursor-pointer"
                              checked={e.inapp}
                              onChange={() => toggleNotify(e.eventCode, "inapp")}
                              aria-label={`${e.label} 인앱 알림`}
                            />
                          </div>
                          <div className="w-11 flex justify-center shrink-0">
                            <input
                              type="checkbox"
                              className="size-3.5 accent-primary cursor-pointer"
                              checked={e.email}
                              onChange={() => toggleNotify(e.eventCode, "email")}
                              aria-label={`${e.label} 이메일 알림`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </MyPagePanel>
      </div>

      {addressSearchOpen ? (
        <div aria-modal="true" className="fixed inset-0 z-200 flex items-center justify-center bg-black/35 p-4" role="dialog">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-3">
              <p className="font-bold text-[15px] text-[#404040]">주소 검색</p>
              <ActionButton
                onClick={() => setAddressSearchOpen(false)}
                size="sm"
                tone="neutral"
              >
                닫기
              </ActionButton>
            </div>
            <DaumPostcode autoClose={false} onComplete={handleAddressComplete} />
          </div>
        </div>
      ) : null}
      </div>
      <AlertModal
        open={saveAlertOpen}
        message="알림 설정이 저장되었습니다."
        onClose={() => setSaveAlertOpen(false)}
      />
      <AlertModal
        open={profileSaveAlertOpen}
        message="저장되었습니다."
        onClose={() => setProfileSaveAlertOpen(false)}
      />
      <AlertModal
        open={photoUploadAlertOpen}
        message={"사진이 업로드되었습니다.\n저장을 눌러야 반영됩니다."}
        onClose={() => setPhotoUploadAlertOpen(false)}
      />
      <WithdrawConfirmModal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        passwordChangeable={passwordChangeable}
      />
    </>
  );
}

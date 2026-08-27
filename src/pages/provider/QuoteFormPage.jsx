// src/pages/provider/QuoteFormPage.jsx
// F-SVC-005/006: 제공자 견적 제출·수정 (담당자3 황성경 소유)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSubmitQuote, useUpdateQuote } from "@hooks/useQuote";
import { getMyActiveQuote, uploadQuotePhoto, getQuoteHistory } from "@api/quoteApi";
import { getServiceRequest } from "@api/serviceRequestApi";
import { fetchMyProviderQuoteAccess } from "@api/providerProfileApi";
import { toImageUrl } from "@api/fileApi";
import { formatPoint, toast } from "@utils/common";
import AlertModal from "@components/common/AlertModal";
import ConfirmModal from "@components/common/ConfirmModal";
import { ActionButton, CategoryTag } from "@components/common/ui";
import {
  getServiceRequestDetailPath,
  SERVICE_REQUESTS_PATH,
} from "@/routes/serviceRequestRoutes";
import "./QuoteFormPage.css";

const MAX_CONTENT_LEN = 4000;
const MAX_ATTACH      = 5;
const MAX_EDIT_COUNT  = 3;

const FALLBACK_REQUEST = { title: "서비스 요청", category: "" };

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function QuoteFormPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { quoteId: routeQuoteId, svcReqSn: routeSvcReqSn } = useParams();
  const routeState = location.state || {};
  const fileInputRef = useRef(null);

  // 요청번호와 견적번호는 URL 경로에서 받고, 화면 표시용 정보만 router state를 사용한다.
  const quoteId = Number(routeQuoteId) || null;
  const isEditMode = Boolean(quoteId);
  const svcReqSn = Number(routeSvcReqSn) || null;
  const [svcReqInfo, setSvcReqInfo] = useState({
    svcReqSn,
    catSn: routeState.catSn || null,
    title:     routeState.svcReqTitle  || FALLBACK_REQUEST.title,
    category:  routeState.category     || FALLBACK_REQUEST.category,
    sub:       routeState.sub          || FALLBACK_REQUEST.sub,
    location:  routeState.location     || FALLBACK_REQUEST.location,
    budget:    routeState.budget       || FALLBACK_REQUEST.budget,
    budgetRaw: null,
    requester: routeState.requester    || FALLBACK_REQUEST.requester,
  });

  const submitMutation = useSubmitQuote();
  const updateMutation = useUpdateQuote();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(isEditMode);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(Boolean(svcReqSn));
  const [requestLoadFailed, setRequestLoadFailed] = useState(false);

  const [form, setForm] = useState({
    title:  isEditMode ? (routeState.quoteTitle || "") : "",
    amount: isEditMode && routeState.amount != null ? String(routeState.amount) : "",
    message:  isEditMode ? (routeState.content || "") : "",
  });
  const [prevForm,        setPrevForm]        = useState({ ...form });
  const [attachFiles,     setAttachFiles]     = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [initialAttachmentSns, setInitialAttachmentSns] = useState([]);
  const [revisions,   setRevisions]   = useState([]);
  const [editCount,   setEditCount]   = useState(isEditMode ? (routeState.reviseCnt || 0) : 0);
  const [isQuoteSubmitted, setIsQuoteSubmitted] = useState(isEditMode);
  const [activeQuoteLoading, setActiveQuoteLoading] = useState(isEditMode);
  const [activeQuoteLoadFailed, setActiveQuoteLoadFailed] = useState(false);
  const quoteAccessQuery = useQuery({
    queryKey: ['provider', 'quote-access', svcReqInfo.catSn],
    queryFn: () => fetchMyProviderQuoteAccess(svcReqInfo.catSn),
    enabled: !isEditMode && !requestLoading && Number(svcReqInfo.catSn) > 0,
    retry: false,
  });

  useEffect(() => {
    if (!svcReqSn) return undefined;
    let cancelled = false;

    getServiceRequest(svcReqSn)
      .then((res) => {
        if (cancelled || !res.data) return;
        const request = res.data;
        setSvcReqInfo((prev) => ({
          ...prev,
          svcReqSn,
          catSn: request.catSn,
          title: request.svcReqTtl || prev.title,
          category: request.catNm || prev.category,
          budget: request.svcReqBdgtAmt == null
            ? prev.budget
            : formatPoint(request.svcReqBdgtAmt),
          budgetRaw: request.svcReqBdgtAmt == null ? prev.budgetRaw : Number(request.svcReqBdgtAmt),
        }));
        setRequestLoadFailed(false);
      })
      .catch(() => { if (!cancelled) setRequestLoadFailed(true); })
      .finally(() => { if (!cancelled) setRequestLoading(false); });

    if (isEditMode && quoteId) {
      getMyActiveQuote(svcReqSn)
        .then((res) => {
          const quote = res.data;
          if (cancelled || !quote || Number(quote.qutSn) !== Number(quoteId)) {
            if (!cancelled) {
              setActiveQuoteLoadFailed(true);
              setActiveQuoteLoading(false);
            }
            return;
          }
          setForm((prev) => ({
            ...prev,
            title:  quote.qutTtl || quote.title  || prev.title,
            amount: quote.amount == null ? prev.amount : String(quote.amount),
            message: quote.content || '',
          }));
          setPrevForm((prev) => ({
            ...prev,
            title:  quote.qutTtl || quote.title  || prev.title,
            amount: quote.amount == null ? prev.amount : String(quote.amount),
            message: quote.content || '',
          }));
          const attachments = quote.attachments || [];
          setExistingAttachments(attachments);
          setInitialAttachmentSns(attachments.map((attachment) => String(attachment.flSn)));
          setEditCount(quote.reviseCnt || 0);
          setActiveQuoteLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setActiveQuoteLoadFailed(true);
            setActiveQuoteLoading(false);
          }
        });

      getQuoteHistory(quoteId)
        .then((res) => {
          if (cancelled) return;
          const arr = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
          setRevisions(arr.map((h, idx) => {
            const prev = arr[idx - 1];
            const lines = [];
            if (!prev || String(h.amount) !== String(prev.amount)) lines.push(`금액 ${formatPoint(h.amount)}로 수정했습니다.`);
            if (!prev || h.content !== prev.content) lines.push('내용을 수정했습니다.');
            return {
              round: idx + 1,
              date: h.registeredAt ? String(h.registeredAt).slice(0, 16).replace('T', ' ') : '',
              desc: lines.join(' ') || '수정되었습니다.',
            };
          }));
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [svcReqSn, isEditMode, quoteId]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const attachmentFingerprint = () => [
    ...existingAttachments.map((attachment) => String(attachment.flSn)),
    ...attachFiles.map((attachment) => attachment.id),
  ].join(',');

  const hasChanges = () =>
    form.title   !== prevForm.title   ||
    form.amount  !== prevForm.amount  ||
    form.message !== prevForm.message ||
    attachmentFingerprint() !== initialAttachmentSns.join(',');

  const now = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const validate = () => {
    setSubmitted(true);
    if (!form.title.trim())                       { setAlertMsg("제목을 입력해 주세요.");          return false; }
    if (!form.amount && form.amount !== '0')               { setAlertMsg("견적 금액을 입력해 주세요.");                      return false; }
    if (Number(form.amount) < 0)                          { setAlertMsg("견적 금액은 0원 이상이어야 합니다.");               return false; }
    if (Number(form.amount) > 1000000000)                 { setAlertMsg("견적 금액은 최대 1,000,000,000P 이하이어야 합니다."); return false; }
    if (!form.message.trim())                     { setAlertMsg("내용을 입력해 주세요.");         return false; }
    if (existingAttachments.length + attachFiles.length === 0) {
      setAlertMsg("첨부파일을 추가해 주세요.");
      return false;
    }
    return true;
  };

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    set("amount", raw);
  };

  if (!svcReqSn) {
    return (
      <main className="container seller-page">
        <section className="card mx-auto max-w-[640px] py-12 text-center">
          <p className="m-0 text-[22px] font-bold text-[#1d1d1f]">서비스 요청을 먼저 선택해 주세요.</p>
          <ActionButton className="mt-6" to={SERVICE_REQUESTS_PATH}>서비스 요청 목록으로</ActionButton>
        </section>
      </main>
    );
  }

  if (requestLoading || (isEditMode && activeQuoteLoading) || (!isEditMode && quoteAccessQuery.isLoading)) {
    return (
      <main className="container seller-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <section className="card mx-auto max-w-[640px] py-12 text-center">
          <p style={{ margin: 0 }}>견적 정보를 확인하는 중입니다.</p>
        </section>
      </main>
    );
  }

  if (requestLoadFailed || activeQuoteLoadFailed || (!isEditMode && (quoteAccessQuery.isError || quoteAccessQuery.data !== true))) {
    return (
      <main className="container seller-page">
        <section className="card mx-auto max-w-[640px] py-12 text-center">
          <p className="m-0 text-[22px] font-bold text-[#1d1d1f]">견적을 작성할 수 없습니다.</p>
          <p className="mb-6 mt-3 text-base text-[#686762]">공개 요청과 제공자 카테고리 승인 상태를 확인해 주세요.</p>
          <ActionButton to={getServiceRequestDetailPath(svcReqSn)}>요청 상세로 돌아가기</ActionButton>
        </section>
      </main>
    );
  }

  const handleFiles = (fileList) => {
    const added = Array.from(fileList).slice(0, MAX_ATTACH - existingAttachments.length - attachFiles.length);
    if (!added.length) return;
    setAttachFiles(prev => [
      ...prev,
      ...added.map(f => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        size: f.size,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id) => setAttachFiles(prev => {
    const target = prev.find(f => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    return prev.filter(f => f.id !== id);
  });

  const removeExistingAttachment = (flSn) => {
    setExistingAttachments((prev) => prev.filter((attachment) => attachment.flSn !== flSn));
  };

  const uploadFiles = async () => {
    const results = await Promise.all(attachFiles.map(f => uploadQuotePhoto(f.file)));
    return results.map(r => r.flSn);
  };

  const handleSubmit = async () => {
    if (!policyAgreed) { setAlertMsg("수정 가능 정보를 확인해 주세요."); return; }
    if (!validate()) return;
    setLoading(true);
    try {
      const photoFlSns = await uploadFiles();
      await submitMutation.mutateAsync({
        svcReqSn: svcReqInfo.svcReqSn,
        title:    form.title,
        amount:   Number(form.amount),
        content:  form.message,
        photoFlSns,
      });
      setIsQuoteSubmitted(true);
      setSubmitSuccess(true);
    } catch (err) {
      toast({ icon: "error", title: err?.response?.data?.message || "견적 제출에 실패했습니다. 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (editCount >= MAX_EDIT_COUNT) { setAlertMsg("수정 가능 횟수(3회)를 초과했습니다."); return; }
    if (!hasChanges())               { setAlertMsg("변경된 내용이 없습니다.");              return; }
    if (!validate()) return;
    setLoading(true);
    try {
      const newPhotoFlSns = await uploadFiles();
      const photoFlSns = [
        ...existingAttachments.map((attachment) => attachment.flSn),
        ...newPhotoFlSns,
      ];
      await updateMutation.mutateAsync({
        quoteId,
        title:   form.title,
        amount:  Number(form.amount),
        content: form.message,
        photoFlSns,
      });
      const lines = [];
      if (form.title   !== prevForm.title)           lines.push("제목을 수정했습니다.");
      if (form.amount  !== prevForm.amount)          lines.push("금액을 수정했습니다.");
      if (form.message !== prevForm.message)         lines.push("내용을 수정했습니다.");
      if (attachmentFingerprint() !== initialAttachmentSns.join(',')) lines.push("첨부파일을 변경했습니다.");
      const desc = lines.length ? lines.join(" ") : "내용 변경 없음.";
      const next = editCount + 1;
      setRevisions(prev => [...prev, { round: next, date: now(), desc }]);
      setPrevForm({ ...form });
      setEditCount(next);
      // 첨부파일 기준선 갱신: 다음 수정에서 변경 여부를 정확히 감지하기 위해 서버 상태로 동기화
      getMyActiveQuote(svcReqSn).then((res) => {
        const refreshed = res.data;
        if (!refreshed) return;
        const refreshedAttachments = refreshed.attachments || [];
        setExistingAttachments(refreshedAttachments);
        setInitialAttachmentSns(refreshedAttachments.map((a) => String(a.flSn)));
        setAttachFiles([]);
      }).catch(() => {
        setInitialAttachmentSns([
          ...existingAttachments.map((a) => String(a.flSn)),
          ...newPhotoFlSns.map((sn) => String(sn)),
        ]);
        setAttachFiles([]);
      });
      setEditSuccessMsg(`견적이 수정되었습니다.\n남은 수정 횟수: ${MAX_EDIT_COUNT - next}회`);
    } catch (err) {
      toast({ icon: "error", title: err?.response?.data?.message || "견적 수정에 실패했습니다. 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container seller-page">

      {/* 페이지 헤더 */}
      <div className="page-title">
        <div><h1 style={{ fontWeight: 700 }}>{isEditMode ? '견적 수정' : '견적 작성'}</h1></div>
      </div>

      <div className="qf-simple-layout">

        {/* 서비스 요청 한 줄 표시 */}
        <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
          {svcReqInfo.title}
          {svcReqInfo.category && (
            <CategoryTag className="ml-2 align-middle" tone="info" variant="soft">
              {svcReqInfo.category}
            </CategoryTag>
          )}
        </p>

        {/* 폼 카드 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 좌: 입력 필드 / 우: 수정가능정보 (50/50) */}
          <div className="qf-main-2col">

            {/* 좌측 — 제목·금액·첨부파일 세로 나열 */}
            <div className="qf-col-left">
              <div className="qf-field">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <span>제목 <span style={{ color: "#EF4444" }}>*</span></span>
                  <span className="qf-field-hint" style={{ fontSize: 12, marginLeft: 'auto' }}>{form.title.length} / 50</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="견적 제목을 입력하세요"
                  value={form.title}
                  onChange={e => set("title", e.target.value.slice(0, 50))}
                  maxLength={50}
                  style={{ borderColor: submitted && !form.title.trim() ? "#EF4444" : undefined }}
                />
              </div>
              <div className="qf-field">
                <label>
                  견적 금액 <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input"
                    placeholder="0"
                    value={form.amount ? Number(form.amount).toLocaleString() : ""}
                    onChange={handleAmountInput}
                    style={{
                      paddingRight: 36,
                      borderColor: submitted && (
                        (!form.amount && form.amount !== '0') ||
                        Number(form.amount) < 0 ||
                        Number(form.amount) > 1000000000
                      ) ? "#EF4444" : undefined,
                    }}
                  />
                  <span style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 14, color: "#888", pointerEvents: "none",
                  }}>P</span>
                </div>
                <p style={{
                  margin: "4px 0 0", fontSize: 13,
                  color: form.amount && (
                    Number(form.amount) < 0 ||
                    Number(form.amount) > 1000000000
                  ) ? "#EF4444" : "#888",
                }}>
                  {"최대 1,000,000,000P"}
                </p>
                {/* 거래 수수료 사전 고지 — 팀 합의 요율(서비스 10% 단일 고정) (담당자6 BJN, 2026-08-13 추가) */}
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#888" }}>
                  거래 완료 후 정산 시 거래금액의 10%가 수수료로 차감됩니다.
                </p>
              </div>

              <div className="qf-field">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 500, color: '#333' }}>첨부파일 <span style={{ color: "#EF4444" }}>*</span></span>
                  <span className="qf-field-hint">드래그앤드롭 또는 파일 선택 ({existingAttachments.length + attachFiles.length}/{MAX_ATTACH})</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={existingAttachments.length + attachFiles.length >= MAX_ATTACH}
                    style={{ marginLeft: 'auto' }}
                  >
                    파일 추가
                  </button>
                </div>
                <div
                  className="qf-thumb-wrap"
                  style={{ borderColor: submitted && existingAttachments.length + attachFiles.length === 0 ? "#EF4444" : undefined }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    onChange={e => handleFiles(e.target.files)}
                  />
                  <div className="qf-thumb-grid">
                    {existingAttachments.map((attachment) => {
                      const extension = attachment.fileName?.split(".").pop()?.toUpperCase() || "FILE";
                      const isImage = ["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(extension);
                      return (
                        <div key={`saved-${attachment.flSn}`} className="qf-thumb-item">
                          {isImage ? (
                            <img src={toImageUrl(attachment.url)} alt="" className="qf-thumb-img" />
                          ) : (
                            <div className="qf-thumb-file">
                              <span className="qf-thumb-ext">{extension}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            className="qf-thumb-del"
                            onClick={() => removeExistingAttachment(attachment.flSn)}
                            aria-label="기존 첨부파일 삭제"
                          >×</button>
                        </div>
                      );
                    })}
                    {attachFiles.map(f => (
                      <div key={f.id} className="qf-thumb-item">
                        {f.previewUrl ? (
                          <img src={f.previewUrl} alt={f.name} className="qf-thumb-img" />
                        ) : (
                          <div className="qf-thumb-file">
                            <span className="qf-thumb-ext">{f.name.split(".").pop().toUpperCase()}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="qf-thumb-del"
                          onClick={() => removeFile(f.id)}
                          aria-label="삭제"
                        >×</button>
                      </div>
                    ))}
                    {Array.from({ length: MAX_ATTACH - existingAttachments.length - attachFiles.length }, (_, i) => (
                      <div key={`empty-${i}`} className="qf-thumb-item">
                        <div
                          className="qf-thumb-empty"
                          style={{ width: '100%' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span>+</span>
                        </div>
                        <span className="qf-thumb-name" aria-hidden="true" style={{ visibility: 'hidden' }}>-</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="qf-policy-wrap">
                <div className="qf-policy-head">
                  <h4>수정 가능 정보 <span style={{ color: "#c0392b" }}>*</span></h4>
                  {editCount < MAX_EDIT_COUNT
                    ? <span style={{ marginLeft: 'auto', color: "#0064ff", fontWeight: 600, fontSize: 14 }}>남은 수정 횟수: {MAX_EDIT_COUNT - editCount}회</span>
                    : <span style={{ marginLeft: 'auto', color: "#EF4444", fontWeight: 600, fontSize: 14 }}>수정 횟수를 모두 사용했습니다.</span>}
                </div>
                <span style={{ fontSize: 15, color: '#4e4e4e', display: 'block', marginBottom: 6 }}>제출 후 최대 3회 수정 가능하며, 이력은 보존됩니다.</span>
                <ul className="qf-policy-list">
                  <li>제출한 견적은 요청자가 선택하기 전까지 수정할 수 있습니다</li>
                  <li>수정할 때마다 이력이 기록되며 요청자에게 공개됩니다</li>
                  <li>수정 횟수 3회를 모두 사용하면 추가 수정이 불가합니다</li>
                </ul>
                {revisions.length === 0 ? (
                  <p className="qf-no-history">아직 수정 이력이 없습니다.</p>
                ) : (
                  revisions.map(({ round, date, desc }) => (
                    <div key={round} className="qf-history-card">
                      <div className="qf-history-card-header">
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{round}회차 수정</span>
                        <span className="muted small">{date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "#555" }}>{desc}</p>
                    </div>
                  ))
                )}
              </div>
              {!isEditMode && (
                <div className="qf-policy-agree">
                  <label>
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={e => setPolicyAgreed(e.target.checked)}
                      style={{ accentColor: "#0048bf" }}
                    />
                    위 내용을 확인하였습니다.
                  </label>
                </div>
              )}
            </div>

            {/* 우측 — 내용 */}
            <div className="qf-col-right">
              <div className="qf-field">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <span>내용 <span style={{ color: "#EF4444" }}>*</span></span>
                  <span className="qf-field-hint" style={{ fontSize: 12, marginLeft: 'auto' }}>{form.message.length} / {MAX_CONTENT_LEN}</span>
                </label>
                <textarea
                  className="input"
                  rows={7}
                  placeholder={"견적 내용을 입력하세요\n\n예) 서비스 범위, 예상 일정, 특이사항 등"}
                  value={form.message}
                  onChange={e => set("message", e.target.value.slice(0, MAX_CONTENT_LEN))}
                  maxLength={MAX_CONTENT_LEN}
                  style={{
                    resize: "vertical", minHeight: 160,
                    padding: "10px 12px", lineHeight: 1.6,
                    borderColor: submitted && !form.message.trim() ? "#EF4444" : undefined,
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 버튼 — 전체 영역 밖, 전체 우측 정렬 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginBottom: 32 }}>
        <ActionButton
          onClick={() => setCancelConfirm(true)}
          tone="neutral"
        >
          취소
        </ActionButton>
        {isQuoteSubmitted ? (
          <ActionButton
            onClick={handleEdit}
            disabled={loading || editCount >= MAX_EDIT_COUNT}
          >
            {loading ? "수정 중..." : "견적 수정"}
          </ActionButton>
        ) : (
          <ActionButton
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "제출 중..." : "견적 제출"}
          </ActionButton>
        )}
        <ActionButton
          onClick={() => setShowPreview(true)}
          tone="outline"
        >
          미리보기
        </ActionButton>
      </div>

      <AlertModal open={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />

      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="qf-preview-modal-overlay">
          <div className="qf-preview-modal-box" style={{ maxWidth: 1000, width: '95%', textAlign: 'left', padding: 0, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* 타이틀 헤더 */}
            <div style={{ position: 'relative', background: '#0064ff', padding: '16px 20px', display: 'flex', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>견적 미리보기</p>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex', alignItems: 'center' }}
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* 본문 */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>제목</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111' }}>{form.title || '—'}</p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>견적 금액</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>
                {form.amount ? formatPoint(form.amount) : '—'}
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>내용</p>
              <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap', color: '#333', background: '#f8f8f6', borderRadius: 8, padding: '10px 12px', maxHeight: 200, overflowY: 'auto' }}>
                {form.message || '—'}
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888' }}>첨부파일 ({existingAttachments.length + attachFiles.length}개)</p>
              {existingAttachments.length + attachFiles.length === 0 ? (
                <p style={{ margin: 0, fontSize: 14, color: '#aaa' }}>없음</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {existingAttachments.map((a, i) => {
                    const displayName = (a.fileName && !/^\d+$/.test(a.fileName.trim())) ? a.fileName : `첨부파일 ${i + 1}`;
                    const ext = displayName.split('.').pop().toUpperCase();
                    const isImg = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext);
                    return (
                      <div key={a.flSn} style={{ background: '#f8f8f6', borderRadius: 8, overflow: 'hidden' }}>
                        {isImg && (
                          <img src={toImageUrl(a.url)} alt={displayName} style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain', background: '#eee' }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
                          <span style={{ fontSize: 14, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{displayName}</span>
                        </div>
                      </div>
                    );
                  })}
                  {attachFiles.map(f => (
                    <div key={f.id} style={{ background: '#f8f8f6', borderRadius: 8, overflow: 'hidden' }}>
                      {f.previewUrl && (
                        <img src={f.previewUrl} alt={f.name} style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'contain', background: '#eee' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
                        <span style={{ fontSize: 14, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>{/* 본문 끝 */}
          </div>
        </div>
      )}

      <AlertModal
        description={editSuccessMsg.split("\n").slice(1).join("\n") || undefined}
        message={editSuccessMsg.split("\n")[0]}
        onClose={() => {
          setEditSuccessMsg("");
          navigate("/user/mypage/services/quotes");
        }}
        open={Boolean(editSuccessMsg)}
        variant="success"
      />

      <AlertModal
        description="견적 제출 내역에서 확인하실 수 있습니다."
        message="견적이 제출되었습니다."
        onClose={() => {
          setSubmitSuccess(false);
          navigate("/user/mypage/services/quotes");
        }}
        open={submitSuccess}
        variant="success"
      />

      <ConfirmModal
        cancelLabel="돌아가기"
        confirmLabel="취소 확인"
        message="작성 중인 내용은 저장되지 않습니다."
        onCancel={() => setCancelConfirm(false)}
        onConfirm={() => navigate(-1)}
        open={cancelConfirm}
        title="작성을 취소하시겠습니까?"
      />
    </main>
  );
}

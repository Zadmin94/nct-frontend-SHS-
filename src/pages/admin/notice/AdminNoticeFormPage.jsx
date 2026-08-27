import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EyeOff, Save, Trash2 } from 'lucide-react';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import PageMeta from '@components/admin/PageMeta';
import FormSkeleton from '@components/skeleton/FormSkeleton';
import {
  useAdminNoticeDetail,
  useAdminNoticeOptions,
  useCreateAdminNotice,
  useDeleteAdminNotice,
  useHideAdminNotice,
  useUpdateAdminNotice,
} from '@hooks/useAdminNotices';
import { confirm, formatDateTime, toast } from '@utils/common';
import { formatAdminMemberIdentity } from '@utils/adminMemberIdentity';
import './adminContentPages.css';

const FAQ_TYPE_CODE = 'NTCC0008';
const PUBLISHED_STATUS_CODE = 'NTCC0006';

const EMPTY_FORM = {
  typeCode: '',
  statusCode: PUBLISHED_STATUS_CODE,
  title: '',
  content: '',
  postingStartAt: '',
  postingEndAt: '',
  permanentPosting: true,
  expectedUpdatedAt: null,
  expectedRevision: null,
  pinned: false,
};

const toDateTimeInput = (value) => value ? value.slice(0, 16) : '';
// 담당자 7 | F-OPS-023: 신규 공지는 게시 상태·현재 시각·종료일 없음으로 바로 노출할 수 있게 시작합니다.
const nowDateTimeInput = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const getErrorMessage = (error) => error?.response?.status === 409
  ? '다른 관리자가 먼저 변경했습니다. 목록에서 공지를 다시 열어 확인해 주세요.'
  : error?.response?.data?.message || '처리 중 오류가 발생했습니다.';
const formFromNotice = (notice) => ({
  typeCode: notice.typeCode,
  statusCode: notice.statusCode,
  title: notice.title,
  content: notice.content,
  postingStartAt: toDateTimeInput(notice.postingStartAt),
  postingEndAt: toDateTimeInput(notice.postingEndAt),
  permanentPosting: !notice.postingEndAt,
  expectedUpdatedAt: notice.updatedAt,
  expectedRevision: notice.revisionToken,
  pinned: notice.typeCode === FAQ_TYPE_CODE ? false : notice.pinned,
});

/** 공지 신규 작성과 기존 공지 상세·수정을 한 화면 구조로 제공해 입력 규칙을 동일하게 유지합니다. */
const AdminNoticeFormPage = () => {
  const { noticeId: noticeIdParam } = useParams();
  const navigate = useNavigate();
  const isNew = noticeIdParam === undefined;
  const noticeId = Number(noticeIdParam);
  const isValidNoticeId = isNew || (Number.isSafeInteger(noticeId) && noticeId > 0);
  const [draft, setDraft] = useState(null);
  const [isEditing, setIsEditing] = useState(isNew);
  const [feedback, setFeedback] = useState('');
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const optionsQuery = useAdminNoticeOptions();
  const noticeQuery = useAdminNoticeDetail(isNew ? null : noticeId);
  const createMutation = useCreateAdminNotice();
  const updateMutation = useUpdateAdminNotice();
  const hideMutation = useHideAdminNotice();
  const deleteMutation = useDeleteAdminNotice();
  const noticeTypeOptions = optionsQuery.data?.types ?? [];
  const noticeStatusOptions = optionsQuery.data?.statuses ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending
    || hideMutation.isPending || deleteMutation.isPending;

  const initialForm = isNew
    ? { ...EMPTY_FORM, postingStartAt: nowDateTimeInput(), typeCode: noticeTypeOptions[0]?.code ?? '' }
    : noticeQuery.data ? formFromNotice(noticeQuery.data) : EMPTY_FORM;
  const form = draft ?? initialForm;

  const changeField = (event) => {
    const { name, value, checked, type } = event.target;
    setDraft((current) => {
      const next = {
        ...(current ?? initialForm),
        [name]: type === 'checkbox' ? checked : value,
      };

      // 담당자 7 | F-OPS-023: 영구 게시를 선택하면 종료일을 비워 공개 필터가 계속 통과하도록 한다.
      if (name === 'permanentPosting' && checked) {
        next.postingEndAt = '';
      }
      if (name === 'typeCode' && value === FAQ_TYPE_CODE) {
        next.pinned = false;
      }
      return next;
    });
    setFeedback('');
  };

  // 담당자 7 | F-OPS-023: 네이티브 날짜 선택기의 최종 화면 값을 제출 시점에 다시 읽습니다.
  // 날짜 선택 직후 저장해도 React 상태 갱신 전 값이나 영구 게시 기본값이 전송되지 않게 합니다.
  const payload = (formElement) => {
    const { permanentPosting, ...noticeForm } = form;
    const postingStartInput = formElement?.elements.namedItem('postingStartAt');
    const postingEndInput = formElement?.elements.namedItem('postingEndAt');
    const permanentPostingInput = formElement?.elements.namedItem('permanentPosting');
    const submittedStartAt = postingStartInput?.value ?? form.postingStartAt;
    const submittedEndAt = postingEndInput?.value ?? form.postingEndAt;
    const submittedPermanentPosting = permanentPostingInput?.checked ?? permanentPosting;
    return {
      ...noticeForm,
      postingStartAt: submittedStartAt || null,
      postingEndAt: submittedPermanentPosting ? null : submittedEndAt || null,
    };
  };

  /** 담당자 7 | F-OPS-023: 저장 성공 시 신규 공지는 관리 목록으로, 실패 시 현재 입력 화면에 남깁니다. */
  const submit = async (event) => {
    event.preventDefault();
    setFeedback('');
    const submittedPayload = payload(event.currentTarget);
    try {
      if (isNew) {
        await createMutation.mutateAsync(submittedPayload);
        setDraft(null);
        toast({ icon: 'success', title: '공지가 등록되었습니다.', timer: 1800 });
        navigate('/admin/notices', { replace: true });
      } else {
        await updateMutation.mutateAsync({ noticeId, payload: submittedPayload });
        setIsEditing(false);
        setDraft(null);
        toast({ icon: 'success', title: '공지가 수정되었습니다.', timer: 1800 });
      }
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const hideNotice = async () => {
    const confirmed = await confirm({
      title: '공지를 숨길까요?',
      text: '공지 내용과 게시 기간은 유지됩니다.',
      confirmButtonText: '숨기기',
    });
    if (!confirmed) return;
    try {
      await hideMutation.mutateAsync({ noticeId });
      setDeletePanelOpen(false);
      setDeleteReason('');
      setDraft(null);
      toast({ icon: 'success', title: '공지가 숨김 처리되었습니다.', timer: 1800 });
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const deleteNotice = async () => {
    const reason = deleteReason.trim();
    if (!reason) {
      setFeedback('삭제 사유를 입력해 주세요.');
      return;
    }
    const confirmed = await confirm({
      title: '공지를 삭제할까요?',
      text: '삭제 후에는 사용자와 관리자 목록에서 모두 보이지 않습니다.',
      confirmButtonText: '삭제',
      size: 'md',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync({ noticeId, changeReason: reason });
      toast({ icon: 'success', title: '공지가 삭제되었습니다.', timer: 1800 });
      navigate('/admin/notices', { replace: true });
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  if (!isValidNoticeId) {
    return <div className="card admin-content-state is-error">잘못된 공지 주소입니다.</div>;
  }
  if (!isNew && noticeQuery.isLoading) {
    return <FormSkeleton fields={6} />;
  }
  if (!isNew && noticeQuery.isError) {
    return <div className="card admin-content-state is-error">공지를 찾을 수 없거나 불러오지 못했습니다.</div>;
  }

  const notice = noticeQuery.data;
  const fieldsDisabled = !isEditing || isPending;
  const isFaq = form.typeCode === FAQ_TYPE_CODE;
  const previewTitle = form.title.trim() || '공지 제목을 입력해 주세요';
  return (
    <div className="admin-content-page">
      <PageMeta title={isNew ? '공지 작성' : '공지 상세'} />
      <AdminPageHeader
        action={!isNew && (
          <AdminStatusBadge tone={notice?.visibleNow ? 'success' : 'neutral'}>
            {notice?.visibleNow ? '사용자 화면 공개' : '현재 비공개'}
          </AdminStatusBadge>
        )}
        title={isNew ? '공지 작성' : '공지 상세'}
      />

      <form className="card admin-notice-form" onSubmit={submit}>
        {!isNew && (
          <div className="admin-notice-form__readonly-meta">
            <span><small>공지 번호</small><strong>{notice.noticeId}</strong></span>
            <span><small>작성자</small><strong>{formatAdminMemberIdentity(notice.writerMember, notice.writerUserId)}</strong></span>
            <span><small>등록 일시</small><strong>{formatDateTime(notice.registeredAt)}</strong></span>
            <span><small>최종 처리자</small><strong>{formatAdminMemberIdentity(notice.updaterMember, notice.updaterUserId)}</strong></span>
            <span><small>최종 처리 일시</small><strong>{formatDateTime(notice.updatedAt)}</strong></span>
            <span><small>최종 처리 사유</small><strong>{notice.lastChangeReason ?? '기록 없음'}</strong></span>
          </div>
        )}

        <div className="admin-notice-form__grid">
          <label>
            <span>공지 유형</span>
            <select
              disabled={fieldsDisabled}
              name="typeCode"
              onChange={changeField}
              required
              value={form.typeCode}
            >
              {noticeTypeOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>게시 상태</span>
            <select
              disabled={fieldsDisabled}
              name="statusCode"
              onChange={changeField}
              required
              value={form.statusCode}
            >
              {noticeStatusOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>게시 시작일시</span>
            <input
              disabled={fieldsDisabled}
              name="postingStartAt"
              onChange={changeField}
              type="datetime-local"
              value={form.postingStartAt}
            />
          </label>
          <label>
            <span className="admin-notice-form__end-label">
              게시 종료일시
              <span className="admin-notice-form__permanent-posting">
                <input
                  checked={form.permanentPosting}
                  disabled={fieldsDisabled}
                  name="permanentPosting"
                  onChange={changeField}
                  type="checkbox"
                />
                종료일 없음
              </span>
            </span>
            <input
              disabled={fieldsDisabled || form.permanentPosting}
              name="postingEndAt"
              onChange={changeField}
              required={!form.permanentPosting}
              type="datetime-local"
              value={form.postingEndAt}
            />
          </label>
        </div>

        <label className="admin-notice-form__full">
          <span>제목 <em>{form.title.length}/200</em></span>
          <input
            disabled={fieldsDisabled}
            maxLength={200}
            name="title"
            onChange={changeField}
            required
            value={form.title}
          />
        </label>
        <label className="admin-notice-form__full">
          <span>내용 <em>{form.content.length}/4000</em></span>
          <textarea
            disabled={fieldsDisabled}
            maxLength={4000}
            name="content"
            onChange={changeField}
            required
            rows="12"
            value={form.content}
          />
        </label>
        <label className="admin-notice-form__check">
          <input
            checked={form.pinned}
            disabled={fieldsDisabled || isFaq}
            name="pinned"
            onChange={changeField}
            type="checkbox"
          />
          중요 공지로 등록{isFaq && ' (FAQ는 선택 불가)'}
        </label>

        <section className="admin-notice-preview" aria-label="사용자 공지 미리보기">
          <div><small>사용자 화면 미리보기</small><strong>{previewTitle}</strong><p>{form.content.trim() || '공지 내용이 이곳에 표시됩니다.'}</p></div>
          <div>
            <AdminStatusBadge tone="info">
              {optionsQuery.data?.types?.find((item) => item.code === form.typeCode)?.name ?? '유형 선택'}
            </AdminStatusBadge>
            {form.pinned && (
              <AdminStatusBadge tone="warning">중요 공지</AdminStatusBadge>
            )}
          </div>
        </section>

        {deletePanelOpen && (
          <section className="admin-notice-form__delete-confirm" aria-label="공지 삭제 확인">
            <div>
              <strong>공지 삭제</strong>
              <p>삭제는 관리 목록에서도 공지를 제거합니다. 삭제가 필요한 이유만 기록해 주세요.</p>
            </div>
            <label>
              <span>삭제 사유</span>
              <textarea
                autoFocus
                className="admin-reason-textarea"
                disabled={isPending}
                maxLength={500}
                onChange={(event) => {
                  setDeleteReason(event.target.value);
                  setFeedback('');
                }}
                placeholder="예: 중복 등록된 공지"
                rows="2"
                value={deleteReason}
              />
            </label>
            <div className="admin-notice-form__delete-actions">
              <button
                className="btn btn-outline"
                disabled={isPending}
                onClick={() => {
                  setDeletePanelOpen(false);
                  setDeleteReason('');
                  setFeedback('');
                }}
                type="button"
              >
                취소
              </button>
              <button
                className="btn admin-danger-button"
                disabled={isPending || !deleteReason.trim()}
                onClick={deleteNotice}
                type="button"
              >
                <Trash2 aria-hidden="true" />
                삭제 확인
              </button>
            </div>
          </section>
        )}

        {feedback && (
          <p className="admin-notice-form__feedback" role="alert">
            {feedback}
          </p>
        )}

        <div className="admin-notice-form__actions">
          <Link className="btn btn-outline" to="/admin/notices">목록으로</Link>
          {!isNew && !isEditing && (
            <>
              <button
                className="btn btn-outline"
                disabled={isPending}
                onClick={() => {
                  setDeletePanelOpen(false);
                  setDeleteReason('');
                  setIsEditing(true);
                }}
                type="button"
              >
                수정하기
              </button>
              <button
                className="btn btn-outline"
                disabled={isPending || notice?.statusCode === 'NTCC0007'}
                onClick={hideNotice}
                type="button"
              >
                <EyeOff aria-hidden="true" />
                숨김
              </button>
              <button
                className="btn admin-danger-button"
                disabled={isPending}
                onClick={() => {
                  setDeletePanelOpen(true);
                  setDeleteReason('');
                  setFeedback('');
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" />
                삭제
              </button>
            </>
          )}
          {!isNew && isEditing && (
            <button
              className="btn btn-outline"
              disabled={isPending}
              onClick={() => {
                setDraft(null);
                setIsEditing(false);
              }}
              type="button"
            >
              수정 취소
            </button>
          )}
          {(isNew || isEditing) && (
            <button className="btn btn-primary" disabled={isPending} type="submit">
              <Save aria-hidden="true" />
              {isNew ? '공지 등록' : '수정 저장'}
            </button>
          )}
        </div>
      </form>
      {!isNew && (
        <AdminHistoryTimeline referenceSn={noticeId} referenceType="NOTICE" />
      )}
    </div>
  );
};

export default AdminNoticeFormPage;

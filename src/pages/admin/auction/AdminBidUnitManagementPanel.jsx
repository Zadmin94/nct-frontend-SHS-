import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import {
  changeAdminBidUnitStatus,
  fetchAdminBidUnits,
  saveAdminBidUnit,
} from '@api/adminAuctionApi';
import AdminModal from '@components/admin/AdminModal';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminSectionCard from '@components/admin/AdminSectionCard';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import AdminTable from '@components/admin/AdminTable';
import { toast } from '@utils/common';
import './adminBidUnitManagementPanel.css';

const EMPTY_FORM = {
  amount: '',
  changeReason: '',
};

const formatAmount = (value) => `${Number(value).toLocaleString('ko-KR')}P`;

/** 담당자 7 · F-AUC-013/F-OPS-003: AUCG02 입찰 단위를 경매 관리에서 편집합니다. */
const AdminBidUnitManagementPanel = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [statusChanging, setStatusChanging] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusReason, setStatusReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const bidUnitsQuery = useQuery({
    queryKey: ['admin-auction-bid-units'],
    queryFn: fetchAdminBidUnits,
  });
  const saveMutation = useMutation({
    mutationFn: saveAdminBidUnit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-auction-bid-units'] });
      await queryClient.invalidateQueries({ queryKey: ['reference-codes', 'AUCG02'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: changeAdminBidUnitStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-auction-bid-units'] });
      await queryClient.invalidateQueries({ queryKey: ['reference-codes', 'AUCG02'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });

  const bidUnits = bidUnitsQuery.data ?? [];
  const activeCount = bidUnits.filter((item) => item.active).length;

  const resetDialogs = () => {
    setEditing(null);
    setStatusChanging(null);
    setForm(EMPTY_FORM);
    setStatusReason('');
    setFeedback('');
  };

  const closeDialogs = () => {
    if (saveMutation.isPending || statusMutation.isPending) return;
    resetDialogs();
  };

  const openCreate = () => {
    setEditing({ isNew: true });
    setForm(EMPTY_FORM);
    setFeedback('');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      amount: String(item.amount),
      changeReason: '',
    });
    setFeedback('');
  };

  const change = ({ target }) => setForm((current) => ({
    ...current,
    [target.name]: target.value,
  }));

  const validate = () => {
    const amount = Number(form.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return '입찰 단위는 1P 이상의 정수로 입력해 주세요.';
    }
    if (!form.changeReason.trim()) {
      return editing?.isNew
        ? '추가 사유를 입력해 주세요.'
        : '변경 사유를 입력해 주세요.';
    }
    const duplicate = bidUnits.some((item) => (
      item.bidUnitSn !== editing?.bidUnitSn && Number(item.amount) === amount
    ));
    return duplicate ? '동일한 입찰 단위가 이미 존재합니다.' : '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationMessage = validate();
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    setFeedback('');
    try {
      await saveMutation.mutateAsync({
        bidUnitSn: editing?.bidUnitSn,
        payload: {
          amount: Number(form.amount),
          changeReason: form.changeReason.trim(),
        },
      });
      const message = editing?.isNew ? '입찰 단위를 추가했습니다.' : '입찰 단위를 수정했습니다.';
      resetDialogs();
      toast({ icon: 'success', title: message, timer: 1800 });
    } catch (error) {
      setFeedback(error.response?.data?.message || '입찰 단위를 저장하지 못했습니다.');
    }
  };

  const submitStatus = async (event) => {
    event.preventDefault();
    if (!statusReason.trim()) {
      setFeedback('변경 사유를 입력해 주세요.');
      return;
    }
    setFeedback('');
    try {
      await statusMutation.mutateAsync({
        bidUnitSn: statusChanging.item.bidUnitSn,
        payload: {
          active: statusChanging.active,
          changeReason: statusReason.trim(),
        },
      });
      const message = statusChanging.active
        ? '입찰 단위를 다시 사용합니다.'
        : '입찰 단위를 사용 중지했습니다.';
      resetDialogs();
      toast({ icon: 'success', title: message, timer: 1800 });
    } catch (error) {
      setFeedback(error.response?.data?.message || '입찰 단위 상태를 변경하지 못했습니다.');
    }
  };

  const columns = [
    { key: 'amount', label: '입찰 단위', render: formatAmount },
    {
      key: 'active',
      label: '상태',
      render: (active) => (
        <AdminStatusBadge tone={active ? 'success' : 'neutral'}>
          {active ? '사용 중' : '사용 중지'}
        </AdminStatusBadge>
      ),
    },
    {
      key: 'manage',
      label: '관리',
      render: (_, item) => (
        <div className="admin-bid-unit-actions">
          <button className="btn btn-outline" onClick={() => openEdit(item)} type="button">
            <Pencil aria-hidden="true" />
            수정
          </button>
          <button
            className={`btn btn-outline${item.active ? ' admin-bid-unit-actions__deactivate' : ''}`}
            disabled={item.active && activeCount <= 1}
            onClick={() => {
              setStatusChanging({ item, active: !item.active });
              setStatusReason('');
              setFeedback('');
            }}
            title={item.active && activeCount <= 1
              ? '활성 입찰 단위는 최소 한 개 이상이어야 합니다.'
              : undefined}
            type="button"
          >
            {item.active ? <Power aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
            {item.active ? '사용 중지' : '사용 재개'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="admin-bid-unit-title" className="admin-bid-unit-panel">
      {bidUnitsQuery.isError && (
        <div className="admin-bjn-state is-error">
          입찰 단위를 불러오지 못했습니다.
          <button className="btn btn-outline" onClick={() => bidUnitsQuery.refetch()} type="button">
            다시 시도
          </button>
        </div>
      )}
      {!bidUnitsQuery.isError && (
        <>
          <AdminSectionCard
            action={(
              <div className="admin-bid-unit-panel__summary">
                {!bidUnitsQuery.isLoading && <span>활성 {activeCount}개 · 전체 {bidUnits.length}개</span>}
                <button className="btn btn-primary" onClick={openCreate} type="button">
                  <Plus aria-hidden="true" />
                  입찰 단위 추가
                </button>
              </div>
            )}
            description="입찰 단위는 금액이 작은 순서대로 자동 정렬됩니다."
            title="입찰 단위 목록"
          >
            <div className="admin-bjn-table-scroll">
              <AdminTable
                columns={columns}
                data={bidUnits}
                emptyMessage="등록된 입찰 단위가 없습니다."
                loading={bidUnitsQuery.isLoading}
                rowKey={(item) => item.bidUnitSn}
              />
            </div>
          </AdminSectionCard>
        </>
      )}

      {editing && (
        <AdminModal onClose={closeDialogs} title={editing.isNew ? '입찰 단위 추가' : '입찰 단위 수정'}>
          <form className="admin-bid-unit-form" onSubmit={submit}>
            <label>
              <span>입찰 단위 (P)</span>
              <input
                autoFocus
                inputMode="numeric"
                min="1"
                name="amount"
                onChange={change}
                step="1"
                type="number"
                value={form.amount}
              />
            </label>
            <label>
              <span>{editing.isNew ? '추가 사유' : '변경 사유'}</span>
              <textarea
                className="admin-reason-textarea"
                maxLength="500"
                name="changeReason"
                onChange={change}
                value={form.changeReason}
              />
            </label>
            {!editing.isNew && (
              <AdminHistoryTimeline
                limit={30}
                referenceSn={editing.bidUnitSn}
                referenceType="COMMON_CODE"
                title="입찰 단위 변경 이력"
              />
            )}
            {feedback && <p className="admin-bid-unit-form__feedback" role="alert">{feedback}</p>}
            <div className="admin-bid-unit-form__actions">
              <button className="btn btn-outline" disabled={saveMutation.isPending} onClick={closeDialogs} type="button">취소</button>
              <button className="btn btn-primary" disabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {statusChanging && (
        <AdminModal
          onClose={closeDialogs}
          title={statusChanging.active ? '입찰 단위 사용 재개' : '입찰 단위 사용 중지'}
        >
          <form className="admin-bid-unit-form" onSubmit={submitStatus}>
            <div className="admin-bid-unit-form__code">
              <span>대상</span>
              <strong>{formatAmount(statusChanging.item.amount)}</strong>
            </div>
            <label>
              <span>변경 사유</span>
              <textarea
                autoFocus
                className="admin-reason-textarea"
                maxLength="500"
                onChange={(event) => setStatusReason(event.target.value)}
                value={statusReason}
              />
            </label>
            <AdminHistoryTimeline
              limit={30}
              referenceSn={statusChanging.item.bidUnitSn}
              referenceType="COMMON_CODE"
              title="입찰 단위 변경 이력"
            />
            {feedback && <p className="admin-bid-unit-form__feedback" role="alert">{feedback}</p>}
            <div className="admin-bid-unit-form__actions">
              <button className="btn btn-outline" disabled={statusMutation.isPending} onClick={closeDialogs} type="button">취소</button>
              <button
                className={statusChanging.active ? 'btn btn-primary' : 'btn btn-danger'}
                disabled={statusMutation.isPending}
                type="submit"
              >
                {statusMutation.isPending
                  ? '처리 중...'
                  : statusChanging.active ? '사용 재개' : '사용 중지'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </section>
  );
};

export default AdminBidUnitManagementPanel;

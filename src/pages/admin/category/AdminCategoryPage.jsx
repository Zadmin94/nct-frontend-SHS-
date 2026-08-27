import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ListOrdered,
  PencilLine,
  Plus,
  Save,
  X,
} from 'lucide-react';
import AdminModal from '@components/admin/AdminModal';
import AdminHistoryTimeline from '@components/admin/AdminHistoryTimeline';
import AdminPagination from '@components/admin/AdminPagination';
import AdminTable from '@components/admin/AdminTable';
import AdminPageHeader from '@components/admin/AdminPageHeader';
import AdminStatusBadge from '@components/admin/AdminStatusBadge';
import PageMeta from '@components/admin/PageMeta';
import { ADMIN_PAGE_SIZE } from '@/constants/adminPagination';
import {
  useAdminCategories,
  useReorderAdminCategories,
  useSaveAdminCategory,
} from '@hooks/useAdminCategories';
import useClientPagination from '@hooks/useClientPagination';
import { toast } from '@utils/common';
import '../notice/adminContentPages.css';
import './adminCategoryPage.css';

const PRODUCT_DOMAIN = 'CATC0001';
const SERVICE_DOMAIN = 'CATC0002';
const DOMAINS = [
  { code: PRODUCT_DOMAIN, label: '상품 카테고리' },
  { code: SERVICE_DOMAIN, label: '서비스 카테고리' },
];
const EMPTY_FORM = { name: '', active: true };
const PAGE_SIZE = ADMIN_PAGE_SIZE;

const normalizeCategoryName = (name) => name.trim().toLocaleLowerCase('ko-KR');

const FormVersionStatus = ({ activeVersion, draftVersion }) => {
  if (draftVersion) {
    return (
      <AdminStatusBadge tone="warning">
        {activeVersion
          ? `초안 v${draftVersion} · 운영 v${activeVersion}`
          : `초안 v${draftVersion} · 미발행`}
      </AdminStatusBadge>
    );
  }
  if (activeVersion) {
    return <AdminStatusBadge tone="success">발행 v{activeVersion}</AdminStatusBadge>;
  }
  return <AdminStatusBadge tone="neutral">폼 미등록</AdminStatusBadge>;
};

/** 담당자 7 · F-COM-003: 도메인별 카테고리 생성·수정·순서 관리를 독립적으로 처리한다. */
const AdminCategoryPanel = ({ domainCode, label }) => {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [moveFeedback, setMoveFeedback] = useState('');
  const [orderEditing, setOrderEditing] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [draggedCategorySn, setDraggedCategorySn] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const categoriesQuery = useAdminCategories(domainCode);
  const saveMutation = useSaveAdminCategory();
  const reorderMutation = useReorderAdminCategories();
  const categories = categoriesQuery.data ?? [];
  const managementCategories = [...categories].reverse();
  const isServiceDomain = domainCode === SERVICE_DOMAIN;
  const orderPending = reorderMutation.isPending;
  const {
    page,
    pagedItems: pagedCategories,
    setPage,
    totalItems,
    totalPages,
  } = useClientPagination(managementCategories, PAGE_SIZE);

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveFeedback('');
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, active: domainCode !== SERVICE_DOMAIN });
    setSaveFeedback('');
    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingId(category.categorySn);
    setForm({ name: category.name, active: category.active });
    setSaveFeedback('');
    setDialogOpen(true);
  };

  const change = ({ target }) => setForm((current) => ({
    ...current,
    [target.name]: target.type === 'checkbox' ? target.checked : target.value,
  }));

  const submit = async (event) => {
    event.preventDefault();
    setSaveFeedback('');
    const normalizedName = normalizeCategoryName(form.name);
    const duplicate = categories.some((category) => (
      category.categorySn !== editingId
      && normalizeCategoryName(category.name) === normalizedName
    ));
    if (duplicate) {
      setSaveFeedback('같은 분류에 동일한 이름의 카테고리가 이미 있습니다.');
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({
        domainCode,
        categorySn: editingId,
        payload: {
          name: form.name.trim(),
          professional: isServiceDomain,
          active: editingId ? form.active : (isServiceDomain ? false : form.active),
        },
      });
      if (!editingId) setPage(1);
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setSaveFeedback('');
      toast({ icon: 'success', title: '카테고리를 저장했습니다.', timer: 1800 });
      if (!editingId && isServiceDomain) {
        navigate(`/admin/categories/${saved.categorySn}/form`);
      }
    } catch (error) {
      setSaveFeedback(
        error.response?.data?.message
          || '저장하지 못했습니다. 입력값과 중복 이름을 확인해 주세요.',
      );
    }
  };

  const startOrderEditing = () => {
    setMoveFeedback('');
    setOrderedCategories([...categories]);
    setOrderEditing(true);
  };

  const cancelOrderEditing = () => {
    if (orderPending) return;
    setOrderEditing(false);
    setOrderedCategories([]);
    setMoveFeedback('');
    setDraggedCategorySn(null);
    setDragTarget(null);
  };

  const move = (category, direction) => {
    if (!orderEditing || orderPending) return;
    setOrderedCategories((current) => {
      const index = current.findIndex((item) => item.categorySn === category.categorySn);
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const saveOrder = async () => {
    if (!orderEditing || orderPending) return;
    setMoveFeedback('');
    try {
      await reorderMutation.mutateAsync({
        domainCode,
        categorySnOrder: orderedCategories.map((category) => category.categorySn),
      });
      setOrderEditing(false);
      setOrderedCategories([]);
      toast({ icon: 'success', title: '노출 순서를 저장했습니다.', timer: 1500 });
    } catch (error) {
      setMoveFeedback(error.response?.data?.message || '노출 순서를 저장하지 못했습니다.');
    }
  };

  const startDrag = (event, category) => {
    if (orderPending) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(category.categorySn));
    setDraggedCategorySn(category.categorySn);
    setDragTarget(null);
  };

  const dragOver = (event, category) => {
    if (!orderEditing || !draggedCategorySn || orderPending) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setDragTarget({ categorySn: category.categorySn, position });
  };

  const finishDrag = () => {
    setDraggedCategorySn(null);
    setDragTarget(null);
  };

  const drop = (event, targetCategory) => {
    event.preventDefault();
    const sourceCategorySn = draggedCategorySn
      ?? Number(event.dataTransfer.getData('text/plain'));
    const bounds = event.currentTarget.getBoundingClientRect();
    const dropPosition = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    finishDrag();
    if (!sourceCategorySn || sourceCategorySn === targetCategory.categorySn || orderPending) return;

    const currentIds = orderedCategories.map((category) => category.categorySn);
    const reorderedIds = [...currentIds];
    const sourceIndex = reorderedIds.indexOf(sourceCategorySn);
    if (sourceIndex < 0) return;
    const [movedCategorySn] = reorderedIds.splice(sourceIndex, 1);
    const targetIndex = reorderedIds.indexOf(targetCategory.categorySn);
    if (targetIndex < 0) return;
    const insertionIndex = dropPosition === 'after' ? targetIndex + 1 : targetIndex;
    reorderedIds.splice(insertionIndex, 0, movedCategorySn);
    if (reorderedIds.every((categorySn, index) => categorySn === currentIds[index])) return;

    const byId = new Map(orderedCategories.map((category) => [category.categorySn, category]));
    setOrderedCategories(reorderedIds.map((categorySn) => byId.get(categorySn)));
  };

  const orderItems = orderEditing ? orderedCategories : categories;
  const visibleCategories = orderEditing ? orderedCategories : pagedCategories;

  const columns = [
    {
      key: 'order',
      label: '노출 순서',
      render: (_, row) => {
        const orderIndex = orderItems.findIndex(
          (category) => category.categorySn === row.categorySn,
        );
        const dropPosition = dragTarget?.categorySn === row.categorySn
          && draggedCategorySn !== row.categorySn
          ? dragTarget.position
          : null;
        return (
          <div
            className={`admin-category-order${draggedCategorySn === row.categorySn ? ' is-dragging' : ''}${dropPosition ? ` is-drop-${dropPosition}` : ''}`}
            onKeyDown={(event) => {
              if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              move(row, event.key === 'ArrowUp' ? 'UP' : 'DOWN');
            }}
            onDragOver={(event) => dragOver(event, row)}
            onDrop={(event) => drop(event, row)}
            tabIndex={orderEditing ? 0 : undefined}
          >
            {orderEditing && (
              <button
                aria-label={`${row.name} 순서 끌어서 이동`}
                className="admin-category-drag-handle"
                disabled={orderPending}
                draggable={!orderPending}
                onDragEnd={finishDrag}
                onDragStart={(event) => startDrag(event, row)}
                title="잡고 끌어서 순서 변경"
                type="button"
              >
                <GripVertical />
              </button>
            )}
            <strong>{orderIndex + 1}</strong>
            {orderEditing && (
              <div>
                <button
                  aria-label={`${row.name} 위로 이동`}
                  disabled={orderIndex <= 0 || orderPending}
                  onClick={() => move(row, 'UP')}
                  title="위로 이동 (Alt+↑)"
                  type="button"
                >
                  <ArrowUp />
                </button>
                <button
                  aria-label={`${row.name} 아래로 이동`}
                  disabled={orderIndex < 0 || orderIndex >= orderItems.length - 1 || orderPending}
                  onClick={() => move(row, 'DOWN')}
                  title="아래로 이동 (Alt+↓)"
                  type="button"
                >
                  <ArrowDown />
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'name', label: '이름', className: 'admin-table__compact-text', render: (value) => <strong>{value}</strong> },
    {
      key: 'active',
      label: '상태',
      render: (value) => (
        <AdminStatusBadge tone={value ? 'success' : 'neutral'}>
          {value ? '사용 중' : '사용 중지'}
        </AdminStatusBadge>
      ),
    },
    ...(isServiceDomain ? [{
      key: 'formStatus',
      label: '요청 폼',
      render: (_, row) => orderEditing ? '-' : (
        <FormVersionStatus
          activeVersion={row.activeFormVersion}
          draftVersion={row.draftFormVersion}
        />
      ),
    }] : []),
    {
      key: 'manage',
      label: '관리',
      render: (_, row) => (
        <div className="admin-category-manage-actions">
          {isServiceDomain ? (
            <button
              className="btn btn-outline admin-category-edit-button"
              onClick={() => navigate(`/admin/categories/${row.categorySn}/form`)}
              type="button"
            >
              <PencilLine /> 폼 관리
            </button>
          ) : (
            <button
              className="btn btn-outline admin-category-edit-button"
              onClick={() => openEditDialog(row)}
              type="button"
            >
              <PencilLine /> 수정
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby={`category-panel-${domainCode}`} className="card admin-category-list">
      <div className="admin-category-panel__header">
        <div>
          <h2 id={`category-panel-${domainCode}`}>{label}</h2>
          <p>
            총 <strong>{totalItems}</strong>개
            {orderEditing ? ' · 실제 노출 순서대로 편집' : ' · 노출 순서 역순으로 표시'}
          </p>
        </div>
        <div className="admin-category-panel__actions">
          {orderEditing ? (
            <>
              <button
                className="btn btn-outline"
                disabled={orderPending}
                onClick={cancelOrderEditing}
                type="button"
              >
                <X /> 취소
              </button>
              <button
                className="btn btn-primary"
                disabled={orderPending}
                onClick={saveOrder}
                type="button"
              >
                <Save /> {orderPending ? '저장 중' : '순서 저장'}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-outline"
                disabled={categoriesQuery.isLoading || categoriesQuery.isError || categories.length < 2}
                onClick={startOrderEditing}
                type="button"
              >
                <ListOrdered /> 순서 편집
              </button>
              <button
                className="btn btn-primary admin-category-summary-action"
                disabled={categoriesQuery.isLoading || categoriesQuery.isError}
                onClick={openCreateDialog}
                type="button"
              >
                <Plus /> {label} 추가
              </button>
            </>
          )}
        </div>
      </div>
      {orderEditing && (
        <p className="admin-category-order-guide">
          전체 카테고리를 끌어 놓거나 화살표로 이동한 뒤 저장하세요. 키보드는 항목에서 Alt+↑·Alt+↓를 사용할 수 있습니다.
        </p>
      )}
      {moveFeedback && <p className="admin-category-feedback" role="alert">{moveFeedback}</p>}
      {categoriesQuery.isError && (
        <div className="admin-content-state is-error" role="alert">
          <strong>{label}를 불러오지 못했습니다.</strong>
          <button
            className="btn btn-outline"
            disabled={categoriesQuery.isFetching}
            onClick={() => categoriesQuery.refetch()}
            type="button"
          >
            다시 시도
          </button>
        </div>
      )}
      {!categoriesQuery.isError && (
        <>
          <div className="admin-table-scroll">
            <AdminTable
              columns={columns}
              data={visibleCategories}
              emptyMessage="등록된 카테고리가 없습니다."
              loading={categoriesQuery.isLoading}
              rowKey={(category) => category.categorySn}
            />
          </div>
          {!orderEditing && (
            <AdminPagination
              ariaLabel={`${label} 목록 페이지 이동`}
              disabled={categoriesQuery.isFetching}
              onPageChange={setPage}
              page={page}
              totalPages={totalPages}
            />
          )}
        </>
      )}

      {dialogOpen && (
        <AdminModal
          onClose={closeDialog}
          title={editingId
            ? '카테고리 수정'
            : `${isServiceDomain ? '서비스' : '상품'} 카테고리 추가`}
        >
          <form className="admin-category-form" onSubmit={submit}>
            <div className="admin-category-form__domain">
              <span>분류</span>
              <strong>{isServiceDomain ? '서비스 카테고리' : '상품 카테고리'}</strong>
              {!editingId && (
                <small>
                  저장하면 현재 {isServiceDomain ? '서비스' : '상품'} 목록의 마지막에 추가됩니다.
                </small>
              )}
            </div>
            <label>
              <span>카테고리 이름</span>
              <input
                autoFocus
                maxLength="100"
                name="name"
                onChange={change}
                placeholder="카테고리 이름을 입력해 주세요."
                required
                value={form.name}
              />
            </label>
            <label className="admin-category-check">
              <input
                checked={isServiceDomain && !editingId ? false : form.active}
                disabled={isServiceDomain && !editingId}
                name="active"
                onChange={change}
                type="checkbox"
              />
              사용자 화면에 노출
            </label>
            {isServiceDomain && !editingId && (
              <p className="admin-category-form__notice">
                새 서비스 카테고리는 요청 폼을 발행하면 자동으로 노출됩니다.
              </p>
            )}
            {saveFeedback && (
              <p className="admin-category-form__feedback" role="alert">{saveFeedback}</p>
            )}
            <div className="admin-category-form__actions">
              <button className="btn btn-outline" onClick={closeDialog} type="button">
                취소
              </button>
              <button className="btn btn-primary" disabled={saveMutation.isPending} type="submit">
                <Save /> {saveMutation.isPending ? '저장 중' : '저장'}
              </button>
            </div>
          </form>
          {editingId && (
            <AdminHistoryTimeline referenceSn={editingId} referenceType="CATEGORY" />
          )}
        </AdminModal>
      )}
    </section>
  );
};

/** 담당자 7 · F-COM-003: 상품과 서비스 카테고리를 한 화면의 좌우 영역에 함께 제공한다. */
const AdminCategoryPage = () => {
  return (
    <div className="admin-content-page admin-category-page">
      <PageMeta title="카테고리 관리" />
      <AdminPageHeader title="카테고리 관리" />
      <div className="admin-category-layout">
        {DOMAINS.map(({ code, label }) => (
          <AdminCategoryPanel domainCode={code} key={code} label={label} />
        ))}
      </div>
    </div>
  );
};

export default AdminCategoryPage;

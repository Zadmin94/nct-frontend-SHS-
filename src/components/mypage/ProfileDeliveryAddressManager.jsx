import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  createDeliveryAddress,
  deleteDeliveryAddress,
  setDefaultDeliveryAddress,
  updateDeliveryAddress,
} from '@api/memberApi';
import DeliveryAddressFormModal from '@components/member/DeliveryAddressFormModal';
import { ActionButton, StatusBadge } from '@components/common/ui';
import {
  DELIVERY_ADDRESSES_QUERY_KEY,
  useDeliveryAddresses,
} from '@hooks/useDeliveryAddresses';
import { confirm, toast } from '@utils/common';

const MAX_ADDRESS_COUNT = 10;

const resolveErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
);

const ProfileDeliveryAddressManager = () => {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [pendingDefaultId, setPendingDefaultId] = useState(null);
  const {
    data: addresses = [],
    isLoading,
    isError,
    refetch,
  } = useDeliveryAddresses();

  const sortedAddresses = [...addresses].sort((left, right) => (
    Number(right.defaultAddress) - Number(left.defaultAddress)
    || Number(left.deliveryAddressId) - Number(right.deliveryAddressId)
  ));
  const currentDefaultId = addresses.find((item) => item.defaultAddress)?.deliveryAddressId
    ?? addresses[0]?.deliveryAddressId
    ?? null;
  const selectedDefaultId = addresses.some((item) => (
    Number(item.deliveryAddressId) === Number(pendingDefaultId)
  ))
    ? pendingDefaultId
    : currentDefaultId;
  const hasDefaultChange = selectedDefaultId != null
    && Number(selectedDefaultId) !== Number(currentDefaultId);

  const saveMutation = useMutation({
    mutationFn: ({ deliveryAddressId, payload }) => (
      deliveryAddressId
        ? updateDeliveryAddress(deliveryAddressId, payload)
        : createDeliveryAddress(payload)
    ),
    onSuccess: (_savedAddress, variables) => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_ADDRESSES_QUERY_KEY });
      setEditor(null);
      toast({
        icon: 'success',
        title: variables.deliveryAddressId ? '배송지를 수정했습니다.' : '배송지를 추가했습니다.',
      });
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultDeliveryAddress,
    onSuccess: (updatedAddress) => {
      queryClient.setQueryData(DELIVERY_ADDRESSES_QUERY_KEY, (current = []) => (
        current.map((item) => ({
          ...item,
          defaultAddress: Number(item.deliveryAddressId)
            === Number(updatedAddress.deliveryAddressId),
        }))
      ));
      setPendingDefaultId(updatedAddress.deliveryAddressId);
      queryClient.invalidateQueries({ queryKey: DELIVERY_ADDRESSES_QUERY_KEY });
      toast({ icon: 'success', title: '기본 배송지를 저장했습니다.' });
    },
    onError: (error) => {
      toast({
        icon: 'error',
        title: resolveErrorMessage(error, '기본 배송지를 저장하지 못했습니다.'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryAddress,
    onSuccess: (_result, deliveryAddressId) => {
      queryClient.setQueryData(DELIVERY_ADDRESSES_QUERY_KEY, (current = []) => (
        current.filter((item) => (
          Number(item.deliveryAddressId) !== Number(deliveryAddressId)
        ))
      ));
      if (Number(pendingDefaultId) === Number(deliveryAddressId)) {
        setPendingDefaultId(null);
      }
      queryClient.invalidateQueries({ queryKey: DELIVERY_ADDRESSES_QUERY_KEY });
      toast({ icon: 'success', title: '배송지를 삭제했습니다.' });
    },
    onError: (error) => {
      toast({
        icon: 'error',
        title: resolveErrorMessage(error, '배송지를 삭제하지 못했습니다.'),
      });
    },
  });

  const openCreate = () => {
    saveMutation.reset();
    setEditor({ mode: 'create' });
  };

  const openEdit = (address) => {
    saveMutation.reset();
    setEditor({ mode: 'edit', address });
  };

  const closeEditor = () => {
    if (saveMutation.isPending) return;
    saveMutation.reset();
    setEditor(null);
  };

  const handleDelete = async (address) => {
    if (address.defaultAddress) return;

    const confirmed = await confirm({
      title: '배송지를 삭제하시겠습니까?',
      text: `${address.name} 배송지는 삭제 후 복구할 수 없습니다.`,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    });
    if (confirmed) deleteMutation.mutate(address.deliveryAddressId);
  };

  const isChanging = saveMutation.isPending
    || defaultMutation.isPending
    || deleteMutation.isPending;

  return (
    <section className="border-y border-[#e8e9ec] py-4" aria-labelledby="profile-delivery-address-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          className="m-0 text-[14px] font-bold text-[#404040]"
          id="profile-delivery-address-title"
        >
          배송지 관리
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {!isLoading && !isError && (
            <span className="text-[12px] font-bold tabular-nums text-[#777]">
              {addresses.length}/{MAX_ADDRESS_COUNT}
            </span>
          )}
          <ActionButton
            className="shrink-0"
            disabled={addresses.length >= MAX_ADDRESS_COUNT || isLoading || isError}
            onClick={openCreate}
            size="sm"
            title={addresses.length >= MAX_ADDRESS_COUNT
              ? '배송지는 최대 10개까지 등록할 수 있습니다.'
              : '배송지 추가'}
            tone="neutral"
          >
            <Plus aria-hidden="true" size={14} />
            추가
          </ActionButton>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 grid gap-2" aria-label="배송지 목록 불러오는 중">
          <div className="h-[58px] animate-pulse rounded-[5px] bg-[#f4f5f7]" />
          <div className="h-[58px] animate-pulse rounded-[5px] bg-[#f4f5f7]" />
        </div>
      ) : isError ? (
        <div className="mt-3 flex min-h-[58px] items-center justify-between gap-3 rounded-[5px] bg-[#f7f7f7] px-3">
          <span className="text-[13px] text-[#666]">배송지를 불러오지 못했습니다.</span>
          <button
            className="shrink-0 text-[13px] font-bold text-primary hover:underline"
            onClick={() => refetch()}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : sortedAddresses.length === 0 ? (
        <div className="mt-3 flex min-h-[58px] items-center gap-2 bg-[#f7f7f7] px-3 text-[13px] text-[#666]">
          <MapPin aria-hidden="true" className="shrink-0 text-[#888]" size={16} />
          등록된 배송지가 없습니다.
        </div>
      ) : (
        <div className="mt-3 divide-y divide-[#ececec] border-y border-[#ececec]">
          {sortedAddresses.map((address) => (
            <div className="flex min-w-0 items-center gap-3 py-3" key={address.deliveryAddressId}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input
                  aria-label={`${address.name}을 기본 배송지로 선택`}
                  checked={Number(selectedDefaultId) === Number(address.deliveryAddressId)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                  disabled={isChanging}
                  name="default-delivery-address"
                  onChange={() => setPendingDefaultId(address.deliveryAddressId)}
                  type="radio"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-[14px] text-[#333]">{address.name}</strong>
                    {address.defaultAddress && (
                      <StatusBadge tone="info" variant="soft">
                        기본
                      </StatusBadge>
                    )}
                  </span>
                  <span className="mt-0.5 block break-words text-[13px] leading-5 text-[#666]">
                    [{address.zip}] {address.address}{address.addressDetail ? ` ${address.addressDetail}` : ''}
                  </span>
                </span>
              </label>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label={`${address.name} 배송지 수정`}
                  className="grid size-8 place-items-center rounded-[5px] text-[#666] hover:bg-[#f2f4f7] hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isChanging}
                  onClick={() => openEdit(address)}
                  title="수정"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={15} />
                </button>
                <button
                  aria-label={`${address.name} 배송지 삭제`}
                  className="grid size-8 place-items-center rounded-[5px] text-[#777] hover:bg-[#fff1f0] hover:text-[#b3261e] disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isChanging || address.defaultAddress}
                  onClick={() => handleDelete(address)}
                  title={address.defaultAddress
                    ? '기본 배송지는 삭제할 수 없습니다.'
                    : '삭제'}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && sortedAddresses.length > 0 && (
        <div className="mt-3 flex justify-end">
          <ActionButton
            disabled={!hasDefaultChange || isChanging}
            onClick={() => defaultMutation.mutate(selectedDefaultId)}
            size="sm"
            tone="outline"
          >
            {defaultMutation.isPending ? '저장 중...' : '기본 배송지로 저장'}
          </ActionButton>
        </div>
      )}

      {editor && (
        <DeliveryAddressFormModal
          address={editor.address}
          defaultAddress={addresses.length === 0}
          errorMessage={saveMutation.error
            ? resolveErrorMessage(saveMutation.error, '배송지를 저장하지 못했습니다.')
            : ''}
          isSaving={saveMutation.isPending}
          key={editor.address?.deliveryAddressId ?? 'new-address'}
          onClose={closeEditor}
          onSave={(payload) => saveMutation.mutateAsync({
            deliveryAddressId: editor.address?.deliveryAddressId,
            payload,
          })}
        />
      )}
    </section>
  );
};

export default ProfileDeliveryAddressManager;

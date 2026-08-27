import { useEffect, useRef, useState } from 'react';
import DaumPostcode from 'react-daum-postcode';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { ActionButton } from '@components/common/ui';

const FIELD_CLASS = 'h-11 w-full rounded-[5px] border border-[#d9d9d9] bg-white px-3 text-body-md text-[#333] outline-none transition-colors focus:border-primary disabled:bg-[#f6f6f6] disabled:text-[#888]';

const AuctionDeliveryAddressModal = ({
  addresses = [],
  selectedAddressId,
  isSaving,
  errorMessage,
  onClose,
  onSelect,
  onSave,
}) => {
  const [view, setView] = useState(addresses.length > 0 ? 'list' : 'form');
  const [addressId, setAddressId] = useState(selectedAddressId ?? null);
  const [form, setForm] = useState({
    name: '',
    zip: '',
    address: '',
    addressDetail: '',
    defaultAddress: addresses.length === 0,
  });
  const [validationMessage, setValidationMessage] = useState('');
  const detailInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const resetForm = () => {
    setForm({
      name: '',
      zip: '',
      address: '',
      addressDetail: '',
      defaultAddress: addresses.length === 0,
    });
    setValidationMessage('');
  };

  const openCreateForm = () => {
    resetForm();
    setView('form');
  };

  const handleAddressComplete = (data) => {
    const address = data.roadAddress || data.jibunAddress || '';
    const zip = data.zonecode || '';
    if (!address || !zip) return;
    setForm((current) => ({ ...current, address, zip }));
    setValidationMessage('');
    setView('form');
    window.requestAnimationFrame(() => detailInputRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setValidationMessage('배송지명을 입력해 주세요.');
      return;
    }
    if (!form.zip.trim() || !form.address.trim()) {
      setValidationMessage('주소 검색을 통해 배송지를 선택해 주세요.');
      return;
    }

    setValidationMessage('');
    try {
      await onSave({
        name: form.name.trim(),
        zip: form.zip.trim(),
        address: form.address.trim(),
        addressDetail: form.addressDetail.trim(),
        defaultAddress: form.defaultAddress,
      });
    } catch {
      // 서버 오류 메시지는 부모가 모달 안으로 전달합니다.
    }
  };

  const handleSelect = () => {
    if (addressId == null) {
      setValidationMessage('사용할 배송지를 선택해 주세요.');
      return;
    }
    onSelect(addressId);
  };

  const closeFromBackdrop = (event) => {
    if (event.target === event.currentTarget && !isSaving) onClose();
  };

  const isSearchView = view === 'search';
  const isListView = view === 'list';
  const isFormValid = Boolean(
    form.name.trim() && form.zip.trim() && form.address.trim(),
  );

  return (
    <div
      aria-labelledby="auction-delivery-address-title"
      aria-modal="true"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={closeFromBackdrop}
      role="dialog"
    >
      <section
        className="flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_54px_rgba(0,0,0,0.22)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#ececec] px-5">
          <div className="flex min-w-0 items-center gap-3">
            {!isListView ? (
              <button
                aria-label={isSearchView ? '배송지 입력으로 돌아가기' : '배송지 목록으로 돌아가기'}
                className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-[#444] hover:bg-[#f3f3f3]"
                onClick={() => setView(isSearchView ? 'form' : 'list')}
                title="뒤로"
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={20} />
              </button>
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-primary">
                <MapPin aria-hidden="true" size={20} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="m-0 text-body-lg font-bold text-[#1d1d1f]" id="auction-delivery-address-title">
                {isSearchView ? '주소 검색' : (isListView ? '배송지 선택' : '배송지 등록')}
              </h2>
              {!isSearchView && (
                <p className="m-0 mt-0.5 text-body-sm text-[#666]">
                  {isListView ? '이번 거래에 사용할 배송지를 선택해 주세요.' : '새 배송지 정보를 입력해 주세요.'}
                </p>
              )}
            </div>
          </div>
          <button
            aria-label="배송지 선택 닫기"
            className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-[#666] hover:bg-[#f3f3f3]"
            disabled={isSaving}
            onClick={onClose}
            title="닫기"
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        {isSearchView ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DaumPostcode autoClose={false} onComplete={handleAddressComplete} style={{ height: 470 }} />
          </div>
        ) : isListView ? (
          <div className="grid min-h-0 gap-4 overflow-y-auto p-5">
            <div className="grid gap-2" role="radiogroup" aria-label="배송지 목록">
              {addresses.map((item) => {
                const selected = Number(addressId) === Number(item.deliveryAddressId);
                return (
                  <label
                    className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border p-3.5 transition-colors ${
                      selected
                        ? 'border-primary bg-primary-light'
                        : 'border-[#dedede] bg-white hover:border-[#9bbfff]'
                    }`}
                    key={item.deliveryAddressId}
                  >
                    <input
                      className="mt-1 size-4 accent-primary"
                      checked={selected}
                      name="deliveryAddress"
                      onChange={() => setAddressId(item.deliveryAddressId)}
                      type="radio"
                      value={item.deliveryAddressId}
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-body-md font-bold text-[#1d1d1f]">
                        {item.name}
                        {item.defaultAddress && (
                          <span className="rounded-full bg-[#e7efff] px-2 py-0.5 text-caption text-primary-dark">기본</span>
                        )}
                      </span>
                      <span className="mt-1 block break-words text-body-sm leading-5 text-[#555]">
                        [{item.zip}] {item.address}{item.addressDetail ? ` ${item.addressDetail}` : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <ActionButton
              onClick={openCreateForm}
              tone="neutral"
            >
              <Plus aria-hidden="true" size={18} />
              새 배송지 등록
            </ActionButton>

            <p
              aria-hidden={!(validationMessage || errorMessage)}
              aria-live="polite"
              className={`m-0 min-h-[42px] rounded-[5px] px-3 py-2.5 text-body-sm text-[#c5221f] ${
                validationMessage || errorMessage ? 'visible bg-[#fff1f0]' : 'invisible'
              }`}
              role={validationMessage || errorMessage ? 'alert' : undefined}
            >
              {validationMessage || errorMessage || '\u00a0'}
            </p>

            <ActionButton
              disabled={addressId == null || isSaving}
              fullWidth
              loading={isSaving}
              onClick={handleSelect}
              size="lg"
            >
              이 배송지 사용
            </ActionButton>
          </div>
        ) : (
          <form className="grid gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="auction-delivery-address-name">
                배송지명 <span className="text-[#d93025]">*</span>
              </label>
              <input
                className={FIELD_CLASS}
                id="auction-delivery-address-name"
                maxLength={50}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="예: 집, 회사"
                value={form.name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="auction-delivery-address">
                주소 <span className="text-[#d93025]">*</span>
              </label>
              <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2 max-sm:grid-cols-1">
                <input
                  className={FIELD_CLASS}
                  disabled={!form.address}
                  id="auction-delivery-address"
                  placeholder="주소 검색을 눌러주세요."
                  readOnly
                  value={form.address}
                />
                <ActionButton
                  onClick={() => setView('search')}
                  tone="neutral"
                >
                  <Search aria-hidden="true" size={18} />
                  주소 검색
                </ActionButton>
              </div>
              <p className="m-0 min-h-5 text-body-sm text-[#777]">
                {form.zip ? `우편번호 ${form.zip}` : '우편번호와 기본주소는 필수입니다.'}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="auction-delivery-address-detail">
                상세주소 <span className="font-normal text-[#888]">(선택)</span>
              </label>
              <input
                className={FIELD_CLASS}
                disabled={!form.address}
                id="auction-delivery-address-detail"
                maxLength={200}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  addressDetail: event.target.value,
                }))}
                placeholder={form.address ? '동·호수 등 상세주소' : '주소 검색 후 입력할 수 있습니다.'}
                ref={detailInputRef}
                value={form.addressDetail}
              />
            </div>

            {addresses.length > 0 && (
              <label className="flex items-center gap-2 text-body-sm text-[#555]">
                <input
                  checked={form.defaultAddress}
                  className="size-4 accent-primary"
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    defaultAddress: event.target.checked,
                  }))}
                  type="checkbox"
                />
                기본 배송지로 설정
              </label>
            )}

            <p
              aria-hidden={!(validationMessage || errorMessage)}
              aria-live="polite"
              className={`m-0 min-h-[42px] rounded-[5px] px-3 py-2.5 text-body-sm text-[#c5221f] ${
                validationMessage || errorMessage ? 'visible bg-[#fff1f0]' : 'invisible'
              }`}
              role={validationMessage || errorMessage ? 'alert' : undefined}
            >
              {validationMessage || errorMessage || '\u00a0'}
            </p>

            <ActionButton
              disabled={isSaving || !isFormValid}
              fullWidth
              loading={isSaving}
              size="lg"
              type="submit"
            >
              {isSaving ? '저장 중...' : '배송지 저장'}
            </ActionButton>
          </form>
        )}
      </section>
    </div>
  );
};

export default AuctionDeliveryAddressModal;

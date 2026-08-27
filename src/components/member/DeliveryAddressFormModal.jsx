import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DaumPostcode from 'react-daum-postcode';
import {
  ArrowLeft,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import useBodyScrollLock from '@hooks/useBodyScrollLock';

const FIELD_CLASS = 'h-11 w-full rounded-[5px] border border-[#d9d9d9] bg-white px-3 text-body-md text-[#333] outline-none transition-colors focus:border-primary disabled:bg-[#f6f6f6] disabled:text-[#888]';

const createInitialForm = (address, defaultAddress) => ({
  name: address?.name ?? '',
  zip: address?.zip ?? '',
  address: address?.address ?? '',
  addressDetail: address?.addressDetail ?? '',
  defaultAddress: address?.defaultAddress ?? defaultAddress,
});

const DeliveryAddressFormModal = ({
  address,
  defaultAddress = false,
  errorMessage,
  isSaving = false,
  onClose,
  onSave,
}) => {
  const [view, setView] = useState('form');
  const [form, setForm] = useState(() => createInitialForm(address, defaultAddress));
  const [validationMessage, setValidationMessage] = useState('');
  const detailInputRef = useRef(null);
  const isEditing = Boolean(address);
  const isSearchView = view === 'search';
  const isFormValid = Boolean(
    form.name.trim() && form.zip.trim() && form.address.trim(),
  );
  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const handleAddressComplete = (data) => {
    const selectedAddress = data.roadAddress || data.jibunAddress || '';
    const zip = data.zonecode || '';
    if (!selectedAddress || !zip) return;

    setForm((current) => ({
      ...current,
      address: selectedAddress,
      zip,
    }));
    setValidationMessage('');
    setView('form');
    window.requestAnimationFrame(() => detailInputRef.current?.focus());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
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
      // 서버 오류는 부모 mutation의 errorMessage로 같은 모달 안에 표시합니다.
    }
  };

  const closeFromBackdrop = (event) => {
    if (event.target === event.currentTarget && !isSaving) onClose();
  };

  return createPortal((
    <div
      aria-labelledby="delivery-address-form-title"
      aria-modal="true"
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4 max-sm:items-end max-sm:p-0"
      onMouseDown={closeFromBackdrop}
      role="dialog"
    >
      <section
        className="flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_54px_rgba(0,0,0,0.22)] max-sm:max-h-[92dvh] max-sm:rounded-b-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#ececec] px-5">
          <div className="flex min-w-0 items-center gap-3">
            {isSearchView ? (
              <button
                aria-label="배송지 입력으로 돌아가기"
                className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-[#444] hover:bg-[#f3f3f3]"
                onClick={() => setView('form')}
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
              <h2 className="m-0 text-body-lg font-bold text-[#1d1d1f]" id="delivery-address-form-title">
                {isSearchView ? '주소 검색' : (isEditing ? '배송지 수정' : '배송지 추가')}
              </h2>
              {!isSearchView && (
                <p className="m-0 mt-0.5 text-body-sm text-[#666]">
                  경매 배송 거래에 사용할 주소를 입력해 주세요.
                </p>
              )}
            </div>
          </div>
          <button
            aria-label="배송지 입력 닫기"
            className="grid size-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-[#666] hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:opacity-50"
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
            <DaumPostcode
              autoClose={false}
              onComplete={handleAddressComplete}
              style={{ height: 470 }}
            />
          </div>
        ) : (
          <form className="grid gap-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="delivery-address-name">
                배송지명 <span className="text-[#d93025]">*</span>
              </label>
              <input
                autoFocus
                className={FIELD_CLASS}
                id="delivery-address-name"
                maxLength={50}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))}
                placeholder="예: 집, 회사"
                value={form.name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="delivery-address-address">
                주소 <span className="text-[#d93025]">*</span>
              </label>
              <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2 max-sm:grid-cols-1">
                <input
                  className={FIELD_CLASS}
                  disabled={!form.address}
                  id="delivery-address-address"
                  placeholder="주소 검색을 눌러주세요."
                  readOnly
                  value={form.address}
                />
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[5px] border border-[#333] bg-white px-3 text-body-md font-bold text-[#333] hover:bg-[#f6f6f6]"
                  onClick={() => setView('search')}
                  type="button"
                >
                  <Search aria-hidden="true" size={18} />
                  주소 검색
                </button>
              </div>
              <p className="m-0 min-h-5 text-body-sm text-[#777]">
                {form.zip ? `우편번호 ${form.zip}` : '우편번호와 기본주소는 필수입니다.'}
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-body-md font-bold text-[#333]" htmlFor="delivery-address-detail">
                상세주소 <span className="font-normal text-[#888]">(선택)</span>
              </label>
              <input
                className={FIELD_CLASS}
                disabled={!form.address}
                id="delivery-address-detail"
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

            <button
              className="h-12 w-full rounded-[5px] border border-primary bg-primary text-body-md font-bold text-white hover:bg-[#0058df] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !isFormValid}
              type="submit"
            >
              {isSaving ? '저장 중...' : (isEditing ? '배송지 수정' : '배송지 추가')}
            </button>
          </form>
        )}
      </section>
    </div>
  ), document.body);
};

export default DeliveryAddressFormModal;

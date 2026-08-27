import { useQuery } from '@tanstack/react-query';
import { getDeliveryAddresses } from '@api/memberApi';

export const DELIVERY_ADDRESSES_QUERY_KEY = ['member', 'delivery-addresses'];

export const useDeliveryAddresses = ({ enabled = true } = {}) => useQuery({
  queryKey: DELIVERY_ADDRESSES_QUERY_KEY,
  queryFn: getDeliveryAddresses,
  enabled,
  staleTime: 5 * 60 * 1000,
});

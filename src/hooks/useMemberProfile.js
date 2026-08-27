import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@api/memberApi';

export const MEMBER_PROFILE_QUERY_KEY = ['member', 'profile'];

const fetchMemberProfile = () => getProfile().then((response) => response.data);

export const memberProfileQueryOptions = {
  queryKey: MEMBER_PROFILE_QUERY_KEY,
  queryFn: fetchMemberProfile,
  staleTime: Infinity,
  gcTime: Infinity,
};

export const hasDeliveryAddress = (profile) => (
  [profile?.zip, profile?.address]
    .every((value) => typeof value === 'string' && value.trim())
);

export const useMemberProfile = ({ enabled = true } = {}) => useQuery({
  ...memberProfileQueryOptions,
  enabled,
});

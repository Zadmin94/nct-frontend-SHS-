import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPortfolio,
  deletePortfolio,
  fetchMyPortfolios,
  fetchMyProviderProfile,
  fetchPublicPortfolios,
  fetchPublicProviderProfile,
  updatePortfolio,
  updateMyProviderProfile,
} from '@api/providerProfileApi';

// 담당자 7 · F-PROV-004: 화면이 Axios 세부사항을 직접 알지 않도록 프로필 요청을 모은다.
export const providerProfileKeys = {
  mine: ['provider-profile', 'mine'],
  public: (providerUserSn) => ['provider-profile', 'public', providerUserSn],
  portfolios: {
    all: ['provider-portfolio'],
    mine: ['provider-portfolio', 'mine'],
    public: (providerUserSn) => ['provider-portfolio', 'public', providerUserSn],
  },
};

export const useMyProviderProfile = () => useQuery({
  queryKey: providerProfileKeys.mine,
  queryFn: fetchMyProviderProfile,
});

export const useUpdateMyProviderProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProviderProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(providerProfileKeys.mine, profile);
      queryClient.setQueryData(providerProfileKeys.public(profile.userSn), profile);
    },
  });
};

export const usePublicProviderProfile = (providerUserSn) => useQuery({
  queryKey: providerProfileKeys.public(providerUserSn),
  queryFn: () => fetchPublicProviderProfile(providerUserSn),
  enabled: Number.isSafeInteger(providerUserSn) && providerUserSn > 0,
});

export const useMyPortfolios = () => useQuery({
  queryKey: providerProfileKeys.portfolios.mine,
  queryFn: fetchMyPortfolios,
});

export const usePublicPortfolios = (providerUserSn) => useQuery({
  queryKey: providerProfileKeys.portfolios.public(providerUserSn),
  queryFn: () => fetchPublicPortfolios(providerUserSn),
  enabled: Number.isSafeInteger(providerUserSn) && providerUserSn > 0,
});

const usePortfolioMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: providerProfileKeys.portfolios.all,
    }),
  });
};

export const useCreatePortfolio = () => usePortfolioMutation(createPortfolio);
export const useUpdatePortfolio = () => usePortfolioMutation(updatePortfolio);

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePortfolio,
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: providerProfileKeys.portfolios.all,
    }),
  });
};

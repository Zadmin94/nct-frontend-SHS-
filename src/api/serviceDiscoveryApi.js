import api from './axios';
import {
  fetchPublicPortfolios as fetchProviderPortfolios,
  fetchPublicProviderProfile as fetchProviderProfile,
} from '@api/providerProfileApi';
import { getUserReviews } from '@api/reviewApi';

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeRequest = (item) => ({
  id: firstDefined(item.svcReqSn, item.serviceRequestId, item.id),
  title: firstDefined(item.svcReqTtl, item.title, ''),
  description: firstDefined(item.svcReqCn, item.description, item.summary, ''),
  categoryName: firstDefined(item.catNm, item.categoryName, item.category, ''),
  regionName: firstDefined(item.regionName, item.region, item.availableArea, ''),
  budgetAmount: toNumber(firstDefined(item.svcReqBdgtAmt, item.budgetAmount, item.budget)),
  budgetLabel: firstDefined(item.budgetLabel, ''),
  statusCode: firstDefined(item.svcReqStatusCd, item.statusCode, ''),
  statusName: firstDefined(item.svcReqStatusNm, item.statusName, item.status, ''),
  quoteCount: firstDefined(item.quoteCount, item.quotationCount),
  registeredAt: firstDefined(item.svcReqRegDt, item.registeredAt, item.createdAt),
  imageUrl: firstDefined(item.thumbnailUrl, item.imageUrl, item.imageList?.[0]?.url, ''),
});

const normalizeDiscoveryResult = (payload, requestedPage, requestedSize) => {
  const source = payload ?? {};
  const pageSource = source.page && typeof source.page === 'object' ? source.page : source;
  const rawItems = firstDefined(
    source.items,
    source.list,
    source.content,
    pageSource.content,
    source.results,
    [],
  );
  const total = toNumber(firstDefined(
    source.total,
    source.totalCount,
    source.totalElements,
    pageSource.totalElements,
    rawItems.length,
  ));
  const totalPages = Math.max(0, toNumber(firstDefined(
    source.totalPages,
    pageSource.totalPages,
    Math.ceil(total / requestedSize),
  )));
  const rawResponsePage = toNumber(
    firstDefined(source.pageNumber, pageSource.number, source.page),
    requestedPage,
  );
  const counts = source.counts ?? {};

  return {
    items: rawItems.map(normalizeRequest),
    total,
    totalPages,
    page: rawResponsePage,
    size: toNumber(firstDefined(source.size, pageSource.size), requestedSize),
    counts: {
      requests: firstDefined(counts.requests, source.requestCount, total),
    },
    view: 'requests',
  };
};

export const fetchServiceDiscovery = async ({
  keyword = '',
  categorySn = '',
  minBudget = 0,
  maxBudget = 0,
  sort = '',
  page = 1,
  size = 12,
}) => {
  const response = await api.get('/service-requests', {
    params: {
      keyword: keyword.trim() || undefined,
      categorySn: categorySn || undefined,
      minBudget: minBudget || undefined,
      maxBudget: maxBudget || undefined,
      sort: sort || undefined,
      page: Math.max(1, page),
      size,
    },
    skipServerErrorRedirect: true,
  });
  return normalizeDiscoveryResult(response.data.data, page, size);
};

export const fetchPublicProviderProfile = async (providerId) => {
  const [profile, portfolios, reviewResponse] = await Promise.all([
    fetchProviderProfile(Number(providerId)),
    fetchProviderPortfolios(Number(providerId)),
    getUserReviews(Number(providerId), {
      dealType: 'service',
      page: 0,
      size: 10,
    }).catch(() => null),
  ]);
  const serviceReviews = reviewResponse?.data?.content ?? [];

  return {
    id: profile.userSn,
    name: profile.displayName || `제공자 ${profile.userSn}`,
    profileImageUrl: profile.profileImageUrl,
    verified: true,
    rating: Number(profile.reviewAverageScore ?? 0),
    reviewCount: Number(profile.reviewCount ?? 0),
    completedCount: null,
    responseRate: null,
    categories: profile.categories ?? [],
    regions: profile.availableArea ? [profile.availableArea] : [],
    intro: profile.introduction || '등록된 소개가 없습니다.',
    reviews: serviceReviews.map((review) => ({
      id: review.reviewId,
      score: Number(review.rating ?? 0),
      content: review.content || '작성된 리뷰 내용이 없습니다.',
      author: review.reviewerName || '회원',
      date: review.createdDate || '작성일 미정',
    })),
    portfolios: (portfolios ?? []).map((portfolio) => {
      const representative = portfolio.files?.find((file) => file.representative)
        ?? portfolio.files?.[0];
      return {
        id: portfolio.portfolioSn,
        title: portfolio.title,
        category: null,
        description: portfolio.content || '등록된 설명이 없습니다.',
        imageUrl: representative?.url ?? null,
        images: portfolio.files ?? [],
      };
    }),
  };
};

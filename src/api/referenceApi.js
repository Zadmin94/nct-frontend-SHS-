import api from './axios';

export const fetchReferenceCodes = async (groupCode) => {
  const response = await api.get('/reference/codes', {
    params: { groupCd: groupCode },
  });
  return response.data.data;
};

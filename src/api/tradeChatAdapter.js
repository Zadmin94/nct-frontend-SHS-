const getResponseBody = (response) => response?.data ?? response;

const formatChatDateTime = (value) => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return '-';
  }

  return normalizedValue.replace('T', ' ').slice(11, 16) || normalizedValue;
};

const normalizeRoomStatus = (status) => {
  if (status === 'CHRC0001' || status === 'ACTIVE') {
    return 'ACTIVE';
  }

  return 'CLOSED';
};

/** 서버 채팅방 DTO를 기존 채팅 화면 표시 형식으로 변환한다. */
export const toTradeChatRooms = (response) => {
  const body = getResponseBody(response);
  const rooms = Array.isArray(body) ? body : body?.content ?? body?.items ?? [];

  return rooms.map((room) => {
    // 새 목록 계약이 배포되기 전에도 기존 응답의 상품명 유무로 물건 직거래를 안전하게 유지한다.
    const tradeTypeCode = room.tradeTypeCode
      ?? (room.productName ? 'TRDC0001' : room.tradeTitle ? 'TRDC0002' : null);

    return {
    roomId: String(room.roomId),
    tradeId: room.tradeId,
    counterpartNickname: room.counterpartNickname ?? '-',
    counterpartUserId: room.counterpartUserId ?? null,
    // 기존 채팅 화면의 productName 표시 키는 유지하되, 서비스 거래에서는 요청 제목을 우선 표시한다.
    productName: room.tradeTitle ?? room.productName ?? '-',
    tradeTypeCode,
    viewerRole: room.viewerRole ?? null,
    roomStatus: normalizeRoomStatus(room.roomStatus),
    lastMessage: room.lastMessage ?? '아직 주고받은 메시지가 없습니다.',
    latestMessageAt: formatChatDateTime(room.latestMessageAt),
    unreadCount: Number(room.unreadCount ?? 0),
    };
  });
};

/** 현재 모드에 맞는 채팅만 노출한다. 제공자 모드에서는 본인 제공 서비스 대화만 확인한다. */
export const filterTradeChatRoomsForCurrentRole = (rooms, isProvider) => rooms.filter((room) => {
  if (isProvider) {
    return room.tradeTypeCode === 'TRDC0002'
      && (room.viewerRole === 'PROVIDER' || room.viewerRole === null);
  }

  return room.tradeTypeCode === 'TRDC0001'
    || (room.tradeTypeCode === 'TRDC0002'
      && (room.viewerRole === 'REQUESTER' || room.viewerRole === null));
});

/** 서버 메시지 DTO를 현재 로그인 사용자를 기준으로 한 화면 데이터로 변환한다. */
export const toTradeChatMessages = (response) => {
  const body = getResponseBody(response);
  const messages = Array.isArray(body) ? body : body?.messages ?? body?.content ?? [];

  return messages.map((message) => ({
    messageId: String(message.messageId),
    senderType: message.senderType,
    content: message.content,
    sentAt: formatChatDateTime(message.sentAt),
    isRead: Boolean(message.read ?? message.isRead),
  }));
};

/** 메시지 전송 응답 한 건을 채팅 목록에 즉시 추가할 화면 데이터로 변환한다. */
export const toTradeChatMessage = (response) => {
  const body = getResponseBody(response);

  return {
    messageId: String(body.messageId),
    senderType: body.senderType,
    content: body.content,
    sentAt: formatChatDateTime(body.sentAt),
    isRead: Boolean(body.read ?? body.isRead),
  };
};

// src/layouts/MyPageReviewLayout.jsx
// 리뷰 작성/수정 페이지에서 마이페이지 왼쪽 사이드바를 유지하기 위한 레이아웃
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import MyPageSidebar from "@components/mypage/MyPageSidebar";
import { useAuth } from "@hooks/useAuth";
import { getMyPagePath } from "@/routes/myPageRoutes";

export default function MyPageReviewLayout() {
  const navigate = useNavigate();
  const { isProvider } = useAuth();

  const handleSelect = (section) => {
    navigate(getMyPagePath(section));
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 lg:px-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
        <MyPageSidebar
          mode={isProvider ? "provider" : "general"}
          activeSection="review"
          onSelect={handleSelect}
        />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

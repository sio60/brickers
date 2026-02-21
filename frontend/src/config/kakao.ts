export const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID as string;
export const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI as string;

export function getKakaoAuthorizeUrl() {
  const base = "https://kauth.kakao.com/oauth/authorize";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
  });
  return `${base}?${params.toString()}`;
}
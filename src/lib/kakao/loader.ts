const SCRIPT_ID = "kakao-maps-sdk";

let loaderPromise: Promise<typeof kakao> | null = null;

/**
 * 카카오맵 SDK를 한 번만 로드해 재사용한다(여러 지도 컴포넌트가 동시에 마운트돼도 안전).
 * 키 미설정 시에는 명확한 에러로 reject해 호출부가 안내 문구를 보여줄 수 있게 한다.
 */
export function loadKakaoMaps(): Promise<typeof kakao> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오맵은 브라우저에서만 불러올 수 있어요."));
  }
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao);
  }
  if (loaderPromise) {
    return loaderPromise;
  }

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!appKey) {
    return Promise.reject(new Error("카카오맵 API 키가 설정되지 않았어요."));
  }

  loaderPromise = new Promise<typeof kakao>((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.async = true;
    script.addEventListener("load", () => window.kakao.maps.load(() => resolve(window.kakao)));
    // 스크립트 로드 실패는 대부분 카카오 개발자 콘솔에 현재 도메인이 등록되지 않아
    // 401(domain mismatched)이 떨어지는 경우다. 원인을 바로 알 수 있게 도메인을 같이 보여준다.
    script.addEventListener("error", () => {
      loaderPromise = null;
      reject(
        new Error(
          `카카오맵을 불러오지 못했어요. 카카오 개발자 콘솔 > 플랫폼 > Web에 ${window.location.origin} 을 등록해 주세요.`,
        ),
      );
    });
    if (!existingScript) document.head.appendChild(script);
  });

  return loaderPromise;
}

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
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.async = true;
    script.addEventListener("load", () => window.kakao.maps.load(() => resolve(window.kakao)));
    script.addEventListener("error", () => {
      loaderPromise = null;
      reject(new Error("카카오맵 스크립트를 불러오지 못했어요. 네트워크 상태를 확인해 주세요."));
    });
    if (!existingScript) document.head.appendChild(script);
  });

  return loaderPromise;
}

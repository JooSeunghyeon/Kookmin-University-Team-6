"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { loadKakaoMaps } from "@/lib/kakao/loader";
import type { LatLng } from "@/lib/geo";

interface UseKakaoMapOptions {
  center: LatLng;
  level?: number;
}

interface UseKakaoMapResult {
  containerRef: RefObject<HTMLDivElement | null>;
  map: kakao.maps.Map | null;
  isLoading: boolean;
  error: string | null;
}

/** 카카오맵 SDK를 불러와 컨테이너에 지도를 한 번 생성한다. 중심 이동은 호출부가 map.setCenter로 처리한다. */
export function useKakaoMap({ center, level = 4 }: UseKakaoMapOptions): UseKakaoMapResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    loadKakaoMaps()
      .then((kakaoSdk) => {
        if (isCancelled || !containerRef.current) return;
        const instance = new kakaoSdk.maps.Map(containerRef.current, {
          center: new kakaoSdk.maps.LatLng(center.lat, center.lng),
          level,
        });
        setMap(instance);
        setIsLoading(false);
      })
      .catch((loadError: Error) => {
        if (isCancelled) return;
        setError(loadError.message);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 1회만 지도를 생성한다.
  }, []);

  return { containerRef, map, isLoading, error };
}

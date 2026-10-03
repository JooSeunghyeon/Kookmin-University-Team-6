const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 두 좌표 사이의 직선 거리(m)를 하버사인 공식으로 계산한다. */
export function haversineMeters(from: LatLng, to: LatLng): number {
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const a =
    sinLat * sinLat + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

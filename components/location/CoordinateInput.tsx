"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Korea bounding box (rough). Used to reject typos that would point overseas.
const KR_LAT_MIN = 33.0;
const KR_LAT_MAX = 38.7;
const KR_LNG_MIN = 124.5;
const KR_LNG_MAX = 132.0;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CoordinateInputProps {
  defaultLat?: number;
  defaultLng?: number;
  onChange?: (coords: Coordinates) => void;
  onSubmit?: (coords: Coordinates) => void;
}

function validateCoords(latNum: number, lngNum: number): string | null {
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return "좌표 입력값이 숫자가 아닙니다.";
  }
  if (latNum < KR_LAT_MIN || latNum > KR_LAT_MAX) {
    return `위도 ${latNum}은 한국 영토 범위(${KR_LAT_MIN}~${KR_LAT_MAX})를 벗어납니다.`;
  }
  if (lngNum < KR_LNG_MIN || lngNum > KR_LNG_MAX) {
    return `경도 ${lngNum}은 한국 영토 범위(${KR_LNG_MIN}~${KR_LNG_MAX})를 벗어납니다.`;
  }
  return null;
}

/**
 * Map-free coordinate entry. Used as the fallback when the Kakao map SDK
 * is not loaded (no API key) and as a manual override even with the map.
 */
export function CoordinateInput({
  defaultLat,
  defaultLng,
  onChange,
  onSubmit,
}: CoordinateInputProps) {
  const [lat, setLat] = React.useState<string>(
    defaultLat !== undefined ? String(defaultLat) : "",
  );
  const [lng, setLng] = React.useState<string>(
    defaultLng !== undefined ? String(defaultLng) : "",
  );
  const [error, setError] = React.useState<string | null>(null);

  function commit(handler: ((c: Coordinates) => void) | undefined) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const err = validateCoords(latNum, lngNum);
    setError(err);
    if (!err) handler?.({ lat: latNum, lng: lngNum });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    commit(onSubmit);
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor="coord-lat"
          >
            위도 (33 ~ 38.7)
          </label>
          <Input
            id="coord-lat"
            type="number"
            step="0.0001"
            placeholder="예: 35.2773"
            value={lat}
            onChange={(e) => {
              setLat(e.target.value);
            }}
            onBlur={() => {
              commit(onChange);
            }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor="coord-lng"
          >
            경도 (124.5 ~ 132)
          </label>
          <Input
            id="coord-lng"
            type="number"
            step="0.0001"
            placeholder="예: 126.4181"
            value={lng}
            onChange={(e) => {
              setLng(e.target.value);
            }}
            onBlur={() => {
              commit(onChange);
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">위치 인리치 실행</Button>
    </form>
  );
}

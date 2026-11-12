export interface Place {
  name: string;
  detail?: string;
  lat: number;
  lng: number;
}

export interface MapFocus {
  key: number;
  lat?: number;
  lng?: number;
  zoom?: number;
  bounds?: [number, number][];
}

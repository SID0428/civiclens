export interface GeocodeResult {
  address: string;
  pincode: string;
  district: string;
  state: string;
  landmark?: string;
}

export interface FusedPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

export const GeoService = {
  // STRICT 100% PHYSICAL HARDWARE GPS SENSOR (NO IP FALLBACK)
  startLiveTracking: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): { watchId: number | null } => {
    if (!navigator.geolocation) {
      onError({
        code: 2,
        message: 'Geolocation hardware is not supported on this browser/device.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return { watchId: null };
    }

    const processSensorPosition = (pos: GeolocationPosition) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 5),
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
      });
    };

    // 1. Initial Prompt & High-Accuracy Hardware Query
    navigator.geolocation.getCurrentPosition(
      processSensorPosition,
      (err) => {
        console.warn('[Strict GPS Hardware Error]:', err.code, err.message);
        onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Strictly fresh hardware sensor data
      }
    );

    // 2. Continuous Hardware GPS Stream
    const watchId = navigator.geolocation.watchPosition(
      processSensorPosition,
      (err) => {
        console.warn('[Strict GPS Hardware Watch Error]:', err.code, err.message);
        onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    return { watchId };
  },

  // High-Precision Reverse Geocoding
  reverseGeocode: async (lat: number, lng: number): Promise<GeocodeResult> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();

      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || addr.town || '';
      const state = addr.state || '';
      const landmark = addr.road || addr.suburb || addr.neighbourhood || addr.building || '';
      const formattedAddress = data.display_name || '';

      return { address: formattedAddress, pincode, district, state, landmark };
    } catch (error) {
      console.warn("Reverse Geocode Warning:", error);
      return { address: '', pincode: '', district: '', state: '' };
    }
  },
};

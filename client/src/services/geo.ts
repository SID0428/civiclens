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
  // Ultra-Fast Zero-Wait Network Resolver (Fetches in <200ms)
  fetchFastNetworkLocation: async (): Promise<FusedPosition | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Try freeipapi.com (Fast CORS HTTPS)
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          return {
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude),
            accuracy: 100,
            speed: null,
            heading: null,
            altitude: null,
            timestamp: Date.now(),
          };
        }
      }
    } catch (e) {
      // Try secondary fallback (ipapi.co)
      try {
        const res2 = await fetch('https://ipapi.co/json/');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && data2.latitude && data2.longitude) {
            return {
              lat: parseFloat(data2.latitude),
              lng: parseFloat(data2.longitude),
              accuracy: 100,
              speed: null,
              heading: null,
              altitude: null,
              timestamp: Date.now(),
            };
          }
        }
      } catch {
        // Ignore
      }
    }
    return null;
  },

  // Instant Multi-Tier Live GPS Tracker
  startLiveTracking: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): { watchId: number | null } => {
    let hasHighAccuracyFix = false;

    // 1. Fire Fast Network Location Immediately (Zero waiting)
    GeoService.fetchFastNetworkLocation().then((netPos) => {
      if (netPos && !hasHighAccuracyFix) {
        console.log('[GPS Fast-Lock]: Initial position acquired via network');
        onUpdate(netPos);
      }
    });

    if (!navigator.geolocation) {
      return { watchId: null };
    }

    const processSensorPosition = (pos: GeolocationPosition) => {
      hasHighAccuracyFix = true;
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 10),
        speed: pos.coords.speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        timestamp: pos.timestamp,
      });
    };

    // 2. Immediate Hardware Position Request
    navigator.geolocation.getCurrentPosition(
      processSensorPosition,
      (err) => {
        console.warn('[GPS Hardware Request]:', err.message);
        onError(err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // 3. Continuous Real-time Hardware Stream
    const watchId = navigator.geolocation.watchPosition(
      processSensorPosition,
      (err) => {
        console.warn('[GPS Watch Stream]:', err.message);
        onError(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
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

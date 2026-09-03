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
  // Fast IP Fallback (guarantees coordinates never get stuck on desktop/laptop)
  fetchIPLocation: async (): Promise<FusedPosition | null> => {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.latitude && data.longitude) {
          return {
            lat: data.latitude,
            lng: data.longitude,
            accuracy: 150,
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
    return null;
  },

  // Progressive Multi-Tier Geolocation Engine
  startLiveTracking: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): { watchId: number | null } => {
    if (!navigator.geolocation) {
      // Try IP fallback immediately
      GeoService.fetchIPLocation().then((ipPos) => {
        if (ipPos) onUpdate(ipPos);
      });
      return { watchId: null };
    }

    let hasReceivedPosition = false;

    const handleSuccess = (pos: GeolocationPosition) => {
      hasReceivedPosition = true;
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

    // Tier 1: Instant Quick-Fix (Standard accuracy, immediate prompt)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => {
        console.warn('[GPS Tier 1]:', err.message);
        // If timed out or position unavailable, attempt IP fallback so UI doesn't hang
        if (err.code !== 1 && !hasReceivedPosition) {
          GeoService.fetchIPLocation().then((ipPos) => {
            if (ipPos && !hasReceivedPosition) onUpdate(ipPos);
          });
        }
        onError(err);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );

    // Tier 2: Continuous High-Accuracy GNSS Satellite Stream
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      (err) => {
        console.warn('[GPS Tier 2 Watch]:', err.message);
        onError(err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    // Safety timeout: If no GPS response in 7 seconds, trigger IP fallback so it NEVER hangs
    setTimeout(() => {
      if (!hasReceivedPosition) {
        GeoService.fetchIPLocation().then((ipPos) => {
          if (ipPos && !hasReceivedPosition) {
            console.log('[GPS Fallback]: Locked initial coordinates via network');
            onUpdate(ipPos);
          }
        });
      }
    }, 7000);

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

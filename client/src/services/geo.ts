// Google-Grade High-Precision Fused Location Service & Kalman Filter for CivicLens

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

// 1D/2D Kalman Filter for GPS Noise Reduction & High-Precision Coordinate Smoothing
class KalmanFilter {
  private Q: number; // Process noise covariance
  private R: number; // Measurement noise covariance
  private P: number; // Estimation error covariance
  private x: number; // Value
  private isInitialized: boolean;

  constructor(processNoise: number = 0.00001, measurementNoise: number = 0.001) {
    this.Q = processNoise;
    this.R = measurementNoise;
    this.P = 1.0;
    this.x = 0;
    this.isInitialized = false;
  }

  public filter(measurement: number, accuracy: number): number {
    if (!this.isInitialized) {
      this.x = measurement;
      this.P = accuracy * accuracy;
      this.isInitialized = true;
      return this.x;
    }

    // Prediction update
    this.P = this.P + this.Q;

    // Measurement update
    const K = this.P / (this.P + (accuracy > 0 ? accuracy * accuracy * 0.000001 : this.R));
    this.x = this.x + K * (measurement - this.x);
    this.P = (1 - K) * this.P;

    return this.x;
  }
}

const latKalman = new KalmanFilter();
const lngKalman = new KalmanFilter();

export const GeoService = {
  // Continuous High-Precision Fused GPS Watcher
  watchFusedLocation: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): number | null => {
    if (!navigator.geolocation) {
      return null;
    }

    return navigator.geolocation.watchPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const rawAcc = pos.coords.accuracy || 5;

        // Apply Kalman filter smoothing if accuracy is reasonable
        const filteredLat = rawAcc < 80 ? latKalman.filter(rawLat, rawAcc) : rawLat;
        const filteredLng = rawAcc < 80 ? lngKalman.filter(rawLng, rawAcc) : rawLng;

        onUpdate({
          lat: filteredLat,
          lng: filteredLng,
          accuracy: Math.round(rawAcc),
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp,
        });
      },
      onError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Never use cached locations
      }
    );
  },

  // Google Maps / OpenStreetMap High-Precision Reverse Geocoding
  reverseGeocode: async (lat: number, lng: number): Promise<GeocodeResult> => {
    try {
      // 1. If Google Maps API key is present in environment, query Google Geocoding
      const googleApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
      if (googleApiKey && googleApiKey !== 'YOUR_KEY') {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;
        const gRes = await fetch(googleUrl);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.results && gData.results.length > 0) {
            const first = gData.results[0];
            let pin = '';
            let dist = '';
            let st = '';
            first.address_components.forEach((c: any) => {
              if (c.types.includes('postal_code')) pin = c.long_name;
              if (c.types.includes('administrative_area_level_2') || c.types.includes('locality')) dist = c.long_name;
              if (c.types.includes('administrative_area_level_1')) st = c.long_name;
            });
            return {
              address: first.formatted_address,
              pincode: pin,
              district: dist,
              state: st,
              landmark: first.address_components[0]?.long_name || '',
            };
          }
        }
      }

      // 2. High-Precision OpenStreetMap Nominatim with Full Address Hierarchy
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();

      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || addr.town || '';
      const state = addr.state || '';
      const landmark = addr.road || addr.suburb || addr.neighbourhood || addr.building || '';
      const formattedAddress = data.display_name || '';

      return {
        address: formattedAddress,
        pincode,
        district,
        state,
        landmark,
      };
    } catch (error) {
      console.warn("Reverse Geocode Warning:", error);
      return { address: '', pincode: '', district: '', state: '' };
    }
  },
};

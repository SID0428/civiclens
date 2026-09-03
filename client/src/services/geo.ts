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

// 1D/2D Kalman Filter for GPS Noise Reduction
class KalmanFilter {
  private Q: number;
  private R: number;
  private P: number;
  private x: number;
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

    this.P = this.P + this.Q;
    const K = this.P / (this.P + (accuracy > 0 ? accuracy * accuracy * 0.000001 : this.R));
    this.x = this.x + K * (measurement - this.x);
    this.P = (1 - K) * this.P;

    return this.x;
  }
}

const latKalman = new KalmanFilter();
const lngKalman = new KalmanFilter();

export const GeoService = {
  // Dual-Phase Quick Lock + Continuous High-Accuracy Stream
  startLiveTracking: (
    onUpdate: (pos: FusedPosition) => void,
    onError: (err: GeolocationPositionError) => void
  ): { watchId: number | null } => {
    if (!navigator.geolocation) {
      return { watchId: null };
    }

    const processPosition = (pos: GeolocationPosition) => {
      const rawLat = pos.coords.latitude;
      const rawLng = pos.coords.longitude;
      const rawAcc = pos.coords.accuracy || 5;

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
    };

    // 1. Immediate Quick-Lock (Forces permission prompt in browser)
    navigator.geolocation.getCurrentPosition(
      processPosition,
      (err) => {
        console.warn('Initial GPS fetch error:', err);
        onError(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // 2. Continuous Real-time Stream
    const watchId = navigator.geolocation.watchPosition(
      processPosition,
      onError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return { watchId };
  },

  // Reverse Geocoding
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

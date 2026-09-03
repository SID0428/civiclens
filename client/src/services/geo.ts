export interface GeocodeResult {
  address: string;
  pincode: string;
  district: string;
  state: string;
}

export const GeoService = {
  reverseGeocode: async (lat: number, lng: number): Promise<GeocodeResult> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();

      const addr = data.address || {};
      const pincode = addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const district = addr.state_district || addr.county || addr.city || addr.suburb || '';
      const state = addr.state || '';
      const formattedAddress = data.display_name || '';

      return {
        address: formattedAddress,
        pincode,
        district,
        state,
      };
    } catch (error) {
      console.warn("Reverse Geocode Warning:", error);
      return { address: '', pincode: '', district: '', state: '' };
    }
  },
};

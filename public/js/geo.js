// GPS & Reverse Geocoding Utility for CivicLens
const Geo = {
  // 1. Get coordinates with Hardware GPS -> NO IP Fallback if user explicitly denied permission
  getCurrentPosition: async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocation is not supported by your browser."));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'hardware_gps',
          });
        },
        (err) => {
          // If User explicitly Denied Permission (Error Code 1) -> STRICT REJECTION
          if (err.code === 1 || err.code === err.PERMISSION_DENIED) {
            console.error("[GPS] Permission explicitly denied by user.");
            return reject(new Error("PERMISSION_DENIED: GPS Location permission was denied."));
          }

          // If device has no GPS hardware or timeout, try low accuracy once
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              resolve({
                lat: pos2.coords.latitude,
                lng: pos2.coords.longitude,
                accuracy: pos2.coords.accuracy,
                source: 'network_wifi',
              });
            },
            (err2) => {
              reject(new Error("GPS signal unavailable. Please ensure GPS is turned on in your device settings."));
            },
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  },

  // 2. Reverse Geocoding (Coordinates -> Full Address + PIN Code)
  reverseGeocode: async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

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
        raw: data,
      };
    } catch (error) {
      console.warn("Reverse Geocode Warning:", error);
      return { address: '', pincode: '', district: '', state: '' };
    }
  },

  // 3. Forward Geocoding (Landmark / PIN -> Lat / Lng)
  searchLocation: async (query) => {
    try {
      const isPin = /^\d{6}$/.test(query.trim());
      const searchQuery = isPin ? `${query}, India` : `${query}`;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1&countrycodes=in`;

      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) throw new Error("Location search failed");
      const data = await response.json();

      if (data && data.length > 0) {
        const item = data[0];
        const addr = item.address || {};
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: item.display_name,
          pincode: addr.postcode ? addr.postcode.replace(/\D/g, '').slice(0, 6) : (isPin ? query : ''),
          district: addr.state_district || addr.county || addr.city || '',
          state: addr.state || '',
        };
      }
      return null;
    } catch (error) {
      console.error("Location Search Error:", error);
      return null;
    }
  },
};

if (typeof window !== 'undefined') {
  window.Geo = Geo;
}

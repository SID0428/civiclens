// GPS & Reverse Geocoding Utility for CivicLens
const Geo = {
  // 1. Get coordinates with Hardware GPS -> Browser Low Accuracy -> IP Geolocation Fallback
  getCurrentPosition: async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return Geo.getIpLocation().then(resolve).catch(reject);
      }

      // Try High Accuracy First (Mobile GPS)
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
          console.warn("[GPS] High accuracy GPS failed, trying standard accuracy...", err.message);

          // Retry with standard accuracy (Wi-Fi/Network)
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              resolve({
                lat: pos2.coords.latitude,
                lng: pos2.coords.longitude,
                accuracy: pos2.coords.accuracy,
                source: 'network_wifi',
              });
            },
            async (err2) => {
              console.warn("[GPS] Browser geolocation unavailable, attempting IP location fallback...", err2.message);
              // Fallback to IP Geolocation (crucial for desktop/laptop browsers without GPS chip)
              try {
                const ipLoc = await Geo.getIpLocation();
                resolve(ipLoc);
              } catch (ipErr) {
                reject(new Error("Location unavailable. Please select your location on the map or type your pincode."));
              }
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  },

  // IP Geolocation Fallback (Works on laptops / desktops where GPS is missing)
  getIpLocation: async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error("IP Geolocation service unreachable");
      const data = await res.json();
      
      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          pincode: data.postal ? data.postal.replace(/\s+/g, '').substring(0, 6) : '',
          district: data.city || data.region || '',
          state: data.region || '',
          address: `${data.city || ''}, ${data.region || ''}, India`,
          source: 'ip_fallback',
        };
      }
      throw new Error("Invalid IP coordinate response");
    } catch (e) {
      // Secondary fallback (BigDataCloud Free Client API)
      const res2 = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
      const data2 = await res2.json();
      return {
        lat: data2.latitude || 28.6139,
        lng: data2.longitude || 77.2090,
        pincode: data2.postcode ? data2.postcode.replace(/\s+/g, '').substring(0, 6) : '',
        district: data2.locality || data2.city || '',
        state: data2.principalSubdivision || '',
        address: `${data2.locality || ''}, ${data2.city || ''}, ${data2.principalSubdivision || ''}`,
        source: 'bigdata_fallback',
      };
    }
  },

  // 2. Reverse Geocode Coordinates to Pincode, District, Address via OpenStreetMap Nominatim
  reverseGeocode: async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, {
        headers: { "Accept-Language": "en" }
      });

      if (!response.ok) {
        throw new Error("Unable to contact geocoding service.");
      }

      const data = await response.json();
      const addr = data.address || {};

      // Pincode extraction (Indian postal code)
      const rawPincode = addr.postcode || "";
      const pincode = rawPincode.replace(/\s+/g, "").substring(0, 6);

      // District / City extraction
      const district =
        addr.state_district ||
        addr.district ||
        addr.county ||
        addr.city ||
        addr.town ||
        addr.suburb ||
        "";

      const state = addr.state || "";
      const address = data.display_name || "";

      return {
        lat,
        lng,
        pincode,
        district,
        state,
        address,
      };
    } catch (error) {
      console.error("Geocoding Error:", error);
      throw error;
    }
  },

  // 3. Forward Geocode Pincode / Address to Coordinates (When user manually types pincode or area)
  searchLocation: async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', India')}&limit=1&addressdetails=1`;
      const response = await fetch(url, {
        headers: { "Accept-Language": "en" }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        const addr = item.address || {};
        const pincode = (addr.postcode || "").replace(/\s+/g, "").substring(0, 6);
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          pincode,
          district: addr.state_district || addr.district || addr.city || '',
          state: addr.state || '',
          address: item.display_name || '',
        };
      }
      return null;
    } catch (error) {
      console.error("Search Location Error:", error);
      return null;
    }
  }
};

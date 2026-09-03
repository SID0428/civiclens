import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapViewProps {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const MapView: React.FC<MapViewProps> = ({ lat, lng, accuracy = 10 }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom Glowing Live GPS Pulse Icon
    const livePulseIcon = L.divIcon({
      className: 'custom-live-marker',
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #0284c7; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #0284c7; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([lat, lng], 17);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Accuracy radius circle
      const circle = L.circle([lat, lng], {
        radius: Math.max(accuracy, 5),
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: livePulseIcon,
        draggable: false,
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      accuracyCircleRef.current = circle;
    } else {
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      markerRef.current?.setLatLng([lat, lng]);
      
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([lat, lng]);
        accuracyCircleRef.current.setRadius(Math.max(accuracy, 5));
      }
    }
  }, [lat, lng, accuracy]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-56 w-full z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Live HUD Floating Tag */}
      <div className="absolute top-2.5 right-2.5 z-20 bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="font-bold text-emerald-400">LIVE SENSOR TRACKING</span>
        <span className="text-slate-400">&bull;</span>
        <span>Radius: &plusmn;{Math.round(accuracy)}m</span>
      </div>

      <div className="absolute bottom-2 left-2.5 z-20 bg-white/90 backdrop-blur-md text-slate-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapViewProps {
  lat: number;
  lng: number;
}

export const MapView: React.FC<MapViewProps> = ({ lat, lng }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([lat, lng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: false }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([lat, lng], 16);
      markerRef.current?.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-inner h-48 w-full z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 z-20 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
        <span>🔒 Pin locked to Live GPS</span>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  ExternalLink,
  Layers,
  Search,
  Filter,
  Flame,
  Users,
  CheckCircle2,
  Clock,
  Navigation,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';
import { API } from '../services/api';
import { ComplaintImage } from './ComplaintImage';

interface CivicGrievanceMapProps {
  initialComplaints?: Complaint[];
  className?: string;
}

export const CivicGrievanceMap: React.FC<CivicGrievanceMapProps> = ({
  initialComplaints,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints || []);
  const [loading, setLoading] = useState<boolean>(!initialComplaints || initialComplaints.length === 0);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 1. Fetch complaints if not provided
  useEffect(() => {
    if (initialComplaints && initialComplaints.length > 0) {
      setComplaints(initialComplaints);
      setLoading(false);
      return;
    }

    const loadPublicIssues = async () => {
      setLoading(true);
      try {
        const res = await API.request('/complaints/public', 'GET');
        if (res && res.complaints) {
          setComplaints(res.complaints);
        }
      } catch (err) {
        console.warn('Failed to fetch public complaints for map:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPublicIssues();
  }, [initialComplaints]);

  // 2. Filter complaints with valid coordinates
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Must have valid lat/lng
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return false;
      if (isNaN(c.latitude) || isNaN(c.longitude)) return false;

      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'In Progress') {
          if (c.status !== 'In Progress' && c.status !== 'Under Review') return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }

      // Category Filter
      if (categoryFilter !== 'All' && c.category !== categoryFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        const matchPin = c.pincode?.includes(q);
        const matchDist = c.district?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAddr && !matchPin && !matchDist) return false;
      }

      return true;
    });
  }, [complaints, statusFilter, categoryFilter, searchQuery]);

  // 3. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to India's centroid or fallback
      const initialLat = 22.5937;
      const initialLng = 78.9629;
      const initialZoom = 5;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([initialLat, initialLng], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount if necessary
    };
  }, []);

  // 4. Update Map Markers whenever filtered complaints change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (filteredComplaints.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredComplaints.forEach((c) => {
      const isSelected = selectedComplaint?._id === c._id;
      const isResolved = c.status === 'Resolved';
      const isInProgress = c.status === 'In Progress' || c.status === 'Under Review';
      const isPending = c.status === 'Pending';
      const reportsCount = c.reportedByCount || 1;

      // Status color palette
      const primaryColor = isResolved ? '#10b981' : isInProgress ? '#2563eb' : isPending ? '#f59e0b' : '#64748b';
      const ringColor = isSelected ? '#38bdf8' : 'white';

      const customIcon = L.divIcon({
        className: 'custom-civic-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
            ${
              reportsCount > 1
                ? `<div style="position: absolute; top: -14px; background: #ea580c; color: white; border-radius: 9999px; padding: 2px 6px; font-size: 9px; font-weight: 900; font-family: sans-serif; display: flex; align-items: center; gap: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1.5px solid white; animation: pulse 2s infinite;">
                    <span>🔥 ${reportsCount}</span>
                   </div>`
                : ''
            }
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              border-radius: 50% 50% 50% 0;
              background: ${primaryColor};
              transform: rotate(-45deg);
              border: 3px solid ${ringColor};
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            ">
              <div style="transform: rotate(45deg); color: white; font-size: 11px; font-weight: bold;">
                ${isResolved ? '✓' : isPending ? '!' : '●'}
              </div>
            </div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.35); filter: blur(1px); margin-top: 2px;"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon }).addTo(markersGroup);

      marker.on('click', () => {
        setSelectedComplaint(c);
        setSelectedPhotoIndex(0);
        map.panTo([c.latitude, c.longitude], { animate: true, duration: 0.6 });
      });

      bounds.extend([c.latitude, c.longitude]);
    });

    // Auto-fit bounds if we have points and no manual selection is active
    if (!selectedComplaint && bounds.isValid() && filteredComplaints.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredComplaints, selectedComplaint]);

  // 5. Handle "Locate Me" button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);

        const map = mapInstanceRef.current;
        if (map) {
          map.setView([latitude, longitude], 14, { animate: true });

          // Add or update User Pin
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'custom-user-marker',
              html: `
                <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: #0284c7; opacity: 0.4; animation: ping 1.5s infinite;"></div>
                  <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #0284c7; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
                </div>
              `,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });

            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .bindPopup('<strong>📍 Your Location</strong>')
              .addTo(map);
          }
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        alert('Could not retrieve your GPS location. Please ensure location permissions are granted.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // 6. Reset Zoom to all markers
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredComplaints.length === 0) return;

    const bounds = L.latLngBounds(filteredComplaints.map((c) => [c.latitude, c.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  const categoriesList = [
    'All',
    'Roads & Potholes',
    'Garbage & Sanitation',
    'Water Supply & Sewage',
    'Electricity & Streetlights',
    'Public Infrastructure',
    'Encroachment & Traffic',
  ];

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : 'relative w-full'
      } ${className}`}
    >
      {/* ─── MAP HEADER CONTROL BAR ─── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-slate-50/80 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-[11px] font-bold border border-sky-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE GIS GRIEVANCE RADAR</span>
              <span className="text-slate-400">&bull;</span>
              <span>{filteredComplaints.length} Issues Mapped</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Geotagged Civic Redressal Map</span>
            </h3>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 hover:border-sky-300 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-600' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetView}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition"
              title="Fit all markers to screen"
            >
              Fit Grid
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-2.5 pt-1">
          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, PIN, or district..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full pb-0.5 scrollbar-none">
            {(['All', 'Pending', 'In Progress', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shrink-0 ml-auto"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── MAP CANVAS & DETAILS SPLIT CONTAINER ─── */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1' : 'h-[520px] sm:h-[600px]'} flex flex-col lg:flex-row overflow-hidden`}>
        {/* Left/Main Map Canvas */}
        <div className="relative w-full h-full flex-1">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Legend Floating HUD */}
          <div className="absolute bottom-4 left-4 z-20 bg-slate-950/85 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-xl space-y-1.5 pointer-events-auto hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Map Key</div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Pending</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>In Progress</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Resolved</span>
              </span>
            </div>
          </div>

          {/* Helper hint */}
          {!selectedComplaint && filteredComplaints.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-4 py-1.5 rounded-full border border-white/15 shadow-lg pointer-events-none flex items-center gap-2 animate-bounce-slow">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Click on any map pin to view issue photos and live telemetry details</span>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex items-center justify-center">
              <div className="p-4 rounded-2xl bg-white shadow-xl border border-slate-200 flex items-center gap-3 text-slate-700 text-xs font-bold">
                <div className="w-4 h-4 rounded-full border-2 border-sky-600 border-t-transparent animate-spin"></div>
                <span>Loading Geotagged Civic Complaints...</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Selected Issue Detail Card OR Recent Issues List */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col max-h-72 lg:max-h-none overflow-y-auto shrink-0 z-20">
          {selectedComplaint ? (
            /* ─── Selected Grievance Detail Card ─── */
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      selectedComplaint.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedComplaint.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedComplaint.status === 'Under Review'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedComplaint.status}
                  </span>
                  <span className="text-xs font-bold text-sky-600">{selectedComplaint.category}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                  title="Close Card"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Photo Display with Multi-Angle Strip */}
              <div className="space-y-2">
                {(() => {
                  const activeImg =
                    selectedComplaint.images && selectedComplaint.images.length > selectedPhotoIndex
                      ? selectedComplaint.images[selectedPhotoIndex].url
                      : selectedComplaint.images && selectedComplaint.images.length > 0
                      ? selectedComplaint.images[0].url
                      : selectedComplaint.imageUrl;

                  return (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group">
                      <ComplaintImage
                        src={activeImg}
                        alt={selectedComplaint.title}
                        heightClass="h-44 sm:h-48"
                        topLeftBadge={
                          selectedComplaint.resolvedImageUrl ? (
                            <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold shadow">
                              BEFORE
                            </span>
                          ) : undefined
                        }
                        bottomOverlay={
                          <div className="flex justify-between items-center gap-1 text-[10px] font-mono text-white">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/85 backdrop-blur-md font-bold">
                              PIN {selectedComplaint.pincode}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-sky-950/85 backdrop-blur-md text-sky-300">
                              {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
                            </span>
                          </div>
                        }
                      />
                    </div>
                  );
                })()}

                {/* Multi-Photo Thumbnails */}
                {selectedComplaint.images && selectedComplaint.images.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {selectedComplaint.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(i)}
                        className={`w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                          selectedPhotoIndex === i
                            ? 'border-sky-600 ring-2 ring-sky-300 scale-105'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img.url} alt={`Angle #${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedComplaint.title}</h4>
                <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line break-words max-h-24 overflow-y-auto">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Primary Reporter Avatar & Info */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  {selectedComplaint.citizen?.avatar ? (
                    <img
                      src={selectedComplaint.citizen.avatar}
                      alt={selectedComplaint.citizen?.name || 'Citizen'}
                      className="w-6 h-6 rounded-full object-cover border border-sky-400"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                      {(selectedComplaint.citizen?.name || 'Citizen').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-bold text-slate-800 text-[11px] truncate">
                      {selectedComplaint.citizen?.name || 'Citizen'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Reported {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {(selectedComplaint.reportedByCount || 1) > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-orange-100 border border-orange-200 text-orange-800 text-[10px] font-black flex items-center gap-1 shrink-0">
                    <Flame className="w-3 h-3 text-orange-600" />
                    <span>{selectedComplaint.reportedByCount} Reports</span>
                  </span>
                )}
              </div>

              {/* Location & Google Maps Link */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    {selectedComplaint.address || 'Geotagged Municipal Location'} (PIN: {selectedComplaint.pincode})
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`https://www.google.com/maps?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>📍 View on Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* If Resolved: Official Resolution Proof */}
              {selectedComplaint.resolvedImageUrl && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-emerald-800">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resolution Proof (AFTER)</span>
                    </span>
                    <span className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-bold">
                      Verified
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-emerald-200">
                    <img
                      src={selectedComplaint.resolvedImageUrl}
                      alt="Work Completed Proof"
                      className="w-full h-28 object-cover"
                    />
                  </div>
                  {selectedComplaint.resolutionNotes && (
                    <p className="text-[11px] text-emerald-900 italic leading-relaxed">
                      "{selectedComplaint.resolutionNotes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ─── List of Nearby / Filtered Issues ─── */
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                <span>Active Grievances ({filteredComplaints.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Click any to inspect</span>
              </div>

              {filteredComplaints.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                  <div>No grievances match the selected filters.</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredComplaints.slice(0, 15).map((item) => {
                    const itemImg = item.images && item.images.length > 0 ? item.images[0].url : item.imageUrl;
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(item);
                          setSelectedPhotoIndex(0);
                          mapInstanceRef.current?.panTo([item.latitude, item.longitude], {
                            animate: true,
                            duration: 0.6,
                          });
                        }}
                        className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 transition text-left flex gap-3 items-center group"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-200 relative">
                          <img src={itemImg} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          {(item.reportedByCount || 1) > 1 && (
                            <span className="absolute top-0.5 right-0.5 px-1 rounded bg-orange-600 text-white text-[8px] font-black">
                              +{item.reportedByCount}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-sky-600 truncate">{item.category}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                item.status === 'Resolved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-sky-700 transition">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>PIN {item.pincode}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

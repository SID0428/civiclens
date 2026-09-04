import React, { useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, dataUrl: string, lat: number, lng: number) => void;
  currentLat: number | null;
  currentLng: number | null;
  pincode: string;
  address: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  currentLat,
  currentLng,
  pincode,
  address,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access denied. Please allow camera permissions.');
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || currentLat === null || currentLng === null) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark
    const barHeight = Math.max(70, Math.floor(canvas.height * 0.12));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    const fontSize = Math.max(14, Math.floor(barHeight * 0.22));
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(
      `CIVICLENS | GPS: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)} | PIN CODE: ${pincode || 'N/A'}`,
      20,
      canvas.height - barHeight + fontSize + 8
    );

    ctx.font = `${fontSize * 0.85}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `Timestamp: ${new Date().toLocaleString('en-IN')}`,
      20,
      canvas.height - barHeight + fontSize * 2.2 + 10
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `civic_live_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(file, dataUrl, currentLat, currentLng);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-600" />
            <span>Live Geotag Camera</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center shadow-inner">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

          <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md text-white p-2.5 rounded-xl text-[10px] font-mono leading-tight space-y-0.5">
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>GENUINE SENSOR TRACKING</span>
            </div>
            <div>Lat: {currentLat?.toFixed(5) || '...'}, Lng: {currentLng?.toFixed(5) || '...'}</div>
            <div>PIN: {pincode || 'Auto-locking...'}</div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-2xl flex items-center justify-center shadow-lg shadow-sky-600/30 transition transform active:scale-95 border-4 border-white"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400">
          Click to snapshot verified sensor GPS & watermark photo
        </p>
      </div>
    </div>
  );
};

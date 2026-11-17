import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, isScanningActive = true }) => {
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const activeRef = useRef(isScanningActive);

  // Keep latest prop value in ref so scanner callback reads fresh state
  useEffect(() => {
    activeRef.current = isScanningActive;
  }, [isScanningActive]);

  useEffect(() => {
    const elementId = "html5-qr-video-reader";
    let isMounted = true;
    let html5QrCode = null;

    const initScanner = async () => {
      try {
        setCameraError(null);
        // Clear any leftover video elements before initializing (StrictMode safety)
        const container = document.getElementById(elementId);
        if (container) {
          container.innerHTML = '';
        }

        html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 180, height: 180 },
            aspectRatio: 1.33,
          },
          (decodedText) => {
            if (isMounted && activeRef.current && decodedText) {
              onScanSuccess(decodedText.trim());
            }
          },
          () => {}
        );

        // If component unmounted while camera was still starting, stop immediately
        if (!isMounted && html5QrCode) {
          try {
            await html5QrCode.stop();
            html5QrCode.clear();
          } catch (_) {}
        }
      } catch (err) {
        if (isMounted) {
          console.warn("Unable to start camera scanner:", err);
          setCameraError(err?.message || "Camera access not available or permission denied.");
        }
      }
    };

    // Slight defer prevents StrictMode double-camera start race condition
    const timer = setTimeout(() => {
      if (isMounted) {
        initScanner();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        const instance = scannerRef.current;
        scannerRef.current = null;
        if (instance.isScanning) {
          instance.stop().then(() => {
            try { instance.clear(); } catch (_) {}
          }).catch(() => {});
        } else {
          try { instance.clear(); } catch (_) {}
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[300px] min-h-[210px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative block">
        <div id="html5-qr-video-reader" className="w-full block"></div>

        {cameraError && (
          <div className="p-6 text-center text-slate-300 flex flex-col items-center justify-center min-h-[210px]">
            <CameraOff size={26} className="text-amber-400 mb-1.5" />
            <p className="text-xs font-semibold text-white mb-0.5">Camera Unavailable</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              Please use manual Registration ID or Token lookup below.
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mt-1.5 text-center">
        Align ticket QR code inside viewfinder
      </p>
    </div>
  );
};

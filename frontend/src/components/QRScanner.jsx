import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, isScanningActive = true }) => {
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const activeRef = useRef(isScanningActive);
  const onScanRef = useRef(onScanSuccess);
  const lastScanRef = useRef({ code: '', time: 0 });

  // Keep latest props in refs so scanner callback never uses stale closures
  useEffect(() => {
    activeRef.current = isScanningActive;
  }, [isScanningActive]);

  useEffect(() => {
    onScanRef.current = onScanSuccess;
  }, [onScanSuccess]);

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
            if (!isMounted || !activeRef.current || !decodedText) return;
            const code = decodedText.trim();
            const now = Date.now();
            // Debounce duplicate frames while camera stays pointed at the same QR code
            if (code === lastScanRef.current.code && now - lastScanRef.current.time < 2000) {
              return;
            }
            lastScanRef.current = { code, time: now };
            if (onScanRef.current) {
              onScanRef.current(code);
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
      <div className="w-full max-w-[300px] min-h-[210px] bg-[#030705] rounded-lg overflow-hidden border border-emerald-400/40 shadow-[0_0_24px_rgba(34,255,102,0.16)] relative block">
        <div id="html5-qr-video-reader" className="w-full block"></div>

        {cameraError && (
          <div className="p-6 text-center text-emerald-100/70 flex flex-col items-center justify-center min-h-[210px]">
            <CameraOff size={26} className="text-amber-300 mb-1.5" />
            <p className="text-xs font-semibold text-emerald-50 mb-0.5">Camera Unavailable</p>
            <p className="text-[10px] text-emerald-200/60 max-w-xs mx-auto">
              Please use manual Registration ID or Token lookup below.
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-emerald-200/60 mt-2 text-center font-mono-tech">
        Align ticket QR code inside viewfinder
      </p>
    </div>
  );
};

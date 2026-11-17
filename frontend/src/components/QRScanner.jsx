import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

export const QRScanner = ({ onScanSuccess, isScanningActive = true }) => {
  const [cameraError, setCameraError] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const elementId = "html5-qr-video-reader";
    const qrScanner = new Html5Qrcode(elementId);
    html5QrCodeRef.current = qrScanner;

    const startScanner = async () => {
      try {
        setCameraError(null);
        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 180, height: 180 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isScanningActive && decodedText) {
              onScanSuccess(decodedText.trim());
            }
          },
          () => {}
        );
        setIsStarted(true);
      } catch (err) {
        console.warn("Unable to start camera scanner:", err);
        setCameraError(err?.message || "Camera access not available or permission denied.");
        setIsStarted(false);
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current.clear();
          }).catch(err => console.error("Error stopping scanner", err));
        } else {
          try {
            html5QrCodeRef.current.clear();
          } catch (e) {}
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[280px] h-[210px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative flex items-center justify-center">
        <div id="html5-qr-video-reader" className="w-full h-full flex items-center justify-center"></div>

        {cameraError && (
          <div className="p-3 text-center text-slate-300">
            <CameraOff size={26} className="mx-auto text-amber-400 mb-1" />
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

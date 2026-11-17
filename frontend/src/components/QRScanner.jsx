import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

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
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isScanningActive && decodedText) {
              onScanSuccess(decodedText.trim());
            }
          },
          (errorMessage) => {
            // Ignore normal scanning frame-by-frame non-match
          }
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
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-md relative min-h-[300px] flex items-center justify-center">
        <div id="html5-qr-video-reader" className="w-full"></div>

        {cameraError && (
          <div className="p-6 text-center text-slate-300">
            <CameraOff size={36} className="mx-auto text-amber-400 mb-2" />
            <p className="text-sm font-semibold text-white mb-1">Camera Not Detected / Permission Blocked</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-3">
              {cameraError}
            </p>
            <p className="text-xs text-teal-400 font-medium">
              Please use the manual Token or Registration ID lookup below.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-2 text-center">
        Point the camera at the QR code on the participant's E-Ticket.
      </p>
    </div>
  );
};

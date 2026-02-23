// TO BE REMOVED WHEN SMART PEN HARDWARE IS ACTUALLY CREATED AND FUNCTIONALLY RUNNING.
// ============================================
// CAMERA CAPTURE COMPONENT
// Mobile-friendly camera for OCR testing
// ============================================

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  Loader2,
  SwitchCamera,
  AlertCircle,
} from "lucide-react";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => Promise<void>;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setHasPermission(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasPermission(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to access camera. Please allow camera permissions.",
      );
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setError(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Switch camera (front/back)
  const switchCamera = () => {
    setCapturedImage(null);
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Re-trigger camera when facing mode changes
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
  }, [facingMode, isOpen, capturedImage, startCamera]);

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 image data
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageData);

      // Stop camera to save battery
      stopCamera();
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  };

  // Confirm and process captured image
  const confirmCapture = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      await onCapture(capturedImage);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle close
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        disabled={isProcessing}
        title="Close camera"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Main content */}
      <div className="w-full max-w-lg mx-4">
        {/* Camera/Preview area */}
        <div className="relative aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden">
          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-white text-lg mb-2">Camera Error</p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading permission state */}
          {!error && hasPermission === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
              <p className="text-white">Requesting camera access...</p>
            </div>
          )}

          {/* Video stream (live camera) */}
          {!error && hasPermission && !capturedImage && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Captured image preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[#FF9500] animate-spin mb-4" />
              <p className="text-white text-lg font-medium">
                Saving capture...
              </p>
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {!capturedImage ? (
            <>
              {/* Switch camera button (mobile) */}
              <button
                onClick={switchCamera}
                disabled={!hasPermission || isProcessing}
                className="p-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full transition-colors"
                title="Switch Camera"
              >
                <SwitchCamera className="w-6 h-6 text-white" />
              </button>

              {/* Capture button */}
              <button
                onClick={capturePhoto}
                disabled={!hasPermission || isProcessing}
                className="w-20 h-20 bg-white hover:bg-gray-100 disabled:opacity-50 rounded-full flex items-center justify-center transition-all transform hover:scale-105"
                title="Capture Photo"
              >
                <Camera className="w-8 h-8 text-gray-900" />
              </button>

              {/* Spacer for symmetry */}
              <div className="w-14 h-14" />
            </>
          ) : (
            <>
              {/* Retake button */}
              <button
                onClick={retakePhoto}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Retake
              </button>

              {/* Confirm button */}
              <button
                onClick={confirmCapture}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF9500] to-[#FF6B00] hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Use Photo
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Tip text */}
        {!capturedImage && !error && hasPermission && (
          <p className="text-center text-gray-400 text-sm mt-4">
            Position your handwritten notes in the frame and tap to capture
          </p>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;

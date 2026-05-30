'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Camera, CheckCircle, XCircle, Loader } from 'lucide-react';

interface FaceVerifyResponse {
  success: boolean;
  matchScore: number;
  verified: boolean;
  message: string;
  timestamp: string;
  aadharMasked?: string;
}

export default function FaceAuthPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<FaceVerifyResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const verifyFace = async () => {
    if (!capturedImage) return;

    try {
      setVerifying(true);
      setError('');

      const response = await axios.post('/api/auth/face-verify', {
        faceImage: capturedImage,
        userId: 'current-user', // In production: get from auth context
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Face verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setResult(null);
  };

  if (error && !capturedImage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Camera Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={startCamera}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Aadhaar Face Authentication</h1>
          <p className="text-sm text-gray-600 mt-1">Secure your account with biometric verification</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-8">
            {!capturedImage ? (
              <>
                {/* Live Camera Feed */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Position Your Face in Frame</h2>
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Face Guide Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-4 border-green-400 rounded-full" style={{ width: '200px', height: '200px' }} />
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="hidden"
                  />
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <ul className="text-sm text-blue-900 space-y-2">
                    <li>✓ Ensure good lighting on your face</li>
                    <li>✓ Position your face within the circle</li>
                    <li>✓ Keep your face visible and clear</li>
                    <li>✓ Do not cover your face with glasses or masks</li>
                  </ul>
                </div>

                {/* Capture Button */}
                <button
                  onClick={captureImage}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Capture Photo
                </button>
              </>
            ) : result ? (
              <>
                {/* Verification Result */}
                <div className="text-center mb-8">
                  {result.verified ? (
                    <>
                      <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold text-green-600">Verified ✓</h2>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold text-red-600">Verification Failed</h2>
                    </>
                  )}
                </div>

                {/* Match Score */}
                <div className="bg-gray-100 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-600">Face Match Score</p>
                    <p className={`text-2xl font-bold ${result.matchScore > 85 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.matchScore}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        result.matchScore > 85 ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${result.matchScore}%` }}
                    />
                  </div>
                </div>

                {/* Aadhaar Info */}
                {result.aadharMasked && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-600">Aadhaar Number</p>
                    <p className="text-xl font-mono font-semibold text-purple-900">{result.aadharMasked}</p>
                  </div>
                )}

                {/* Message */}
                <p className={`text-center mb-6 p-4 rounded-lg ${
                  result.verified 
                    ? 'bg-green-50 text-green-900' 
                    : 'bg-red-50 text-red-900'
                }`}>
                  {result.message}
                </p>

                {/* Timestamp */}
                <p className="text-sm text-gray-600 text-center mb-6">
                  Verified at: {new Date(result.timestamp).toLocaleString()}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={retake}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                  >
                    Retake
                  </button>
                  {result.verified && (
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      Continue to Dashboard
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Captured Image Preview */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Preview</h2>
                  <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                </div>

                {/* Verify Button */}
                <button
                  onClick={verifyFace}
                  disabled={verifying}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Face'
                  )}
                </button>

                {/* Retake Button */}
                <button
                  onClick={retake}
                  className="w-full mt-3 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  Retake Photo
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

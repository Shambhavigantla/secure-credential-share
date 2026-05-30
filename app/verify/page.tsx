'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  disclosedData: Record<string, any>;
  trustScore: number;
  verifiedAt: string;
  errors?: string[];
  issuerName?: string;
  issuedAt?: string;
  credentialTitle?: string;
  viewCount?: number;
  lastViewedAt?: string;
  fieldLevelTrust?: Record<string, {
    trustScore: number;
    trustLevel: string;
    integrityChecks: {
      hashVerified: boolean;
      saltVerified: boolean;
      valueVerified: boolean;
      notExpired: boolean;
      credentialAge: string;
    };
    dataType: string;
    dataSize: number;
  }>;
  auditTrail?: {
    verifiedAt: string;
    sharingDuration: number | null;
    timeRemaining: number | null;
    totalViews: number;
    issuerName: string;
    issuerPublicKey: string;
  };
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyCredential();
    }
  }, [token]);

  const verifyCredential = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('/api/credentials/verify', {
        shareToken: token,
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Secure Credentials</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              No Credential to Verify
            </h2>
            <p className="text-yellow-800">
              A verification link is required to verify a shared credential.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Clock className="w-12 h-12 text-blue-600 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg">Verifying credential...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Secure Credentials</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-red-800">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Secure Credentials - Verify</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Verification Status */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="text-center mb-8">
            {result.valid ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900">Verified ✓</h1>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900">Verification Failed</h1>
              </>
            )}
          </div>

          {/* Trust Score */}
          <div className="flex justify-center mb-8">
            <div className={`${getTrustScoreBgColor(result.trustScore)} rounded-lg p-6 w-full max-w-md text-center`}>
              <p className="text-sm font-medium text-gray-600 mb-2">Trust Score</p>
              <p className={`text-4xl font-bold ${getTrustScoreColor(result.trustScore)} mb-2`}>
                {result.trustScore}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    result.trustScore >= 80
                      ? 'bg-green-600'
                      : result.trustScore >= 50
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${result.trustScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {result.errors && result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-red-900 mb-2">Issues Found:</h3>
              <ul className="list-disc list-inside text-red-700">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Credential Information */}
        {(result.credentialTitle || result.issuerName) && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Credential Information</h2>
            <div className="grid grid-cols-2 gap-4">
              {result.credentialTitle && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Credential</p>
                  <p className="text-gray-900">{result.credentialTitle}</p>
                </div>
              )}
              {result.issuerName && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Issuer</p>
                  <p className="text-gray-900">{result.issuerName}</p>
                </div>
              )}
              {result.issuedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Issued On</p>
                  <p className="text-gray-900">
                    {new Date(result.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {result.viewCount !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Views</p>
                  <p className="text-gray-900">{result.viewCount}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclosed Data */}
        {result.disclosedData && Object.keys(result.disclosedData).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Shared Information</h2>
            <div className="grid gap-4">
              {Object.entries(result.disclosedData).map(([key, value]) => {
                const fieldTrust = result.fieldLevelTrust?.[key];
                const getTrustColor = (score: number) => {
                  if (score >= 95) return 'bg-green-100 border-green-300';
                  if (score >= 85) return 'bg-blue-100 border-blue-300';
                  if (score >= 70) return 'bg-yellow-100 border-yellow-300';
                  if (score >= 50) return 'bg-orange-100 border-orange-300';
                  return 'bg-red-100 border-red-300';
                };

                const getTrustBadgeColor = (level: string) => {
                  switch (level) {
                    case 'Critical': return 'bg-green-600 text-white';
                    case 'High': return 'bg-blue-600 text-white';
                    case 'Medium': return 'bg-yellow-600 text-white';
                    case 'Low': return 'bg-orange-600 text-white';
                    default: return 'bg-red-600 text-white';
                  }
                };

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border-2 ${getTrustColor(fieldTrust?.trustScore || 100)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{key}</p>
                        <p className="text-lg text-gray-900 font-semibold">{String(value)}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <div className="text-right">
                          {fieldTrust && (
                            <>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTrustBadgeColor(fieldTrust.trustLevel)}`}>
                                {fieldTrust.trustLevel}
                              </span>
                              <p className="text-sm font-bold text-gray-900 mt-2">
                                {fieldTrust.trustScore}%
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Field-level integrity checks */}
                    {fieldTrust && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Integrity Checks:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            {fieldTrust.integrityChecks.hashVerified ? (
                              <span className="w-4 h-4 rounded-full bg-green-500" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-red-500" />
                            )}
                            <span className="text-gray-700">Hash Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {fieldTrust.integrityChecks.saltVerified ? (
                              <span className="w-4 h-4 rounded-full bg-green-500" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-red-500" />
                            )}
                            <span className="text-gray-700">Salt Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {fieldTrust.integrityChecks.valueVerified ? (
                              <span className="w-4 h-4 rounded-full bg-green-500" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-red-500" />
                            )}
                            <span className="text-gray-700">Value Verified</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {fieldTrust.integrityChecks.notExpired ? (
                              <span className="w-4 h-4 rounded-full bg-green-500" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-red-500" />
                            )}
                            <span className="text-gray-700">Not Expired</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Age: {fieldTrust.integrityChecks.credentialAge}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {result.auditTrail && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Trail</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Issuer</p>
                <p className="text-gray-900">{result.auditTrail.issuerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-gray-900">{result.auditTrail.totalViews}</p>
              </div>
              {result.auditTrail.sharingDuration && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Share Duration</p>
                  <p className="text-gray-900">{result.auditTrail.sharingDuration} seconds</p>
                </div>
              )}
              {result.auditTrail.timeRemaining !== null && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Time Remaining</p>
                  <p className={result.auditTrail.timeRemaining > 0 ? 'text-green-700' : 'text-red-700'}>
                    {result.auditTrail.timeRemaining > 0 
                      ? `${Math.floor(result.auditTrail.timeRemaining / 3600)} hours` 
                      : 'Expired'}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono break-all">
              <p className="text-gray-600 mb-1">Issuer Public Key:</p>
              <p className="text-gray-900">{result.auditTrail.issuerPublicKey}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-600 text-sm">
            Verified at: {new Date(result.verifiedAt).toLocaleString()}
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Clock className="w-12 h-12 text-blue-600 mx-auto" />
          </div>
          <p className="text-gray-600 text-lg">Loading verification...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

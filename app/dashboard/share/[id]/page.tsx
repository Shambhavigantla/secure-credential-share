'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ChevronLeft, Copy, Download } from 'lucide-react';

interface Credential {
  id: string;
  title: string;
  claims: Record<string, any>;
  merkleRoot: string;
  issuedAt: string;
  issuerName: string;
}

interface ShareResult {
  shareToken: string;
  verifiableLink: string;
  qrCode: string;
  expiresAt?: string;
}

export default function ShareCredentialPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params.id as string;

  const [credential, setCredential] = useState<Credential | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [expiresInMinutes, setExpiresInMinutes] = useState(1440); // 24 hours
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchCredential();
  }, [credentialId, router]);

  const fetchCredential = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/credentials/${credentialId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCredential(response.data.credential);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load credential');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleSelectAll = () => {
    if (credential) {
      if (selectedFields.size === Object.keys(credential.claims).length) {
        setSelectedFields(new Set());
      } else {
        setSelectedFields(new Set(Object.keys(credential.claims)));
      }
    }
  };

  const handleShare = async () => {
    if (selectedFields.size === 0) {
      setError('Please select at least one field to share');
      return;
    }

    setSharing(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/credentials/share',
        {
          credentialId,
          selectedFields: Array.from(selectedFields),
          expiresInMinutes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShareResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = () => {
    if (shareResult?.verifiableLink) {
      navigator.clipboard.writeText(shareResult.verifiableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (shareResult?.qrCode) {
      const link = document.createElement('a');
      link.href = shareResult.qrCode;
      link.download = `credential-qr-${credentialId}.png`;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading credential...</p>
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900">
              <ChevronLeft size={20} />
              Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Credential not found'}
          </div>
        </main>
      </div>
    );
  }

  if (shareResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900">
              <ChevronLeft size={20} />
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Credential Shared!</h1>
              <p className="text-gray-600">Your selective disclosure link is ready to share</p>
            </div>

            {/* QR Code */}
            {shareResult.qrCode && (
              <div className="flex justify-center mb-8">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <img src={shareResult.qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
              </div>
            )}

            {/* Link */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Verifiable Link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareResult.verifiableLink}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white font-mono text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Copy size={18} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleDownloadQR}
                className="py-2 px-4 border border-gray-300 hover:bg-gray-50 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download QR
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Verify my credential',
                      text: 'Please verify my shared credential',
                      url: shareResult.verifiableLink,
                    });
                  }
                }}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Share Link
              </button>
            </div>

            {/* Back Button */}
            <div className="mt-8 text-center">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-900 font-semibold"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900">
            <ChevronLeft size={20} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{credential.title}</h1>
          <p className="text-gray-600 mb-8">Select the fields you want to share with verifiers</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Credential Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-700">
              <strong>Issued by:</strong> {credential.issuerName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Issued on:</strong> {new Date(credential.issuedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Field Selection */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Select Fields to Share</h2>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-900 text-sm font-semibold"
              >
                {selectedFields.size === Object.keys(credential.claims).length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(credential.claims).map(([key, value]) => (
                <label key={key} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(key)}
                    onChange={() => handleFieldToggle(key)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">{key}</p>
                    <p className="text-sm text-gray-600">{String(value)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry Setting */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link Expiry
            </label>
            <select
              value={expiresInMinutes}
              onChange={e => setExpiresInMinutes(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={60}>1 hour</option>
              <option value={480}>8 hours</option>
              <option value={1440}>24 hours</option>
              <option value={10080}>7 days</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleShare}
            disabled={sharing || selectedFields.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            {sharing ? 'Creating Share Link...' : 'Create Share Link'}
          </button>
        </div>
      </main>
    </div>
  );
}

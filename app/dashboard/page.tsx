'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { LogOut, Plus } from 'lucide-react';

interface Credential {
  id: string;
  title: string;
  merkleRoot: string;
  issuedAt: string;
  expiresAt?: string;
  issuerName: string;
  shareCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchCredentials();
  }, [router]);

  const fetchCredentials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCredentials(response.data.credentials || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Secure Credentials</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 transition flex items-center gap-1"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <Link
            href="/dashboard/issue"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            <Plus size={20} />
            Issue New Credential
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Credentials List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">My Credentials</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : credentials.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No credentials yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Issuer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Issued
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Shares
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred) => (
                    <tr key={cred.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {cred.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cred.issuerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(cred.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cred.shareCount}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <Link
                          href={`/dashboard/share/${cred.id}`}
                          className="text-blue-600 hover:text-blue-900 font-semibold"
                        >
                          Share
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

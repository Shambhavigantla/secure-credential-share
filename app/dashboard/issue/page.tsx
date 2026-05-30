'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';

export default function IssueCredentialPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    issuerName: '',
    expiresInDays: 365,
    fields: [{ key: 'name', value: '' }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  };

  const handleIssuerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, issuerName: e.target.value }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 365 }));
  };

  const handleFieldChange = (index: number, key: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const newFields = [...prev.fields];
      newFields[index][key] = value;
      return { ...prev, fields: newFields };
    });
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, { key: '', value: '' }],
    }));
  };

  const removeField = (index: number) => {
    if (formData.fields.length > 1) {
      setFormData(prev => ({
        ...prev,
        fields: prev.fields.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title.trim()) {
      setError('Credential title is required');
      return;
    }

    if (formData.fields.some(f => !f.key.trim() || !f.value.trim())) {
      setError('All fields must have keys and values');
      return;
    }

    setLoading(true);

    try {
      const claims = Object.fromEntries(formData.fields.map(f => [f.key, f.value]));

      const response = await axios.post(
        '/api/credentials/issue',
        {
          title: formData.title,
          issuerName: formData.issuerName,
          claims,
          expiresInDays: formData.expiresInDays,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setSuccess('Credential issued successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Issue New Credential</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                required
                placeholder="e.g., Bachelor of Science Degree"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Issuer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuer Name
              </label>
              <input
                type="text"
                value={formData.issuerName}
                onChange={handleIssuerChange}
                placeholder="e.g., University of Technology"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires In (Days)
              </label>
              <input
                type="number"
                value={formData.expiresInDays}
                onChange={handleExpiryChange}
                min="1"
                max="3650"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Credential Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Credential Fields *
              </label>
              <div className="space-y-3">
                {formData.fields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Field name (e.g., name)"
                      value={field.key}
                      onChange={e => handleFieldChange(index, 'key', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Field value"
                      value={field.value}
                      onChange={e => handleFieldChange(index, 'value', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {formData.fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addField}
                className="mt-3 text-blue-600 hover:text-blue-900 font-semibold text-sm"
              >
                + Add Field
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {loading ? 'Issuing credential...' : 'Issue Credential'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

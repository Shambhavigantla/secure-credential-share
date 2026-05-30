'use client';

import Link from 'next/link';
import { Shield, Share2, CheckCircle, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      {/* Header */}
      <header className="bg-white bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Secure Credentials</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-gray-900 font-semibold"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Share Only What Matters
          </h2>
          <p className="text-xl text-white opacity-90 mb-8 max-w-2xl mx-auto">
            Securely issue and share verified credentials with selective disclosure.
            Choose exactly which fields to reveal while maintaining cryptographic integrity.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-8 rounded-lg transition"
          >
            Get Started Free
          </Link>
        </section>

        {/* Features */}
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why Choose Secure Credentials?
            </h3>

            <div className="grid md:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Shield className="w-12 h-12 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Cryptographically Secure
                </h4>
                <p className="text-gray-600">
                  EdDSA signatures and Merkle tree verification ensure authenticity
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Share2 className="w-12 h-12 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Selective Disclosure
                </h4>
                <p className="text-gray-600">
                  Share only the fields you choose, keep the rest private
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-12 h-12 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Instant Verification
                </h4>
                <p className="text-gray-600">
                  Verifiers can instantly confirm authenticity with zero trust required
                </p>
              </div>

              {/* Feature 4 */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Lock className="w-12 h-12 text-red-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Privacy First
                </h4>
                <p className="text-gray-600">
                  Never expose full credentials unnecessarily
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-white opacity-90 mb-8 max-w-2xl mx-auto">
              Create an account and start issuing secure, verifiable credentials today
            </p>
            <Link
              href="/register"
              className="inline-block bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-8 rounded-lg transition"
            >
              Create Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Secure Credentials. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

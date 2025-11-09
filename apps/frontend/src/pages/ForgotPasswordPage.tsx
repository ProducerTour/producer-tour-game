import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-800 rounded-xl shadow-2xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-700 p-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-900/50 border border-green-700 p-4">
              <p className="text-sm text-green-200">
                If an account exists with that email, a password reset link has been sent.
                Please check your inbox.
              </p>
            </div>
          )}

          {!success && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

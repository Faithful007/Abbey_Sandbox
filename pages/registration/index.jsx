"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function RegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    email: '',
    mobile: '',
    address: '',
    unit_in_BEC: '',
    password: '',
    confirm_password: ''
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    // Required checks
    if (
      !form.first_name || !form.last_name || !form.age || !form.email || !form.mobile ||
      !form.address || !form.unit_in_BEC || !form.password || !form.confirm_password
    ) {
      return setErr('All fields are required');
    }

    // Field validations
    const age = parseInt(form.age, 10);
    if (isNaN(age) || age < 18 || age > 90) return setErr('Age must be 18-90');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr('Invalid email');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters');
    if (form.password !== form.confirm_password) return setErr('Passwords do not match');

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');

      // Redirect to login on success
      router.push('/login');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Create Account</h1>
        <p className="text-sm text-gray-500 mb-5">Register to BEC</p>

        {err && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">First name</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="given-name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Last name</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="family-name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Age</label>
            <input
              name="age"
              type="number"
              min="18"
              max="90"
              value={form.age}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile</label>
            <input
              name="mobile"
              value={form.mobile}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <textarea
              name="address"
              rows={3}
              value={form.address}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="street-address"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">BEC Unit</label>
            <input
              name="unit_in_BEC"
              value={form.unit_in_BEC}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm password</label>
            <input
              name="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={onChange}
              required
              className="w-full border rounded px-3 py-2"
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Register'}
          </button>

          <div className="text-center mt-3 text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-indigo-600 hover:underline"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


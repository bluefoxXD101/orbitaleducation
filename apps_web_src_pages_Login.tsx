import React, { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [districtCode, setDistrictCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password, districtCode });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input value={districtCode} onChange={e => setDistrictCode(e.target.value)} placeholder="District Code" maxLength={16} required />
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" required />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}
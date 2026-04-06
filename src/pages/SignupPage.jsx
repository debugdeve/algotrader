import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup, registerBiometric, isWebAuthnSupported } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('welcome'); // welcome | form | biometric | success
  const [authMethod, setAuthMethod] = useState(null); // google | apple | email

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateForm = () => {
    if (!form.firstName.trim()) return 'First name is required';
    if (!form.lastName.trim()) return 'Last name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format';
    if (!form.contactNumber.trim()) return 'Contact number is required';
    if (!/^[6-9]\d{9}$/.test(form.contactNumber.replace(/\s/g, '')))
      return 'Enter a valid 10-digit Indian mobile number';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await signup(form);
      setStep('biometric');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSetup = async () => {
    setLoading(true);
    setError('');
    try {
      await registerBiometric({
        id: Date.now().toString(36),
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setStep('success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const skipBiometric = () => {
    setStep('success');
    setTimeout(() => navigate('/login'), 2000);
  };

  const handleSocialAuth = (method) => {
    setAuthMethod(method);
    if (method === 'email') {
      setStep('form');
    } else {
      // For Google / Apple — simulate social auth
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep('form');
      }, 1200);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-redesign">
        {/* Welcome / Sign-in method selection */}
        {step === 'welcome' && (
          <div className="animate-fadeInUp">
            <div className="auth-logo-redesign">
              <div className="auth-logo-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#authGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="authGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <h1 className="auth-heading-bold">Let's create your account</h1>
              <p className="auth-subtitle">Join AlgoTrader Pro to start automated trading on NSE</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="auth-social-buttons">
              {/* Continue with Google */}
              <button
                className="auth-social-btn auth-btn-google"
                onClick={() => handleSocialAuth('google')}
                disabled={loading}
                id="signup-google-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Continue with Apple */}
              <button
                className="auth-social-btn auth-btn-apple"
                onClick={() => handleSocialAuth('apple')}
                disabled={loading}
                id="signup-apple-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>

              {/* Continue with Email  */}
              <button
                className="auth-email-link"
                onClick={() => handleSocialAuth('email')}
                disabled={loading}
                id="signup-email-btn"
              >
                Continue with Email
              </button>
            </div>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>

            <div className="auth-terms">
              By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </div>
          </div>
        )}

        {/* Email Registration Form */}
        {step === 'form' && (
          <div className="animate-fadeInUp">
            <div className="auth-logo-redesign">
              <h1 className="auth-heading-bold" style={{ fontSize: 'var(--fs-xl)' }}>Create your account</h1>
              <p className="auth-subtitle">Fill in your details to get started</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} id="signup-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="firstName">First Name</label>
                  <input
                    className="form-input"
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="Enter first name"
                    value={form.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lastName">Last Name</label>
                  <input
                    className="form-input"
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Enter last name"
                    value={form.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contactNumber">Contact Number</label>
                <input
                  className="form-input"
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  placeholder="10-digit mobile number"
                  value={form.contactNumber}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    className="form-input"
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} id="signup-submit">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => { setStep('welcome'); setError(''); }}>
                ← Back
              </button>
            </form>
          </div>
        )}

        {step === 'biometric' && (
          <div className="animate-fadeInUp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
            <p style={{ color: 'var(--c-text-secondary)', marginBottom: '24px', fontSize: 'var(--fs-sm)' }}>
              Set up fingerprint or biometric authentication for secure 2-step verification when you login.
            </p>

            {isWebAuthnSupported ? (
              <>
                <button
                  className="biometric-btn"
                  onClick={handleBiometricSetup}
                  disabled={loading}
                  id="biometric-setup-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04c.027-.254.04-.511.04-.771 0-2.282-.653-4.413-1.783-6.214m8.218-3.39A14.93 14.93 0 0 1 12 5c-1.555 0-3.048.235-4.455.67M19 10.168A14.82 14.82 0 0 1 12 8c-3.063 0-5.888.927-8.246 2.516M12 14c0 2.137-.472 4.16-1.316 5.975M7.5 16c0 1.573-.252 3.085-.718 4.501m9.006-6.083A14.89 14.89 0 0 1 12 14c-.476 0-.945.023-1.408.067"/>
                  </svg>
                  {loading ? 'Setting up...' : 'Setup Fingerprint / Biometric'}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={skipBiometric}
                  id="skip-biometric-btn"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <>
                <div className="error-message">
                  Biometric authentication is not available on this device/browser.
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={skipBiometric}
                >
                  Continue to Login
                </button>
              </>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="animate-fadeInUp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ color: 'var(--c-profit)', fontWeight: 600, marginBottom: '8px' }}>
              Account created successfully!
            </p>
            <p style={{ color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Redirecting to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

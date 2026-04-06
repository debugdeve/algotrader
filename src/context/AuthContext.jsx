import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// WebAuthn helpers
const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined;
};

const generateChallenge = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array;
};

const stringToArrayBuffer = (str) => {
  return new TextEncoder().encode(str);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricRegistered, setBiometricRegistered] = useState(false);

  useEffect(() => {
    // Check for existing session
    const saved = localStorage.getItem('algotrader_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('algotrader_user');
      }
    }
    const bioReg = localStorage.getItem('algotrader_biometric');
    if (bioReg) setBiometricRegistered(true);
    setLoading(false);
  }, []);

  const signup = async ({ firstName, lastName, email, contactNumber, password }) => {
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('algotrader_users') || '[]');
    if (users.find(u => u.email === email)) {
      throw new Error('An account with this email already exists');
    }

    const newUser = {
      id: Date.now().toString(36),
      firstName,
      lastName,
      email,
      contactNumber,
      password, // In production: hash this
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('algotrader_users', JSON.stringify(users));

    return { success: true, message: 'Account created successfully' };
  };

  const login = async (email, password) => {
    let users = JSON.parse(localStorage.getItem('algotrader_users') || '[]');
    let foundUser = users.find(u => u.email === email && u.password === password);

    // Fallback for demo/development if cache is cleared
    if (!foundUser && email === 'ssbiswal14@gmail.com') {
      foundUser = {
        id: 'admin_123',
        firstName: 'Developer',
        lastName: 'Account',
        email: email,
        contactNumber: '9999999999',
        password: password,
        createdAt: new Date().toISOString(),
      };
      users.push(foundUser);
      localStorage.setItem('algotrader_users', JSON.stringify(users));
    }

    if (!foundUser) {
      throw new Error('Invalid email or password');
    }

    return foundUser;
  };

  const registerBiometric = async (userData) => {
    if (!isWebAuthnSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: generateChallenge(),
          rp: {
            name: 'AlgoTrader Pro',
            id: window.location.hostname,
          },
          user: {
            id: stringToArrayBuffer(userData.id),
            name: userData.email,
            displayName: `${userData.firstName} ${userData.lastName}`,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          timeout: 60000,
          attestation: 'none',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
        },
      });

      if (credential) {
        localStorage.setItem('algotrader_biometric', 'registered');
        localStorage.setItem('algotrader_credential_id', credential.id);
        setBiometricRegistered(true);
        return true;
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Biometric registration was cancelled');
      }
      throw new Error('Failed to register biometric: ' + err.message);
    }
  };

  const verifyBiometric = async () => {
    if (!isWebAuthnSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    const credentialId = localStorage.getItem('algotrader_credential_id');

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: generateChallenge(),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          ...(credentialId ? {
            allowCredentials: [{
              id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
              type: 'public-key',
              transports: ['internal'],
            }],
          } : {}),
        },
      });

      return !!assertion;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Biometric verification was cancelled');
      }
      throw new Error('Biometric verification failed');
    }
  };

  const completeLogin = (userData) => {
    const { password, ...safeUser } = userData;
    setUser(safeUser);
    localStorage.setItem('algotrader_user', JSON.stringify(safeUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('algotrader_user');
  };

  const value = {
    user,
    loading,
    signup,
    login,
    completeLogin,
    logout,
    registerBiometric,
    verifyBiometric,
    biometricRegistered,
    isWebAuthnSupported: isWebAuthnSupported(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export default AuthContext;

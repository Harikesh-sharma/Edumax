import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import { Loader2, AlertCircle } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Use environment variable for the Client ID
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const parseJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const handleGoogleResponse = (response) => {
        setIsLoading(true);
        const userData = parseJwt(response.credential);

        if (userData) {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('edumax_users') || '[]');
                const existingUser = users.find(u => u.email === userData.email);

                const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
                console.log("Admin config check - User Email:", userData.email, "Admin Email Config:", adminEmail);

                // Robust comparison: lowercase and trim both
                const userEmailClean = (userData.email || "").toLowerCase().trim();
                const adminEmailClean = (adminEmail || "").toLowerCase().trim();

                const role = adminEmailClean && userEmailClean === adminEmailClean ? 'admin' : 'user';
                console.log("Assigned Role:", role);

                const userInfo = {
                    id: userData.sub,
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture,
                    role: role,
                    lastLogin: new Date().toISOString()
                };

                if (!existingUser) {
                    users.push({ ...userInfo, createdAt: new Date().toISOString() });
                } else {
                    Object.assign(existingUser, userInfo);
                }

                localStorage.setItem('edumax_users', JSON.stringify(users));
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('role', role);
                localStorage.setItem('username', userData.name);
                localStorage.setItem('userEmail', userData.email);
                localStorage.setItem('userPicture', userData.picture);

                setIsLoading(false);
                navigate('/library');
            }, 1000);
        } else {
            setIsLoading(false);
            setError("Google registration failed. Please try again.");
        }
    };

    useEffect(() => {
        const initGoogle = () => {
            if (window.google) {
                try {
                    google.accounts.id.initialize({
                        client_id: CLIENT_ID,
                        callback: handleGoogleResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true
                    });

                    google.accounts.id.renderButton(
                        document.getElementById("googleSignUpButton"),
                        {
                            theme: "outline",
                            size: "large",
                            width: "100%",
                            text: "signup_with",
                            shape: "rectangular"
                        }
                    );

                    google.accounts.id.prompt();
                } catch (err) {
                    console.error("GSI Init Error:", err);
                    setError("Google initialization failed.");
                }
            } else {
                setTimeout(initGoogle, 500);
            }
        };

        if (!CLIENT_ID || CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            setError("Please configure your Google Client ID in Register.jsx to enable real registration.");
        } else {
            setError(null);
            initGoogle();
        }
    }, []);

    React.useEffect(() => {
        if (localStorage.getItem('isAuthenticated') === 'true') {
            navigate('/library');
        }
    }, [navigate]);

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join Edumax today using your real Google account"
        >
            <div style={{ padding: 'var(--space-lg) 0' }}>
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        padding: '12px',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '10px',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        marginBottom: '20px'
                    }}>
                        <AlertCircle size={18} />
                        <div>
                            <strong>Configuration Required:</strong>
                            <p style={{ margin: '4px 0 0 0' }}>{error}</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '16px' }}>
                        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                        <p style={{ color: 'var(--text-muted)' }}>Creating your account...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div id="googleSignUpButton" style={{ width: '100%', minHeight: '44px' }}></div>

                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'var(--space-md)' }}>
                            By creating an account, you agree to our <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
                        </p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-lg)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Log in</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Register;

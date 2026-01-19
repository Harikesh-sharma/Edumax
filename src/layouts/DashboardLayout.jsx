import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Layout, Star, Trash2, BookOpen, Menu, X } from 'lucide-react';
import Button from '../components/Button';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm)',
            margin: '0 var(--space-xs)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            backgroundColor: active ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
            color: active ? 'var(--primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s',
            fontWeight: active ? '600' : '500'
        }}
        onMouseEnter={(e) => {
            if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
            if (!active) e.currentTarget.style.backgroundColor = 'transparent';
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Icon size={20} />
            <span>{label}</span>
        </div>
    </div>
);

const DashboardLayout = ({ children, onAddNote }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem('username') || 'User';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        // Only clear session-specific keys, preserve edumax_ app data
        const sessionKeys = ['isAuthenticated', 'role', 'username', 'userEmail', 'userPicture'];
        sessionKeys.forEach(key => localStorage.removeItem(key));

        console.log('User logged out. App data preserved.');
        navigate('/login');
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'var(--bg-primary)', position: 'relative' }}>

            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                <Menu size={24} />
            </button>

            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="text-gradient" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layout /> Edumax
                    </h2>
                    {/* Close button for mobile inside sidebar */}
                    <div style={{ display: 'none' }} className="mobile-only-close">
                        <Button variant="ghost" onClick={() => setIsMobileMenuOpen(false)} style={{ padding: '4px' }}>
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                <div style={{ padding: '0 var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    {/* Placeholder for future actions */}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', overflowY: 'auto', minHeight: 0 }}>
                    <SidebarItem
                        icon={BookOpen}
                        label="Library"
                        active={location.pathname === '/library' || location.pathname.startsWith('/pdf')}
                        onClick={() => {
                            navigate('/library');
                            setIsMobileMenuOpen(false);
                        }}
                    />

                    <div style={{ margin: 'var(--space-sm) 0', borderTop: '1px solid var(--glass-border)' }} />
                    <div style={{ padding: '0 var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                        Categories
                    </div>

                    <SidebarItem
                        icon={Layout}
                        label="State Board"
                        active={location.pathname === '/state-boards'}
                        onClick={() => {
                            navigate('/state-boards');
                            setIsMobileMenuOpen(false);
                        }}
                    />
                    <SidebarItem
                        icon={BookOpen}
                        label="10th Board"
                        active={location.search === '?category=10th'}
                        onClick={() => {
                            navigate('/library?category=10th');
                            setIsMobileMenuOpen(false);
                        }}
                    />
                    <SidebarItem
                        icon={BookOpen}
                        label="12th Board"
                        active={location.search === '?category=12th'}
                        onClick={() => {
                            navigate('/library?category=12th');
                            setIsMobileMenuOpen(false);
                        }}
                    />
                    <SidebarItem
                        icon={Star}
                        label="B.Tech"
                        active={location.search === '?category=btech'}
                        onClick={() => {
                            navigate('/library?category=btech');
                            setIsMobileMenuOpen(false);
                        }}
                    />

                    <div style={{ margin: 'var(--space-sm) 0', borderTop: '1px solid var(--glass-border)' }} />

                    <SidebarItem icon={Star} label="Favorites" />

                    {localStorage.getItem('role') === 'admin' && (
                        <>
                            <div style={{ margin: 'var(--space-sm) 0', borderTop: '1px solid var(--glass-border)' }} />
                            <div style={{ padding: '0 var(--space-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                                Admin
                            </div>
                            <SidebarItem
                                icon={BookOpen}
                                label="Upload PDF"
                                active={location.pathname === '/admin/upload'}
                                onClick={() => {
                                    navigate('/admin/upload');
                                    setIsMobileMenuOpen(false);
                                }}
                            />
                        </>
                    )}
                </div>

                <div style={{
                    padding: 'var(--space-md)',
                    borderTop: '1px solid var(--glass-border)',
                    marginTop: 'auto',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            borderRadius: '50%', background: 'var(--gradient-primary, #64748b)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '0.8rem'
                        }}>
                            {username[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {username}
                                {localStorage.getItem('role') === 'admin' && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>Admin</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            color: 'var(--error)',
                            borderColor: 'var(--error)',
                            marginTop: 'var(--space-xs)'
                        }}
                    >
                        <LogOut size={18} /> Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { FileText, Lock, Unlock, Trash2 } from 'lucide-react';
import Button from '../components/Button';

const PdfLibrary = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const [pdfs, setPdfs] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const isAdmin = localStorage.getItem('role') === 'admin';

    // Get category from URL query params
    const queryParams = new URLSearchParams(location.search);
    const categoryFilter = queryParams.get('category');

    const loadPdfs = async (manual = false) => {
        if (manual) setIsSyncing(true);
        console.group('Library: Sync Process');

        try {
            const response = await fetch(`${API_URL}/pdfs`);
            if (response.ok) {
                const data = await response.json();
                console.log(`Library: Fetched ${data.length} PDFs from MongoDB`);
                setPdfs(data);
            }

            if (manual) {
                setTimeout(() => {
                    setIsSyncing(false);
                }, 600);
            }
        } catch (err) {
            console.error('Library: Sync Failed:', err);
            if (manual) setIsSyncing(false);
        } finally {
            console.groupEnd();
        }
    };

    useEffect(() => {
        loadPdfs();

        const handleSync = (e) => {
            console.log('Library: Sync signal received', e instanceof CustomEvent ? e.detail : 'Storage Event');
            setTimeout(loadPdfs, 100);
        };

        window.addEventListener('edumax-sync', handleSync);

        return () => {
            window.removeEventListener('edumax-sync', handleSync);
        };
    }, []);

    // Derived filtered list
    const filteredPdfs = categoryFilter
        ? pdfs.filter(pdf => String(pdf.category).toLowerCase() === categoryFilter.toLowerCase())
        : pdfs;

    const handlePdfClick = (pdf) => {
        navigate(`/pdf/${pdf._id}`);
    };

    const deletePdf = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Delete this PDF permanently?')) {
            try {
                const response = await fetch(`${API_URL}/pdfs/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    window.dispatchEvent(new CustomEvent('edumax-sync', { detail: { action: 'delete', id } }));
                    loadPdfs();
                }
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
    };

    const resetLibrary = () => {
        alert('Library reset is handled by clearing MongoDB database manually or deleting individual items.');
    };

    return (
        <DashboardLayout>
            <div className="container" style={{ padding: 'var(--space-lg) var(--space-md)', overflowY: 'auto', height: '100%' }}>

                <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div>
                        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
                            {categoryFilter ? `${categoryFilter} Library` : 'Academic Library'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {categoryFilter
                                ? `Showing resources for ${categoryFilter}`
                                : 'Explore your collection of notes and books'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        {categoryFilter && (
                            <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
                                ✕ Clear Filter
                            </Button>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'var(--space-sm)', textAlign: 'right' }}>
                            {categoryFilter ? (
                                <>Showing <strong>{filteredPdfs.length}</strong> of <strong>{pdfs.length}</strong> total</>
                            ) : (
                                <>Total documents: <strong>{pdfs.length}</strong></>
                            )}
                        </div>
                        {isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => loadPdfs(true)} disabled={isSyncing}>
                                {isSyncing ? '⌛ Syncing...' : '🔄 Sync'}
                            </Button>
                        )}
                    </div>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 'var(--space-md)'
                }}>
                    {filteredPdfs.length === 0 && (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: 'var(--space-xl)',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px dashed var(--glass-border)',
                            color: 'var(--text-muted)'
                        }}>
                            <FileText size={48} style={{ margin: '0 auto var(--space-md)', opacity: 0.3 }} />
                            <h3 style={{ marginBottom: '8px' }}>No Documents Found</h3>
                            <p>
                                {categoryFilter
                                    ? `There are no PDFs available in the "${categoryFilter}" category.`
                                    : 'The library is currently empty.'}
                            </p>

                            {categoryFilter && pdfs.length > 0 && (
                                <div style={{ marginTop: 'var(--space-md)' }}>
                                    <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>
                                        Found <strong>{pdfs.length}</strong> documents in other categories.
                                    </p>
                                    <Button variant="secondary" size="sm" onClick={() => navigate('/library')}>
                                        Show All Documents
                                    </Button>
                                </div>
                            )}

                            {isAdmin && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate('/admin/upload')}
                                    style={{ marginTop: 'var(--space-md)' }}
                                >
                                    Upload New PDF
                                </Button>
                            )}
                        </div>
                    )}

                    {filteredPdfs.map((pdf) => (
                        <div
                            key={pdf._id}
                            className="glass"
                            style={{
                                padding: 'var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'transform 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-sm)',
                                position: 'relative'
                            }}
                            onClick={() => handlePdfClick(pdf)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {/* Delete Button (Admins only) */}
                            {isAdmin && (
                                <button
                                    onClick={(e) => deletePdf(e, pdf._id)}
                                    title="Delete PDF"
                                    style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        zIndex: 10,
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid var(--error)',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--error)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        padding: 0
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--error)';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                        e.currentTarget.style.color = 'var(--error)';
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <div style={{
                                aspectRatio: '3/4',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 'var(--space-xs)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Preview Placeholder */}
                                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                                    <FileText size={48} />
                                    <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>PDF Preview</div>
                                </div>

                                {/* Lock Overlay */}
                                {pdf.locked && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        background: 'rgba(0,0,0,0.6)',
                                        padding: '4px',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)'
                                    }}>
                                        <Lock size={16} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {pdf.title}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{pdf.author}</p>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Category: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{pdf.category}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontWeight: '700',
                                    color: pdf.price > 0 ? 'var(--accent)' : 'var(--success)'
                                }}>
                                    {Number(pdf.price) > 0 ? `₹${pdf.price}` : 'Free'}
                                </span>
                                <Button size="sm" variant={Number(pdf.price) > 0 ? 'primary' : 'secondary'}>
                                    {Number(pdf.price) > 0 ? 'Buy Now' : 'Read'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Storage Diagnostics (Admin Only) */}
                {isAdmin && (
                    <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ color: 'var(--primary)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem' }}>🛠 Admin Storage Diagnostics</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            <div><strong>Active Filter:</strong> <span style={{ color: 'var(--accent)' }}>{categoryFilter || 'None'}</span></div>
                            <div>
                                <strong>Raw Uploaded Data:</strong>
                                <pre style={{ marginTop: '4px', padding: '8px', background: 'rgba(0,0,0,0.5)', overflowX: 'auto', borderRadius: '4px' }}>
                                    {localStorage.getItem('edumax_uploadedPdfs') || 'EMPTY'}
                                </pre>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={resetLibrary} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>[Clear All Data]</button>
                                <button onClick={() => loadPdfs(true)} style={{ color: 'var(--success)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>[Force Reload]</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PdfLibrary;

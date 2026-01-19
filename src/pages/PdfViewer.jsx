import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, Lock, CreditCard, ShieldAlert } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF worker using CDN to avoid build issues with Vite/Rollup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const [numPages, setNumPages] = useState(null);
    const [pdfMetadata, setPdfMetadata] = useState(null);
    const [isPaid, setIsPaid] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [metadataLoaded, setMetadataLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isAdmin = localStorage.getItem('role') === 'admin';

    // Injection of modal animation
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes modalSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    // Injection of Razorpay Payment Button
    useEffect(() => {
        if (showPaymentModal) {
            const container = document.getElementById('razorpay-button-container');
            // Clear container before adding script
            if (container) {
                container.innerHTML = '';
                const script = document.createElement('script');
                script.src = "https://checkout.razorpay.com/v1/payment-button.js";
                script.setAttribute("data-payment_button_id", "pl_S5SdlSBYBNavF6");
                script.async = true;
                container.appendChild(script);
            }
        }
    }, [showPaymentModal]);

    // Industry standard worker configuration for Vite
    useEffect(() => {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    }, []);

    useEffect(() => {
        console.group('Viewer: Initialization');

        const loadMetadata = async () => {
            console.log('Document ID:', id);

            try {
                // Fetch specific PDF from backend
                const response = await fetch(`${API_URL}/pdfs`);
                if (response.ok) {
                    const pdfs = await response.json();
                    const found = pdfs.find(p => String(p._id) === String(id));

                    if (found) {
                        console.log('Metadata found:', found.title);
                        setPdfMetadata(found);

                        if (Number(found.price) === 0) {
                            console.log('Document is free, unlocking all pages');
                            setIsPaid(true);
                        }
                    } else {
                        console.error('Document not found in storage!');
                    }
                }
            } catch (err) {
                console.error('Viewer: Failed to fetch metadata', err);
            } finally {
                setMetadataLoaded(true);
                console.groupEnd();
            }
        };

        loadMetadata();
    }, [id, isAdmin]);

    const pdfFile = pdfMetadata?.fileId ? `${API_URL}/pdfs/file/${pdfMetadata.fileId}` : null;

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handlePayment = () => {
        setIsLoading(true);
        // Simulate payment processing
        setTimeout(() => {
            setIsPaid(true);
            setShowPaymentModal(false);
            setIsLoading(false);
        }, 2000);
    };

    // Prevent right click
    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    if (!metadataLoaded) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            Initializing secure viewer...
        </div>;
    }

    return (
        <div style={{
            height: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none', // CSS Protection
            WebkitUserSelect: 'none'
        }}>
            {/* Header */}
            <div className="glass" style={{
                padding: 'var(--space-sm) var(--space-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10
            }}>
                <div className="flex items-center gap-sm">
                    <Button variant="ghost" onClick={() => navigate('/library')}>
                        <ArrowLeft size={20} /> Back
                    </Button>
                    <h3 style={{ marginLeft: 'var(--space-md)' }}>
                        {pdfMetadata?.title || 'Document Viewer'}
                    </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.8rem' }}>
                        <ShieldAlert size={16} />
                        <span className="desktop-only">Secure Restricted Access</span>
                    </div>
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsPaid(true)}
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '4px 10px',
                                    borderColor: 'var(--primary)',
                                    color: 'var(--primary)'
                                }}
                            >
                                [Admin] Bypass Lock
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Viewer */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--space-lg)',
                position: 'relative',
                backgroundColor: '#525659' // Standard PDF reader background
            }}>
                <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div style={{ color: 'white', padding: 'var(--space-xl)' }}>Opening document...</div>}
                    error={<div style={{ color: 'var(--error)', padding: 'var(--space-xl)', textAlign: 'center' }}>
                        <p><strong>Failed to load PDF.</strong></p>
                        <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>This may be due to browser security settings or a corrupted file.</p>
                        <Button variant="ghost" size="sm" onClick={() => window.location.reload()} style={{ marginTop: 'var(--space-md)' }}>Retry</Button>
                    </div>}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <div
                            key={`page_${index + 1}`}
                            style={{
                                marginBottom: '20px',
                                position: 'relative',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            {/* Blur Overlay for unpaid pages > 1 */}
                            {!isPaid && index > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backdropFilter: 'blur(12px)',
                                    zIndex: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    color: 'white'
                                }}>
                                    <Lock size={48} style={{ marginBottom: 'var(--space-md)', color: 'var(--accent)' }} />
                                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>Premium Content</h3>
                                    <p style={{ marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                                        Purchase full access to view the remaining {numPages - 1} pages.
                                    </p>
                                    <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
                                        Unlock Now - ₹{pdfMetadata?.price || '0'}
                                    </Button>
                                </div>
                            )}

                            {/* Transparent overlay to block drag/drop/interaction */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 1
                            }} />

                            <Page
                                pageNumber={index + 1}
                                renderTextLayer={false} // Disable text selection layer
                                renderAnnotationLayer={false}
                                scale={1.2}
                            />
                        </div>
                    ))}
                </Document>
            </div>

            {/* Razorpay Simulation Modal */}
            {showPaymentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: '420px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        animation: 'modalSlideUp 0.3s ease-out'
                    }}>
                        {/* Razorpay Header */}
                        <div style={{
                            background: '#3392FF',
                            padding: 'var(--space-md) var(--space-lg)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Payment for</div>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{pdfMetadata?.title || 'PDF Document'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>₹{pdfMetadata?.price}</div>
                                <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>ID: #RP_{id.slice(-6)}</div>
                            </div>
                        </div>

                        {/* Razorpay Body */}
                        <div style={{ padding: 'var(--space-lg)', color: '#1f2937', textAlign: 'center' }}>
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: 'var(--space-md)' }}>
                                    Click the button below to complete your payment securely via Razorpay.
                                </p>

                                {/* Container for the external script */}
                                <div id="razorpay-button-container" style={{ minHeight: '60px', display: 'flex', justifyContent: 'center' }}>
                                    {/* Script will be injected here */}
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading Payment Button...</div>
                                </div>
                            </div>

                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
                                🔒 Secure checkout powered by Razorpay. <br />
                                After payment, please use the <b>Admin Bypass</b> to view the content in this demo.
                            </p>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                            <Button
                                variant="ghost"
                                onClick={() => setShowPaymentModal(false)}
                                style={{ width: '100%', color: '#6b7280' }}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfViewer;

import React from 'react';
import { SearchBox } from '@mapbox/search-js-react';

// Icônes SVG légères
const CloseIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>;
const TimeIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
const EyeIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const MapIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" /><path d="M8 2v16" /><path d="M16 6v16" /></svg>;

const Sidebar = ({ isOpen, onClose, setStartCoords, setEndCoords, onCalculate, routeStats, isCalculated, onReset }) => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    // Style "Silicon Valley"
    const s = {
        container: {
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            maxWidth: '100vw',
            height: '100vh',
            background: 'rgba(12, 12, 12, 0.95)', // Noir profond
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 100,
            padding: '32px',
            boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
            color: '#fff',
            fontFamily: '"Inter", sans-serif'
        },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
        title: { fontSize: '14px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.5 },
        closeBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7 },
        inputGroup: { marginBottom: '24px' },
        inputLabel: { fontSize: '11px', textTransform: 'uppercase', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 },
        searchWrapper: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', background: '#1a1a1a', marginBottom: '12px' },
        btnMain: { width: '100%', padding: '16px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: '10px' },
        btnGhost: { width: '100%', padding: '14px', background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', marginTop: '16px' },

        // Résultats
        resultCard: { background: '#1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '16px', border: '1px solid #333' },
        cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' },
        statBig: { fontSize: '28px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center' },
        statRow: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', opacity: 0.8 },
        badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center' },

        // Couleurs
        cyan: '#00ffff',
        green: '#39ff14',
        red: '#ff3b30'
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <span style={s.title}>{isCalculated ? 'Analyse Terminée' : 'Planifier'}</span>
                <button onClick={onClose} style={s.closeBtn}><CloseIcon /></button>
            </div>

            {!isCalculated ? (
                // --- MODE RECHERCHE ---
                <div>
                    <div style={s.inputGroup}>
                        <span style={s.inputLabel}>Point de départ</span>
                        <div style={s.searchWrapper}>
                            <SearchBox
                                accessToken={token}
                                options={{ language: 'fr', country: 'ca' }}
                                placeholder="Où êtes-vous ?"
                                theme={{ variables: { fontFamily: 'inherit', unit: '16px', borderRadius: '0', colorText: '#fff', colorBackground: '#1a1a1a' } }}
                                onRetrieve={(res) => setStartCoords(res.features[0].geometry.coordinates)}
                            />
                        </div>

                        <span style={s.inputLabel}>Destination</span>
                        <div style={s.searchWrapper}>
                            <SearchBox
                                accessToken={token}
                                options={{ language: 'fr', country: 'ca' }}
                                placeholder="Où allez-vous ?"
                                theme={{ variables: { fontFamily: 'inherit', unit: '16px', borderRadius: '0', colorText: '#fff', colorBackground: '#1a1a1a' } }}
                                onRetrieve={(res) => setEndCoords(res.features[0].geometry.coordinates)}
                            />
                        </div>
                    </div>
                    <button style={s.btnMain} onClick={onCalculate}>LANCER L'ANALYSE</button>
                </div>
            ) : (
                // --- MODE RÉSULTATS ---
                <div>
                    {/* Standard Route */}
                    <div style={{ ...s.resultCard, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div style={{ ...s.cardHeader, color: s.cyan }}>RAPIDE (STANDARD)</div>
                        <div style={s.statBig}>{routeStats.standard.time} min</div>
                        <div style={s.statRow}>
                            <span><MapIcon /> {routeStats.standard.dist} km</span>
                            <span style={{ ...s.badge, background: 'rgba(255, 59, 48, 0.2)', color: s.red }}>
                                <EyeIcon /> {routeStats.standard.cams} CAMÉRAS
                            </span>
                        </div>
                    </div>

                    {/* Safe Route */}
                    <div style={{ ...s.resultCard, borderColor: routeStats.safe.cams === 0 ? s.green : '#ffcc00', boxShadow: routeStats.safe.cams === 0 ? '0 0 20px rgba(57, 255, 20, 0.1)' : 'none' }}>
                        <div style={{ ...s.cardHeader, color: s.green }}>SÉCURISÉ (GHOST)</div>
                        <div style={s.statBig}>{routeStats.safe.time} min</div>
                        <div style={s.statRow}>
                            <span><MapIcon /> {routeStats.safe.dist} km</span>
                            <span style={{ ...s.badge, background: routeStats.safe.cams === 0 ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 204, 0, 0.2)', color: routeStats.safe.cams === 0 ? s.green : '#ffcc00' }}>
                                <EyeIcon /> {routeStats.safe.cams} CAMÉRAS
                            </span>
                        </div>
                        {routeStats.safe.cams === 0 && (
                            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.3)', color: s.green, fontSize: '11px', fontWeight: 800, textAlign: 'center', borderRadius: '8px', letterSpacing: '1px' }}>
                                GHOST MODE ACTIVATED
                            </div>
                        )}
                    </div>

                    <button style={s.btnGhost} onClick={onReset}>NOUVELLE RECHERCHE</button>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
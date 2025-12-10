import React from 'react';

const TitleOverlay = () => {
    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '25px',
            zIndex: 1000,
            pointerEvents: 'none', // Allow clicking through
            userSelect: 'none'
        }}>
            <h1 style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.4)',
                letterSpacing: '2px',
                margin: 0,
                textTransform: 'uppercase',
                textShadow: '0 0 10px rgba(0,0,0,0.5)' // Subtle shadow for readability
            }}>
                GHOSTMAP
            </h1>
        </div>
    );
};

export default TitleOverlay;

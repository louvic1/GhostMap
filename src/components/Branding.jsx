import React from 'react';

const Branding = () => {
    return (
        <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 10,
            pointerEvents: 'none',
            userSelect: 'none'
        }}>
            <h1 style={{
                fontSize: '12px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                color: 'white',
                opacity: 0.5,
                margin: 0,
                fontFamily: '"Inter", sans-serif'
            }}>
                GhostMap
            </h1>
        </div>
    );
};

export default Branding;
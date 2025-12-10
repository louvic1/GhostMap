import React from 'react';

const MenuTrigger = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(18, 18, 18, 0.6)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                zIndex: 50,
                transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
    );
};

export default MenuTrigger;
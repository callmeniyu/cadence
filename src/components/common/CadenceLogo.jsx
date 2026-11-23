export function CadenceMark({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <rect x="2" y="10" width="3" height="8" rx="1.5" fill="var(--cd-accent-violet, #7775E8)" />
      <rect x="7.5" y="6" width="3" height="14" rx="1.5" fill="var(--cd-accent-lime, #C7F36B)" />
      <rect x="13" y="3" width="3" height="18" rx="1.5" fill="currentColor" />
      <rect x="18.5" y="8" width="3" height="11" rx="1.5" fill="var(--cd-accent-lime, #C7F36B)" />
    </svg>
  );
}

export function CadenceLogo({ size = 'md', tone = 'dark', showTagline = false }) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const isDarkTone = tone === 'dark'; // on dark background

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        textDecoration: 'none',
        color: isDarkTone ? '#FFFFFF' : 'var(--cd-primary-dark, #171B24)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: iconSize + 10,
          height: iconSize + 10,
          borderRadius: 8,
          background: isDarkTone ? 'rgba(255, 255, 255, 0.08)' : 'var(--cd-primary-dark, #171B24)',
          color: isDarkTone ? '#FFFFFF' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDarkTone ? 'none' : '0 2px 6px rgba(23, 27, 36, 0.16)',
        }}
      >
        <CadenceMark size={iconSize} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: size === 'sm' ? '0.9375rem' : size === 'lg' ? '1.35rem' : '1.125rem',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: isDarkTone ? '#FFFFFF' : 'var(--cd-primary-dark, #171B24)',
          }}
        >
          Cadence
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isDarkTone ? 'rgba(255, 255, 255, 0.6)' : 'var(--cd-secondary-text, #747B88)',
              marginTop: 2,
            }}
          >
            Run in rhythm
          </span>
        )}
      </div>
    </div>
  );
}

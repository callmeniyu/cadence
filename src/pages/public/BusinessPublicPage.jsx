import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Search, Calendar, ChevronRight } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useBusinessBySlug, usePublicServices } from '../../features/booking/hooks';
import { formatMoney, formatDuration } from '../../utils/format';
import './business.css';

export default function BusinessPublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: business, isLoading: bizLoading, isError } = useBusinessBySlug(slug);
  const { data: services, isLoading: svcLoading } = usePublicServices(business?.id);

  if (bizLoading) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '3rem 0' }}>
          <SkeletonRows rows={4} height={90} />
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '5rem 0' }}>
          <EmptyState
            title="Business not found"
            description="This Cadence booking page doesn't exist or is currently inactive."
          />
        </div>
        <PublicFooter />
      </div>
    );
  }

  const categories = [...new Set((services || []).map((s) => s.category).filter(Boolean))];

  const filteredServices = (services || []).filter((s) => {
    if (selectedCategory && s.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <PublicHeader />

      <main style={{ flex: 1 }}>
        {/* Business Branding Banner */}
        <div className="sf-biz-banner">
          <div className="sf-container">
            <div className="sf-flex sf-items-center sf-gap-2 sf-mb-2">
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--cd-accent-lime)',
                }}
              >
                {business.business_type || 'Services'}
              </span>
            </div>
            <h1 className="sf-biz-name">{business.name}</h1>
            <div
              className="sf-flex sf-gap-4 sf-items-center"
              style={{ flexWrap: 'wrap', color: 'rgba(255, 255, 255, 0.75)', fontSize: 'var(--sf-fs-sm)', marginTop: 8 }}
            >
              {business.address && (
                <span className="sf-flex sf-items-center sf-gap-1">
                  <MapPin size={14} color="var(--cd-accent-lime)" />
                  {business.address}
                </span>
              )}
              {business.phone && (
                <span className="sf-flex sf-items-center sf-gap-1">
                  <Phone size={14} color="var(--cd-accent-lime)" />
                  {business.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Services Showcase */}
        <div className="sf-container" style={{ padding: '3rem 0 5rem' }}>
          <div className="sf-flex sf-justify-between sf-items-center sf-mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: 'var(--sf-fs-xl)', fontWeight: 800, color: 'var(--cd-primary-dark)' }}>
                Select a Service
              </h2>
              <p className="sf-muted sf-text-sm">Choose an offering to view live availability and book online.</p>
            </div>

            <div className="sf-flex sf-gap-2 sf-items-center" style={{ flexWrap: 'wrap' }}>
              <div className="sf-search-input-wrap" style={{ maxWidth: 240 }}>
                <Search size={14} />
                <input
                  className="sf-input"
                  style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: 'var(--sf-fs-xs)' }}
                  placeholder="Filter services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {categories.length > 0 && (
                <div className="sf-chip-row">
                  <button
                    type="button"
                    className="sf-chip"
                    style={{
                      background: selectedCategory === '' ? 'var(--cd-primary-dark)' : 'var(--cd-surface)',
                      color: selectedCategory === '' ? '#FFFFFF' : 'var(--cd-primary-text)',
                    }}
                    onClick={() => setSelectedCategory('')}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="sf-chip"
                      style={{
                        background: selectedCategory === cat ? 'var(--cd-primary-dark)' : 'var(--cd-surface)',
                        color: selectedCategory === cat ? '#FFFFFF' : 'var(--cd-primary-text)',
                      }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {svcLoading ? (
            <SkeletonRows rows={4} height={100} />
          ) : !filteredServices.length ? (
            <EmptyState
              title="No services match your criteria"
              description="Try clearing your search or category filter."
            />
          ) : (
            <div className="sf-card-list">
              {filteredServices.map((s) => (
                <Card key={s.id} className="sf-svc-row">
                  <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1.25rem' }}>
                    <div style={{ borderLeft: `4px solid ${s.color || 'var(--cd-primary-dark)'}`, paddingLeft: 16 }}>
                      <div className="sf-flex sf-items-center sf-gap-2">
                        <span className="sf-row-card-title" style={{ fontSize: '1.0625rem' }}>{s.name}</span>
                        {s.category && <span className="sf-badge sf-badge-neutral">{s.category}</span>}
                      </div>

                      {s.description && (
                        <p className="sf-muted sf-text-sm sf-mt-2" style={{ maxWidth: 540 }}>
                          {s.description}
                        </p>
                      )}

                      <div className="sf-row-card-meta sf-mt-3">
                        <span className="sf-flex sf-items-center sf-gap-1">
                          <Clock size={14} color="var(--cd-secondary-text)" />
                          {formatDuration(s.duration_minutes)}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--cd-primary-dark)', fontSize: 'var(--sf-fs-sm)' }}>
                          {formatMoney(s.price, business.currency)}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => navigate(`/b/${slug}/book?service=${s.id}`)}
                      className="sf-flex sf-items-center sf-gap-1"
                    >
                      <span>Book session</span>
                      <ChevronRight size={16} />
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '3.5rem',
              padding: '1.5rem',
              borderRadius: 'var(--sf-radius-lg)',
              background: 'var(--cd-surface)',
              border: '1px solid var(--cd-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>Already booked an appointment?</div>
              <p className="sf-muted sf-text-xs sf-mt-1">
                Lookup your reservation anytime using your Cadence confirmation code.
              </p>
            </div>
            <Link to={`/b/${slug}/lookup`}>
              <Button variant="secondary" size="sm">
                <Calendar size={14} />
                Lookup booking
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

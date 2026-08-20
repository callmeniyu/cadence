import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Phone, Clock } from 'lucide-react';
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
  const { data: business, isLoading: bizLoading, isError } = useBusinessBySlug(slug);
  const { data: services, isLoading: svcLoading } = usePublicServices(business?.id);

  if (bizLoading) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '2rem 0' }}><SkeletonRows rows={4} height={90} /></div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '4rem 0' }}>
          <EmptyState title="Business not found" description="This booking page doesn't exist or is no longer active." />
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <div className="sf-biz-banner" style={{ background: business.brand_color }}>
          <div className="sf-container">
            <h1 className="sf-biz-name">{business.name}</h1>
            <div className="sf-flex sf-gap-4" style={{ flexWrap: 'wrap', color: 'rgba(255,255,255,0.9)', fontSize: 'var(--sf-fs-sm)' }}>
              {business.address && <span className="sf-flex sf-items-center sf-gap-1"><MapPin size={14} />{business.address}</span>}
              {business.phone && <span className="sf-flex sf-items-center sf-gap-1"><Phone size={14} />{business.phone}</span>}
            </div>
          </div>
        </div>

        <div className="sf-container" style={{ padding: '2.5rem 0' }}>
          <h2 className="sf-mb-4" style={{ fontSize: 'var(--sf-fs-lg)' }}>Choose a service</h2>
          {svcLoading ? (
            <SkeletonRows rows={4} height={100} />
          ) : !services?.length ? (
            <EmptyState title="No services available" description="This business hasn't published any bookable services yet." />
          ) : (
            <div className="sf-card-list">
              {services.map((s) => (
                <Card key={s.id} className="sf-svc-row">
                  <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ borderLeft: `4px solid ${s.color}`, paddingLeft: 14 }}>
                      <div className="sf-row-card-title">{s.name}</div>
                      {s.category && <span className="sf-badge sf-badge-neutral sf-mt-2">{s.category}</span>}
                      {s.description && <p className="sf-muted sf-text-sm sf-mt-2" style={{ maxWidth: 480 }}>{s.description}</p>}
                      <div className="sf-row-card-meta sf-mt-2">
                        <span className="sf-flex sf-items-center sf-gap-1"><Clock size={13} />{formatDuration(s.duration_minutes)}</span>
                        <span>{formatMoney(s.price, business.currency)}</span>
                      </div>
                    </div>
                    <Button variant="primary" onClick={() => navigate(`/b/${slug}/book?service=${s.id}`)}>Book now</Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          <p className="sf-text-xs sf-muted sf-mt-6">
            Already booked? <Link to={`/b/${slug}/lookup`} style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>Look up your booking</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

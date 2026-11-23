import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Search, ArrowLeft, Calendar } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';

export default function BookingLookup() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function submit(e) {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/b/${slug}/book/confirmation/${code.trim().toUpperCase()}`);
    }
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <PublicHeader />

      <main style={{ flex: 1, padding: '3.5rem 0' }}>
        <div className="sf-container" style={{ maxWidth: 460 }}>
          <Link
            to={`/b/${slug}`}
            className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4"
            style={{ color: 'var(--cd-primary-dark)', fontWeight: 600, textDecoration: 'none' }}
          >
            <ArrowLeft size={14} /> Back to business
          </Link>

          <Card padded>
            <div className="sf-flex sf-items-center sf-gap-3 sf-mb-3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'var(--cd-surface-subtle)',
                  border: '1px solid var(--cd-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cd-primary-dark)',
                }}
              >
                <Calendar size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 800, color: 'var(--cd-primary-dark)' }}>
                  Look up your booking
                </h1>
                <p className="sf-muted sf-text-xs">Retrieve your reservation details</p>
              </div>
            </div>

            <p className="sf-muted sf-mb-4 sf-text-sm">
              Enter your Cadence confirmation code (e.g. <strong>CAD-7K2P9Q</strong>) below.
            </p>

            <form onSubmit={submit}>
              <Field label="Confirmation code" htmlFor="code">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CAD-XXXXXX"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--sf-font-mono)' }}
                  required
                />
              </Field>

              <Button type="submit" variant="primary" block className="sf-mt-2">
                <Search size={16} /> Find booking
              </Button>
            </form>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

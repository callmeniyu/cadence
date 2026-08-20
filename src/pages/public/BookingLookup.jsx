import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    if (code.trim()) navigate(`/b/${slug}/book/confirmation/${code.trim().toUpperCase()}`);
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <div className="sf-container" style={{ padding: '3rem 0', maxWidth: 460 }}>
          <Card padded>
            <h1 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-lg)' }}>Look up your booking</h1>
            <p className="sf-muted sf-mb-4 sf-text-sm">Enter the confirmation code you received, e.g. SF-7K2P9Q.</p>
            <form onSubmit={submit}>
              <Field label="Confirmation code" htmlFor="code">
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SF-XXXXXX" />
              </Field>
              <Button type="submit" variant="primary" block>Find booking</Button>
            </form>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

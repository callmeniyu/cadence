import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { businessApi, getPreference, setPreference } from '../../services';

const BusinessContext = createContext(null);

// Tracks the caller's workspaces + which one is "current" (persisted in
// Cadence preferences so a refresh doesn't drop the active workspace selection).
export function BusinessProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [currentBusinessId, setCurrentBusinessId] = useState(() => getPreference('current_business_id', null));
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await businessApi.getMyBusinesses(user.id);
      setMemberships(rows);
      setCurrentBusinessId((prev) => {
        if (prev && rows.some((r) => r.business.id === prev)) return prev;
        return rows[0]?.business.id || null;
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (active) {
      reload();
    }
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (currentBusinessId) {
      setPreference('current_business_id', currentBusinessId);
    }
  }, [currentBusinessId]);

  const current = memberships.find((m) => m.business.id === currentBusinessId) || null;

  const value = {
    memberships,
    loading: isAuthenticated ? loading : false,
    currentBusiness: current?.business || null,
    currentMembership: current?.membership || null,
    role: current?.membership?.role || null,
    hasWorkspace: memberships.length > 0,
    switchBusiness: setCurrentBusinessId,
    reload,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}

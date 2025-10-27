// client/src/components/ActiveOrgName.jsx
import React, { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function ActiveOrgName({ fallback = '— none —' }) {
  const { user, activeOrgId } = useAuth();

  const orgName = useMemo(() => {
    if (!user?.organizations || !activeOrgId) return null;
    const match = user.organizations.find(o => String(o.id) === String(activeOrgId));
    return match?.name || null;
  }, [user, activeOrgId]);

  return <span>{orgName ?? fallback}</span>;
}

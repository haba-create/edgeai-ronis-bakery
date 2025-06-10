import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import OwnerDashboard from '@/components/owner/OwnerDashboard';

export default function OwnerPage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={['admin', 'owner']}>
      <OwnerDashboard />
    </ProtectedRoute>
  );
}
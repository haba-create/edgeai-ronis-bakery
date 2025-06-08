import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DriverApp from '@/components/apps/DriverApp';

export default function DriverDashboard() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={['driver', 'admin']}>
      <DashboardLayout 
        title="Driver Dashboard"
        description={`Welcome back, ${session?.user?.name || 'Driver'}! Manage your delivery routes.`}
      >
        <DriverApp />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ClientApp from '@/components/apps/ClientApp';

export default function ClientDashboard() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={['client', 'admin']}>
      <DashboardLayout 
        title="Restaurant Dashboard"
        description={`Welcome back, ${session?.user?.name || 'Restaurant Owner'}! Manage your bakery operations.`}
      >
        <div className="h-[calc(100vh-4rem)]">
          <ClientApp />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
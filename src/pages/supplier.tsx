import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SupplierApp from '@/components/apps/SupplierApp';

export default function SupplierDashboard() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={['supplier', 'admin']}>
      <DashboardLayout 
        title="Supplier Dashboard"
        description={`Welcome back, ${session?.user?.name || 'Supplier Manager'}! Manage your supply operations.`}
      >
        <SupplierApp />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
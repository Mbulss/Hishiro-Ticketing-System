import React from 'react';
import AdminLayout from '../AdminLayout';
import UserManagement from '../components/UserManagement';

export default function Users() {
  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
        <UserManagement />
      </main>
    </AdminLayout>
  );
} 
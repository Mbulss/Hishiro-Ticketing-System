import AdminLayout from '../AdminLayout';
import { TicketStats } from "../components/ticket-stats"
import { TicketList } from "../components/ticket-list"
// import { Filters } from "../components/filters" // Remove filter import
import { useState } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center items-start">
        <div className="w-full max-w-5xl mx-auto bg-white/90 rounded-2xl shadow-2xl p-2 sm:p-4 md:p-8 mt-2 sm:mt-4 mb-4 sm:mb-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-gray-500 text-sm sm:text-base font-medium">Overview of your support ticket system</p>
            </div>
            <TicketStats status={status} priority={priority}/>
            <div className="space-y-4">
              {/* Filters removed from dashboard */}
              <TicketList status={status} priority={priority} limit={5} />
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  )
}

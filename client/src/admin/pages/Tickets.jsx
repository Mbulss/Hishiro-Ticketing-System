// src/admin/pages/Tickets.jsx

import AdminLayout from '../AdminLayout';
import { TicketList } from "../components/ticket-list"
import { Filters } from "../components/filters"
import { Input } from "../../components/ui/input"
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';

export default function Tickets() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialStatus = query.get('status') || 'all';
  const initialAssignee = query.get('assignee') || 'all';
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState('all');
  const [assignee, setAssignee] = useState(initialAssignee);
  const [search, setSearch] = useState('');

  // Update filters if URL changes
  useEffect(() => {
    setStatus(query.get('status') || 'all');
    setAssignee(query.get('assignee') || 'all');
  }, [location.search]);

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 max-w-full">
        <div className="space-y-6 max-w-full overflow-hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tickets</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage and track support tickets</p>
          </div>
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full">
              <Input
                placeholder="Search tickets..."
                className="mb-2 w-full sm:w-auto sm:max-w-xs sm:mb-0 min-w-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="flex-1 min-w-0">
                <Filters
                  status={status}
                  setStatus={setStatus}
                  priority={priority}
                  setPriority={setPriority}
                  assignee={assignee}
                  setAssignee={setAssignee}
                  onClear={() => {
                    setStatus('all');
                    setPriority('all');
                    setAssignee('all');
                  }}
                />
              </div>
            </div>
            <div className="w-full overflow-hidden">
              <TicketList status={status} priority={priority} assignee={assignee} search={search} />
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  )
}

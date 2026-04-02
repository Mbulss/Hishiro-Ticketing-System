import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Eye, MessageSquare, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { API_URL, getSocketUrl } from '../../config/api';

function getPriorityColor(priority) {
  switch (priority) {
    case "Critical":
      return "bg-red-500 hover:bg-red-600"
    case "High":
      return "bg-orange-500 hover:bg-orange-600"
    case "Medium":
      return "bg-yellow-500 hover:bg-yellow-600"
    case "Low":
      return "bg-green-500 hover:bg-green-600"
    default:
      return "bg-gray-500 hover:bg-gray-600"
  }
}

function getStatusColor(status) {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200"
    case "in-progress":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    case "pending":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200"
    case "resolved":
      return "bg-green-100 text-green-800 hover:bg-green-200"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  }
}

export function TicketList({ status, priority, assignee, search, limit }) {
  const [tickets, setTickets] = useState([]);
  const [socket, setSocket] = useState(null);
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  // Helper to filter tickets client-side (if backend doesn't support query params)
  const filterTickets = (tickets) => {
    return tickets.filter(ticket => {
      let statusMatch = status === 'all' || ticket.status === status;
      let priorityMatch = priority === 'all' || ticket.priority?.toLowerCase() === priority;
      let searchMatch = !search ||
        ticket._id?.toLowerCase().includes(search.toLowerCase()) ||
        ticket.message?.toLowerCase().includes(search.toLowerCase()) ||
        ticket.userEmail?.toLowerCase().includes(search.toLowerCase());
      return statusMatch && priorityMatch && searchMatch;
    });
  };

  useEffect(() => {
    if (loading) return; // Wait for user loading to complete
    if (!user) {
      // If user is not logged in, redirect to login page
      navigate('/login');
      return;
    }

    // Connect to socket
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Fetch initial tickets
    const fetchTickets = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 401) {
             // If unauthorized, redirect to login
             navigate('/login');
             return;
          }
          throw new Error(`Failed to fetch tickets: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setTickets(filterTickets(data));
      } catch (err) {
        console.error('Error fetching tickets:', err);
        // Handle other potential errors, maybe show a message to the user
      }
    };

    fetchTickets();

    // Listen for new tickets
    newSocket.on('newTicket', (ticket) => {
      setTickets(prev => {
        if (!prev.find(t => t._id === ticket._id)) {
          const updated = [ticket, ...prev];
          return filterTickets(updated);
        }
        return filterTickets(prev);
      });
    });

    // Listen for ticket updates
    newSocket.on('ticketUpdated', (updatedTicket) => {
      setTickets(prev => {
        const updated = prev.map(ticket => 
          ticket._id === updatedTicket._id ? updatedTicket : ticket
        );
        return filterTickets(updated);
      });
    });

    return () => {
      newSocket.disconnect();
    };
  // re-run when filters change
  }, [user, loading, navigate, status, priority, search]);

  if (loading) {
    // Optionally show a loading indicator while user state is being determined
    return <div>Loading tickets...</div>;
  }

  // After loading, if user is null, the redirect above will handle it,
  // so no need for a separate check here for rendering.

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-4 p-6">
          {(limit ? tickets.slice(0, limit) : tickets).map((ticket) => {
            // Priority emoji
            let priorityEmoji = '🟢';
            if (ticket.priority?.toLowerCase() === 'high' || ticket.priority === 'Critical') priorityEmoji = '🔴';
            else if (ticket.priority?.toLowerCase() === 'medium') priorityEmoji = '🟡';

            // Status badge color and emoji
            let statusColor = 'border-blue-400 text-blue-700';
            let statusText = 'Open';
            let statusEmoji = '🔵';
            if (ticket.status === 'resolved') {
              statusColor = 'border-green-500 text-green-700';
              statusText = 'Resolved';
              statusEmoji = '🟢';
            } else if (ticket.status === 'in-progress') {
              statusColor = 'border-yellow-500 text-yellow-700';
              statusText = 'In Progress';
              statusEmoji = '🟡';
            } else if (ticket.status === 'pending') {
              statusColor = 'border-orange-500 text-orange-700';
              statusText = 'Pending';
              statusEmoji = '🟠';
            }

            return (
              <div
                key={ticket._id}
                className="bg-white border border-zinc-100 rounded-2xl p-4 sm:p-6 shadow-sm w-full overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0 overflow-hidden">
                    <span className="text-xl flex-shrink-0 mt-1">{priorityEmoji}</span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-bold text-base sm:text-lg break-words">{ticket.subject || ticket.message}</div>
                      <div className="text-xs text-gray-400 break-all">Ticket #{ticket._id.substring(0, 8)}</div>
                      {ticket.userEmail && (
                        <div className="text-xs text-gray-500 break-words">User: {ticket.userEmail}</div>
                      )}
                      {!ticket.userEmail && ticket.userId && (
                        <div className="text-xs text-gray-500 break-all">User ID: {ticket.userId}</div>
                      )}
                      <div className="text-gray-600 text-sm mt-2 break-words whitespace-pre-wrap">{ticket.message}</div>
                      <div className="text-xs text-gray-400 mt-2">Created: {new Date(ticket.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColor} bg-white flex items-center gap-1 whitespace-nowrap`}>
                      <span>{statusEmoji}</span>
                      {statusText}
                    </span>
                    <button
                      onClick={() => navigate(`/chat/${ticket._id}`)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium whitespace-nowrap"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tickets found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 
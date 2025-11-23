import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { Send, MessageCircle, Clock, CheckCircle, HelpCircle } from 'lucide-react';

interface SupportMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function CustomerSupportPage() {
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  // Fetch support tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return [] as SupportTicket[];
    },
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tickets]);

  const statusColors = {
    OPEN: 'bg-blue-500/20 text-blue-400',
    IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400',
    RESOLVED: 'bg-green-500/20 text-green-400',
    CLOSED: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Support Center</h1>
              <p className="text-text-secondary">
                Get help from our support team. We typically respond within 24 hours.
              </p>
            </div>

            {/* Quick Help Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <a
                href="https://producertour.com/faq"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all group"
              >
                <HelpCircle className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">FAQ</h3>
                <p className="text-sm text-text-secondary">Find answers to common questions</p>
              </a>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <Clock className="w-8 h-8 text-yellow-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Response Time</h3>
                <p className="text-sm text-text-secondary">Usually within 24 hours</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Priority Support</h3>
                <p className="text-sm text-text-secondary">Gold tier and above get faster responses</p>
              </div>
            </div>

            {/* Support Chat/Tickets */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-6 h-6 text-brand-blue" />
                    <h2 className="text-lg font-semibold text-white">Support Messages</h2>
                  </div>
                  {!showNewTicketForm && (
                    <button
                      onClick={() => setShowNewTicketForm(true)}
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      New Message
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-text-secondary">Loading...</p>
                </div>
              ) : showNewTicketForm ? (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="What do you need help with?"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Message
                      </label>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowNewTicketForm(false);
                          setNewSubject('');
                          setNewMessage('');
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!newSubject.trim() || !newMessage.trim()}
                        className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/80 disabled:bg-brand-blue/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send Message
                      </button>
                    </div>
                  </div>
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-medium">{ticket.subject}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[ticket.status]}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {ticket.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                msg.isAdmin
                                  ? 'bg-white/10 text-white'
                                  : 'bg-brand-blue text-white'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-60 mt-1">
                                {msg.senderName} - {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                      {ticket.status !== 'CLOSED' && (
                        <div className="mt-4 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type a reply..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                          />
                          <button className="p-2 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-lg transition-colors">
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
                  <p className="text-text-secondary mb-6">
                    Have a question? Our support team is here to help!
                  </p>
                  <button
                    onClick={() => setShowNewTicketForm(true)}
                    className="px-6 py-3 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-lg font-medium transition-colors"
                  >
                    Start a Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="mt-8 text-center text-text-secondary text-sm">
              <p>
                For urgent matters, email us at{' '}
                <a href="mailto:support@producertour.com" className="text-brand-blue hover:underline">
                  support@producertour.com
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

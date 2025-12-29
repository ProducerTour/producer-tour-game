import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { userApi } from '../lib/api';
import { Send, MessageCircle, Clock, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';

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
  const [messageSent, setMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Support message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) => userApi.sendSupportMessage(data),
    onSuccess: () => {
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      setNewSubject('');
      setNewMessage('');
      setShowNewTicketForm(false);
      setMessageSent(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send message. Please try again.');
    },
  });

  const handleSendMessage = () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    sendMessageMutation.mutate({
      subject: newSubject.trim(),
      message: newMessage.trim(),
    });
  };

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
    OPEN: 'bg-blue-100 text-blue-700 border border-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-700 border border-amber-200',
    RESOLVED: 'bg-green-100 text-green-700 border border-green-200',
    CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Background Effects - Light theme subtle gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 md:pt-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Support Center</h1>
              <p className="text-gray-500">
                Get help from our support team. We typically respond within 24 hours.
              </p>
            </div>

            {/* Quick Help Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <a
                href="https://producertour.com/faq"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-all group shadow-sm"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">FAQ</h3>
                <p className="text-sm text-gray-500">Find answers to common questions</p>
              </a>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Response Time</h3>
                <p className="text-sm text-gray-500">Usually within 24 hours</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Priority Support</h3>
                <p className="text-sm text-gray-500">Gold tier and above get faster responses</p>
              </div>
            </div>

            {/* Support Chat/Tickets */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Support Messages</h2>
                  </div>
                  {!showNewTicketForm && (
                    <button
                      onClick={() => setShowNewTicketForm(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      New Message
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : showNewTicketForm ? (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="What do you need help with?"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Describe your issue or question..."
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowNewTicketForm(false);
                          setNewSubject('');
                          setNewMessage('');
                        }}
                        disabled={sendMessageMutation.isPending}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!newSubject.trim() || !newMessage.trim() || sendMessageMutation.isPending}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {sendMessageMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-900 font-medium">{ticket.subject}</h3>
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
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-blue-500 text-white'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.isAdmin ? 'text-gray-500' : 'text-blue-100'}`}>
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
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                          />
                          <button className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : messageSent ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-6">
                    We've received your message and will respond within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setMessageSent(false);
                      setShowNewTicketForm(true);
                    }}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500 mb-6">
                    Have a question? Our support team is here to help!
                  </p>
                  <button
                    onClick={() => setShowNewTicketForm(true)}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Start a Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="mt-8 text-center text-gray-500 text-sm">
              <p>
                For urgent matters, email us at{' '}
                <a href="mailto:support@producertour.com" className="text-blue-500 hover:underline">
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

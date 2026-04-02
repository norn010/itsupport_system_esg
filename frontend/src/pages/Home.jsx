import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getRecentTickets } from '../utils/ticketStorage';

const Home = () => {
  const navigate = useNavigate();
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    setRecentTickets(getRecentTickets());
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 md:py-0 animate-in fade-in duration-700">
      <div className="max-w-4xl w-full text-center space-y-6 md:space-y-8">
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            IT Service <span className="text-primary-600">Hub</span>
          </h1>
          <p className="text-sm md:text-xl text-slate-500 font-medium max-w-2xl mx-auto px-4">
            Professional IT support and ticket management system. Get help or track your requests in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4 md:pt-8">
          {/* Create Ticket Button */}
          <button 
            onClick={() => navigate('/create')}
            className="group relative bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary-500 text-left overflow-hidden ring-1 ring-slate-100"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary-500 text-white flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-primary-200 group-hover:scale-110 transition-transform duration-500 font-bold text-xl md:text-2xl">
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-1 md:mb-2">Create Ticket</h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                  Submit a new technical issue or request a service from our IT department.
                </p>
                <div className="mt-4 md:mt-6 flex items-center text-primary-600 font-bold uppercase tracking-widest text-[10px] md:text-xs gap-2">
                  Get Started 
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-primary-100/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          </button>

          {/* Queue Ticket Button */}
          <button 
            onClick={() => navigate('/queue')}
            className="group relative bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500 text-left overflow-hidden ring-1 ring-slate-100"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-indigo-500 text-white flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-500 font-bold text-xl md:text-2xl">
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 01-2-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-1 md:mb-2">Queue Status</h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                  Track all active tickets and see which tasks are currently being handled by IT.
                </p>
                <div className="mt-4 md:mt-6 flex items-center text-indigo-600 font-bold uppercase tracking-widest text-[10px] md:text-xs gap-2">
                  View Queue
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          </button>
        </div>

        {/* Recent Tickets Section */}
        {recentTickets.length > 0 && (
          <div className="pt-8 md:pt-12 text-left bg-white/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary-500 rounded-full"></span>
                Your Recent Tickets
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Last {recentTickets.length} items
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.ticket_id}
                  to={`/ticket/${ticket.ticket_id}`}
                  className="group flex flex-col p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      #{ticket.ticket_id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(ticket.lastViewed).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 truncate group-hover:text-primary-600 transition-colors">
                    {ticket.issue_title}
                  </h4>
                  <div className="mt-2 text-[10px] text-primary-500 font-bold uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Status 
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 md:pt-12 flex flex-col sm:flex-row justify-center items-center gap-4 md:gap-8 text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            IT Support Online
          </div>
          <div className="opacity-50">v2.0 Enterprise System</div>
        </div>
      </div>
    </div>
  );
};

export default Home;

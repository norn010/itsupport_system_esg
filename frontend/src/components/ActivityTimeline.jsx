import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityTimeline = ({ ticketId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [ticketId]);

  const fetchActivities = async () => {
    try {
      const { data } = await axios.get(`/api/tickets/${ticketId}/activity`);
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activity logs', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (actionType) => {
    switch (actionType) {
      case 'ticket_created': return '📝';
      case 'status_changed': return '🔄';
      case 'priority_changed': return '⚡';
      case 'staff_assigned': return '👤';
      case 'message_sent': return '💬';
      default: return '📌';
    }
  };

  if (loading) return <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">Loading timeline...</div>;

  if (activities.length === 0) return <div className="text-sm text-slate-500 dark:text-slate-400 italic mt-4">No activity recorded yet.</div>;

  return (
    <div className="mt-6 border-l-4 border-l-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10 p-4 rounded-r-lg shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-indigo-800 dark:text-indigo-300 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Activity Timeline
      </h2>

      <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/50 ml-3 space-y-6">
        {activities.map((log) => (
          <div key={log.id} className="relative pl-6">
            {/* Timeline Dot */}
            <span className="absolute -left-[18px] top-1 bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-colors">
              {getIcon(log.action_type)}
            </span>
            
            <div className="bg-white dark:bg-slate-900/60 p-3 rounded shadow-sm border border-indigo-100 dark:border-indigo-900/50 transition-colors backdrop-blur-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {log.description}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>By: <span className="font-medium text-slate-700 dark:text-slate-300">{log.actor_name}</span> ({log.actor_type})</span>
                {log.browser_info && (
                   <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                     🌐 {log.browser_info}
                   </span>
                )}
              </p>
              
              {(log.device_name || log.device_asset_code || log.ip_address || log.comp_name) && (
                <div className="mt-2 text-[10px] text-slate-400 font-medium flex flex-wrap gap-2 pt-2 border-t border-slate-50 dark:border-white/5">
                  {log.comp_name && <span className="text-slate-600 dark:text-slate-300 font-bold">💻 Host: {log.comp_name}</span>}
                  {log.ip_address && <span className="text-slate-600 dark:text-slate-300 font-bold">📡 IP: {log.ip_address}</span>}
                  {log.device_name && <span>🖥 Device: {log.device_name}</span>}
                  {log.device_model && <span>📦 Model: {log.device_model}</span>}
                  {log.device_asset_code && <span className="text-indigo-600 dark:text-indigo-400 font-bold">🏷 Code: {log.device_asset_code}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;

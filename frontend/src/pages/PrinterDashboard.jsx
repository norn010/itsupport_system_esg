import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmtDateTime = (val) => {
  if (!val) return '—';
  if (typeof val === 'object' && val._seconds) {
    return new Date(val._seconds * 1000).toLocaleString('th-TH');
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('th-TH');
};

// Helper to get time value
const getTime = (val) => {
  if (!val) return 0;
  if (typeof val === 'object' && val._seconds) return val._seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const PrinterDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, printersRes] = await Promise.all([
          axios.get('/api/printer-logs'),
          axios.get('/api/printers')
        ]);
        setLogs(logsRes.data || []);
        setPrinters(printersRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dashboardData = useMemo(() => {
    if (!logs.length) return [];

    // Group by Serial Number
    const grouped = {};
    logs.forEach(log => {
      const sn = log.serial_number || 'Unknown';
      if (!grouped[sn]) grouped[sn] = [];
      grouped[sn].push(log);
    });

    const printerMap = {};
    printers.forEach(p => {
      if (p.serial_number) printerMap[p.serial_number] = p;
    });

    const result = [];

    for (const [sn, printerLogs] of Object.entries(grouped)) {
      const sorted = printerLogs.sort((a, b) => getTime(b.updated_at) - getTime(a.updated_at));
      const currentLog = sorted[0];

      // Get month/year of current log to find the latest log from a previous month
      const currentMonthYear = new Date(getTime(currentLog.updated_at)).toLocaleString('en-US', { month: 'numeric', year: 'numeric' });
      
      const previousLog = sorted.find(log => {
        const logMonthYear = new Date(getTime(log.updated_at)).toLocaleString('en-US', { month: 'numeric', year: 'numeric' });
        return logMonthYear !== currentMonthYear;
      }) || (sorted.length > 1 ? sorted[1] : null);

      const currentImp = Number(currentLog.total_impressions) || 0;
      const prevImp = previousLog ? (Number(previousLog.total_impressions) || 0) : currentImp;
      const usage = currentImp - prevImp;

      const printerInfo = printerMap[sn] || {};

      result.push({
        serial_number: sn,
        product_name: currentLog.product_name,
        brand: printerInfo.brand || 'Unknown',
        branch: printerInfo.branch || 'Unknown',
        ip: printerInfo.ip || '—',
        current_impressions: currentImp,
        previous_impressions: prevImp,
        usage: usage > 0 ? usage : 0,
        updated_at: currentLog.updated_at,
        previous_updated_at: previousLog ? previousLog.updated_at : null
      });
    }

    return result.sort((a, b) => b.usage - a.usage);
  }, [logs, printers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Chart Data: Group by Brand & Branch
  const groupedChartData = {};
  dashboardData.forEach(d => {
    const key = `${d.brand} - ${d.branch}`;
    if (!groupedChartData[key]) {
      groupedChartData[key] = { current: 0, previous: 0 };
    }
    groupedChartData[key].current += d.current_impressions;
    groupedChartData[key].previous += d.previous_impressions;
  });

  const chartLabels = Object.keys(groupedChartData);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'รอบปัจจุบัน (Current)',
        data: chartLabels.map(k => groupedChartData[k].current),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'รอบก่อนหน้า (Previous)',
        data: chartLabels.map(k => groupedChartData[k].previous),
        backgroundColor: 'rgba(148, 163, 184, 0.6)',
        borderColor: 'rgba(148, 163, 184, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            if (context.length >= 2) {
              const current = context.find(c => c.datasetIndex === 0)?.raw || 0;
              const previous = context.find(c => c.datasetIndex === 1)?.raw || 0;
              const diff = current - previous;
              return `\n📈 ผลต่างการใช้งาน (Usage Diff): +${diff.toLocaleString()} แผ่น`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // --- Calculate Insights ---
  const now = Date.now();
  const todayStart = new Date().setHours(0,0,0,0);
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  
  const updatedToday = dashboardData.filter(d => getTime(d.updated_at) >= todayStart);
  const notUpdated3Days = dashboardData.filter(d => getTime(d.updated_at) < threeDaysAgo);
  
  const highestUsage = dashboardData[0];
  const highUsageAlerts = dashboardData.filter(d => d.usage > 1000);
  const drumAlerts = dashboardData.filter(d => d.current_impressions >= 45000);
  
  const koratPrinters = dashboardData.filter(d => d.branch.includes('นครราชสีมา') && (d.brand.includes('Nissan') || d.brand.includes('HP') || d.product_name.includes('HP')));
  const koratAlerts = koratPrinters.filter(d => d.usage > 1000 || d.current_impressions >= 45000 || getTime(d.updated_at) < threeDaysAgo);

  const totalUsageAllPrinters = dashboardData.reduce((sum, d) => sum + d.usage, 0);
  const idlePrinters = dashboardData.filter(d => d.usage === 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            Printer Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Comparing latest impressions with previous records</p>
        </div>
        <div className="flex gap-3">
          <Link to="/printer-logs" className="btn-secondary text-sm">
            View All Logs
          </Link>
          <Link to="/printers" className="btn-secondary text-sm">
            Printer List
          </Link>
        </div>
      </div>

      {dashboardData.length === 0 ? (
        <div className="card !p-0 overflow-hidden shadow-sm border border-slate-100">
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            No printer logs available to analyze
          </div>
        </div>
      ) : (
        <>
          {/* Smart Insights Section */}
          <div className="card mb-6 shadow-sm border border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white">
            <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Smart Insights & Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-1.5"><span className="text-xl">📊</span> สรุปสถานะ</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">✅</span>
                    <span>มีการอัปเดตล่าสุดวันนี้จำนวน <strong>{updatedToday.length} เครื่อง</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">{notUpdated3Days.length > 0 ? '⚠️' : '✅'}</span>
                    <span className={notUpdated3Days.length > 0 ? 'text-amber-700 font-medium' : ''}>
                      {notUpdated3Days.length > 0 ? `พบเครื่องที่ไม่อัปเดตเกิน 3 วัน จำนวน ${notUpdated3Days.length} เครื่อง` : 'ทุกเครื่องมีการอัปเดตในช่วง 3 วันที่ผ่านมา'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-1.5"><span className="text-xl">📈</span> วิเคราะห์การใช้งาน</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">🔥</span>
                    <span>ใช้งานเยอะสุด: <strong>{highestUsage?.product_name}</strong> (SN: {highestUsage?.serial_number}) เพิ่มขึ้น <strong>+{highestUsage?.usage.toLocaleString()} แผ่น</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">{highUsageAlerts.length > 0 ? '🚨' : '✅'}</span>
                    <span className={highUsageAlerts.length > 0 ? 'text-red-600 font-medium' : ''}>
                      {highUsageAlerts.length > 0 ? `แจ้งเตือน: พบ ${highUsageAlerts.length} เครื่องมียอดพิมพ์พุ่งสูงเกิน 1,000 แผ่น/รอบ` : 'ไม่พบการใช้งานผิดปกติ (เกิน 1,000 แผ่น/รอบ)'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-1.5"><span className="text-xl">🖨️</span> ภาพรวมการพิมพ์รวม</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">📄</span>
                    <span>ยอดพิมพ์รวมทุกเครื่องรอบนี้: <strong className="text-indigo-600 text-base">{totalUsageAllPrinters.toLocaleString()} แผ่น</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">{idlePrinters.length > 0 ? '💤' : '✅'}</span>
                    <span className={idlePrinters.length > 0 ? 'text-slate-500 font-medium' : ''}>
                      {idlePrinters.length > 0 ? `พบเครื่องที่ไม่มีการใช้งานเลย (0 แผ่น): ${idlePrinters.length} เครื่อง` : 'ทุกเครื่องมีการใช้งานปกติ'}
                    </span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="card lg:col-span-2 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 text-slate-800">ยอดพิมพ์สะสมรวมรายสาขา (Current vs Previous)</h2>
              <Bar data={chartData} options={chartOptions} />
            </div>

            <div className="card shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
               <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                 <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
               </div>
               <h3 className="text-2xl font-black text-slate-800">{dashboardData.length}</h3>
               <p className="text-slate-500 font-medium">Unique Printers Tracked</p>
               
               <div className="mt-8 w-full border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Highest Usage Printer</h4>
                  {dashboardData[0] && (
                    <div>
                      <p className="font-bold text-primary-700">{dashboardData[0].product_name}</p>
                      <p className="text-sm text-slate-500">SN: {dashboardData[0].serial_number}</p>
                      <p className="text-xl font-black text-slate-800 mt-2">+{dashboardData[0].usage.toLocaleString()} <span className="text-sm font-medium text-slate-400">pages</span></p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">Detailed Usage Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-slate-500 uppercase tracking-wider text-xs">
                    <th className="text-left py-3 px-6 font-semibold">Brand / Branch</th>
                    <th className="text-left py-3 px-6 font-semibold">Printer</th>
                    <th className="text-left py-3 px-6 font-semibold">Serial Number</th>
                    <th className="text-right py-3 px-6 font-semibold">Previous Log</th>
                    <th className="text-right py-3 px-6 font-semibold">Current Log</th>
                    <th className="text-right py-3 px-6 font-semibold text-primary-600">Usage (Diff)</th>
                    <th className="text-right py-3 px-6 font-semibold">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dashboardData.map(d => (
                    <tr key={d.serial_number} title={`IP Address: ${d.ip}`} className="hover:bg-slate-50/50 transition-colors cursor-help">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{d.brand}</div>
                        <div className="text-xs text-slate-500">{d.branch}</div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">{d.product_name || '—'}</td>
                      <td className="py-4 px-6 text-slate-500 font-mono">{d.serial_number}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-medium text-slate-600">{d.previous_impressions.toLocaleString()}</div>
                        {d.previous_updated_at && <div className="text-[10px] text-slate-400">{fmtDateTime(d.previous_updated_at)}</div>}
                        {!d.previous_updated_at && <div className="text-[10px] text-slate-400">No previous data</div>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-bold text-slate-800">{d.current_impressions.toLocaleString()}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${d.usage > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          +{d.usage.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-500 text-xs">
                        {fmtDateTime(d.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PrinterDashboard;

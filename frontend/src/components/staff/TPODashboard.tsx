import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  BarChart3, 
  TrendingUp, 
  UserCheck, 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { User, Job, Student } from '../../types';

interface TPODashboardProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const data = [
  { name: 'CSE', placed: 85, total: 120 },
  { name: 'ECE', placed: 65, total: 100 },
  { name: 'MECH', placed: 40, total: 90 },
  { name: 'CIVIL', placed: 30, total: 80 },
  { name: 'IT', placed: 90, total: 110 },
];

const trendData = [
  { month: 'Jan', offers: 12 },
  { month: 'Feb', offers: 25 },
  { month: 'Mar', offers: 45 },
  { month: 'Apr', offers: 30 },
  { month: 'May', offers: 60 },
  { month: 'Jun', offers: 85 },
];

export default function TPODashboard({ user, activeTab, setActiveTab }: TPODashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics/overview');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} /> +12%
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Total Students</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.totalStudents?.count || 0}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Briefcase size={24} />
              </div>
              <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} /> +5%
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Active Jobs</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.totalJobs?.count || 0}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <UserCheck size={24} />
              </div>
              <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} /> +18%
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Total Offers</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.totalOffers?.count || 0}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <span className="flex items-center text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-lg">
                <ArrowDownRight size={14} /> -2%
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Placement %</p>
            <h3 className="text-2xl font-bold text-slate-900">72.4%</h3>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Department Performance</h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#F8FAFC'}}
                  />
                  <Bar dataKey="placed" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">Monthly Offer Trends</h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="offers" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorOffers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Companies */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Recruiters</h3>
            <button className="text-indigo-600 text-sm font-bold hover:underline">View All Companies</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Company</th>
                <th className="px-8 py-4">Industry</th>
                <th className="px-8 py-4">Jobs Posted</th>
                <th className="px-8 py-4">Hired</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Google', industry: 'Technology', jobs: 5, hired: 12, status: 'Active' },
                { name: 'Microsoft', industry: 'Software', jobs: 3, hired: 8, status: 'Active' },
                { name: 'Goldman Sachs', industry: 'Finance', jobs: 2, hired: 4, status: 'Pending' },
                { name: 'Tesla', industry: 'Automotive', jobs: 4, hired: 6, status: 'Active' },
              ].map((company, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-all cursor-pointer">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <Building2 size={20} />
                      </div>
                      <span className="font-bold text-slate-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-600">{company.industry}</td>
                  <td className="px-8 py-5 text-sm text-slate-600 font-medium">{company.jobs}</td>
                  <td className="px-8 py-5 text-sm text-slate-600 font-medium">{company.hired}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      company.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {company.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
      <h3 className="text-xl font-bold text-slate-900 mb-2">Module Under Development</h3>
      <p className="text-slate-500">The {activeTab} module is coming soon.</p>
    </div>
  );
}

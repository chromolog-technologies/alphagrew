import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase, Users, TrendingUp, MapPin } from 'lucide-react';
import { fetchPlacementDrives, createPlacementDrive, updatePlacementDrive, fetchPlacementStatistics } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';
import { PrototypeNotice } from '../shared';


interface Company {
  id: number;
  name: string;
  location: string;
  website: string;
  hrEmail: string;
  hrContact: string;
  industry: string;
  status: 'active' | 'inactive';
  lastVisit: string;
}

interface JobPosting {
  id: number;
  companyName: string;
  position: string;
  package: string;
  eligibility: string;
  jobType: string;
  applicants: number;
  status: 'open' | 'closed' | 'on_hold';
  postDate: string;
}

export const PlacementOfficerModule: React.FC = () => {
  const [drives, setDrives] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'jobs' | 'interviews'>('companies');
  
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: 1,
      name: 'Google',
      location: 'Mountain View, CA',
      website: 'google.com',
      hrEmail: 'hr@google.com',
      hrContact: '1234567890',
      industry: 'Technology',
      status: 'active',
      lastVisit: '2025-03-10',
    },
    {
      id: 2,
      name: 'Microsoft',
      location: 'Redmond, WA',
      website: 'microsoft.com',
      hrEmail: 'hr@microsoft.com',
      hrContact: '0987654321',
      industry: 'Technology',
      status: 'active',
      lastVisit: '2025-02-28',
    },
  ]);

  const [jobPostings, setJobPostings] = useState<JobPosting[]>([
    {
      id: 1,
      companyName: 'Google',
      position: 'Software Engineer',
      package: '12-15 LPA',
      eligibility: 'CGPA > 8.0',
      jobType: 'Full-time',
      applicants: 15,
      status: 'open',
      postDate: '2025-03-15',
    },
    {
      id: 2,
      companyName: 'Microsoft',
      position: 'Support Engineer',
      package: '8-10 LPA',
      eligibility: 'CGPA > 7.0',
      jobType: 'Full-time',
      applicants: 8,
      status: 'open',
      postDate: '2025-03-18',
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredToken();
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const [drivesResponse, statsResponse] = await Promise.all([
          fetchPlacementDrives(token),
          fetchPlacementStatistics(token)
        ]);

        if (drivesResponse?.data) {
          const drivesList = Array.isArray(drivesResponse.data) ? drivesResponse.data : 
            drivesResponse.data.drives || [];
          setDrives(drivesList);
        }

        if (statsResponse?.data) {
          setStats(statsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch placement data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'open') return 'bg-green-100 text-green-800';
    if (status === 'inactive') return 'bg-red-100 text-red-800';
    if (status === 'closed') return 'bg-slate-100 text-slate-800';
    if (status === 'on_hold') return 'bg-yellow-100 text-yellow-800';
    return 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading placement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  const placementStats = [
    {
      label: 'Total Drives',
      value: drives.length,
      color: 'blue',
      icon: <Briefcase size={32} />,
    },
    {
      label: 'Placement Rate',
      value: stats?.placement_rate ? stats.placement_rate + '%' : '0%',
      color: 'green',
      icon: <TrendingUp size={32} />,
    },
    { 
      label: 'Avg Package', 
      value: stats?.average_package ? stats.average_package + ' LPA' : '0 LPA', 
      color: 'purple', 
      icon: <Users size={32} /> 
    },
  ];

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Placement Management</h2>
        <p className="mt-1 text-sm text-slate-600">Manage companies, job postings, and student placements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {placementStats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-${stat.color}-50 border border-${stat.color}-200 p-6 rounded-lg flex items-center justify-between`}
          >
            <div>
              <p className={`text-sm text-${stat.color}-700 font-medium`}>{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-900 mt-2`}>{stat.value}</p>
            </div>
            <div className={`text-${stat.color}-300`}>{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'companies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Briefcase size={18} />
            Companies
          </span>
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <TrendingUp size={18} />
            Job Postings
          </span>
        </button>
        <button
          onClick={() => setActiveTab('interviews')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'interviews'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users size={18} />
            Interview Schedule
          </span>
        </button>
      </div>

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <button
            onClick={() => setIsAddingCompany(!isAddingCompany)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Company
          </button>

          {isAddingCompany && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-4">Add New Company</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Company Name" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Location" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Website" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="email" placeholder="HR Email" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="tel" placeholder="HR Contact" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Industry" className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                <button
                  onClick={() => setIsAddingCompany(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-lg">{company.name}</h4>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(company.status)}`}>
                    {company.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {company.location}
                  </div>
                  <p>Industry: {company.industry}</p>
                  <p>HR: {company.hrEmail}</p>
                  <p>Contact: {company.hrContact}</p>
                  <p className="text-xs text-slate-500">Last Visit: {company.lastVisit}</p>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                    <Edit2 size={16} className="inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setCompanies(companies.filter((c) => c.id !== company.id))}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    <Trash2 size={16} className="inline mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <button
            onClick={() => setIsAddingJob(!isAddingJob)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Post Job
          </button>

          {isAddingJob && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-4">Create Job Posting</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option>Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="text" placeholder="Position" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Package (e.g., 3.5-5 LPA)" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Eligibility" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <select className="px-3 py-2 border border-slate-300 rounded-lg">
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Post</button>
                <button onClick={() => setIsAddingJob(false)} className="px-4 py-2 bg-slate-300 text-slate-900 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {jobPostings.map((job) => (
              <div key={job.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{job.position}</h4>
                    <p className="text-sm text-slate-600 mt-1">{job.companyName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                    {job.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-slate-500">Package</p>
                    <p className="font-semibold text-slate-900">{job.package}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Eligibility</p>
                    <p className="font-semibold text-slate-900">{job.eligibility}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Type</p>
                    <p className="font-semibold text-slate-900">{job.jobType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Applicants</p>
                    <p className="font-semibold text-blue-600">{job.applicants}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                    View Applicants ({job.applicants})
                  </button>
                  <button
                    onClick={() => setJobPostings(jobPostings.filter((j) => j.id !== job.id))}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interview Schedule Tab */}
      {activeTab === 'interviews' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-4">Upcoming Interviews</h3>
          <div className="space-y-3">
            {[
              {
                company: 'TCS',
                position: 'Systems Engineer',
                date: '2025-04-05',
                time: '09:00 AM',
                venue: 'Conference Hall A',
                students: 25,
              },
              {
                company: 'Infosys',
                position: 'Junior Developer',
                date: '2025-04-08',
                time: '02:00 PM',
                venue: 'Conference Hall B',
                students: 18,
              },
            ].map((interview, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-slate-900">{interview.company}</h5>
                  <p className="text-sm text-slate-600 mt-1">{interview.position}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {interview.date} at {interview.time} | {interview.venue}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{interview.students}</p>
                  <p className="text-xs text-slate-600">Students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

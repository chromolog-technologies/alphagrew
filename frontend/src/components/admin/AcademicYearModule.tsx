import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Loader } from 'lucide-react';
import { semesterApi } from '../../api/apiClient';

interface AcademicYear {
  id: number;
  year: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'upcoming';
  semesters: number;
}

export const AcademicYearModule: React.FC = () => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        setLoading(true);
        const data = await semesterApi.getAcademicYears();
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (list.length > 0) {
          setYears(list.map((ay: any) => ({
            id: ay.id,
            year: ay.year || ay.name || 'Academic Year',
            startDate: ay.start_date || ay.startDate || '2025-06-01',
            endDate: ay.end_date || ay.endDate || '2026-05-31',
            status: ay.is_active ? 'active' : 'upcoming',
            semesters: 2,
          })));
        } else {
          // Default initial academic year
          setYears([
            {
              id: 1,
              year: '2025-2026',
              startDate: '2025-06-01',
              endDate: '2026-05-31',
              status: 'active',
              semesters: 2,
            },
          ]);
        }
      } catch (err) {
        console.warn('Could not load academic years from API, using fallback:', err);
        setYears([
          {
            id: 1,
            year: '2025-2026',
            startDate: '2025-06-01',
            endDate: '2026-05-31',
            status: 'active',
            semesters: 2,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicData();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ year: '', startDate: '', endDate: '', semesters: 2 });

  const handleAddYear = () => {
    if (formData.year && formData.startDate && formData.endDate) {
      setYears([
        ...years,
        {
          id: years.length + 1,
          ...formData,
          status: 'upcoming',
        },
      ]);
      setFormData({ year: '', startDate: '', endDate: '', semesters: 2 });
      setShowForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academic Years</h2>
          <p className="mt-1 text-sm text-slate-600">Manage academic year and semesters</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Year
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Add New Academic Year</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Academic Year (e.g., 2025-2026)"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              placeholder="Start Date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              placeholder="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.semesters}
              onChange={(e) => setFormData({ ...formData, semesters: parseInt(e.target.value) })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Semester</option>
              <option value={2}>2 Semesters</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddYear} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map((year) => (
          <div key={year.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{year.year}</h3>
                <p className="mt-2 text-sm text-slate-600 flex items-center gap-1">
                  <Calendar size={14} /> {year.startDate} to {year.endDate}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">{year.semesters}</span> Semester(s)
                </p>
              </div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(year.status)}`}>
                {year.status}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 text-blue-600 hover:text-blue-700 px-2 py-2 border border-blue-200 rounded hover:bg-blue-50">
                <Edit2 size={16} className="mx-auto" />
              </button>
              <button className="flex-1 text-red-600 hover:text-red-700 px-2 py-2 border border-red-200 rounded hover:bg-red-50">
                <Trash2 size={16} className="mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

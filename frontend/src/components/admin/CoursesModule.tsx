import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { apiCall } from '../../api/apiClient';
import { useRecordCustomFields } from '../../hooks/useRecordCustomFields';
import { CustomFieldInputs } from '../shared/CustomFieldInputs';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Staff {
  id: number;
  name: string;
  email: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  department_id: number;
  department?: { id: number; name: string; code: string };
  course_type?: string;
  stream?: string;
  mode?: string;
  academic_level?: string;
  duration_value?: number;
  duration_type?: string;
  total_semesters: number;
  total_credits?: number;
  description?: string;
  intake_capacity?: number;
  eligibility?: string;
  min_qualification?: string;
  entrance_required?: boolean;
  course_coordinator_id?: number;
  course_coordinator?: { id: number; name: string; email: string };
  total_fees?: number;
  fees_per_semester?: number;
  is_active: boolean;
}

interface FormData {
  name: string;
  code: string;
  department_id: number | '';
  course_type: string;
  stream: string;
  mode: string;
  academic_level: string;
  duration_value: number | '';
  duration_type: string;
  total_semesters: number | '';
  total_credits: number | '';
  description: string;
  intake_capacity: number | '';
  eligibility: string;
  min_qualification: string;
  entrance_required: boolean;
  course_coordinator_id: number | '';
  total_fees: number | '';
  fees_per_semester: number | '';
  is_active: boolean;
}

export const CoursesModule: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const customFields = useRecordCustomFields('course', editingId, showForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    academic: true,
    admission: false,
    fees: false,
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    department_id: '',
    course_type: '',
    stream: '',
    mode: 'Full-Time',
    academic_level: '',
    duration_value: '',
    duration_type: 'Years',
    total_semesters: '',
    total_credits: '',
    description: '',
    intake_capacity: '',
    eligibility: '',
    min_qualification: '',
    entrance_required: false,
    course_coordinator_id: '',
    total_fees: '',
    fees_per_semester: '',
    is_active: true,
  });

  useEffect(() => {
    loadCourses();
    loadDepartments();
    loadStaff();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
        const response = await apiCall('/courses', 'GET');
      if (Array.isArray(response)) {
        setCourses(response);
      }
      setError('');
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
        const response = await apiCall('/courses/list/departments', 'GET');
      if (Array.isArray(response)) {
        setDepartments(response);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadStaff = async () => {
    try {
        const response = await apiCall('/courses/list/staff', 'GET');
      if (Array.isArray(response)) {
        setStaff(response);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
    }
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetForm = () => {
    setFormData({
      name: '',
      code: '',
      department_id: '',
      course_type: '',
      stream: '',
      mode: 'Full-Time',
      academic_level: '',
      duration_value: '',
      duration_type: 'Years',
      total_semesters: '',
      total_credits: '',
      description: '',
      intake_capacity: '',
      eligibility: '',
      min_qualification: '',
      entrance_required: false,
      course_coordinator_id: '',
      total_fees: '',
      fees_per_semester: '',
      is_active: true,
    });
    setEditingId(null);
  };

  const handleAddCourse = async () => {
    if (!formData.name || !formData.code || !formData.department_id || !formData.total_semesters) {
      setError('Please fill in all required fields (Name, Code, Department, Total Semesters)');
      return;
    }

    try {
      const payload = {
        ...formData,
        duration_value: formData.duration_value ? Number(formData.duration_value) : null,
        total_semesters: Number(formData.total_semesters),
        total_credits: formData.total_credits ? Number(formData.total_credits) : null,
        intake_capacity: formData.intake_capacity ? Number(formData.intake_capacity) : null,
        course_coordinator_id: formData.course_coordinator_id ? Number(formData.course_coordinator_id) : null,
        total_fees: formData.total_fees ? Number(formData.total_fees) : null,
        fees_per_semester: formData.fees_per_semester ? Number(formData.fees_per_semester) : null,
        ...customFields.payload(),
      };

      if (editingId) {
          await apiCall(`/courses/${editingId}`, 'PUT', payload);
      } else {
          await apiCall('/courses', 'POST', payload);
      }

      await loadCourses();
      handleResetForm();
      setShowForm(false);
      setError('');
    } catch (err: any) {
      customFields.captureErrors(err);
      setError(err.message || 'Failed to save course');
    }
  };

  const handleEditCourse = (course: Course) => {
    setFormData({
      name: course.name,
      code: course.code,
      department_id: course.department_id,
      course_type: course.course_type || '',
      stream: course.stream || '',
      mode: course.mode || 'Full-Time',
      academic_level: course.academic_level || '',
      duration_value: course.duration_value || '',
      duration_type: course.duration_type || 'Years',
      total_semesters: course.total_semesters,
      total_credits: course.total_credits || '',
      description: course.description || '',
      intake_capacity: course.intake_capacity || '',
      eligibility: course.eligibility || '',
      min_qualification: course.min_qualification || '',
      entrance_required: course.entrance_required || false,
      course_coordinator_id: course.course_coordinator_id || '',
      total_fees: course.total_fees || '',
      fees_per_semester: course.fees_per_semester || '',
      is_active: course.is_active,
    });
    setEditingId(course.id);
    setShowForm(true);
    setExpandedSections({ basic: true, academic: true, admission: false, fees: false });
  };

  const handleDeleteCourse = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
          await apiCall(`/courses/${id}`, 'DELETE');
        await loadCourses();
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to delete course');
      }
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Courses Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage academic courses and programs</p>
        </div>
        <button
          onClick={() => {
            handleResetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Course
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Course' : 'Add New Course'}</h3>

          {/* Basic Information Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Basic Information</span>
              <ChevronDown size={18} className={expandedSections.basic ? 'rotate-180' : ''} />
            </button>
            {expandedSections.basic && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="Course Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Course Code *"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) || '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department *</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Academic Structure Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('academic')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Academic Structure</span>
              <ChevronDown size={18} className={expandedSections.academic ? 'rotate-180' : ''} />
            </button>
            {expandedSections.academic && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <select
                  value={formData.course_type}
                  onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course Type</option>
                  <option value="UG">Undergraduate</option>
                  <option value="PG">Postgraduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certification">Certification</option>
                </select>
                <select
                  value={formData.academic_level}
                  onChange={(e) => setFormData({ ...formData, academic_level: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Academic Level</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certificate">Certificate</option>
                </select>
                <select
                  value={formData.stream}
                  onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Stream</option>
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Management">Management</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Distance">Distance</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Duration Value"
                    value={formData.duration_value}
                    onChange={(e) => setFormData({ ...formData, duration_value: e.target.value ? Number(e.target.value) : '' })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                  />
                  <select
                    value={formData.duration_type}
                    onChange={(e) => setFormData({ ...formData, duration_type: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Years">Years</option>
                    <option value="Months">Months</option>
                    <option value="Weeks">Weeks</option>
                  </select>
                </div>
                <input
                  type="number"
                  placeholder="Total Semesters *"
                  value={formData.total_semesters}
                  onChange={(e) => setFormData({ ...formData, total_semesters: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Total Credits"
                  value={formData.total_credits}
                  onChange={(e) => setFormData({ ...formData, total_credits: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Admission & Eligibility Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('admission')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Admission & Eligibility</span>
              <ChevronDown size={18} className={expandedSections.admission ? 'rotate-180' : ''} />
            </button>
            {expandedSections.admission && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <input
                  type="number"
                  placeholder="Intake Capacity"
                  value={formData.intake_capacity}
                  onChange={(e) => setFormData({ ...formData, intake_capacity: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Minimum Qualification"
                  value={formData.min_qualification}
                  onChange={(e) => setFormData({ ...formData, min_qualification: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Eligibility Criteria"
                  value={formData.eligibility}
                  onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows={2}
                />
                <select
                  value={formData.course_coordinator_id}
                  onChange={(e) => setFormData({ ...formData, course_coordinator_id: Number(e.target.value) || '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course Coordinator</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={formData.entrance_required}
                    onChange={(e) => setFormData({ ...formData, entrance_required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700">Entrance Exam Required</span>
                </label>
              </div>
            )}
          </div>

          {/* Fees Structure Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('fees')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Fees Structure</span>
              <ChevronDown size={18} className={expandedSections.fees ? 'rotate-180' : ''} />
            </button>
            {expandedSections.fees && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <input
                  type="number"
                  placeholder="Total Fees"
                  value={formData.total_fees}
                  onChange={(e) => setFormData({ ...formData, total_fees: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Fees Per Semester"
                  value={formData.fees_per_semester}
                  onChange={(e) => setFormData({ ...formData, fees_per_semester: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-700">Active Course</span>
                </label>
              </div>
            )}
          </div>

          <CustomFieldInputs
            definitions={customFields.fields}
            values={customFields.values}
            onChange={customFields.setValues}
            errors={customFields.errors}
            className="mt-6 grid gap-4 md:grid-cols-2"
          />

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddCourse}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                handleResetForm();
              }}
              className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading courses...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No courses found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Course Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Duration</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Semesters</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">{course.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{course.code}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{course.department?.name || 'N/A'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{course.course_type || '-'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {course.duration_value} {course.duration_type || 'Years'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{course.total_semesters}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          course.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm space-x-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

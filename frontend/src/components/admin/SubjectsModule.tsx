import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { apiCall } from '../../api/apiClient';
import { useRecordCustomFields } from '../../hooks/useRecordCustomFields';
import { CustomFieldInputs } from '../shared/CustomFieldInputs';

interface Course {
  id: number;
  name: string;
  code: string;
  duration_years: number;
  total_semesters: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  course_id: number;
  course?: { id: number; name: string; code: string; total_semesters: number };
  semester_number: number;
  credit_hours: number;
  lecture_hours: number;
  practical_hours: number;
  subject_type?: string;
  description?: string;
  is_mandatory: boolean;
  is_active: boolean;
}

interface FormData {
  name: string;
  code: string;
  course_id: number | '';
  semester_number: number | '';
  credit_hours: number | '';
  lecture_hours: number | '';
  practical_hours: number | '';
  subject_type: string;
  description: string;
  is_mandatory: boolean;
  is_active: boolean;
}

export const SubjectsModule: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const customFields = useRecordCustomFields('subject', editingId, showForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourseSemesters, setSelectedCourseSemesters] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    course_id: '',
    semester_number: '',
    credit_hours: '',
    lecture_hours: '',
    practical_hours: '',
    subject_type: '',
    description: '',
    is_mandatory: true,
    is_active: true,
  });

  useEffect(() => {
    loadSubjects();
    loadCourses();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
        const response = await apiCall('/subjects', 'GET');
      if (Array.isArray(response)) {
        setSubjects(response);
      }
      setError('');
    } catch (err) {
      setError('Failed to load subjects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
        const response = await apiCall('/subjects/list/courses', 'GET');
      if (Array.isArray(response)) {
        setCourses(response);
      }
    } catch (err) {
      console.error('Failed to load courses', err);
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetForm = () => {
    setFormData({
      name: '',
      code: '',
      course_id: '',
      semester_number: '',
      credit_hours: '',
      lecture_hours: '',
      practical_hours: '',
      subject_type: '',
      description: '',
      is_mandatory: true,
      is_active: true,
    });
    setEditingId(null);
    setSelectedCourseSemesters(0);
  };

  const handleCourseChange = (courseId: number | '') => {
    setFormData({ ...formData, course_id: courseId, semester_number: '' });
    if (courseId) {
      const selectedCourse = courses.find((c) => c.id === courseId);
      if (selectedCourse) {
        setSelectedCourseSemesters(selectedCourse.total_semesters);
      }
    } else {
      setSelectedCourseSemesters(0);
    }
  };

  const handleAddSubject = async () => {
    if (
      !formData.name ||
      !formData.code ||
      !formData.course_id ||
      !formData.semester_number ||
      !formData.credit_hours ||
      !formData.lecture_hours ||
      !formData.practical_hours
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        course_id: Number(formData.course_id),
        semester_number: Number(formData.semester_number),
        credit_hours: Number(formData.credit_hours),
        lecture_hours: Number(formData.lecture_hours),
        practical_hours: Number(formData.practical_hours),
        ...customFields.payload(),
      };

      if (editingId) {
          await apiCall(`/subjects/${editingId}`, 'PUT', payload);
      } else {
          await apiCall('/subjects', 'POST', payload);
      }

      await loadSubjects();
      handleResetForm();
      setShowForm(false);
      setError('');
    } catch (err: any) {
      customFields.captureErrors(err);
      setError(err.message || 'Failed to save subject');
    }
  };

  const handleEditSubject = (subject: Subject) => {
    const courseId = subject.course_id;
    const selectedCourse = courses.find((c) => c.id === courseId);
    if (selectedCourse) {
      setSelectedCourseSemesters(selectedCourse.total_semesters);
    }

    setFormData({
      name: subject.name,
      code: subject.code,
      course_id: subject.course_id,
      semester_number: subject.semester_number,
      credit_hours: subject.credit_hours,
      lecture_hours: subject.lecture_hours,
      practical_hours: subject.practical_hours,
      subject_type: subject.subject_type || '',
      description: subject.description || '',
      is_mandatory: subject.is_mandatory,
      is_active: subject.is_active,
    });
    setEditingId(subject.id);
    setShowForm(true);
  };

  const handleDeleteSubject = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
          await apiCall(`/subjects/${id}`, 'DELETE');
        await loadSubjects();
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to delete subject');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subjects Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage academic subjects</p>
        </div>
        <button
          onClick={() => {
            handleResetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Subject
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Subject' : 'Add New Subject'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Subject Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Subject Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.course_id}
              onChange={(e) => handleCourseChange(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Course *</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
            <select
              value={formData.semester_number}
              onChange={(e) => setFormData({ ...formData, semester_number: e.target.value ? Number(e.target.value) : '' })}
              disabled={!formData.course_id}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              <option value="">Select Semester *</option>
              {selectedCourseSemesters > 0 &&
                Array.from({ length: selectedCourseSemesters }, (_, i) => i + 1).map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
            </select>
            <input
              type="number"
              placeholder="Credit Hours *"
              value={formData.credit_hours}
              onChange={(e) => setFormData({ ...formData, credit_hours: e.target.value ? Number(e.target.value) : '' })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Lecture Hours *"
              value={formData.lecture_hours}
              onChange={(e) => setFormData({ ...formData, lecture_hours: e.target.value ? Number(e.target.value) : '' })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Practical Hours *"
              value={formData.practical_hours}
              onChange={(e) => setFormData({ ...formData, practical_hours: e.target.value ? Number(e.target.value) : '' })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Subject Type (e.g., Lecture, Lab)"
              value={formData.subject_type}
              onChange={(e) => setFormData({ ...formData, subject_type: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
              rows={2}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_mandatory}
                onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Mandatory</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
          <CustomFieldInputs
            definitions={customFields.fields}
            values={customFields.values}
            onChange={customFields.setValues}
            errors={customFields.errors}
            className="mt-4 grid gap-4 md:grid-cols-2"
          />

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddSubject}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                handleResetForm();
              }}
              className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading subjects...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No subjects found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subject Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Course</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Semester</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Credits</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-900">{subject.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{subject.code}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{subject.course?.name || 'N/A'}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">Sem {subject.semester_number}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{subject.credit_hours}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{subject.subject_type || 'Lecture'}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        subject.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm space-x-2">
                    <button
                      onClick={() => handleEditSubject(subject)}
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

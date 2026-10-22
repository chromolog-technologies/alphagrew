import React, { useState, useEffect } from 'react';
import { Upload, Download, Edit2, Save, X } from 'lucide-react';
import { fetchStaffMarksStudents, submitStaffMarks, fetchExamsListForMarks, uploadMarksFromFile } from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';

interface StudentMark {
  id: number;
  name: string;
  rollNo: string;
  marksObtained: number | null;
  totalMarks: number;
}

export const MarksEntry: React.FC = () => {
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [totalMarks, setTotalMarks] = useState(50);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjects = ['Database Management', 'Data Structures', 'Web Development'];
  const classes = ['CSE-5A', 'CSE-5B', 'IT-5A'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredAuthToken();
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const examsResponse = await fetchExamsListForMarks(token);
        if (examsResponse?.data) {
          const examsList = Array.isArray(examsResponse.data) ? examsResponse.data : 
            examsResponse.data.exams || [];
          setExams(examsList);
          if (examsList.length > 0) setSelectedExam(examsList[0]?.id || examsList[0]);
        }

        if (selectedExam && selectedClass && selectedSubject) {
          const studentsResponse = await fetchStaffMarksStudents(token, 
            typeof selectedClass === 'string' ? parseInt(selectedClass) : selectedClass,
            typeof selectedExam === 'string' ? parseInt(selectedExam) : selectedExam,
            typeof selectedSubject === 'string' ? parseInt(selectedSubject) : selectedSubject,
            totalMarks
          );
          if (studentsResponse?.data) {
            const studentsList = Array.isArray(studentsResponse.data) ? 
              studentsResponse.data : studentsResponse.data.students || [];
            setStudents(studentsList.map((s: any) => ({
              ...s,
              marksObtained: null,
              totalMarks: totalMarks
            })));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedExam, selectedClass, selectedSubject, totalMarks]);

  const updateMark = (studentId: number, marks: number) => {
    if (marks > totalMarks) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, marksObtained: marks } : s))
    );
    setEditingId(null);
  };

  const handleSaveAll = async () => {
    const allMarked = students.every((s) => s.marksObtained !== null);
    if (!allMarked) {
      alert('Please fill marks for all students');
      return;
    }
    try {
      const token = getStoredAuthToken();
      if (!token) return;

      const payload = {
        exam_id: selectedExam,
        subject_id: selectedSubject,
        class_id: selectedClass,
        marks: students.map(s => ({
          student_id: s.id,
          marks_obtained: s.marksObtained
        }))
      };

      await submitStaffMarks(token, payload);
      alert('Marks saved successfully!');
    } catch (err) {
      alert('Error saving marks: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const markedCount = students.filter((s) => s.marksObtained !== null).length;
  const averageMark = students
    .filter((s) => s.marksObtained !== null)
    .reduce((sum, s) => sum + (s.marksObtained || 0), 0) / markedCount || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading marks data...</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Enter Marks</h2>
        <p className="mt-1 text-sm text-slate-600">Record exam marks for your students</p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Exam</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Exam</option>
            {exams.map((exam: any) => (
              <option key={exam.id} value={exam.id}>
                {exam.name || exam}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 font-medium">Marked</p>
          <p className="text-2xl font-bold text-blue-900">
            {markedCount}/{students.length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-medium">Average Mark</p>
          <p className="text-2xl font-bold text-green-900">{averageMark.toFixed(1)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700 font-medium">Progress</p>
          <p className="text-2xl font-bold text-purple-900">{Math.round((markedCount / students.length) * 100)}%</p>
        </div>
      </div>

      {/* Bulk Upload */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Upload size={18} /> Upload CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            <Download size={18} /> Download Template
          </button>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Roll No.</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Marks ({totalMarks})</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">%</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.map((student) => {
              const percentage = student.marksObtained ? (student.marksObtained / totalMarks) * 100 : 0;
              const isEditing = editingId === student.id;

              return (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{student.rollNo}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        max={totalMarks}
                        min={0}
                        autoFocus
                        defaultValue={student.marksObtained || 0}
                        onBlur={(e) => updateMark(student.id, parseInt(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateMark(student.id, parseInt(e.currentTarget.value));
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-20 px-2 py-1 border border-blue-500 rounded text-center focus:outline-none"
                      />
                    ) : (
                      <div
                        className="text-center font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 px-2 py-1 rounded"
                        onClick={() => setEditingId(student.id)}
                      >
                        {student.marksObtained !== null ? student.marksObtained : '—'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.marksObtained !== null ? (
                      <span className="font-semibold text-slate-900">{percentage.toFixed(1)}%</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setEditingId(student.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">
          Cancel
        </button>
        <button
          onClick={handleSaveAll}
          disabled={markedCount < students.length}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Marks
        </button>
      </div>
    </div>
  );
};

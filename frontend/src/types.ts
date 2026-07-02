export type Role = 'admin' | 'tpo' | 'recruiter' | 'student';

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
}

export interface Student {
  id: number;
  user_id: number;
  roll_number: string;
  department: string;
  cgpa: number;
  skills: string[];
  resume_url: string;
  profile_completed: boolean;
  name: string;
  email: string;
  projects?: any[];
}

export interface Job {
  id: number;
  company_id: number;
  company_name: string;
  title: string;
  description: string;
  role_details: any;
  eligibility_rules: any;
  salary_range: string;
  location: string;
  deadline: string;
  status: 'open' | 'closed' | 'draft';
  created_at: string;
  cgpa_required?: number;
  department?: string;
}

export interface Application {
  id: number;
  job_id: number;
  student_id: number;
  status: string;
  resume_score: number;
  ai_feedback: string;
  applied_at: string;
  student_name: string;
  student_department: string;
  student_cgpa: number;
  job_title: string;
  company_name: string;
  title?: string;
}

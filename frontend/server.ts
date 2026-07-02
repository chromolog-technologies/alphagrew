import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import db from "./src/db.ts";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- API Routes ---

// Auth
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  
  if (user && user.password === password) { // In real app, use bcrypt
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { email, password, role, name } = req.body;
  try {
    const info = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)").run(email, password, role, name);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as any;
    
    if (role === 'student') {
      db.prepare("INSERT INTO students (user_id, roll_number, department, cgpa) VALUES (?, ?, ?, ?)").run(user.id, `ROLL-${user.id}`, 'General', 0);
    } else if (role === 'recruiter') {
      db.prepare("INSERT INTO companies (user_id, name) VALUES (?, ?)").run(user.id, `${name}'s Company`);
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Jobs
app.get("/api/jobs", (req, res) => {
  const jobs = db.prepare(`
    SELECT jobs.*, companies.name as company_name 
    FROM jobs 
    JOIN companies ON jobs.company_id = companies.id
    ORDER BY created_at DESC
  `).all();
  res.json(jobs);
});

app.post("/api/jobs", (req, res) => {
  const { company_id, title, description, salary_range, location, deadline } = req.body;
  const info = db.prepare(`
    INSERT INTO jobs (company_id, title, description, salary_range, location, deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(company_id, title, description, salary_range, location, deadline);
  res.json({ id: info.lastInsertRowid });
});

// AI: Extract JD Details
app.post("/api/ai/extract-jd", async (req, res) => {
  const { jdText } = req.body;
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract structured information from this Job Description:
      "${jdText}"
      
      Return JSON with:
      - title: string
      - role_details: object
      - eligibility_rules: object (cgpa, department, skills)
      - salary_range: string
      - location: string`,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Students
app.get("/api/students/:userId", (req, res) => {
  try {
    // First, check if the user exists and what their role is
    const user = db.prepare("SELECT id, role, name, email FROM users WHERE id = ?").get(req.params.userId) as any;
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ error: "User is not a student" });
    }

    // Now try to get the student record
    let student = db.prepare(`
      SELECT students.*, users.name, users.email 
      FROM students 
      JOIN users ON students.user_id = users.id 
      WHERE users.id = ?
    `).get(req.params.userId) as any;

    // If student record is missing, create it (lazy creation)
    if (!student) {
      console.log(`Creating missing student record for user ${user.id}`);
      db.prepare("INSERT INTO students (user_id, roll_number, department, cgpa) VALUES (?, ?, ?, ?)").run(
        user.id, 
        `ROLL-${user.id}-${Math.floor(Math.random() * 1000)}`, 
        'General', 
        0
      );
      
      // Fetch again after creation
      student = db.prepare(`
        SELECT students.*, users.name, users.email 
        FROM students 
        JOIN users ON students.user_id = users.id 
        WHERE users.id = ?
      `).get(req.params.userId);
    }

    res.json(student);
  } catch (e: any) {
    console.error("Error in /api/students/:userId:", e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/students/:id", (req, res) => {
  try {
    const { department, cgpa, skills, projects, resume_url } = req.body;
    db.prepare(`
      UPDATE students 
      SET department = ?, cgpa = ?, skills = ?, projects = ?, resume_url = ?, profile_completed = 1 
      WHERE id = ?
    `).run(department, cgpa, JSON.stringify(skills), JSON.stringify(projects), resume_url, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Companies
app.get("/api/companies/:userId", (req, res) => {
  try {
    const user = db.prepare("SELECT id, role, name FROM users WHERE id = ?").get(req.params.userId) as any;
    if (!user || user.role !== 'recruiter') {
      return res.status(404).json({ error: "Recruiter not found" });
    }

    let company = db.prepare("SELECT * FROM companies WHERE user_id = ?").get(user.id) as any;
    if (!company) {
      console.log(`Creating missing company record for recruiter ${user.id}`);
      db.prepare("INSERT INTO companies (user_id, name, industry) VALUES (?, ?, ?)").run(
        user.id,
        `${user.name}'s Company`,
        'Technology'
      );
      company = db.prepare("SELECT * FROM companies WHERE user_id = ?").get(user.id);
    }
    res.json(company);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Applications
app.post("/api/applications", (req, res) => {
  const { job_id, student_id } = req.body;
  try {
    db.prepare("INSERT INTO applications (job_id, student_id) VALUES (?, ?)").run(job_id, student_id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: "Already applied or invalid data" });
  }
});

app.get("/api/applications/student/:studentId", (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT applications.*, jobs.title, companies.name as company_name
      FROM applications
      JOIN jobs ON applications.job_id = jobs.id
      JOIN companies ON jobs.company_id = companies.id
      WHERE student_id = ?
    `).all(req.params.studentId);
    res.json(apps);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Analytics
app.get("/api/analytics/overview", (req, res) => {
  const stats = {
    totalStudents: (db.prepare("SELECT COUNT(*) as count FROM students").get() as any).count,
    totalCompanies: (db.prepare("SELECT COUNT(*) as count FROM companies").get() as any).count,
    totalJobs: (db.prepare("SELECT COUNT(*) as count FROM jobs").get() as any).count,
    totalApplications: (db.prepare("SELECT COUNT(*) as count FROM applications").get() as any).count,
    totalOffers: (db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'offered' OR status = 'selected'").get() as any).count,
    recentActivities: [
      { type: 'job', message: 'Job posted by TCS', time: '2h ago' },
      { type: 'application', message: '45 students applied', time: '5h ago' },
      { type: 'interview', message: 'Interview scheduled', time: '1d ago' }
    ]
  };
  res.json(stats);
});

// Admin: Student Management
app.get("/api/admin/students", (req, res) => {
  const students = db.prepare(`
    SELECT students.*, users.name, users.email 
    FROM students 
    JOIN users ON students.user_id = users.id
  `).all();
  res.json(students);
});

app.post("/api/admin/students", (req, res) => {
  const { name, email, password, department, cgpa, roll_number } = req.body;
  try {
    const user = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, 'student', ?)").run(email, password || 'password123', name);
    db.prepare("INSERT INTO students (user_id, roll_number, department, cgpa) VALUES (?, ?, ?, ?)").run(user.lastInsertRowid, roll_number, department, cgpa);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/api/admin/students/:id", (req, res) => {
  const { name, email, department, cgpa, roll_number } = req.body;
  try {
    const student = db.prepare("SELECT user_id FROM students WHERE id = ?").get(req.params.id) as any;
    db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, student.user_id);
    db.prepare("UPDATE students SET department = ?, cgpa = ?, roll_number = ? WHERE id = ?").run(department, cgpa, roll_number, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: Application Management
app.get("/api/admin/applications", (req, res) => {
  const apps = db.prepare(`
    SELECT 
      applications.*, 
      users.name as student_name, 
      students.department as student_department,
      students.cgpa as student_cgpa,
      jobs.title as job_title, 
      companies.name as company_name
    FROM applications
    JOIN students ON applications.student_id = students.id
    JOIN users ON students.user_id = users.id
    JOIN jobs ON applications.job_id = jobs.id
    JOIN companies ON jobs.company_id = companies.id
    ORDER BY applied_at DESC
  `).all();
  res.json(apps);
});

app.put("/api/admin/applications/:id/status", (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Admin: Mock Tests / Questions
app.get("/api/admin/questions", (req, res) => {
  const questions = db.prepare("SELECT * FROM questions ORDER BY created_at DESC").all();
  res.json(questions);
});

app.post("/api/admin/questions", (req, res) => {
  const { question_text, option_a, option_b, option_c, option_d, correct_option, type, department } = req.body;
  db.prepare(`
    INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_option, type, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(question_text, option_a, option_b, option_c, option_d, correct_option, type, department);
  res.json({ success: true });
});

app.delete("/api/admin/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Test Attempts
app.get("/api/test-attempts/student/:studentId", (req, res) => {
  const attempts = db.prepare("SELECT * FROM test_attempts WHERE student_id = ? ORDER BY attempted_at DESC").all(req.params.studentId);
  res.json(attempts);
});

app.post("/api/test-attempts", (req, res) => {
  const { student_id, score, total_questions } = req.body;
  db.prepare("INSERT INTO test_attempts (student_id, score, total_questions) VALUES (?, ?, ?)").run(student_id, score, total_questions);
  res.json({ success: true });
});

// Seed Data
function seedData() {
  // Ensure default admin exists
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@alphagrew.ai') as any;
  if (!admin) {
    db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)").run('admin@alphagrew.ai', 'admin123', 'admin', 'System Administrator');
  }

  // Ensure default student exists
  const student = db.prepare("SELECT id FROM users WHERE email = ?").get('student@alphagrew.ai') as any;
  if (!student) {
    const studentUser = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)").run('student@alphagrew.ai', 'password', 'student', 'Sample Student');
    db.prepare("INSERT INTO students (user_id, roll_number, department, cgpa) VALUES (?, ?, ?, ?)").run(studentUser.lastInsertRowid, 'ROLL-101', 'Computer Science', 8.5);
  }

  // Ensure default recruiter exists
  const recruiter = db.prepare("SELECT id FROM users WHERE email = ?").get('recruiter@alphagrew.ai') as any;
  if (!recruiter) {
    const user = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)").run('recruiter@alphagrew.ai', 'password', 'recruiter', 'AlphaGrew Admin');
    db.prepare("INSERT INTO companies (user_id, name, industry) VALUES (?, ?, ?)").run(user.lastInsertRowid, 'AlphaGrew Tech', 'Software');
  }

  const jobCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as any;
  if (jobCount.count === 0) {
    console.log("Seeding initial data...");
    
    // Get company ID for jobs
    const company = db.prepare("SELECT id FROM companies WHERE user_id = (SELECT id FROM users WHERE email = ?)").get('recruiter@alphagrew.ai') as any;
    const companyId = company.id;

    const sampleJobs = [
      {
        title: 'Software Engineer - Frontend',
        description: 'We are looking for a React expert to join our team.',
        salary_range: '₹12L - ₹18L',
        location: 'Bangalore, India',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        department: 'Computer Science',
        cgpa_required: 7.5
      },
      {
        title: 'Backend Developer (Node.js)',
        description: 'Build scalable APIs with Node.js and SQLite.',
        salary_range: '₹10L - ₹15L',
        location: 'Remote',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        department: 'IT',
        cgpa_required: 7.0
      },
      {
        title: 'Data Analyst',
        description: 'Analyze placement trends and student performance.',
        salary_range: '₹8L - ₹12L',
        location: 'Hyderabad, India',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        department: 'Statistics',
        cgpa_required: 6.5
      }
    ];

    for (const job of sampleJobs) {
      db.prepare(`
        INSERT INTO jobs (company_id, title, description, salary_range, location, deadline, department, cgpa_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(companyId, job.title, job.description, job.salary_range, job.location, job.deadline, job.department, job.cgpa_required);
    }

    // Get main student ID for applications
    const mainStudent = db.prepare("SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE email = ?)").get('student@alphagrew.ai') as any;
    const mainStudentId = mainStudent.id;

    // Create more students
    const students = [
      { name: 'John Doe', email: 'john@example.com', dept: 'Computer Science', cgpa: 8.1, roll: 'CS001' },
      { name: 'Mary Jane', email: 'mary@example.com', dept: 'ECE', cgpa: 7.5, roll: 'EC001' },
      { name: 'Bob Smith', email: 'bob@example.com', dept: 'IT', cgpa: 6.8, roll: 'IT001' }
    ];
    const otherStudentIds: any[] = [];
    for (const s of students) {
      const u = db.prepare("INSERT INTO users (email, password, role, name) VALUES (?, ?, 'student', ?)").run(s.email, 'password', s.name);
      const sid = db.prepare("INSERT INTO students (user_id, roll_number, department, cgpa) VALUES (?, ?, ?, ?)").run(u.lastInsertRowid, s.roll, s.dept, s.cgpa).lastInsertRowid;
      otherStudentIds.push(sid);
    }

    // Add 3 applicants for the first job
    const firstJob = db.prepare("SELECT id FROM jobs LIMIT 1").get() as any;
    if (firstJob) {
      db.prepare("INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)").run(firstJob.id, mainStudentId, 'applied');
      db.prepare("INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)").run(firstJob.id, otherStudentIds[0], 'shortlisted');
      db.prepare("INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)").run(firstJob.id, otherStudentIds[1], 'interviewing');
    }

    // Create questions
    const questions = [
      { 
        q: 'What is the time complexity of searching in a balanced BST?', 
        a: 'O(1)', b: 'O(log n)', c: 'O(n)', d: 'O(n log n)', 
        correct: 'B', type: 'technical', dept: 'Computer Science' 
      },
      { 
        q: 'Which of the following is NOT a fundamental OOP concept?', 
        a: 'Encapsulation', b: 'Inheritance', c: 'Compilation', d: 'Polymorphism', 
        correct: 'C', type: 'technical', dept: 'Computer Science' 
      },
      { 
        q: 'What does HTML stand for?', 
        a: 'Hyper Text Markup Language', b: 'High Tech Modern Language', c: 'Hyper Transfer Main Link', d: 'Home Tool Markup Language', 
        correct: 'A', type: 'technical', dept: 'IT' 
      },
      { 
        q: 'Tell me about yourself', 
        a: 'Personal background', b: 'Professional experience', c: 'Future goals', d: 'All of the above', 
        correct: 'D', type: 'hr', dept: null 
      }
    ];
    for (const q of questions) {
      db.prepare(`
        INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_option, type, department)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(q.q, q.a, q.b, q.c, q.d, q.correct, q.type, q.dept);
    }

    console.log("Seed data inserted.");
  }
}

// --- Vite Middleware ---

async function startServer() {
  seedData();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

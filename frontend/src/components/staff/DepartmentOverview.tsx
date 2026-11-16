/**
 * Department overview for staff: real figures for the signed-in staff member's own department
 * (GET /department-portal/summary). It used to show the first department in the list, or sample data.
 */
import { BookOpen, CalendarClock, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { useDepartmentSummary } from '../../api/departmentPortalApi';
import { Alert, AlertDescription, Card, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui';

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon size={18} className="text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}

export function DepartmentOverview({ departmentCode }: { departmentCode?: string } = {}) {
  const summary = useDepartmentSummary(departmentCode);

  if (summary.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (summary.error || !summary.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{summary.error instanceof ApiError ? summary.error.message : 'Department figures could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const { department, counts, averages, placedStudents, studentsByYear, courses } = summary.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{department.name}</h1>
        <p className="text-sm text-muted-foreground">
          {department.code}
          {department.hodName ? ` · HOD ${department.hodName}` : ''}
          {department.intakeCapacity ? ` · Intake ${department.intakeCapacity}` : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="Students" value={counts.students} icon={GraduationCap} />
        <Metric label="Staff" value={counts.staff} icon={Users} />
        <Metric label="Average CGPA" value={averages.cgpa.toFixed(2)} icon={TrendingUp} />
        <Metric label="Placement rate" value={`${averages.placementRate}% (${placedStudents})`} icon={TrendingUp} />
        <Metric label="Courses" value={counts.courses} icon={BookOpen} />
        <Metric label="Subjects" value={counts.subjects} icon={BookOpen} />
        <Metric label="Average attendance" value={`${averages.attendance}%`} icon={CalendarClock} />
        <Metric label="Upcoming exams" value={counts.upcomingExams} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Students by year</h2>
          {studentsByYear.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Average CGPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsByYear.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{row.students}</TableCell>
                    <TableCell>{row.averageCgpa.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Courses</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Semesters</TableHead>
                  <TableHead>Subjects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.code} · {c.name}
                    </TableCell>
                    <TableCell>{c.semesters}</TableCell>
                    <TableCell>{c.subjects}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

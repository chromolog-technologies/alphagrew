/** Read-only product oversight across academic, placement, assessment, resume AI & AI interview modules (SRS §5.10–§5.14). */
import { useState } from 'react';
import { Briefcase, FileCheck, GraduationCap, Info, Mic, ShieldCheck } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useInstitutions } from '../../api/ownerApi';
import {
  useAcademicOversight,
  useAssessmentOversight,
  useInterviewOversight,
  usePlacementOversight,
  useResumeOversight,
} from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, KpiCard, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function OversightPage(_props: OwnerPageProps) {
  const [tab, setTab] = useState('academic');
  const [institutionId, setInstitutionId] = useState('');

  const query = institutionId ? { institutionId } : {};
  const institutions = useInstitutions({ perPage: 100 });
  const academic = useAcademicOversight(query);
  const placement = usePlacementOversight(query);
  const assessments = useAssessmentOversight(query);
  const resumes = useResumeOversight(query);
  const interviews = useInterviewOversight(query);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product oversight"
        description="Read-only cross-tenant operational metrics for academic configuration, placements, assessments, resume intelligence, and AI interviews."
        actions={
          <Select className="w-60" aria-label="Filter oversight institution" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
            <option value="">All institutions</option>
            {institutions.data?.data.map((inst) => (
              <option key={inst.id} value={String(inst.id)}>
                {inst.name} ({inst.code})
              </option>
            ))}
          </Select>
        }
      />

      <Alert variant="info">
        <Info size={16} />
        <AlertDescription>
          Strict privacy isolation: this workspace exposes only tenant-level aggregates. Raw resumes, interview audio/transcripts, and individual student exam scripts stay strictly inside each tenant boundary.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="academic">Academic setup</TabsTrigger>
          <TabsTrigger value="placement">Placements</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="resumes">Resume AI</TabsTrigger>
          <TabsTrigger value="interviews">AI Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="space-y-4 pt-4">
          {academic.isPending ? <LoadingRows rows={4} /> : null}
          {academic.isError ? <ErrorState error={academic.error} onRetry={() => void academic.refetch()} /> : null}
          {academic.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Institutions" value={academic.data.totals.institutions.toLocaleString()} icon={<GraduationCap size={18} />} hint={`${academic.data.totals.campuses} campuses`} />
                <KpiCard label="Departments & courses" value={academic.data.totals.departments.toLocaleString()} hint={`${academic.data.totals.courses} courses`} />
                <KpiCard label="Batches & terms" value={academic.data.totals.batches.toLocaleString()} hint={`${academic.data.totals.academicYears} yrs · ${academic.data.totals.semesters} sems`} />
                <KpiCard label="Student directory" value={academic.data.totals.students.toLocaleString()} />
              </div>
              <Card>
                <CardContent className="p-0">
                  {academic.data.institutions.length === 0 ? (
                    <div className="p-4"><EmptyState title="No academic structures found" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Campuses</TableHead>
                          <TableHead>Depts</TableHead>
                          <TableHead>Courses</TableHead>
                          <TableHead>Batches</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead className="text-right">Setup completeness</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {academic.data.institutions.map((row) => (
                          <TableRow key={row.institutionId}>
                            <TableCell>
                              <span className="block font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground">{row.code} · {row.status}</span>
                            </TableCell>
                            <TableCell>{row.campuses}</TableCell>
                            <TableCell>{row.departments}</TableCell>
                            <TableCell>{row.courses}</TableCell>
                            <TableCell>{row.batches}</TableCell>
                            <TableCell>{row.students.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={row.completenessPercent >= 80 ? 'success' : row.completenessPercent >= 40 ? 'warning' : 'secondary'}>
                                {row.completenessPercent}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="placement" className="space-y-4 pt-4">
          {placement.isPending ? <LoadingRows rows={4} /> : null}
          {placement.isError ? <ErrorState error={placement.error} onRetry={() => void placement.refetch()} /> : null}
          {placement.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Recruiters & drives" value={placement.data.totals.companies.toLocaleString()} icon={<Briefcase size={18} />} hint={`${placement.data.totals.drives} drives · ${placement.data.totals.jobPostings} jobs`} />
                <KpiCard label="Applications & shortlists" value={placement.data.totals.applications.toLocaleString()} hint={`${placement.data.totals.shortlisted} shortlisted`} />
                <KpiCard label="Offers & placements" value={placement.data.totals.placements.toLocaleString()} hint={`${placement.data.totals.offers} offers · ${placement.data.totals.placementRatePercent}% offer conv`} />
                <KpiCard label="CTC range (LPA)" value={`${placement.data.totals.avgCtcLpa} avg`} hint={`Max ${placement.data.totals.maxCtcLpa} LPA`} />
              </div>
              <Card>
                <CardContent className="p-0">
                  {placement.data.institutions.length === 0 ? (
                    <div className="p-4"><EmptyState title="No placement metrics recorded" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Companies</TableHead>
                          <TableHead>Drives</TableHead>
                          <TableHead>Applications</TableHead>
                          <TableHead>Shortlisted</TableHead>
                          <TableHead>Offers / Accepted</TableHead>
                          <TableHead className="text-right">Avg CTC (LPA)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {placement.data.institutions.map((row) => (
                          <TableRow key={row.institutionId}>
                            <TableCell>
                              <span className="block font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground">{row.code}</span>
                            </TableCell>
                            <TableCell>{row.companies}</TableCell>
                            <TableCell>{row.drives}</TableCell>
                            <TableCell>{row.applications}</TableCell>
                            <TableCell>{row.shortlisted}</TableCell>
                            <TableCell>
                              {row.offers} / <span className="font-semibold">{row.accepted}</span>
                            </TableCell>
                            <TableCell className="text-right">{row.avgCtcLpa}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4 pt-4">
          {assessments.isPending ? <LoadingRows rows={4} /> : null}
          {assessments.isError ? <ErrorState error={assessments.error} onRetry={() => void assessments.refetch()} /> : null}
          {assessments.data ? (
            <>
              <Alert variant="warning">
                <ShieldCheck size={16} />
                <AlertDescription>{assessments.data.readOnlyNotice}</AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total exams" value={assessments.data.totals.exams.toLocaleString()} icon={<FileCheck size={18} />} hint={`${assessments.data.totals.completed} completed · ${assessments.data.totals.ongoing} ongoing · ${assessments.data.totals.scheduled} scheduled`} />
                <KpiCard label="Evaluated mark entries" value={assessments.data.totals.markEntries.toLocaleString()} hint={`${assessments.data.totals.absentEntries} absent`} />
                <KpiCard label="Platform pass rate" value={`${assessments.data.totals.passRatePercent}%`} />
                <KpiCard label="Avg marks / semester %" value={`${assessments.data.totals.avgMarks}`} hint={`Avg sem ${assessments.data.totals.avgSemesterPercentage}%`} />
              </div>
              <Card>
                <CardContent className="p-0">
                  {assessments.data.institutions.length === 0 ? (
                    <div className="p-4"><EmptyState title="No exam telemetry recorded" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Exams</TableHead>
                          <TableHead>Mark entries</TableHead>
                          <TableHead className="text-right">Pass rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessments.data.institutions.map((row) => (
                          <TableRow key={row.institutionId}>
                            <TableCell>
                              <span className="block font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground">{row.code}</span>
                            </TableCell>
                            <TableCell>{row.exams}</TableCell>
                            <TableCell>{row.markEntries.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{row.passRatePercent}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="resumes" className="space-y-4 pt-4">
          {resumes.isPending ? <LoadingRows rows={4} /> : null}
          {resumes.isError ? <ErrorState error={resumes.error} onRetry={() => void resumes.refetch()} /> : null}
          {resumes.data ? (
            <>
              <Alert variant="info">
                <Info size={16} />
                <AlertDescription>{resumes.data.privacyNotice}</AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Resumes uploaded" value={resumes.data.totals.uploads.toLocaleString()} hint={`${resumes.data.totals.parsed} parsed · ${resumes.data.totals.failed} failed`} />
                <KpiCard label="AI analyses run" value={resumes.data.totals.analyses.toLocaleString()} />
                <KpiCard label="Avg overall / ATS score" value={`${resumes.data.totals.avgOverallScore} / ${resumes.data.totals.avgAtsScore}`} />
                <KpiCard label="AI telemetry & cost" value={`${resumes.data.totals.aiCalls.toLocaleString()} calls`} hint={`${resumes.data.totals.avgLatencyMs} ms avg · $${resumes.data.totals.estimatedCostUsd.toFixed(2)}`} />
              </div>
              <Card>
                <CardContent className="p-0">
                  {resumes.data.institutions.length === 0 ? (
                    <div className="p-4"><EmptyState title="No resume intelligence metrics recorded" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Uploads</TableHead>
                          <TableHead>Parsed</TableHead>
                          <TableHead>Failed</TableHead>
                          <TableHead>Analyses</TableHead>
                          <TableHead>Avg overall</TableHead>
                          <TableHead className="text-right">Avg ATS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumes.data.institutions.map((row) => (
                          <TableRow key={row.institutionId}>
                            <TableCell>
                              <span className="block font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground">{row.code}</span>
                            </TableCell>
                            <TableCell>{row.uploads}</TableCell>
                            <TableCell>{row.parsed}</TableCell>
                            <TableCell>{row.failed}</TableCell>
                            <TableCell>{row.analyses}</TableCell>
                            <TableCell>{row.avgOverallScore}</TableCell>
                            <TableCell className="text-right">{row.avgAtsScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4 pt-4">
          {interviews.isPending ? <LoadingRows rows={4} /> : null}
          {interviews.isError ? <ErrorState error={interviews.error} onRetry={() => void interviews.refetch()} /> : null}
          {interviews.data ? (
            <>
              <Alert variant="warning">
                <ShieldCheck size={16} />
                <AlertDescription>{interviews.data.disclaimer}</AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Interview sessions" value={interviews.data.totals.sessions.toLocaleString()} icon={<Mic size={18} />} hint={`${interviews.data.totals.completed} completed · ${interviews.data.totals.failed} failed`} />
                <KpiCard label="Evaluated sessions" value={interviews.data.totals.evaluated.toLocaleString()} hint={`${interviews.data.totals.abandoned} abandoned · ${interviews.data.totals.inProgress} live`} />
                <KpiCard label="Avg readiness score" value={String(interviews.data.totals.avgScore)} />
                <KpiCard label="AI turn telemetry" value={`${interviews.data.totals.aiCalls.toLocaleString()} turns`} hint={`${interviews.data.totals.avgLatencyMs} ms avg · $${interviews.data.totals.estimatedCostUsd.toFixed(2)}`} />
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sessions by interview mode</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Object.entries(interviews.data.byMode).map(([mode, cnt]) => (
                    <Badge key={mode} variant="secondary" className="capitalize">
                      {mode.replace(/_/g, ' ')}: {cnt}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  {interviews.data.institutions.length === 0 ? (
                    <div className="p-4"><EmptyState title="No AI interview metrics recorded" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Failed</TableHead>
                          <TableHead>Evaluated</TableHead>
                          <TableHead className="text-right">Avg score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interviews.data.institutions.map((row) => (
                          <TableRow key={row.institutionId}>
                            <TableCell>
                              <span className="block font-medium">{row.name}</span>
                              <span className="text-xs text-muted-foreground">{row.code}</span>
                            </TableCell>
                            <TableCell>{row.sessions}</TableCell>
                            <TableCell>{row.completed}</TableCell>
                            <TableCell>{row.failed}</TableCell>
                            <TableCell>{row.evaluated}</TableCell>
                            <TableCell className="text-right">{row.avgScore}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}


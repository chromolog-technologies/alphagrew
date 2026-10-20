<?php

namespace App\Support\Interviews;

/**
 * Curated competency models per target role: what an interview for the role covers and the
 * level a fresher is expected to show. Used by InterviewPlanner (without AI) and always by
 * SkillGapAnalyzer, so gap reports are deterministic.
 *
 * Each competency: name, category (question bank key), level (basic | intermediate | advanced),
 * weight (sums to 100 per role) and keywords (to match skills and AI competency names).
 */
final class RoleCompetencyModel
{
    public const LEVELS = ['none' => 0, 'basic' => 1, 'intermediate' => 2, 'advanced' => 3];

    private const BEHAVIORAL = ['name' => 'Behavioral / Engineering Ownership', 'category' => 'behavioral', 'level' => 'intermediate', 'weight' => 15,
        'keywords' => ['behavioral', 'ownership', 'teamwork', 'conflict', 'communication', 'leadership']];

    private const ROLES = [
        'backend engineer' => [
            ['name' => 'Data Structures & Algorithms', 'category' => 'dsa', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['data structures', 'algorithms', 'dsa', 'complexity']],
            ['name' => 'REST API Design', 'category' => 'api', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['rest', 'api', 'http', 'node.js', 'express', 'spring', 'django', 'flask', 'laravel']],
            ['name' => 'Database Indexing & Query Tuning', 'category' => 'database', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['sql', 'mysql', 'postgresql', 'database', 'indexing', 'mongodb']],
            ['name' => 'Concurrency & Operating Systems', 'category' => 'concurrency', 'level' => 'basic', 'weight' => 15, 'keywords' => ['concurrency', 'threads', 'operating systems', 'multithreading', 'java', 'go']],
            ['name' => 'Docker & Containerization', 'category' => 'devops', 'level' => 'basic', 'weight' => 10, 'keywords' => ['docker', 'kubernetes', 'containers', 'ci/cd']],
            self::BEHAVIORAL,
        ],
        'frontend engineer' => [
            ['name' => 'JavaScript Fundamentals', 'category' => 'javascript', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['javascript', 'typescript', 'es6']],
            ['name' => 'React & Component Design', 'category' => 'frontend', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['react', 'vue', 'angular', 'components', 'state management']],
            ['name' => 'Web Performance & Accessibility', 'category' => 'webperf', 'level' => 'basic', 'weight' => 15, 'keywords' => ['performance', 'accessibility', 'web vitals', 'css', 'html']],
            ['name' => 'Consuming REST APIs', 'category' => 'api', 'level' => 'basic', 'weight' => 15, 'keywords' => ['rest', 'api', 'fetch', 'http']],
            ['name' => 'Data Structures & Algorithms', 'category' => 'dsa', 'level' => 'basic', 'weight' => 10, 'keywords' => ['data structures', 'algorithms', 'dsa']],
            ['name' => 'Behavioral / Engineering Ownership', 'category' => 'behavioral', 'level' => 'intermediate', 'weight' => 10, 'keywords' => ['behavioral', 'ownership', 'teamwork', 'communication']],
        ],
        'full stack engineer' => [
            ['name' => 'Data Structures & Algorithms', 'category' => 'dsa', 'level' => 'intermediate', 'weight' => 15, 'keywords' => ['data structures', 'algorithms', 'dsa']],
            ['name' => 'JavaScript & Frontend Frameworks', 'category' => 'frontend', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['javascript', 'react', 'typescript', 'vue', 'angular']],
            ['name' => 'REST API Design', 'category' => 'api', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['rest', 'api', 'node.js', 'express', 'django', 'laravel']],
            ['name' => 'Databases & Data Modelling', 'category' => 'database', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['sql', 'mysql', 'postgresql', 'mongodb', 'database']],
            ['name' => 'Deployment & Docker', 'category' => 'devops', 'level' => 'basic', 'weight' => 10, 'keywords' => ['docker', 'deployment', 'ci/cd', 'aws']],
            self::BEHAVIORAL,
        ],
        'data analyst' => [
            ['name' => 'SQL & Data Querying', 'category' => 'database', 'level' => 'intermediate', 'weight' => 30, 'keywords' => ['sql', 'mysql', 'postgresql', 'queries']],
            ['name' => 'Statistics & Probability', 'category' => 'statistics', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['statistics', 'probability', 'hypothesis testing']],
            ['name' => 'Data Analysis with Python / Excel', 'category' => 'python_data', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['python', 'pandas', 'excel', 'numpy']],
            ['name' => 'Data Visualisation & Storytelling', 'category' => 'dataviz', 'level' => 'basic', 'weight' => 15, 'keywords' => ['tableau', 'power bi', 'visualization', 'visualisation', 'matplotlib']],
            self::BEHAVIORAL,
        ],
        'data scientist' => [
            ['name' => 'Machine Learning Fundamentals', 'category' => 'ml', 'level' => 'intermediate', 'weight' => 30, 'keywords' => ['machine learning', 'scikit-learn', 'deep learning', 'tensorflow', 'pytorch']],
            ['name' => 'Statistics & Probability', 'category' => 'statistics', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['statistics', 'probability']],
            ['name' => 'Data Wrangling with Python', 'category' => 'python_data', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['python', 'pandas', 'numpy']],
            ['name' => 'SQL & Data Querying', 'category' => 'database', 'level' => 'basic', 'weight' => 15, 'keywords' => ['sql', 'database']],
            self::BEHAVIORAL,
        ],
        'devops engineer' => [
            ['name' => 'Linux & Operating Systems', 'category' => 'concurrency', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['linux', 'bash', 'operating systems', 'shell']],
            ['name' => 'Docker & Kubernetes', 'category' => 'devops', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['docker', 'kubernetes', 'containers']],
            ['name' => 'CI/CD Pipelines', 'category' => 'devops', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['ci/cd', 'jenkins', 'github actions', 'gitlab']],
            ['name' => 'Cloud & Networking Basics', 'category' => 'cloud', 'level' => 'basic', 'weight' => 20, 'keywords' => ['aws', 'azure', 'gcp', 'cloud', 'networking']],
            self::BEHAVIORAL,
        ],
        'software engineer' => [
            ['name' => 'Data Structures & Algorithms', 'category' => 'dsa', 'level' => 'intermediate', 'weight' => 30, 'keywords' => ['data structures', 'algorithms', 'dsa', 'complexity']],
            ['name' => 'Object-Oriented Design', 'category' => 'oop', 'level' => 'intermediate', 'weight' => 20, 'keywords' => ['oop', 'java', 'c++', 'python', 'design patterns']],
            ['name' => 'Databases & SQL', 'category' => 'database', 'level' => 'basic', 'weight' => 20, 'keywords' => ['sql', 'mysql', 'postgresql', 'database']],
            ['name' => 'Operating Systems & Concurrency', 'category' => 'concurrency', 'level' => 'basic', 'weight' => 15, 'keywords' => ['operating systems', 'threads', 'concurrency']],
            self::BEHAVIORAL,
        ],
    ];

    /** HR interviews: one competency per area. */
    public const HR = [
        ['name' => 'Motivation & Career Goals', 'category' => 'hr', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['motivation', 'goals']],
        ['name' => 'Teamwork & Conflict Resolution', 'category' => 'behavioral', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['teamwork', 'conflict']],
        ['name' => 'Ownership & Accountability', 'category' => 'behavioral', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['ownership', 'accountability']],
        ['name' => 'Communication & Adaptability', 'category' => 'hr', 'level' => 'intermediate', 'weight' => 25, 'keywords' => ['communication', 'adaptability']],
    ];

    public const SYSTEM_DESIGN = [
        ['name' => 'Requirements & API Design', 'category' => 'system_design', 'level' => 'basic', 'weight' => 25, 'keywords' => ['api', 'requirements']],
        ['name' => 'Data Modelling & Storage', 'category' => 'database', 'level' => 'basic', 'weight' => 25, 'keywords' => ['database', 'sql', 'nosql']],
        ['name' => 'Scalability & Caching', 'category' => 'system_design', 'level' => 'basic', 'weight' => 30, 'keywords' => ['scalability', 'caching', 'redis', 'load balancing']],
        ['name' => 'Reliability & Trade-offs', 'category' => 'system_design', 'level' => 'basic', 'weight' => 20, 'keywords' => ['reliability', 'trade-offs', 'availability']],
    ];

    private const REMEDIATION = [
        'dsa' => 'Practise array, hash map, tree and graph problems daily; explain time and space complexity aloud for each.',
        'api' => 'Design a small REST API end to end: resources, status codes, pagination, validation and idempotency.',
        'database' => 'Focus on EXPLAIN plans, B-Tree vs hash indexes, joins vs subqueries, and transaction isolation levels.',
        'concurrency' => 'Revise processes vs threads, locks, deadlocks and race conditions with small code experiments.',
        'devops' => 'Containerise one of your projects with Docker and run it through a simple CI pipeline before the drive.',
        'behavioral' => 'Prepare three STAR stories (situation, task, action, result) about ownership, conflict and failure.',
        'hr' => 'Write down your career goals and why this role fits them; practise a two-minute introduction.',
        'javascript' => 'Revise closures, the event loop, promises and async/await with small exercises.',
        'frontend' => 'Build a component with state, effects and props; explain re-render causes and memoisation.',
        'webperf' => 'Measure a page with Lighthouse and fix two issues; review semantic HTML and ARIA basics.',
        'statistics' => 'Revise distributions, hypothesis testing, p-values and confidence intervals with worked examples.',
        'python_data' => 'Practise pandas group-bys, joins and cleaning on a public dataset; explain each step.',
        'dataviz' => 'Rebuild one dashboard choosing chart types deliberately; explain the story each chart tells.',
        'ml' => 'Revise bias-variance, cross-validation, overfitting remedies and evaluation metrics on one project.',
        'cloud' => 'Deploy a small service on a free cloud tier; learn VPCs, subnets, DNS and load balancers at a basic level.',
        'oop' => 'Revise SOLID principles and two design patterns; refactor a past project class using them.',
        'system_design' => 'Work through classic designs (URL shortener, chat) covering scaling, caching and failure modes.',
        'project' => 'Rehearse explaining your project architecture, your exact contribution and the trade-offs you made.',
    ];

    /** @return list<array{name: string, category: string, level: string, weight: int, keywords: list<string>}> */
    public static function forRole(string $role, string $experienceLevel = 'fresher'): array
    {
        $competencies = self::ROLES[self::roleKey($role)];

        if ($experienceLevel === 'intermediate') {
            $levels = array_keys(self::LEVELS);
            $competencies = array_map(fn (array $c) => [...$c, 'level' => $levels[min(3, self::LEVELS[$c['level']] + 1)]], $competencies);
        }

        return $competencies;
    }

    /** The curated role closest to a free-text target role. */
    public static function roleKey(string $role): string
    {
        $role = strtolower($role);

        return match (true) {
            str_contains($role, 'full') => 'full stack engineer',
            (bool) preg_match('/back.?end|node|server|api/', $role) => 'backend engineer',
            (bool) preg_match('/front.?end|react|angular|\bui\b|web developer/', $role) => 'frontend engineer',
            str_contains($role, 'analyst') => 'data analyst',
            (bool) preg_match('/scien|machine learning|\bml\b|\bai\b/', $role) => 'data scientist',
            (bool) preg_match('/devops|\bsre\b|cloud|infrastructure/', $role) => 'devops engineer',
            default => 'software engineer',
        };
    }

    public static function remediation(string $category, string $competency): string
    {
        return self::REMEDIATION[$category] ?? "Revise the core concepts of {$competency} and practise explaining them with an example.";
    }

    /** Level name for a 0–100 interview score. */
    public static function levelForScore(int $score): string
    {
        return match (true) {
            $score >= 85 => 'advanced',
            $score >= 65 => 'intermediate',
            $score >= 40 => 'basic',
            default => 'none',
        };
    }

    /** Level name for a 1–5 skill level. */
    public static function levelForSkill(int $level): string
    {
        return match (true) {
            $level >= 4 => 'advanced',
            $level === 3 => 'intermediate',
            $level >= 1 => 'basic',
            default => 'none',
        };
    }
}

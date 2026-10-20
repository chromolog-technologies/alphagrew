<?php

namespace App\Support\Interviews;

/**
 * Curated questions used when AI is off (or fails): per competency category, three difficulty
 * bands — 1 (difficulty 1–2, fundamentals), 2 (difficulty 3), 3 (difficulty 4–5). Each question
 * is a single focused question, never a compound one (spec §4.2 rule 1).
 */
final class QuestionBank
{
    private const QUESTIONS = [
        'dsa' => [
            1 => ['What is the difference between an array and a linked list, and when would you choose each?',
                'How does a hash map store and find a value, and what happens on a collision?',
                'What does O(n log n) time complexity mean in practice?'],
            2 => ['How would you detect a cycle in a linked list without extra memory?',
                'How would you find the k most frequent elements in a large array efficiently?',
                'When would you use a heap instead of sorting the whole input?'],
            3 => ['How would you design an LRU cache with O(1) get and put operations?',
                'How would you find the shortest path in a weighted graph with no negative edges, and why does that algorithm work?',
                'How would you merge k sorted streams that do not fit in memory?'],
        ],
        'api' => [
            1 => ['What is the difference between PUT and PATCH in a REST API?',
                'Which HTTP status code would you return when a request fails validation, and why?',
                'What makes an API endpoint stateless?'],
            2 => ['How would you design pagination for an endpoint that lists millions of records?',
                'How would you make a payment-creation endpoint safe to retry?',
                'How would you version a public REST API without breaking existing clients?'],
            3 => ['How would you design rate limiting for a public API used by thousands of clients?',
                'How would you keep an API consistent when one request must update two separate services?',
                'How would you evolve an API contract that mobile apps you cannot force-update depend on?'],
        ],
        'database' => [
            1 => ['What is a primary key, and why does every table need one?',
                'What is the difference between an INNER JOIN and a LEFT JOIN?',
                'What problem does database normalisation solve?'],
            2 => ['How does a B-Tree index speed up a query, and when does it not help?',
                'How would you find out why a particular SQL query is slow?',
                'What is a transaction, and what does the I in ACID protect you from?'],
            3 => ['How would you choose between a composite index and two single-column indexes for a query filtering on both columns?',
                'What anomalies can each transaction isolation level allow, and which would you pick for an order system?',
                'How would you migrate a large production table to a new schema without downtime?'],
        ],
        'concurrency' => [
            1 => ['What is the difference between a process and a thread?',
                'What is a race condition?',
                'What does an operating system scheduler decide?'],
            2 => ['How can a deadlock occur, and how would you prevent one?',
                'When would you use a mutex rather than a semaphore?',
                'What is the difference between concurrency and parallelism?'],
            3 => ['How would you design a thread-safe counter that scales across many cores?',
                'How does a thread pool decide how many threads to run for I/O-bound versus CPU-bound work?',
                'How would you debug an intermittent deadlock in production?'],
        ],
        'devops' => [
            1 => ['What problem does a Docker container solve compared with installing an app directly on a server?',
                'What is the difference between a Docker image and a container?',
                'What does a CI pipeline typically run on every commit?'],
            2 => ['How would you keep a Docker image small and fast to build?',
                'How would you pass secrets to a containerised application safely?',
                'How would you roll back a bad deployment quickly?'],
            3 => ['How would you design a zero-downtime deployment for a stateful service?',
                'How would you decide resource requests and limits for a service in Kubernetes?',
                'How would you structure a CI/CD pipeline for a monorepo with many services?'],
        ],
        'behavioral' => [
            1 => ['Tell me about a project you are proud of and the part you personally owned.',
                'Tell me about a time you had to learn something new quickly.',
                'How do you keep your teammates informed about your progress?'],
            2 => ['Tell me about a disagreement with a teammate and how you resolved it.',
                'Tell me about a time something you built failed. What did you do?',
                'Describe a time you had to deliver with an unclear requirement.'],
            3 => ['Tell me about a time you pushed back on a decision. How did you convince others?',
                'Describe a situation where you had to balance quality against a deadline. What did you trade off?',
                'Tell me about a time you took ownership of a problem nobody was responsible for.'],
        ],
        'hr' => [
            1 => ['Tell me about yourself in two minutes.',
                'Why are you interested in this role?',
                'What are your strengths?'],
            2 => ['Where do you see yourself in three years?',
                'What is a weakness you are actively working on?',
                'How do you handle pressure during deadlines?'],
            3 => ['Why should we hire you over another strong candidate?',
                'Tell me about feedback that changed how you work.',
                'How would you handle being assigned work you find uninteresting?'],
        ],
        'javascript' => [
            1 => ['What is the difference between let, const and var?', 'What is a closure in JavaScript?', 'What does === check that == does not?'],
            2 => ['How does the JavaScript event loop decide what runs next?', 'What is the difference between a promise and async/await?', 'How does prototypal inheritance work?'],
            3 => ['How would you find and fix a memory leak in a long-running single-page app?', 'How would you cancel an in-flight request when a user types a new search?', 'How does the microtask queue differ from the macrotask queue, and why does it matter?'],
        ],
        'frontend' => [
            1 => ['What is the difference between props and state in React?', 'Why do lists in React need keys?', 'What does a component re-render mean?'],
            2 => ['When would you lift state up versus use a context or store?', 'How would you avoid unnecessary re-renders in a large list?', 'How do you handle loading and error states for data fetched in a component?'],
            3 => ['How would you structure state for a complex form with dependent fields?', 'How would you design a component library used by several teams?', 'How would you server-render a page that also needs client interactivity?'],
        ],
        'webperf' => [
            1 => ['What is semantic HTML and why does it matter?', 'What makes a web page accessible to screen-reader users?', 'What slows down the first load of a web page?'],
            2 => ['How would you improve the Largest Contentful Paint of a page?', 'How do you make a custom dropdown keyboard accessible?', 'What is code splitting and when is it worth it?'],
            3 => ['How would you diagnose a page that feels janky while scrolling?', 'How would you audit and fix accessibility across an existing app?', 'How would you budget and enforce performance in CI?'],
        ],
        'statistics' => [
            1 => ['What is the difference between mean and median, and when is median better?', 'What is a p-value?', 'What is the difference between correlation and causation?'],
            2 => ['How would you design an A/B test for a new checkout button?', 'What is a confidence interval telling you?', 'When would you use a t-test?'],
            3 => ['How would you handle multiple-comparison problems when testing many metrics?', 'How would you detect and handle a sample ratio mismatch in an experiment?', 'How do you explain statistical power to a non-technical stakeholder?'],
        ],
        'python_data' => [
            1 => ['How do you remove duplicate rows in pandas?', 'What is the difference between a list and a NumPy array?', 'How do you handle missing values in a dataset?'],
            2 => ['How would you combine two datasets that share a customer id?', 'How would you compute a monthly total per region with pandas?', 'How do you spot outliers in a column?'],
            3 => ['How would you process a dataset too large to fit in memory?', 'How would you make a data-cleaning script reproducible for your team?', 'How would you validate that a data pipeline produced correct numbers?'],
        ],
        'dataviz' => [
            1 => ['When would you use a bar chart instead of a pie chart?', 'What makes a chart misleading?', 'How do you choose colours for a chart?'],
            2 => ['How would you design a dashboard for a sales manager?', 'How do you show a trend and its seasonality together?', 'How do you present uncertainty in a chart?'],
            3 => ['How would you tell a story with data to executives who have five minutes?', 'How would you redesign a cluttered dashboard nobody uses?', 'How do you decide which metrics deserve a place on a dashboard?'],
        ],
        'ml' => [
            1 => ['What is overfitting and how do you detect it?', 'What is the difference between classification and regression?', 'Why do we split data into training and test sets?'],
            2 => ['How does cross-validation work and why use it?', 'When is accuracy a poor metric?', 'What is the bias-variance trade-off?'],
            3 => ['How would you handle a heavily imbalanced dataset?', 'How would you monitor a model for drift after deployment?', 'How would you explain a model\'s prediction to a business user?'],
        ],
        'cloud' => [
            1 => ['What is the difference between IaaS, PaaS and SaaS?', 'What does a load balancer do?', 'What is DNS?'],
            2 => ['How would you make a web app highly available on a cloud provider?', 'What is the difference between a public and a private subnet?', 'How do you control access to cloud resources?'],
            3 => ['How would you design a multi-region deployment?', 'How would you reduce a cloud bill that doubled last month?', 'How would you recover from the loss of an availability zone?'],
        ],
        'oop' => [
            1 => ['What is encapsulation?', 'What is the difference between an abstract class and an interface?', 'What is polymorphism?'],
            2 => ['How does the single-responsibility principle change how you design classes?', 'When would you prefer composition over inheritance?', 'What is dependency injection and why use it?'],
            3 => ['How would you refactor a class with too many responsibilities without breaking callers?', 'Which design pattern would you use to add new payment providers, and why?', 'How do you design classes to be easy to test?'],
        ],
        'system_design' => [
            1 => ['What questions would you ask before designing a URL shortener?', 'What is caching and where can it be added in a web system?', 'What is the difference between vertical and horizontal scaling?'],
            2 => ['How would you design the data model and API for a URL shortener?', 'How would you design a notification service that sends email and SMS?', 'Where would you put a cache in a read-heavy news feed, and how would you invalidate it?'],
            3 => ['How would you design a chat system that supports millions of concurrent users?', 'How would you design a rate limiter shared across many servers?', 'How would you keep a system available when its database is down?'],
        ],
    ];

    private const GENERIC = [
        1 => 'Explain the core idea of %s in your own words, with a simple example.',
        2 => 'Describe how you have applied %s in practice and one problem you ran into.',
        3 => 'What are the main trade-offs in %s, and how would you decide between them on a real project?',
    ];

    private const PROJECT = [
        1 => 'Walk me through your project "%s": what problem did it solve and what was your role?',
        2 => 'How did you design the architecture of "%s", and why did you choose that tech stack?',
        3 => 'If "%s" had to handle ten times the load tomorrow, what would break first and how would you fix it?',
    ];

    public static function band(int $difficulty): int
    {
        return $difficulty <= 2 ? 1 : ($difficulty === 3 ? 2 : 3);
    }

    /**
     * A question not yet asked in this interview.
     *
     * @param  list<string>  $asked  question texts already asked
     */
    public static function pick(string $category, string $competency, int $difficulty, array $asked, ?string $project = null): string
    {
        $band = self::band($difficulty);

        if ($category === 'project' && $project !== null) {
            $candidates = [sprintf(self::PROJECT[$band], $project), ...array_map(fn ($b) => sprintf(self::PROJECT[$b], $project), [1, 2, 3])];
        } else {
            $candidates = [...(self::QUESTIONS[$category][$band] ?? []), ...array_merge(...array_values(self::QUESTIONS[$category] ?? [[]])), sprintf(self::GENERIC[$band], $competency)];
        }

        foreach ($candidates as $question) {
            if (! in_array($question, $asked, true)) {
                return $question;
            }
        }

        return sprintf(self::GENERIC[$band], $competency);
    }

    public static function vagueFollowUp(string $competency): string
    {
        return "Could you make that more concrete? Walk me through one specific example from your own work on {$competency}, step by step.";
    }

    public static function claimFollowUp(string $claim): string
    {
        return "You mentioned \"{$claim}\". How did you measure that, what was the baseline before your change, and what exactly did you change?";
    }
}

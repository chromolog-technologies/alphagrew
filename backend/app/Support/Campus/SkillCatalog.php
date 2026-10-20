<?php

namespace App\Support\Campus;

use Illuminate\Support\Str;

/**
 * Platform skills catalogue (skills.institution_id = null). Institutions can add their own
 * skills; free-text skills that match nothing here become institution skills flagged for review.
 */
final class SkillCatalog
{
    public const CATEGORIES = ['language', 'framework', 'tool', 'domain', 'soft'];

    /**
     * @return list<array{name: string, category: string, aliases: list<string>}>
     */
    public static function defaults(): array
    {
        $skills = [
            'language' => [
                'Java' => [], 'Python' => [], 'JavaScript' => ['JS', 'ECMAScript'], 'TypeScript' => ['TS'],
                'C' => [], 'C++' => ['CPP'], 'C#' => ['CSharp', 'C Sharp'], 'PHP' => [], 'Go' => ['Golang'],
                'Kotlin' => [], 'Swift' => [], 'SQL' => [], 'R' => [], 'Dart' => [], 'Embedded C' => [],
                'MATLAB' => [],
            ],
            'framework' => [
                'React' => ['ReactJS', 'React.js'], 'Angular' => ['AngularJS'], 'Vue.js' => ['Vue', 'VueJS'],
                'Node.js' => ['Node', 'NodeJS'], 'Express.js' => ['Express'], 'Laravel' => [],
                'Spring Boot' => ['Spring'], 'Django' => [], 'Flask' => [], 'Flutter' => [],
                '.NET' => ['ASP.NET', 'dotnet'], 'TensorFlow' => [], 'PyTorch' => [],
            ],
            'tool' => [
                'Git' => ['GitHub', 'GitLab'], 'Docker' => [], 'Kubernetes' => ['K8s'], 'AWS' => ['Amazon Web Services'],
                'Azure' => [], 'Google Cloud' => ['GCP'], 'Linux' => [], 'MySQL' => [], 'PostgreSQL' => ['Postgres'],
                'MongoDB' => ['Mongo'], 'Figma' => [], 'Excel' => ['MS Excel', 'Microsoft Excel'], 'Power BI' => ['PowerBI'],
                'Tableau' => [], 'AutoCAD' => [], 'SolidWorks' => [],
            ],
            'domain' => [
                'Data Structures and Algorithms' => ['DSA', 'Data Structures', 'Algorithms'],
                'Machine Learning' => ['ML'], 'Data Analysis' => ['Data Analytics'],
                'Business Analytics' => [], 'UI Design' => ['UI/UX', 'UX Design'],
                'Web Development' => [], 'REST APIs' => ['REST', 'RESTful APIs'],
                'VLSI' => [], 'Manufacturing' => [], 'Quality Control' => ['QC'], 'Digital Marketing' => [],
                'Finance' => [], 'Cyber Security' => ['Cybersecurity', 'Information Security'],
            ],
            'soft' => [
                'Communication' => [], 'Presentation' => ['Presentation Skills'], 'Leadership' => [],
                'Teamwork' => [], 'Problem Solving' => [],
            ],
        ];

        $list = [];
        foreach ($skills as $category => $entries) {
            foreach ($entries as $name => $aliases) {
                $list[] = ['name' => $name, 'category' => $category, 'aliases' => $aliases];
            }
        }

        return $list;
    }

    /** URL slug that keeps C, C++ and C# distinct. */
    public static function slug(string $name): string
    {
        $slug = Str::slug(str_replace(['++', '+', '#'], [' plus plus', ' plus', ' sharp'], $name));

        return $slug !== '' ? $slug : self::key($name);
    }

    /**
     * Normalised lookup key for names and aliases: "React.js" and "reactjs" match.
     */
    public static function key(string $name): string
    {
        return Str::of($name)->lower()->replace(['+', '#'], ['plus', 'sharp'])->replaceMatches('/[^a-z0-9]+/', '')->value();
    }
}

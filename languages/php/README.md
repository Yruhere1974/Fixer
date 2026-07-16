# PHP Standards

## Naming Conventions
- **Files**: `PascalCase.php` (one class per file, PSR-4 autoloading)
- **Namespaces**: `PascalCase\SubNamespace`
- **Classes/Interfaces**: `PascalCase`
- **Methods/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Project Structure
```text
project_root/
├── src/
│   └── Namespace/
├── tests/
├── public/
│   └── index.php
├── composer.json
├── composer.lock
└── .gitignore
```

## Tools
- **Dependencies**: Composer; commit `composer.lock`.
- **Standards**: PSR-12 coding style (PHP-CS-Fixer or PHP_CodeSniffer).
- **Static Analysis**: PHPStan or Psalm (max level the codebase can sustain).
- **Testing**: PHPUnit or Pest.

## Best Practices
- Always `declare(strict_types=1);` at the top of files.
- Type-hint all parameters and return types.
- Target a currently supported PHP version (8.2+).

## Framework Deep-Dives
- **Laravel**: [`laravel/README.md`](./laravel) — thin controllers + form requests + service/action classes (mandatory for non-trivial apps).

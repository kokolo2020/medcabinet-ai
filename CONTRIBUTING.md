# Contributing to MedCabinet AI

## Before making changes
- Keep medicine data private and never commit real household records, prescription labels, API secrets, or database passwords.
- Open or reference an issue for significant features.
- Separate prototype fixes from production architecture changes.

## Local setup
1. Clone the repository.
2. Configure a development Supabase project.
3. Run the schema in `supabase/schema.sql`.
4. Set only the public Supabase publishable key in browser configuration.
5. Set `ANTHROPIC_API_KEY` in the local/Netlify serverless environment, never in client code.
6. Serve the static site and Netlify function locally using the project’s chosen tooling.

## Branches and commits
Use focused branches and concise commits, for example `feature/shopping-check` or `fix/expiry-boundary`. Keep unrelated formatting or redesign changes out of functional commits.

## Pull requests
Describe:
- What changed and why
- User impact
- Data/schema impact
- Security and privacy considerations
- Screenshots for UI changes
- Tests performed
- Rollback or migration steps when applicable

## Quality requirements
- Preserve mobile responsiveness and accessibility.
- Add tests for calculation, matching, data isolation, and failure paths.
- Require confirmation for AI-extracted medicine fields.
- Do not add medical diagnosis or prescription recommendations.
- Update relevant files in `docs/` and `CHANGELOG.md`.

## Reporting security issues
Do not publish sensitive vulnerabilities in a public issue. Contact the repository owner privately with reproduction steps and impact.

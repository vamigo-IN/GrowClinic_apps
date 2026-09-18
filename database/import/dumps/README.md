# Import dumps (git-ignored)

Place restored **copies** of the MySQL dumps here as `<app>.dump.sql`
(`growclinic`, `audit`, `gmb`, `engine`) for `compose.import.yml`.
They contain personal data: keep this directory out of git and backups of the
repository, transfer dumps only over SSH, and delete them after validation.
See DATABASE-MIGRATION.md §8 and DEPLOYMENT.md §4.

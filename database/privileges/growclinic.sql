-- Re-applied after the generic grants on every migrate run.
-- Migration history is managed only by the migrate job.
REVOKE ALL ON growclinic."_prisma_migrations" FROM growclinic_app;

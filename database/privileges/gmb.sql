-- Re-applied after the generic grants on every migrate run.
-- audit_events is documented as append-only ("never UPDATE/DELETE"): enforce
-- it for the runtime role so a compromised app cannot rewrite its audit trail.
REVOKE UPDATE, DELETE, TRUNCATE ON gmb.audit_events FROM gmb_app;

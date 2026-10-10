-- Run without edits. Counts every public application table exactly.
SELECT table_name,record_count,pg_size_pretty(storage_bytes) AS total_storage
FROM private.count_tables14322();

-- No edits needed. Storage includes table indexes; archived files are separate.
SELECT current_database() AS database_name,pg_size_pretty(pg_database_size(current_database())) AS database_size;
SELECT table_name,record_count,pg_size_pretty(storage_bytes) AS table_storage
FROM private.count_tables14322() ORDER BY storage_bytes DESC,table_name;

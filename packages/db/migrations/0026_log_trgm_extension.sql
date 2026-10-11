-- Custom SQL migration file, put your code below! --
-- Trigram indexes back the logs' free-text search (`log_entry.search_text`, migration 0027).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

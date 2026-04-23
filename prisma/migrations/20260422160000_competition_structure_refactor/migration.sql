-- Competition structure refactor (minimal, backward-compatible)
-- Notes:
-- - Old columns `competition_code` / `organizer` / `competition_category` are kept for DB compatibility,
--   but API/Frontend no longer use them.
-- - Competition time fields are upgraded from DATE -> DATETIME(0) to support time-of-day rules.

ALTER TABLE `comp_competition`
  ADD COLUMN `location` VARCHAR(255) NULL,
  ADD COLUMN `involved_field` VARCHAR(64) NULL,
  ADD COLUMN `published_at` DATETIME(3) NULL,
  ADD COLUMN `archived_at` DATETIME(3) NULL,
  ADD COLUMN `status_logs` JSON NULL;

ALTER TABLE `comp_competition`
  MODIFY `status_code` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  MODIFY `registration_start_date` DATETIME(0) NULL,
  MODIFY `registration_end_date` DATETIME(0) NULL,
  MODIFY `event_start_date` DATETIME(0) NULL,
  MODIFY `event_end_date` DATETIME(0) NULL;

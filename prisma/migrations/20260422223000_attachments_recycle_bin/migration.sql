-- Add recycle-bin fields for attachments
ALTER TABLE `sys_file`
  ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `updated_at`,
  ADD COLUMN `deleted_at` DATETIME NULL AFTER `is_deleted`,
  ADD COLUMN `deleted_by` BIGINT UNSIGNED NULL AFTER `deleted_at`,
  ADD INDEX `idx_sys_file_is_deleted_deleted_at` (`is_deleted`, `deleted_at`);

-- Attachment operation logs (delete / cleanup / etc.)
CREATE TABLE `sys_file_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `file_id` BIGINT UNSIGNED NOT NULL,
  `action_type` VARCHAR(32) NOT NULL,
  `business_type` VARCHAR(64) NULL,
  `business_id` VARCHAR(64) NULL,
  `usage_type` VARCHAR(64) NULL,
  `operator_user_id` BIGINT UNSIGNED NULL,
  `description` VARCHAR(500) NULL,
  `extra_data` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sys_file_op_file_created` (`file_id`, `created_at`),
  KEY `idx_sys_file_op_operator_created` (`operator_user_id`, `created_at`),
  CONSTRAINT `fk_sys_file_op_file` FOREIGN KEY (`file_id`) REFERENCES `sys_file` (`id`),
  CONSTRAINT `fk_sys_file_op_operator` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (`id`)
);


-- Add missing fund reimbursement / labor tables defined in prisma/schema.prisma

CREATE TABLE IF NOT EXISTS `fund_labor_application` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `labor_no` VARCHAR(64) NOT NULL,
    `labor_type` VARCHAR(32) NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `target_user_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `status_logs` JSON NULL,
    `submitted_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `fund_labor_application_labor_no_key`(`labor_no`),
    UNIQUE INDEX `fund_labor_application_approval_instance_id_key`(`approval_instance_id`),
    INDEX `fund_labor_application_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    INDEX `fund_labor_application_target_user_id_status_code_idx`(`target_user_id`, `status_code`),
    INDEX `fund_labor_application_status_code_updated_at_idx`(`status_code`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fund_reimbursement_application` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `reimbursement_no` VARCHAR(64) NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `target_user_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `purchase_platform` VARCHAR(64) NULL,
    `purpose` VARCHAR(1000) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `status_logs` JSON NULL,
    `submitted_at` DATETIME(3) NULL,
    `reimbursed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `fund_reimbursement_application_reimbursement_no_key`(`reimbursement_no`),
    UNIQUE INDEX `fund_reimbursement_application_approval_instance_id_key`(`approval_instance_id`),
    INDEX `fund_reimbursement_application_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    INDEX `fund_reimbursement_application_target_user_id_status_code_idx`(`target_user_id`, `status_code`),
    INDEX `fund_reimbursement_application_status_code_updated_at_idx`(`status_code`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys: guard against environments where tables already exist
SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_labor_application'
    AND CONSTRAINT_NAME = 'fund_labor_application_applicant_user_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_labor_application` ADD CONSTRAINT `fund_labor_application_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_labor_application'
    AND CONSTRAINT_NAME = 'fund_labor_application_target_user_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_labor_application` ADD CONSTRAINT `fund_labor_application_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_labor_application'
    AND CONSTRAINT_NAME = 'fund_labor_application_approval_instance_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_labor_application` ADD CONSTRAINT `fund_labor_application_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_reimbursement_application'
    AND CONSTRAINT_NAME = 'fund_reimbursement_application_applicant_user_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_reimbursement_application` ADD CONSTRAINT `fund_reimbursement_application_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_reimbursement_application'
    AND CONSTRAINT_NAME = 'fund_reimbursement_application_target_user_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_reimbursement_application` ADD CONSTRAINT `fund_reimbursement_application_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @smw_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fund_reimbursement_application'
    AND CONSTRAINT_NAME = 'fund_reimbursement_application_approval_instance_id_fkey'
);
SET @smw_fk_sql := IF(
  @smw_fk_exists = 0,
  'ALTER TABLE `fund_reimbursement_application` ADD CONSTRAINT `fund_reimbursement_application_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @smw_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add reimbursement material threshold config item (idempotent)
INSERT INTO `sys_config_item` (
  `config_category`,
  `config_key`,
  `config_name`,
  `config_value`,
  `value_type`,
  `status_code`,
  `remark`,
  `editable`,
  `created_at`,
  `updated_at`
) VALUES (
  'FINANCE',
  'reimbursement_material_threshold',
  '报销材料阈值',
  '500',
  'NUMBER',
  'ACTIVE',
  '金额大于该阈值时，订单截图/发票截图/实物截图为必填',
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
) ON DUPLICATE KEY UPDATE
  `config_category` = VALUES(`config_category`),
  `config_name` = VALUES(`config_name`),
  `value_type` = VALUES(`value_type`),
  `status_code` = VALUES(`status_code`),
  `remark` = VALUES(`remark`),
  `editable` = VALUES(`editable`),
  `updated_at` = VALUES(`updated_at`);

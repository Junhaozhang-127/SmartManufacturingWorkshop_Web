CREATE TABLE `fund_account` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `account_code` VARCHAR(64) NOT NULL,
    `account_name` VARCHAR(128) NOT NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `category_name` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `owner_org_unit_id` BIGINT UNSIGNED NULL,
    `manager_user_id` BIGINT UNSIGNED NULL,
    `total_budget` DECIMAL(12, 2) NOT NULL,
    `reserved_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `used_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `remarks` VARCHAR(1000) NULL,
    `last_expense_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `fund_account_account_code_key`(`account_code`),
    INDEX `fund_account_status_code_owner_org_unit_id_idx`(`status_code`, `owner_org_unit_id`),
    INDEX `fund_account_project_id_idx`(`project_id`),
    INDEX `fund_account_manager_user_id_status_code_idx`(`manager_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fund_application` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_no` VARCHAR(64) NOT NULL,
    `account_id` BIGINT UNSIGNED NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `applicant_role_code` VARCHAR(32) NULL,
    `application_type` VARCHAR(32) NOT NULL,
    `expense_type` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `purpose` VARCHAR(1000) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `reimbursement_amount` DECIMAL(12, 2) NULL,
    `payee_name` VARCHAR(128) NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `related_business_type` VARCHAR(64) NULL,
    `related_business_id` VARCHAR(64) NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `payment_status` VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
    `payment_remark` VARCHAR(500) NULL,
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `attachments` JSON NULL,
    `status_logs` JSON NULL,
    `submitted_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,

    UNIQUE INDEX `fund_application_application_no_key`(`application_no`),
    UNIQUE INDEX `fund_application_approval_instance_id_key`(`approval_instance_id`),
    INDEX `fund_application_account_id_status_code_idx`(`account_id`, `status_code`),
    INDEX `fund_application_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    INDEX `fund_application_project_id_idx`(`project_id`),
    INDEX `fund_application_payment_status_status_code_idx`(`payment_status`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `fund_account` ADD CONSTRAINT `fund_account_owner_org_unit_id_fkey`
    FOREIGN KEY (`owner_org_unit_id`) REFERENCES `org_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `fund_account` ADD CONSTRAINT `fund_account_manager_user_id_fkey`
    FOREIGN KEY (`manager_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `fund_application` ADD CONSTRAINT `fund_application_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `fund_account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fund_application` ADD CONSTRAINT `fund_application_applicant_user_id_fkey`
    FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fund_application` ADD CONSTRAINT `fund_application_approval_instance_id_fkey`
    FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

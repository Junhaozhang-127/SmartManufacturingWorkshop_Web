CREATE TABLE `asset_device` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_code` VARCHAR(64) NOT NULL,
    `device_name` VARCHAR(128) NOT NULL,
    `category_name` VARCHAR(64) NOT NULL,
    `model` VARCHAR(128) NULL,
    `specification` VARCHAR(255) NULL,
    `manufacturer` VARCHAR(128) NULL,
    `serial_no` VARCHAR(128) NULL,
    `asset_tag` VARCHAR(64) NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'IDLE',
    `org_unit_id` BIGINT UNSIGNED NULL,
    `responsible_user_id` BIGINT UNSIGNED NULL,
    `location_label` VARCHAR(128) NULL,
    `purchase_date` DATE NULL,
    `warranty_until` DATE NULL,
    `purchase_amount` DECIMAL(12, 2) NULL,
    `remarks` VARCHAR(1000) NULL,
    `latest_repair_id` BIGINT UNSIGNED NULL,
    `status_changed_at` DATETIME(3) NULL,
    `status_logs` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `asset_device_device_code_key`(`device_code`),
    UNIQUE INDEX `asset_device_latest_repair_id_key`(`latest_repair_id`),
    INDEX `asset_device_status_code_org_unit_id_idx`(`status_code`, `org_unit_id`),
    INDEX `asset_device_responsible_user_id_status_code_idx`(`responsible_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `asset_device_repair` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id` BIGINT UNSIGNED NOT NULL,
    `repair_no` VARCHAR(64) NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `applicant_role_code` VARCHAR(32) NULL,
    `handler_user_id` BIGINT UNSIGNED NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `severity` VARCHAR(16) NOT NULL,
    `fault_description` VARCHAR(2000) NOT NULL,
    `handler_comment` VARCHAR(1000) NULL,
    `resolution_summary` VARCHAR(1000) NULL,
    `latest_result` VARCHAR(500) NULL,
    `requested_amount` DECIMAL(12, 2) NULL,
    `cost_estimate` DECIMAL(12, 2) NULL,
    `actual_cost` DECIMAL(12, 2) NULL,
    `fund_link_code` VARCHAR(64) NULL,
    `device_status_before_repair` VARCHAR(32) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `attachments` JSON NULL,
    `status_logs` JSON NULL,
    `reported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `accepted_at` DATETIME(3) NULL,
    `resolved_at` DATETIME(3) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `status_changed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `asset_device_repair_repair_no_key`(`repair_no`),
    UNIQUE INDEX `asset_device_repair_approval_instance_id_key`(`approval_instance_id`),
    INDEX `asset_device_repair_device_id_status_code_idx`(`device_id`, `status_code`),
    INDEX `asset_device_repair_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    INDEX `asset_device_repair_handler_user_id_status_code_idx`(`handler_user_id`, `status_code`),
    INDEX `asset_device_repair_reported_at_idx`(`reported_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `asset_device` ADD CONSTRAINT `asset_device_org_unit_id_fkey` FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `asset_device` ADD CONSTRAINT `asset_device_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `asset_device_repair` ADD CONSTRAINT `asset_device_repair_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `asset_device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `asset_device_repair` ADD CONSTRAINT `asset_device_repair_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `asset_device_repair` ADD CONSTRAINT `asset_device_repair_handler_user_id_fkey` FOREIGN KEY (`handler_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `asset_device_repair` ADD CONSTRAINT `asset_device_repair_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `asset_device` ADD CONSTRAINT `asset_device_latest_repair_id_fkey` FOREIGN KEY (`latest_repair_id`) REFERENCES `asset_device_repair`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

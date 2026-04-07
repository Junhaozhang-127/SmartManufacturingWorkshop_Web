CREATE TABLE `inv_consumable` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `consumable_code` VARCHAR(64) NOT NULL,
    `consumable_name` VARCHAR(128) NOT NULL,
    `category_name` VARCHAR(64) NOT NULL,
    `specification` VARCHAR(255) NULL,
    `unit_name` VARCHAR(32) NOT NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `inventory_status` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    `current_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `warning_threshold` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `warning_flag` BOOLEAN NOT NULL DEFAULT false,
    `org_unit_id` BIGINT UNSIGNED NULL,
    `default_location` VARCHAR(128) NULL,
    `replenishment_triggered_at` DATETIME(3) NULL,
    `last_txn_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `inv_consumable_consumable_code_key`(`consumable_code`),
    INDEX `inv_consumable_category_name_inventory_status_idx`(`category_name`, `inventory_status`),
    INDEX `inv_consumable_org_unit_id_inventory_status_idx`(`org_unit_id`, `inventory_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inv_consumable_request` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `request_no` VARCHAR(64) NOT NULL,
    `consumable_id` BIGINT UNSIGNED NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `applicant_role_code` VARCHAR(32) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `purpose` VARCHAR(500) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `outbound_txn_id` BIGINT UNSIGNED NULL,
    `status_logs` JSON NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inv_consumable_request_request_no_key`(`request_no`),
    UNIQUE INDEX `inv_consumable_request_approval_instance_id_key`(`approval_instance_id`),
    UNIQUE INDEX `inv_consumable_request_outbound_txn_id_key`(`outbound_txn_id`),
    INDEX `inv_consumable_request_consumable_id_status_code_idx`(`consumable_id`, `status_code`),
    INDEX `inv_consumable_request_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    INDEX `inv_consumable_request_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `inv_inventory_txn` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `consumable_id` BIGINT UNSIGNED NOT NULL,
    `request_id` BIGINT UNSIGNED NULL,
    `txn_type` VARCHAR(32) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `balance_after` DECIMAL(12, 2) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `operator_user_id` BIGINT UNSIGNED NULL,
    `operator_role_code` VARCHAR(32) NULL,
    `remark` VARCHAR(500) NULL,
    `extra_data` JSON NULL,
    `txn_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inv_inventory_txn_consumable_id_txn_at_idx`(`consumable_id`, `txn_at`),
    INDEX `inv_inventory_txn_request_id_idx`(`request_id`),
    INDEX `inv_inventory_txn_operator_user_id_txn_at_idx`(`operator_user_id`, `txn_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inv_consumable` ADD CONSTRAINT `inv_consumable_org_unit_id_fkey`
    FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inv_consumable` ADD CONSTRAINT `inv_consumable_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inv_consumable_request` ADD CONSTRAINT `inv_consumable_request_consumable_id_fkey`
    FOREIGN KEY (`consumable_id`) REFERENCES `inv_consumable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inv_consumable_request` ADD CONSTRAINT `inv_consumable_request_applicant_user_id_fkey`
    FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inv_consumable_request` ADD CONSTRAINT `inv_consumable_request_approval_instance_id_fkey`
    FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inv_inventory_txn` ADD CONSTRAINT `inv_inventory_txn_consumable_id_fkey`
    FOREIGN KEY (`consumable_id`) REFERENCES `inv_consumable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inv_inventory_txn` ADD CONSTRAINT `inv_inventory_txn_request_id_fkey`
    FOREIGN KEY (`request_id`) REFERENCES `inv_consumable_request`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inv_inventory_txn` ADD CONSTRAINT `inv_inventory_txn_operator_user_id_fkey`
    FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `inv_consumable_request` ADD CONSTRAINT `inv_consumable_request_outbound_txn_id_fkey`
    FOREIGN KEY (`outbound_txn_id`) REFERENCES `inv_inventory_txn`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

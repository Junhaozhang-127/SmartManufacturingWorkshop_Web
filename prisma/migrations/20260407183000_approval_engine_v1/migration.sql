-- CreateTable
CREATE TABLE `wf_approval_template` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_code` VARCHAR(64) NOT NULL,
    `template_name` VARCHAR(128) NOT NULL,
    `business_type` VARCHAR(64) NOT NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wf_approval_template_template_code_key`(`template_code`),
    UNIQUE INDEX `wf_approval_template_business_type_key`(`business_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wf_approval_template_node` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT UNSIGNED NOT NULL,
    `node_key` VARCHAR(64) NOT NULL,
    `node_name` VARCHAR(128) NOT NULL,
    `sort_no` INTEGER NOT NULL,
    `approver_role_code` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wf_approval_template_node_template_id_node_key_key`(`template_id`, `node_key`),
    UNIQUE INDEX `wf_approval_template_node_template_id_sort_no_key`(`template_id`, `sort_no`),
    INDEX `wf_approval_template_node_template_id_sort_no_idx`(`template_id`, `sort_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wf_approval_instance` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT UNSIGNED NULL,
    `business_type` VARCHAR(64) NOT NULL,
    `business_id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `applicant_role_code` VARCHAR(32) NULL,
    `current_node_key` VARCHAR(64) NULL,
    `current_node_name` VARCHAR(128) NULL,
    `current_node_sort` INTEGER NULL,
    `current_approver_role_code` VARCHAR(32) NULL,
    `current_approver_user_id` BIGINT UNSIGNED NULL,
    `latest_comment` VARCHAR(500) NULL,
    `form_data` JSON NULL,
    `finished_at` DATETIME(3) NULL,
    `withdrawn_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `wf_approval_instance_business_type_business_id_idx`(`business_type`, `business_id`),
    INDEX `wf_approval_instance_status_current_approver_role_code_idx`(`status`, `current_approver_role_code`),
    INDEX `wf_approval_instance_status_current_approver_user_id_idx`(`status`, `current_approver_user_id`),
    INDEX `wf_approval_instance_applicant_user_id_status_idx`(`applicant_user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wf_approval_node_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `instance_id` BIGINT UNSIGNED NOT NULL,
    `node_key` VARCHAR(64) NULL,
    `node_name` VARCHAR(128) NULL,
    `action_type` VARCHAR(32) NOT NULL,
    `actor_user_id` BIGINT UNSIGNED NOT NULL,
    `actor_role_code` VARCHAR(32) NULL,
    `target_user_id` BIGINT UNSIGNED NULL,
    `comment` VARCHAR(500) NULL,
    `extra_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wf_approval_node_log_instance_id_created_at_idx`(`instance_id`, `created_at`),
    INDEX `wf_approval_node_log_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `demo_approval_form` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(128) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `demo_approval_form_approval_instance_id_key`(`approval_instance_id`),
    INDEX `demo_approval_form_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wf_approval_template_node` ADD CONSTRAINT `wf_approval_template_node_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `wf_approval_template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_instance` ADD CONSTRAINT `wf_approval_instance_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `wf_approval_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_instance` ADD CONSTRAINT `wf_approval_instance_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_instance` ADD CONSTRAINT `wf_approval_instance_current_approver_user_id_fkey` FOREIGN KEY (`current_approver_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_node_log` ADD CONSTRAINT `wf_approval_node_log_instance_id_fkey` FOREIGN KEY (`instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_node_log` ADD CONSTRAINT `wf_approval_node_log_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_approval_node_log` ADD CONSTRAINT `wf_approval_node_log_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demo_approval_form` ADD CONSTRAINT `demo_approval_form_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `demo_approval_form` ADD CONSTRAINT `demo_approval_form_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

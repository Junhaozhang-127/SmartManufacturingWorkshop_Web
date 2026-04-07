-- CreateTable
CREATE TABLE `member_growth_record` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `member_profile_id` BIGINT UNSIGNED NOT NULL,
    `record_type` VARCHAR(32) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `content` VARCHAR(1000) NULL,
    `record_date` DATE NOT NULL,
    `actor_user_id` BIGINT UNSIGNED NULL,
    `extra_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `member_growth_record_member_profile_id_record_date_idx`(`member_profile_id`, `record_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_stage_evaluation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `member_profile_id` BIGINT UNSIGNED NOT NULL,
    `stage_code` VARCHAR(32) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `score` INTEGER NULL,
    `result_code` VARCHAR(32) NOT NULL,
    `next_action` VARCHAR(500) NULL,
    `evaluated_at` DATETIME(3) NOT NULL,
    `evaluator_user_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `member_stage_evaluation_member_profile_id_evaluated_at_idx`(`member_profile_id`, `evaluated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_regularization` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `member_profile_id` BIGINT UNSIGNED NOT NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `status_code` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `internship_start_date` DATE NOT NULL,
    `planned_regular_date` DATE NOT NULL,
    `application_reason` VARCHAR(1000) NOT NULL,
    `self_assessment` VARCHAR(1000) NULL,
    `mentor_user_id` BIGINT UNSIGNED NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `submitted_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `latest_result` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `member_regularization_approval_instance_id_key`(`approval_instance_id`),
    INDEX `member_regularization_member_profile_id_status_code_idx`(`member_profile_id`, `status_code`),
    INDEX `member_regularization_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_operation_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `member_profile_id` BIGINT UNSIGNED NOT NULL,
    `action_type` VARCHAR(32) NOT NULL,
    `from_status` VARCHAR(32) NULL,
    `to_status` VARCHAR(32) NULL,
    `description` VARCHAR(500) NOT NULL,
    `operator_user_id` BIGINT UNSIGNED NULL,
    `extra_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `member_operation_log_member_profile_id_created_at_idx`(`member_profile_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `member_growth_record` ADD CONSTRAINT `member_growth_record_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_growth_record` ADD CONSTRAINT `member_growth_record_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_stage_evaluation` ADD CONSTRAINT `member_stage_evaluation_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_stage_evaluation` ADD CONSTRAINT `member_stage_evaluation_evaluator_user_id_fkey` FOREIGN KEY (`evaluator_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_regularization` ADD CONSTRAINT `member_regularization_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_regularization` ADD CONSTRAINT `member_regularization_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_regularization` ADD CONSTRAINT `member_regularization_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_operation_log` ADD CONSTRAINT `member_operation_log_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_operation_log` ADD CONSTRAINT `member_operation_log_operator_user_id_fkey` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

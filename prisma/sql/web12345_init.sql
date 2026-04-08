-- SmartManufacturingWorkshop full init SQL
CREATE DATABASE IF NOT EXISTS `web12345` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `web12345`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Migration: 20260407142000_baseline_init
-- CreateTable
CREATE TABLE `sys_user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(64) NOT NULL,
    `mobile` VARCHAR(20) NULL,
    `email` VARCHAR(128) NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `sys_user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(32) NOT NULL,
    `role_name` VARCHAR(64) NOT NULL,
    `data_scope` VARCHAR(20) NOT NULL,
    `sort_no` INTEGER NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_role_role_code_key`(`role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_user_role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `effective_from` DATETIME(3) NULL,
    `effective_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sys_user_role_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `org_unit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT UNSIGNED NULL,
    `unit_code` VARCHAR(32) NOT NULL,
    `unit_name` VARCHAR(128) NOT NULL,
    `unit_type` VARCHAR(32) NOT NULL,
    `leader_user_id` BIGINT UNSIGNED NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `org_unit_unit_code_key`(`unit_code`),
    INDEX `org_unit_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_profile` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `org_unit_id` BIGINT UNSIGNED NOT NULL,
    `position_code` VARCHAR(32) NOT NULL,
    `mentor_user_id` BIGINT UNSIGNED NULL,
    `join_date` DATE NOT NULL,
    `member_status` VARCHAR(20) NOT NULL,
    `skill_tags` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `member_profile_user_id_key`(`user_id`),
    INDEX `member_profile_org_unit_id_idx`(`org_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sys_user_role` ADD CONSTRAINT `sys_user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_unit` ADD CONSTRAINT `org_unit_leader_user_id_fkey` FOREIGN KEY (`leader_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `org_unit` ADD CONSTRAINT `org_unit_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `org_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_profile` ADD CONSTRAINT `member_profile_mentor_user_id_fkey` FOREIGN KEY (`mentor_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_profile` ADD CONSTRAINT `member_profile_org_unit_id_fkey` FOREIGN KEY (`org_unit_id`) REFERENCES `org_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_profile` ADD CONSTRAINT `member_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: 20260407170000_auth_foundation
ALTER TABLE `sys_user`
    ADD COLUMN `force_password_change` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `password_changed_at` DATETIME(3) NULL;

-- Migration: 20260407183000_approval_engine_v1
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

-- Migration: 20260407195000_competition_achievement_p0
CREATE TABLE `comp_competition` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `competition_code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `organizer` VARCHAR(255) NOT NULL,
    `competition_level` VARCHAR(32) NOT NULL,
    `competition_category` VARCHAR(64) NOT NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `registration_start_date` DATE NULL,
    `registration_end_date` DATE NULL,
    `event_start_date` DATE NULL,
    `event_end_date` DATE NULL,
    `description` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `comp_competition_competition_code_key`(`competition_code`),
    INDEX `comp_competition_status_code_competition_level_idx`(`status_code`, `competition_level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `comp_team` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `competition_id` BIGINT UNSIGNED NOT NULL,
    `team_name` VARCHAR(128) NOT NULL,
    `team_leader_user_id` BIGINT UNSIGNED NOT NULL,
    `advisor_user_id` BIGINT UNSIGNED NULL,
    `member_user_ids` VARCHAR(500) NOT NULL,
    `member_names` VARCHAR(500) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `application_reason` VARCHAR(1000) NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `submitted_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `comp_team_approval_instance_id_key`(`approval_instance_id`),
    INDEX `comp_team_competition_id_status_code_idx`(`competition_id`, `status_code`),
    INDEX `comp_team_team_leader_user_id_status_code_idx`(`team_leader_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `achv_achievement` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `achievement_type` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `level_code` VARCHAR(32) NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `recognized_grade` VARCHAR(64) NULL,
    `score_mapping` JSON NULL,
    `project_id` VARCHAR(64) NULL,
    `project_name` VARCHAR(128) NULL,
    `source_competition_id` BIGINT UNSIGNED NULL,
    `source_team_id` BIGINT UNSIGNED NULL,
    `description` VARCHAR(2000) NULL,
    `applicant_user_id` BIGINT UNSIGNED NOT NULL,
    `latest_result` VARCHAR(500) NULL,
    `approval_instance_id` BIGINT UNSIGNED NULL,
    `submitted_at` DATETIME(3) NULL,
    `recognized_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `achv_achievement_approval_instance_id_key`(`approval_instance_id`),
    INDEX `achv_achievement_achievement_type_status_code_idx`(`achievement_type`, `status_code`),
    INDEX `achv_achievement_project_id_idx`(`project_id`),
    INDEX `achv_achievement_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `achv_paper` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `achievement_id` BIGINT UNSIGNED NOT NULL,
    `journal_name` VARCHAR(255) NULL,
    `publish_date` DATE NULL,
    `doi` VARCHAR(128) NULL,
    `indexed_by` VARCHAR(64) NULL,
    `author_order` VARCHAR(32) NULL,
    `corresponding_author` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `achv_paper_achievement_id_key`(`achievement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ip_asset` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `achievement_id` BIGINT UNSIGNED NOT NULL,
    `asset_type` VARCHAR(32) NOT NULL DEFAULT 'SOFTWARE_COPYRIGHT',
    `certificate_no` VARCHAR(128) NULL,
    `registration_no` VARCHAR(128) NULL,
    `authorized_date` DATE NULL,
    `owner_unit` VARCHAR(128) NULL,
    `remarks` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ip_asset_achievement_id_key`(`achievement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `achv_contributor` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `achievement_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `contributor_name` VARCHAR(128) NOT NULL,
    `contributor_role` VARCHAR(32) NOT NULL,
    `contribution_rank` INTEGER NOT NULL,
    `is_internal` BOOLEAN NOT NULL DEFAULT true,
    `contribution_description` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achv_contributor_achievement_id_contribution_rank_idx`(`achievement_id`, `contribution_rank`),
    INDEX `achv_contributor_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `comp_team` ADD CONSTRAINT `comp_team_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `comp_competition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `comp_team` ADD CONSTRAINT `comp_team_team_leader_user_id_fkey` FOREIGN KEY (`team_leader_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `comp_team` ADD CONSTRAINT `comp_team_advisor_user_id_fkey` FOREIGN KEY (`advisor_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `comp_team` ADD CONSTRAINT `comp_team_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `achv_achievement` ADD CONSTRAINT `achv_achievement_source_competition_id_fkey` FOREIGN KEY (`source_competition_id`) REFERENCES `comp_competition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `achv_achievement` ADD CONSTRAINT `achv_achievement_source_team_id_fkey` FOREIGN KEY (`source_team_id`) REFERENCES `comp_team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `achv_achievement` ADD CONSTRAINT `achv_achievement_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `achv_achievement` ADD CONSTRAINT `achv_achievement_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `achv_paper` ADD CONSTRAINT `achv_paper_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achv_achievement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ip_asset` ADD CONSTRAINT `ip_asset_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achv_achievement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `achv_contributor` ADD CONSTRAINT `achv_contributor_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achv_achievement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `achv_contributor` ADD CONSTRAINT `achv_contributor_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Migration: 20260407201000_member_p0
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

-- Migration: 20260407213000_device_repair_p0
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

-- Migration: 20260407230000_inventory_p0
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

-- Migration: 20260408000500_finance_p0
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

-- Migration: 20260408012000_evaluation_promotion_p0
CREATE TABLE `eval_scheme` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scheme_code` VARCHAR(64) NOT NULL,
  `scheme_name` VARCHAR(128) NOT NULL,
  `period_key` VARCHAR(32) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `rule_config` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eval_scheme_scheme_code_key`(`scheme_code`),
  INDEX `eval_scheme_status_code_start_date_end_date_idx`(`status_code`, `start_date`, `end_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `eval_score_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scheme_id` BIGINT UNSIGNED NOT NULL,
  `member_profile_id` BIGINT UNSIGNED NOT NULL,
  `evaluator_user_id` BIGINT UNSIGNED NULL,
  `achievement_count` INTEGER NOT NULL DEFAULT 0,
  `project_count` INTEGER NOT NULL DEFAULT 0,
  `reward_penalty_count` INTEGER NOT NULL DEFAULT 0,
  `auto_score` DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `manual_score` DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `total_score` DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `auto_score_detail` JSON NULL,
  `manual_score_detail` JSON NULL,
  `manual_comment` VARCHAR(500) NULL,
  `result_code` VARCHAR(32) NOT NULL,
  `latest_result` VARCHAR(500) NULL,
  `evaluated_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eval_score_record_scheme_id_member_profile_id_key`(`scheme_id`, `member_profile_id`),
  INDEX `eval_score_record_member_profile_id_updated_at_idx`(`member_profile_id`, `updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `gov_reward_penalty` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_profile_id` BIGINT UNSIGNED NOT NULL,
  `subject_user_id` BIGINT UNSIGNED NOT NULL,
  `event_type` VARCHAR(16) NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `level_code` VARCHAR(32) NULL,
  `score_impact` DECIMAL(8, 2) NOT NULL DEFAULT 0,
  `source_type` VARCHAR(32) NULL,
  `source_ref_id` VARCHAR(64) NULL,
  `description` VARCHAR(500) NULL,
  `occurred_at` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `gov_reward_penalty_member_profile_id_occurred_at_idx`(`member_profile_id`, `occurred_at`),
  INDEX `gov_reward_penalty_subject_user_id_occurred_at_idx`(`subject_user_id`, `occurred_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `prom_application` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_no` VARCHAR(64) NOT NULL,
  `member_profile_id` BIGINT UNSIGNED NOT NULL,
  `applicant_user_id` BIGINT UNSIGNED NOT NULL,
  `scheme_id` BIGINT UNSIGNED NULL,
  `target_position_code` VARCHAR(32) NOT NULL,
  `target_role_code` VARCHAR(32) NULL,
  `status_code` VARCHAR(32) NOT NULL DEFAULT 'IN_APPROVAL',
  `qualification_passed` BOOLEAN NOT NULL DEFAULT false,
  `qualification_snapshot` JSON NULL,
  `team_evaluation` VARCHAR(1000) NULL,
  `department_review` VARCHAR(1000) NULL,
  `public_notice_result` VARCHAR(500) NULL,
  `latest_result` VARCHAR(500) NULL,
  `approval_instance_id` BIGINT UNSIGNED NULL,
  `submitted_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `prom_application_application_no_key`(`application_no`),
  UNIQUE INDEX `prom_application_approval_instance_id_key`(`approval_instance_id`),
  INDEX `prom_application_member_profile_id_status_code_idx`(`member_profile_id`, `status_code`),
  INDEX `prom_application_applicant_user_id_status_code_idx`(`applicant_user_id`, `status_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `prom_appointment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` BIGINT UNSIGNED NOT NULL,
  `member_profile_id` BIGINT UNSIGNED NOT NULL,
  `applicant_user_id` BIGINT UNSIGNED NOT NULL,
  `target_position_code` VARCHAR(32) NOT NULL,
  `target_role_code` VARCHAR(32) NULL,
  `appointment_status` VARCHAR(32) NOT NULL DEFAULT 'NOTICE_PENDING',
  `public_notice_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `public_notice_start_date` DATE NULL,
  `public_notice_end_date` DATE NULL,
  `public_notice_result` VARCHAR(500) NULL,
  `appointed_at` DATETIME(3) NULL,
  `latest_result` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `prom_appointment_application_id_key`(`application_id`),
  INDEX `prom_appointment_member_profile_id_appointment_status_idx`(`member_profile_id`, `appointment_status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `eval_score_record`
  ADD CONSTRAINT `eval_score_record_scheme_id_fkey` FOREIGN KEY (`scheme_id`) REFERENCES `eval_scheme`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `eval_score_record_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `eval_score_record_evaluator_user_id_fkey` FOREIGN KEY (`evaluator_user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `gov_reward_penalty`
  ADD CONSTRAINT `gov_reward_penalty_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `gov_reward_penalty_subject_user_id_fkey` FOREIGN KEY (`subject_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `prom_application`
  ADD CONSTRAINT `prom_application_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `prom_application_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `prom_application_scheme_id_fkey` FOREIGN KEY (`scheme_id`) REFERENCES `eval_scheme`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `prom_application_approval_instance_id_fkey` FOREIGN KEY (`approval_instance_id`) REFERENCES `wf_approval_instance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `prom_appointment`
  ADD CONSTRAINT `prom_appointment_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `prom_application`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `prom_appointment_member_profile_id_fkey` FOREIGN KEY (`member_profile_id`) REFERENCES `member_profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `prom_appointment_applicant_user_id_fkey` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: 20260408030000_system_p1_closure
CREATE TABLE `sys_notification` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `category_code` VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
  `level_code` VARCHAR(16) NOT NULL DEFAULT 'INFO',
  `business_type` VARCHAR(64) NULL,
  `business_id` VARCHAR(64) NULL,
  `route_path` VARCHAR(255) NULL,
  `route_query` JSON NULL,
  `read_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` BIGINT UNSIGNED NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT false,
  INDEX `sys_notification_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
  INDEX `sys_notification_business_type_business_id_idx`(`business_type`, `business_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sys_dict_type` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dict_code` VARCHAR(64) NOT NULL,
  `dict_name` VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) NULL,
  `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `system_flag` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sys_dict_type_dict_code_key`(`dict_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sys_dict_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dict_type_id` BIGINT UNSIGNED NOT NULL,
  `item_code` VARCHAR(64) NOT NULL,
  `item_label` VARCHAR(128) NOT NULL,
  `item_value` VARCHAR(128) NOT NULL,
  `sort_no` INTEGER NOT NULL DEFAULT 0,
  `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `ext_data` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sys_dict_item_dict_type_id_item_code_key`(`dict_type_id`, `item_code`),
  UNIQUE INDEX `sys_dict_item_dict_type_id_item_value_key`(`dict_type_id`, `item_value`),
  INDEX `sys_dict_item_dict_type_id_sort_no_idx`(`dict_type_id`, `sort_no`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sys_config_item` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_category` VARCHAR(64) NOT NULL,
  `config_key` VARCHAR(64) NOT NULL,
  `config_name` VARCHAR(128) NOT NULL,
  `config_value` TEXT NOT NULL,
  `value_type` VARCHAR(32) NOT NULL DEFAULT 'TEXT',
  `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `remark` VARCHAR(500) NULL,
  `editable` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sys_config_item_config_key_key`(`config_key`),
  INDEX `sys_config_item_config_category_status_code_idx`(`config_category`, `status_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sys_notification`
  ADD CONSTRAINT `sys_notification_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `sys_dict_item`
  ADD CONSTRAINT `sys_dict_item_dict_type_id_fkey`
  FOREIGN KEY (`dict_type_id`) REFERENCES `sys_dict_type`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed data
-- Data: sys_user
INSERT INTO `sys_user` (`id`, `username`, `password_hash`, `display_name`, `mobile`, `email`, `force_password_change`, `password_changed_at`, `created_at`, `updated_at`) VALUES
  (1, 'teacher01', '$2b$10$uZ5BH.xc.P4.0lAA8bu4luhZ0ThjfTXZPOsVVWcygxnuwfDtkU5tW', '王老师', '13800000001', 'teacher01@lab.local', false, '2026-04-01 09:00:00.000', '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (3, 'minister01', '$2b$10$uZ5BH.xc.P4.0lAA8bu4luhZ0ThjfTXZPOsVVWcygxnuwfDtkU5tW', '周部长', '13800000003', 'minister01@lab.local', false, '2026-04-01 09:00:00.000', '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (4, 'hybrid01', '$2b$10$uZ5BH.xc.P4.0lAA8bu4luhZ0ThjfTXZPOsVVWcygxnuwfDtkU5tW', '钱组长', '13800000004', 'hybrid01@lab.local', false, '2026-04-01 09:00:00.000', '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (5, 'member01', '$2b$10$uZ5BH.xc.P4.0lAA8bu4luhZ0ThjfTXZPOsVVWcygxnuwfDtkU5tW', '张成员', '13800000005', 'member01@lab.local', false, '2026-04-01 09:00:00.000', '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (6, 'intern01', '$2b$10$uZ5BH.xc.P4.0lAA8bu4luhZ0ThjfTXZPOsVVWcygxnuwfDtkU5tW', '林实习', '13800000006', 'intern01@lab.local', true, NULL, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697');

-- Data: sys_role
INSERT INTO `sys_role` (`id`, `role_code`, `role_name`, `data_scope`, `sort_no`, `created_at`, `updated_at`) VALUES
  (1, 'TEACHER', '老师', 'ALL', 10, '2026-04-08 04:35:53.696', '2026-04-08 04:35:53.696'),
  (3, 'MINISTER', '部长', 'DEPT_PROJECT', 30, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (4, 'GROUP_LEADER', '组长', 'GROUP_PROJECT', 40, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (5, 'MEMBER', '正式成员', 'SELF_PARTICIPATE', 50, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (6, 'INTERN', '实习生', 'SELF_PARTICIPATE', 60, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697');

-- Data: org_unit
INSERT INTO `org_unit` (`id`, `parent_id`, `unit_code`, `unit_name`, `unit_type`, `leader_user_id`, `created_at`, `updated_at`) VALUES
  (1, NULL, 'LAB_ROOT', '智能制造实验室', 'LAB', 1, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (2, 1, 'DEV_DEPT', '研发部', 'DEPARTMENT', 3, '2026-04-08 04:35:53.697', '2026-04-08 04:35:53.697'),
  (3, 2, 'FE_GROUP', '前端组', 'GROUP', 4, '2026-04-08 04:35:53.698', '2026-04-08 04:35:53.698');

-- Data: sys_user_role
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`, `created_at`, `updated_at`) VALUES
  (1, 1, 1, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 3, 3, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (4, 4, 4, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (5, 5, 5, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (6, 6, 6, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: member_profile
INSERT INTO `member_profile` (`id`, `user_id`, `org_unit_id`, `position_code`, `mentor_user_id`, `join_date`, `member_status`, `skill_tags`, `created_at`, `updated_at`) VALUES
  (1, 3, 2, 'MINISTER', 1, '2026-03-01 00:00:00.000', 'ACTIVE', 'Management,Review', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 4, 3, 'GROUP_LEADER', 3, '2026-03-05 00:00:00.000', 'ACTIVE', 'Vue,Architecture', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 5, 3, 'MEMBER', 4, '2026-03-10 00:00:00.000', 'ACTIVE', 'Vue,NestJS,Prisma', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (4, 6, 3, 'INTERN', 4, '2026-03-18 00:00:00.000', 'INTERN', 'Vue,TypeScript', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: sys_dict_type
INSERT INTO `sys_dict_type` (`id`, `dict_code`, `dict_name`, `description`, `status_code`, `system_flag`, `created_at`, `updated_at`) VALUES
  (1, 'ACHIEVEMENT_LEVEL', '成果级别', '成果与竞赛等基础级别字典', 'ACTIVE', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 'ACHIEVEMENT_GRADE', '成果认定等级', '成果认定等级配置', 'ACTIVE', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 'APPROVAL_NODE_ROLE', '审批节点角色', '审批节点可配置角色', 'ACTIVE', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (4, 'NOTIFICATION_CATEGORY', '通知分类', '系统通知消息分类', 'ACTIVE', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: sys_dict_item
INSERT INTO `sys_dict_item` (`id`, `dict_type_id`, `item_code`, `item_label`, `item_value`, `sort_no`, `status_code`, `created_at`, `updated_at`) VALUES
  (1, 1, 'SCHOOL', '校级', 'SCHOOL', 10, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 1, 'PROVINCIAL', '省级', 'PROVINCIAL', 20, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 1, 'NATIONAL', '国家级', 'NATIONAL', 30, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (4, 2, 'A', 'A 等', 'A', 10, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (5, 2, 'B', 'B 等', 'B', 20, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (6, 2, 'C', 'C 等', 'C', 30, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (7, 3, 'GROUP_LEADER', '组长', 'GROUP_LEADER', 10, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (8, 3, 'MINISTER', '部长', 'MINISTER', 20, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (10, 4, 'APPROVAL', '审批消息', 'APPROVAL', 10, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (11, 4, 'QUALIFICATION', '资格提醒', 'QUALIFICATION', 20, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (12, 4, 'SYSTEM', '系统公告', 'SYSTEM', 30, 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: sys_config_item
INSERT INTO `sys_config_item` (`id`, `config_category`, `config_key`, `config_name`, `config_value`, `value_type`, `status_code`, `remark`, `editable`, `created_at`, `updated_at`) VALUES
  (1, 'APPROVAL', 'APPROVAL_SLA_HOURS', '审批超时阈值（小时）', '48', 'NUMBER', 'ACTIVE', '用于首页和消息提醒的超时提示阈值', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 'DASHBOARD', 'DASHBOARD_RECENT_LIMIT', '首页最近记录条数', '5', 'NUMBER', 'ACTIVE', '首页待办、消息、我的申请统一取前 5 条', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 'PROMOTION', 'PROMOTION_NOTICE_DAYS', '晋升公示默认天数', '5', 'NUMBER', 'ACTIVE', '用于晋升基础配置展示', true, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: wf_approval_template
INSERT INTO `wf_approval_template` (`id`, `template_code`, `template_name`, `business_type`, `status_code`, `created_at`, `updated_at`) VALUES
  (1, 'DEMO_REQUEST_FLOW', '测试审批流程', 'DEMO_REQUEST', 'ACTIVE', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 'MEMBER_REGULARIZATION_FLOW', '成员转正流程', 'MEMBER_REGULARIZATION', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (3, 'COMPETITION_REGISTRATION_FLOW', '赛事报名流程', 'COMPETITION_REGISTRATION', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (4, 'ACHIEVEMENT_RECOGNITION_FLOW', '成果认定流程', 'ACHIEVEMENT_RECOGNITION', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (5, 'DEVICE_REPAIR_FLOW', '设备报修审批流程', 'REPAIR_ORDER', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (6, 'CONSUMABLE_REQUEST_FLOW', '耗材申领审批流程', 'CONSUMABLE_REQUEST', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (7, 'FUND_REQUEST_FLOW', '经费申请审批流程', 'FUND_REQUEST', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (8, 'PROMOTION_REQUEST_FLOW', '晋升申请审批流程', 'PROMOTION_REQUEST', 'ACTIVE', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700');

-- Data: wf_approval_template_node
INSERT INTO `wf_approval_template_node` (`id`, `template_id`, `node_key`, `node_name`, `sort_no`, `approver_role_code`, `created_at`, `updated_at`) VALUES
  (1, 1, 'GROUP_LEADER_REVIEW', '组长审批', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 1, 'MINISTER_REVIEW', '部长审批', 2, 'MINISTER', '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (3, 2, 'GROUP_LEADER_REVIEW', '组长评价', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (4, 2, 'MINISTER_REVIEW', '部长审核', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (6, 3, 'GROUP_LEADER_REVIEW', '组长审批', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (7, 3, 'MINISTER_REVIEW', '部长审批', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (8, 4, 'GROUP_LEADER_REVIEW', '组长初审', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (9, 4, 'MINISTER_REVIEW', '部长认定', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (10, 5, 'GROUP_LEADER_REVIEW', '组长审批', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (11, 5, 'MINISTER_REVIEW', '部长审批', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (12, 6, 'GROUP_LEADER_REVIEW', '组长审批', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (13, 6, 'MINISTER_REVIEW', '部长审批', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (14, 7, 'GROUP_LEADER_REVIEW', '组长审批', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (15, 7, 'MINISTER_REVIEW', '部长审批', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (16, 8, 'GROUP_LEADER_REVIEW', '团队评价', 1, 'GROUP_LEADER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (17, 8, 'MINISTER_REVIEW', '部门审核', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (17, 8, 'MINISTER_REVIEW', '部门审核', 2, 'MINISTER', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700');

-- Data: comp_competition
INSERT INTO `comp_competition` (`id`, `competition_code`, `name`, `organizer`, `competition_level`, `competition_category`, `status_code`, `registration_start_date`, `registration_end_date`, `event_start_date`, `event_end_date`, `description`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'COMP-2026-SMW-HACK', '智能制造创新赛', '校创新中心', 'SCHOOL', '创新创业', 'OPEN', '2026-04-01 00:00:00.000', '2026-04-20 00:00:00.000', '2026-05-01 00:00:00.000', '2026-05-10 00:00:00.000', '面向实验室成员的校级创新赛', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 3);

-- Data: comp_team
INSERT INTO `comp_team` (`id`, `competition_id`, `team_name`, `team_leader_user_id`, `advisor_user_id`, `member_user_ids`, `member_names`, `project_id`, `project_name`, `application_reason`, `status_code`, `latest_result`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 1, '智造先锋队', 4, 1, ',4,5,6,', '钱组长、张成员、林实习', 'PRJ-COMP-001', '产线质量预警看板', '围绕产线预警与可视化建设参赛', 'APPROVED', '历史演示队伍', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 4);

-- Data: achv_achievement
INSERT INTO `achv_achievement` (`id`, `achievement_type`, `title`, `level_code`, `status_code`, `recognized_grade`, `score_mapping`, `project_id`, `project_name`, `source_competition_id`, `source_team_id`, `description`, `applicant_user_id`, `latest_result`, `recognized_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'PAPER', '基于视觉检测的产线缺陷识别方法', 'PROVINCIAL', 'RECOGNIZED', 'B', '{"configured":true,"ruleKey":"PAPER:PROVINCIAL","score":25,"message":"seed score mapping"}', 'PRJ-ACH-001', '缺陷检测算法研究', 1, 1, 'P0 种子数据：论文成果草稿', 5, '种子数据：已完成成果认定', '2026-03-20 09:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 5);

-- Data: achv_contributor
INSERT INTO `achv_contributor` (`id`, `achievement_id`, `user_id`, `contributor_name`, `contributor_role`, `contribution_rank`, `is_internal`, `created_at`) VALUES
  (1, 1, 5, '张成员', 'AUTHOR', 1, true, '2026-04-08 04:35:53.700'),
  (2, 1, 1, '王老师', 'ADVISOR', 2, true, '2026-04-08 04:35:53.700');

-- Data: achv_paper
INSERT INTO `achv_paper` (`id`, `achievement_id`, `journal_name`, `publish_date`, `indexed_by`, `author_order`, `created_at`, `updated_at`) VALUES
  (1, 1, '智能制造技术', '2026-03-15 00:00:00.000', 'CNKI', '1/2', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700');

-- Data: eval_scheme
INSERT INTO `eval_scheme` (`id`, `scheme_code`, `scheme_name`, `period_key`, `start_date`, `end_date`, `status_code`, `rule_config`, `created_at`, `updated_at`) VALUES
  (1, 'EVAL-2026-Q1', '2026 年一季度考核', '2026Q1', '2026-01-01 00:00:00.000', '2026-03-31 00:00:00.000', 'ACTIVE', '{"autoWeights":{"achievement":1,"project":1,"rewardPenalty":1},"qualification":{"MEMBER_TO_GROUP_LEADER":{"minimumTotalScore":85,"minimumAchievementCount":1,"minimumProjectCount":1}}}', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (2, 'EVAL-2026-Q2', '2026 年二季度考核', '2026Q2', '2026-04-01 00:00:00.000', '2026-06-30 00:00:00.000', 'ACTIVE', '{"autoWeights":{"achievement":1,"project":1,"rewardPenalty":1},"qualification":{"MEMBER_TO_GROUP_LEADER":{"minimumTotalScore":85,"minimumAchievementCount":1,"minimumProjectCount":1}}}', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700');

-- Data: gov_reward_penalty
INSERT INTO `gov_reward_penalty` (`id`, `member_profile_id`, `subject_user_id`, `event_type`, `title`, `level_code`, `score_impact`, `source_type`, `description`, `occurred_at`, `created_at`, `updated_at`) VALUES
  (1, 3, 5, 'REWARD', '校级优秀成员', 'SCHOOL', 8, 'MANUAL', '用于考核自动汇总分演示', '2026-03-25 00:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700'),
  (2, 4, 6, 'PENALTY', '流程规范扣分', 'GROUP', -3, 'MANUAL', '用于奖惩记录演示', '2026-03-28 00:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700');

-- Data: asset_device
INSERT INTO `asset_device` (`id`, `device_code`, `device_name`, `category_name`, `model`, `specification`, `manufacturer`, `serial_no`, `asset_tag`, `status_code`, `org_unit_id`, `responsible_user_id`, `location_label`, `purchase_date`, `warranty_until`, `purchase_amount`, `remarks`, `latest_repair_id`, `status_changed_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'DEV-CAM-001', '产线边缘相机', '视觉采集', 'SMW-CAM-A1', '5MP / GigE', 'Smart Vision', 'CAM-2026-001', 'AT-DEV-001', 'IDLE', 3, 5, 'A区产线工位 01', '2026-02-01 00:00:00.000', '2028-02-01 00:00:00.000', 12800, '用于缺陷检测演示线', NULL, '2026-04-01 09:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 1),
  (2, 'DEV-PLC-002', 'PLC 调试工位', '控制设备', 'SMW-PLC-X2', '48 I/O', 'Factory Core', 'PLC-2026-002', 'AT-DEV-002', 'REPAIRING', 3, 4, 'B区调试台', '2026-01-15 00:00:00.000', '2027-01-15 00:00:00.000', 18600, '保留一条进行中报修单用于首页聚合', 1, '2026-04-06 10:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 1);

-- Data: asset_device_repair
INSERT INTO `asset_device_repair` (`id`, `device_id`, `repair_no`, `applicant_user_id`, `applicant_role_code`, `handler_user_id`, `status_code`, `severity`, `fault_description`, `latest_result`, `requested_amount`, `cost_estimate`, `fund_link_code`, `device_status_before_repair`, `reported_at`, `approved_at`, `accepted_at`, `status_changed_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 2, 'RP-20260406-001', 5, 'MEMBER', 4, 'PROCESSING', 'HIGH', '工位上电后 IO 指示异常，无法进入联机调试状态', '审批通过，处理中', 800, 600, 'FUND-RESERVED-001', 'IDLE', '2026-04-06 10:00:00.000', '2026-04-06 12:00:00.000', '2026-04-06 13:00:00.000', '2026-04-06 13:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 5);

-- Data: fund_account
INSERT INTO `fund_account` (`id`, `account_code`, `account_name`, `status_code`, `category_name`, `project_id`, `project_name`, `owner_org_unit_id`, `manager_user_id`, `total_budget`, `reserved_amount`, `used_amount`, `paid_amount`, `remarks`, `last_expense_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'FUND-RESERVED-001', '智能产线调试经费', 'ACTIVE', '项目预算', 'PRJ-SMW-001', '智能制造产线调试项目', 3, 4, 50000, 1200, 5800, 5200, '设备维修、差旅与采购共用预算池', '2026-04-07 09:30:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 1),
  (2, 'FUND-TRAVEL-002', '项目外出差旅经费', 'ACTIVE', '差旅预算', 'PRJ-SMW-001', '智能制造产线调试项目', 2, 3, 18000, 0, 2600, 2600, '项目现场调试差旅预算', '2026-04-05 08:00:00.000', '2026-04-08 04:35:53.700', '2026-04-08 04:35:53.700', 1);

-- Data: fund_application
INSERT INTO `fund_application` (`id`, `application_no`, `account_id`, `applicant_user_id`, `applicant_role_code`, `application_type`, `expense_type`, `title`, `purpose`, `amount`, `payee_name`, `project_id`, `project_name`, `related_business_type`, `related_business_id`, `status_code`, `payment_status`, `latest_result`, `submitted_at`, `completed_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'FUND-20260407-001', 1, 5, 'MEMBER', 'EXPENSE', 'REPAIR', 'PLC 工位维修费用', '对应 RP-20260406-001 维修工单，申请更换 IO 模块维修费用', 1200, '设备维修供应商', 'PRJ-SMW-001', '智能制造产线调试项目', 'REPAIR_ORDER', '1', 'APPROVED', 'PENDING', '种子数据：审批通过，待支付', '2026-04-07 09:00:00.000', '2026-04-07 10:00:00.000', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 5);

-- Data: inv_consumable
INSERT INTO `inv_consumable` (`id`, `consumable_code`, `consumable_name`, `category_name`, `specification`, `unit_name`, `status_code`, `inventory_status`, `current_stock`, `warning_threshold`, `warning_flag`, `org_unit_id`, `default_location`, `replenishment_triggered_at`, `last_txn_at`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 'CS-SOLDER-001', '焊锡丝', '电子耗材', '0.8mm / 500g', '卷', 'ACTIVE', 'NORMAL', 18, 5, false, 3, '电子仓 A-01', NULL, '2026-04-06 09:00:00.000', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 1),
  (2, 'CS-GLOVE-002', '防静电手套', '防护耗材', 'L 码 / 12 双装', '盒', 'ACTIVE', 'LOW_STOCK', 1, 4, true, 3, '防护仓 B-03', '2026-04-07 08:30:00.000', '2026-04-07 09:10:00.000', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 1);

-- Data: inv_inventory_txn
INSERT INTO `inv_inventory_txn` (`id`, `consumable_id`, `request_id`, `txn_type`, `quantity`, `balance_after`, `project_id`, `project_name`, `operator_user_id`, `operator_role_code`, `remark`, `txn_at`, `created_at`) VALUES
  (1, 1, NULL, 'INBOUND', 20, 20, NULL, NULL, 1, 'TEACHER', 'P0 种子建账', '2026-04-05 10:00:00.000', '2026-04-08 04:35:53.701'),
  (2, 1, NULL, 'OUTBOUND', 2, 18, 'PRJ-INV-001', '焊接工位改造', 4, 'GROUP_LEADER', '样机调试领用', '2026-04-06 09:00:00.000', '2026-04-08 04:35:53.701'),
  (3, 2, NULL, 'INBOUND', 4, 4, NULL, NULL, 1, 'TEACHER', 'P0 种子建账', '2026-04-05 10:20:00.000', '2026-04-08 04:35:53.701'),
  (4, 2, NULL, 'OUTBOUND', 2, 2, 'PRJ-INV-002', '产线静电防护整改', 5, 'MEMBER', '现场防护领用', '2026-04-07 08:30:00.000', '2026-04-08 04:35:53.701'),
  (5, 2, 1, 'REQUEST_OUTBOUND', 1, 1, 'PRJ-INV-002', '产线静电防护整改', 4, 'GROUP_LEADER', '种子数据：申领审批自动出库', '2026-04-07 09:10:00.000', '2026-04-08 04:35:53.701');

-- Data: inv_consumable_request
INSERT INTO `inv_consumable_request` (`id`, `request_no`, `consumable_id`, `applicant_user_id`, `applicant_role_code`, `quantity`, `purpose`, `project_id`, `project_name`, `status_code`, `latest_result`, `outbound_txn_id`, `status_logs`, `requested_at`, `completed_at`, `created_at`, `updated_at`) VALUES
  (1, 'REQ-20260407-001', 2, 5, 'MEMBER', 1, '实验线巡检防护', 'PRJ-INV-002', '产线静电防护整改', 'FULFILLED', '种子数据：审批通过并已出库', 5, '[{"actionType":"REQUEST_CREATED","fromStatus":null,"toStatus":"DRAFT","operatorUserId":"5","operatorName":"张成员","comment":"实验线巡检防护","createdAt":"2026-04-07T09:00:00.000Z"},{"actionType":"APPROVAL_APPROVED","fromStatus":"IN_APPROVAL","toStatus":"FULFILLED","operatorUserId":"4","operatorName":"钱组长","comment":"种子数据自动出库","createdAt":"2026-04-07T09:10:00.000Z"}]', '2026-04-07 09:00:00.000', '2026-04-07 09:10:00.000', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701');

-- Data: member_growth_record
INSERT INTO `member_growth_record` (`id`, `member_profile_id`, `record_type`, `title`, `content`, `record_date`, `actor_user_id`, `created_at`, `updated_at`) VALUES
  (1, 4, 'MENTOR_BOUND', '带教绑定', '绑定钱组长为带教人', '2026-03-18 00:00:00.000', 4, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699'),
  (2, 4, 'STAGE_EVALUATED', '阶段评价：FIRST_MONTH', '完成前端组上手任务，代码规范良好。', '2026-04-01 00:00:00.000', 4, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: member_stage_evaluation
INSERT INTO `member_stage_evaluation` (`id`, `member_profile_id`, `stage_code`, `summary`, `score`, `result_code`, `next_action`, `evaluated_at`, `evaluator_user_id`, `created_at`, `updated_at`) VALUES
  (1, 4, 'FIRST_MONTH', '已独立完成成员档案页面拆分，具备转正申请条件。', 92, 'PASS', '提交转正申请并进入审批流程', '2026-04-02 09:00:00.000', 4, '2026-04-08 04:35:53.699', '2026-04-08 04:35:53.699');

-- Data: sys_notification
INSERT INTO `sys_notification` (`id`, `user_id`, `title`, `content`, `category_code`, `level_code`, `business_type`, `business_id`, `route_path`, `route_query`, `created_at`, `updated_at`, `created_by`) VALUES
  (1, 5, '成果认定完成', '“基于视觉检测的产线缺陷识别方法” 已完成认定，请前往成果列表查看。', 'SYSTEM', 'INFO', 'ACHIEVEMENT_RECOGNITION', '1', '/achievements', '{"focus":"1"}', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 3),
  (2, 5, '晋升资格提醒', '当前季度考核结果已满足成员晋升申请基础条件，可前往资格看板查看。', 'QUALIFICATION', 'WARNING', 'PROMOTION_REQUEST', '3', '/promotion/eligibility', '{"focus":"3"}', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 4),
  (3, 4, '库存预警提示', '防静电手套库存已低于阈值，请尽快处理补货或申领控制。', 'SYSTEM', 'WARNING', 'CONSUMABLE_REQUEST', '2', '/inventory/ledger', '{"focus":"2"}', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 1),
  (4, 3, '经费申请待跟进', 'PLC 工位维修费用已审批通过，当前待支付，请在经费申请页跟进。', 'APPROVAL', 'INFO', 'FUND_REQUEST', 'FUND-20260407-001', '/funds/applications', '{"focus":"FUND-20260407-001"}', '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 5),
  (5, 6, '个人中心已开放', '请完善个人资料并修改初始密码，后续可从个人中心查看我的申请与消息。', 'SYSTEM', 'INFO', NULL, NULL, '/profile', NULL, '2026-04-08 04:35:53.701', '2026-04-08 04:35:53.701', 1);

SET FOREIGN_KEY_CHECKS = 1;

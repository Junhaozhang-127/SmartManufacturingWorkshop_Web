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

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

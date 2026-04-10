-- Creation center content: draft/submit/review/knowledge-base/home-distribution
CREATE TABLE `creation_content` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(1000) NULL,
    `body` LONGTEXT NULL,
    `cover_storage_key` VARCHAR(128) NULL,
    `cover_file_name` VARCHAR(128) NULL,
    `author_user_id` BIGINT UNSIGNED NOT NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `submitted_at` DATETIME(3) NULL,
    `reviewer_user_id` BIGINT UNSIGNED NULL,
    `review_comment` VARCHAR(1000) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `in_knowledge_base` BOOLEAN NOT NULL DEFAULT false,
    `recommend_to_home` BOOLEAN NOT NULL DEFAULT false,
    `home_section` VARCHAR(32) NULL,
    `portal_content_id` BIGINT UNSIGNED NULL,
    `portal_carousel_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `creation_content_author_user_id_created_at_idx`(`author_user_id`, `created_at`),
    INDEX `creation_content_status_code_submitted_at_idx`(`status_code`, `submitted_at`),
    INDEX `creation_content_in_kb_status_code_reviewed_at_idx`(`in_knowledge_base`, `status_code`, `reviewed_at`),
    INDEX `creation_content_recommend_to_home_home_section_idx`(`recommend_to_home`, `home_section`),
    INDEX `creation_content_portal_content_id_idx`(`portal_content_id`),
    INDEX `creation_content_portal_carousel_id_idx`(`portal_carousel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Portal home content: carousel + unified content (news/notice/showcase/member intro)
CREATE TABLE `portal_carousel_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(1000) NULL,
    `image_storage_key` VARCHAR(128) NULL,
    `image_file_name` VARCHAR(128) NULL,
    `target_url` VARCHAR(500) NULL,
    `theme_code` VARCHAR(20) NOT NULL DEFAULT 'blue',
    `sort_no` INTEGER NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `portal_carousel_item_status_code_sort_no_idx`(`status_code`, `sort_no`),
    INDEX `portal_carousel_item_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `portal_content` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `content_type` VARCHAR(32) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(1000) NULL,
    `body` LONGTEXT NULL,
    `cover_storage_key` VARCHAR(128) NULL,
    `cover_file_name` VARCHAR(128) NULL,
    `link_url` VARCHAR(500) NULL,
    `sort_no` INTEGER NULL,
    `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `portal_content_content_type_status_code_published_at_idx`(`content_type`, `status_code`, `published_at`),
    INDEX `portal_content_created_by_created_at_idx`(`created_by`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


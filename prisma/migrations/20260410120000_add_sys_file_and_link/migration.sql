-- CreateTable
CREATE TABLE `sys_file` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `original_name` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `file_ext` VARCHAR(32) NOT NULL,
  `mime_type` VARCHAR(128) NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `file_category` VARCHAR(32) NOT NULL,
  `uploaded_by` BIGINT UNSIGNED NOT NULL,
  `is_temporary` BOOLEAN NOT NULL DEFAULT true,
  `expires_at` DATETIME(3) NULL,
  `bound_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `sys_file_uploaded_by_created_at_idx` (`uploaded_by`, `created_at`),
  INDEX `sys_file_is_temporary_expires_at_idx` (`is_temporary`, `expires_at`),
  INDEX `sys_file_storage_key_idx` (`storage_key`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sys_file_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `sys_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_file_link` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_type` VARCHAR(64) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL,
  `usage_type` VARCHAR(64) NOT NULL,
  `file_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `sys_file_link_business_type_business_id_usage_type_idx` (`business_type`, `business_id`, `usage_type`),
  INDEX `sys_file_link_file_id_idx` (`file_id`),
  UNIQUE INDEX `sys_file_link_business_type_business_id_usage_type_file_id_key` (`business_type`, `business_id`, `usage_type`, `file_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sys_file_link_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `sys_file`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

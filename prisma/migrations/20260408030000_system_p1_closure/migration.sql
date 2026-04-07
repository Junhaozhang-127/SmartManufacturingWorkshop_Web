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

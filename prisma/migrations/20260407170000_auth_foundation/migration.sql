ALTER TABLE `sys_user`
    ADD COLUMN `force_password_change` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `password_changed_at` DATETIME(3) NULL;

-- Add profile editable fields (student no + avatar)
ALTER TABLE `sys_user`
  ADD COLUMN `student_no` VARCHAR(32) NULL AFTER `display_name`,
  ADD COLUMN `avatar_storage_key` VARCHAR(128) NULL AFTER `email`,
  ADD COLUMN `avatar_file_name` VARCHAR(128) NULL AFTER `avatar_storage_key`;

-- Add user bio for personal center.
ALTER TABLE `sys_user`
  ADD COLUMN `bio` varchar(500) NULL AFTER `email`;


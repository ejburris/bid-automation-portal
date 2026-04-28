ALTER TABLE `bids`
  ADD `sentAt` timestamp NULL,
  ADD `followUpAt` timestamp NULL;

ALTER TABLE `bids`
  MODIFY `status` enum('draft','submitted','approved','sent','follow_up','awarded','lost','withdrawn') NOT NULL DEFAULT 'draft';

UPDATE `bids`
SET
  `sentAt` = COALESCE(`sentAt`, `submittedAt`),
  `followUpAt` = COALESCE(`followUpAt`, `followUpDueAt`),
  `status` = CASE
    WHEN `status` = 'submitted' THEN 'sent'
    WHEN `status` = 'approved' THEN 'sent'
    WHEN `status` = 'withdrawn' THEN 'lost'
    ELSE `status`
  END;

ALTER TABLE `bids`
  MODIFY `status` enum('draft','sent','follow_up','awarded','lost') NOT NULL DEFAULT 'draft';

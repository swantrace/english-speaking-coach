ALTER TABLE `scenarios` ADD `image_asset_id` text REFERENCES media_assets(id);--> statement-breakpoint
CREATE INDEX `scenarios_image_asset_id_idx` ON `scenarios` (`image_asset_id`);
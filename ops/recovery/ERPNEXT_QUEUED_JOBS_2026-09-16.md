# ERPNext — all 56 queued functions

Operator confirmed no customer/client data. These are scheduled functions, not 56 customer transactions. Counts reflect the recorded September 16 queue inspection; no jobs have been run or deleted. Shared dispatcher wrappers are excluded from this list.

Recommendation: retain the backlog until schedules and integrations are configured. The absence of client data reduces business impact, but does not prove there are no internal records, email recipients, API integrations or cleanup targets. Review the email, financial, deletion and external-sync groups before enabling workers.

## Accounting / recurring transactions / stock (11)

- **post depreciation entries** — `erpnext.assets.doctype.asset.depreciation.post_depreciation_entries`
- **make auto repeat entry** — `frappe.automation.doctype.auto_repeat.auto_repeat.make_auto_repeat_entry`
- **auto create fiscal year** — `erpnext.accounts.doctype.fiscal_year.fiscal_year.auto_create_fiscal_year`
- **auto create exchange rate revaluation daily** — `erpnext.accounts.utils.auto_create_exchange_rate_revaluation_daily`
- **run ledger health checks** — `erpnext.accounts.utils.run_ledger_health_checks`
- **make post gl entry** — `erpnext.assets.doctype.asset.asset.make_post_gl_entry`
- **repost entries** — `erpnext.stock.doctype.repost_item_valuation.repost_item_valuation.repost_entries`
- **reorder item** — `erpnext.stock.reorder_item.reorder_item`
- **create subscription process** — `erpnext.accounts.doctype.process_subscription.process_subscription.create_subscription_process`
- **process deferred accounting** — `erpnext.accounts.deferred_revenue.process_deferred_accounting`
- **auto create exchange rate revaluation monthly** — `erpnext.accounts.utils.auto_create_exchange_rate_revaluation_monthly`

## Cleanup / deletion / session maintenance (9)

- **process data deletion request** — `frappe.website.doctype.personal_data_deletion_request.personal_data_deletion_request.process_data_deletion_request`
- **clear notifications** — `frappe.desk.notifications.clear_notifications`
- **run log clean up** — `frappe.core.doctype.log_settings.log_settings.run_log_clean_up`
- **delete all barcodes for users** — `frappe.twofactor.delete_all_barcodes_for_users`
- **remove unverified record** — `frappe.website.doctype.personal_data_deletion_request.personal_data_deletion_request.remove_unverified_record`
- **delete oauth2 data** — `frappe.oauth.delete_oauth2_data`
- **delete old exported report files** — `frappe.desk.utils.delete_old_exported_report_files`
- **clear expired sessions** — `frappe.sessions.clear_expired_sessions`
- **delete downloadable backups** — `frappe.desk.page.backups.backups.delete_downloadable_backups`

## Email / notifications / project requests (10)

- **send auto email** — `erpnext.accounts.doctype.process_statement_of_accounts.process_statement_of_accounts.send_auto_email`
- **set email campaign status** — `erpnext.crm.doctype.email_campaign.email_campaign.set_email_campaign_status`
- **collect project status** — `erpnext.projects.doctype.project.project.collect_project_status`
- **send daily** — `frappe.email.doctype.auto_email_report.auto_email_report.send_daily`
- **send project status email to users** — `erpnext.projects.doctype.project.project.send_project_status_email_to_users`
- **project status update reminder** — `erpnext.projects.doctype.project.project.project_status_update_reminder`
- **send** — `erpnext.setup.doctype.email_digest.email_digest.send`
- **send email to leads or contacts** — `erpnext.crm.doctype.email_campaign.email_campaign.send_email_to_leads_or_contacts`
- **send hourly updates** — `frappe.desk.form.document_follow.send_hourly_updates`
- **send weekly updates** — `frappe.desk.form.document_follow.send_weekly_updates`

## Internal status / maintenance (22)

- **auto close tickets** — `erpnext.support.doctype.issue.issue.auto_close_tickets`
- **update status for contracts** — `erpnext.crm.doctype.contract.contract.update_status_for_contracts`
- **update invoice status** — `erpnext.controllers.accounts_controller.update_invoice_status`
- **sync user settings** — `frappe.model.utils.user_settings.sync_user_settings`
- **update asset maintenance log status** — `erpnext.assets.doctype.asset_maintenance_log.asset_maintenance_log.update_asset_maintenance_log_status`
- **auto update latest price in all boms** — `erpnext.manufacturing.doctype.bom_update_tool.bom_update_tool.auto_update_latest_price_in_all_boms`
- **set expired status** — `erpnext.buying.doctype.supplier_quotation.supplier_quotation.set_expired_status`
- **check agreement status** — `erpnext.support.doctype.service_level_agreement.service_level_agreement.check_agreement_status`
- **mark expired invitations** — `frappe.core.doctype.user_invitation.user_invitation.mark_expired_invitations`
- **expire stalled report** — `frappe.core.doctype.prepared_report.prepared_report.expire_stalled_report`
- **set expired status** — `erpnext.selling.doctype.quotation.quotation.set_expired_status`
- **open leads opportunities based on todays event** — `erpnext.crm.utils.open_leads_opportunities_based_on_todays_event`
- **update maintenance status** — `erpnext.stock.doctype.serial_no.serial_no.update_maintenance_status`
- **cache companies monthly sales history** — `erpnext.setup.doctype.company.company.cache_companies_monthly_sales_history`
- **auto close opportunity** — `erpnext.crm.doctype.opportunity.opportunity.auto_close_opportunity`
- **review** — `erpnext.quality_management.doctype.quality_review.quality_review.review`
- **set tasks as overdue** — `erpnext.projects.doctype.task.task.set_tasks_as_overdue`
- **retry** — `erpnext.utilities.bulk_transaction.retry`
- **update project sales billing** — `erpnext.projects.doctype.project.project.update_project_sales_billing`
- **check publish status** — `frappe.website.doctype.web_page.web_page.check_publish_status`
- **update maintenance status** — `erpnext.assets.doctype.asset.asset.update_maintenance_status`
- **refresh scorecards** — `erpnext.buying.doctype.supplier_scorecard.supplier_scorecard.refresh_scorecards`

## External synchronization / update checks (4)

- **automatic synchronization** — `erpnext.erpnext_integrations.doctype.plaid_settings.plaid_settings.automatic_synchronization`
- **update youtube data** — `erpnext.utilities.doctype.video.video.update_youtube_data`
- **fetch changelog feed** — `frappe.desk.doctype.changelog_feed.changelog_feed.fetch_changelog_feed`
- **check for update** — `frappe.utils.change_log.check_for_update`

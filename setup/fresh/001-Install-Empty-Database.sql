-- Oon Jai Accounting: complete clean backend, release 143.22.
-- Run this whole file once on a NEW Supabase project. No historic repair files are needed.
-- Refuses an existing application database. Contains no users or bookkeeping records.
BEGIN;
DO $fresh$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','v','m')) THEN
  RAISE EXCEPTION 'Fresh installation requires empty public/private application schemas. Use a new project; no records were changed.';
 END IF;
 IF to_regclass('auth.users') IS NULL OR to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
  RAISE EXCEPTION 'Run this installer in a Supabase project with Auth and Storage available.';
 END IF;
END $fresh$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
DO $crypto$ BEGIN
 IF (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto') IS DISTINCT FROM 'extensions' THEN
  ALTER EXTENSION pgcrypto SET SCHEMA extensions;
 END IF;
END $crypto$;
CREATE SCHEMA IF NOT EXISTS private;
SET LOCAL search_path=public,extensions;
SET LOCAL check_function_bodies=off;




-- TYPES
CREATE TYPE "public"."app_role" AS ENUM ('admin','submitter','reviewer');

CREATE TYPE "public"."journal_status" AS ENUM ('draft','posted','voided');

CREATE TYPE "public"."record_status" AS ENUM ('active','inactive');

CREATE TYPE "public"."submission_status" AS ENUM ('pending','approved','rejected');

CREATE SEQUENCE "public"."fund_adjustment_request_seq" AS bigint INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1;

CREATE SEQUENCE "public"."journal_entry_number_seq" AS bigint INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1;

CREATE SEQUENCE "public"."scheduled_journal_number_seq" AS bigint INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1;


-- TABLES
CREATE TABLE "private"."password_reset14257"(
 "user_id" uuid NOT NULL,
 "request_id" uuid NOT NULL,
 "temporary_hash" text,
 "required" boolean NOT NULL,
 "issued_by" uuid NOT NULL,
 "issued_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."account_provisioning14320"(
 "email" text NOT NULL,
 "actor_id" uuid NOT NULL,
 "full_name" text NOT NULL,
 "request_id" uuid NOT NULL,
 "user_id" uuid,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."accounting_feature_samples"(
 "sample_key" text NOT NULL,
 "data" jsonb NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."accounting_id_settings"(
 "id" boolean NOT NULL,
 "journal_prefix" text NOT NULL,
 "journal_digits" integer NOT NULL,
 "sub_user_digits" integer NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamp with time zone NOT NULL,
 "sub_user_prefix" text NOT NULL,
 "automated_prefix" text NOT NULL,
 "schedule_prefix" text NOT NULL,
 "adjustment_prefix" text NOT NULL
);

CREATE TABLE "public"."accounting_operations136"(
 "backend" integer NOT NULL,
 "transaction_id" bigint NOT NULL,
 "actor" uuid NOT NULL
);

CREATE TABLE "public"."accounting_periods"(
 "id" uuid NOT NULL,
 "period_month" date NOT NULL,
 "status" text NOT NULL,
 "review_started_at" timestamp with time zone,
 "closed_at" timestamp with time zone,
 "locked_at" timestamp with time zone,
 "updated_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."accounts"(
 "id" uuid NOT NULL,
 "code" text NOT NULL,
 "name" text NOT NULL,
 "account_type" text NOT NULL,
 "currency_code" text NOT NULL,
 "description" text,
 "is_active" boolean NOT NULL,
 "created_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "account_purpose" text NOT NULL,
 "parent_code" text,
 "is_posting" boolean NOT NULL,
 "is_technical" boolean NOT NULL,
 "currency_label" text
);

CREATE TABLE "public"."approved_reports1443"(
 "journal_id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "approved_by" uuid NOT NULL,
 "approved_at" timestamp with time zone NOT NULL,
 "snapshot" jsonb NOT NULL
);

CREATE TABLE "public"."audit_log"(
 "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
 "table_name" text NOT NULL,
 "record_id" text NOT NULL,
 "action" text NOT NULL,
 "old_data" jsonb,
 "new_data" jsonb,
 "reason" text,
 "actor_id" uuid,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."audit_reviews136"(
 "id" uuid NOT NULL,
 "period_id" uuid NOT NULL,
 "entry_id" uuid,
 "description" text NOT NULL,
 "actor" uuid NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "status" text NOT NULL,
 "adjustment_id" uuid
);

CREATE TABLE "public"."backup_audit113"(
 "id" uuid NOT NULL,
 "actor" uuid,
 "created_at" timestamp with time zone,
 "kind" text,
 "detail" jsonb
);

CREATE TABLE "public"."backup_registry113"(
 "table_name" text NOT NULL,
 "pk_columns" text[] NOT NULL,
 "date_path" text[]
);

CREATE TABLE "public"."book_sessions136"(
 "id" uuid NOT NULL,
 "period_id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "reason" text NOT NULL,
 "original" jsonb NOT NULL,
 "operations" jsonb NOT NULL,
 "status" text NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "finished_at" timestamp with time zone
);

CREATE TABLE "public"."budget_settings14313"(
 "id" boolean NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."budget_templates14313"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."business_settings"(
 "id" boolean NOT NULL,
 "legal_name" text,
 "display_name" text,
 "enterprise_no" text,
 "tax_id" text,
 "business_license" text,
 "industry" text,
 "phone" text,
 "email" text,
 "website" text,
 "address_line" text,
 "city" text,
 "postal_code" text,
 "country" text NOT NULL,
 "timezone" text NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."cashier_currency_counts"(
 "id" uuid NOT NULL,
 "shift_close_id" uuid NOT NULL,
 "currency_code" text NOT NULL,
 "actual_amount" numeric(20,4) NOT NULL,
 "exchange_rate_to_reporting" numeric(20,6) NOT NULL,
 "reporting_equivalent" numeric(20,2) GENERATED ALWAYS AS (round((actual_amount * exchange_rate_to_reporting), 2)) STORED,
 "deposit_account_id" uuid,
 "sort_order" integer NOT NULL
);

CREATE TABLE "public"."cashier_shift_closes"(
 "id" uuid NOT NULL,
 "staff_journal_id" uuid NOT NULL,
 "shift_started_at" timestamp with time zone,
 "shift_ended_at" timestamp with time zone,
 "pos_reporting_currency" text NOT NULL,
 "pos_total" numeric(20,2) NOT NULL,
 "cash_expenses_total" numeric(20,2) NOT NULL,
 "actual_count_equivalent" numeric(20,2) NOT NULL,
 "variance" numeric(20,2) NOT NULL,
 "notes" text NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."cashier_shift_tenders"(
 "id" uuid NOT NULL,
 "shift_close_id" uuid NOT NULL,
 "label" text NOT NULL,
 "pos_amount" numeric(20,2) NOT NULL,
 "sort_order" integer NOT NULL
);

CREATE TABLE "public"."catalog_installations106"(
 "name" text NOT NULL,
 "installed_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."company_documents105"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."currencies"(
 "code" text NOT NULL,
 "name" text NOT NULL,
 "symbol" text NOT NULL,
 "is_base" boolean NOT NULL,
 "is_active" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."data_tools_state14232"(
 "id" integer NOT NULL,
 "instance" uuid NOT NULL
);

CREATE TABLE "public"."document_download_passwords14312"(
 "owner_id" uuid NOT NULL,
 "id" uuid NOT NULL,
 "filename" text NOT NULL,
 "format" text NOT NULL,
 "password" text NOT NULL,
 "prepared_at" timestamp with time zone NOT NULL,
 "saved_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."employees"(
 "id" uuid NOT NULL,
 "employee_no" text,
 "full_name" text NOT NULL,
 "employment_status" text NOT NULL,
 "base_salary" numeric(20,2) NOT NULL,
 "salary_currency" text,
 "hire_date" date,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."entry_prefix_reservations"(
 "stem" text NOT NULL,
 "owner_key" text NOT NULL,
 "reserved_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."entry_submissions"(
 "id" uuid NOT NULL,
 "submission_no" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
 "transaction_date" date NOT NULL,
 "memo" text NOT NULL,
 "reference" text,
 "debit_account_id" uuid NOT NULL,
 "credit_account_id" uuid NOT NULL,
 "currency_code" text NOT NULL,
 "amount" numeric(20,2) NOT NULL,
 "receipt_path" text,
 "status" submission_status NOT NULL,
 "submitted_by" uuid NOT NULL,
 "submitted_at" timestamp with time zone NOT NULL,
 "reviewed_by" uuid,
 "reviewed_at" timestamp with time zone,
 "rejection_reason" text,
 "journal_entry_id" uuid
);

CREATE TABLE "public"."fund_adjustment_lines"(
 "id" uuid NOT NULL,
 "request_id" uuid NOT NULL,
 "activity_key" text NOT NULL,
 "original_value" numeric(20,2) NOT NULL,
 "requested_value" numeric(20,2) NOT NULL,
 "difference" numeric(20,2) NOT NULL,
 "current_before" numeric(20,2),
 "difference_applied" numeric(20,2),
 "current_after" numeric(20,2)
);

CREATE TABLE "public"."fund_adjustment_requests"(
 "id" uuid NOT NULL,
 "request_no" text NOT NULL,
 "owner_id" uuid NOT NULL,
 "fund_account_id" uuid NOT NULL,
 "status" text NOT NULL,
 "explanation" text NOT NULL,
 "report_reference" text NOT NULL,
 "submitted_by" uuid NOT NULL,
 "submitted_at" timestamp with time zone NOT NULL,
 "reviewed_by" uuid,
 "reviewed_at" timestamp with time zone,
 "return_note" text,
 "applied_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."handover_history14320"(
 "request_key" uuid NOT NULL,
 "actor_id" uuid NOT NULL,
 "payload" jsonb NOT NULL,
 "result" jsonb NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."hr_calendar_events14306"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."hr_calendar_history14306"(
 "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
 "record_table" text NOT NULL,
 "record_id" text NOT NULL,
 "before_data" jsonb,
 "after_data" jsonb,
 "changed_at" timestamp with time zone NOT NULL,
 "changed_by" uuid
);

CREATE TABLE "public"."hr_calendar_settings14306"(
 "id" boolean NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."installation14320"(
 "id" boolean NOT NULL,
 "instance" uuid NOT NULL,
 "initialized" boolean NOT NULL,
 "version" integer NOT NULL,
 "deployment" jsonb NOT NULL,
 "incoming_admin" uuid,
 "checks" jsonb NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."inventory_items"(
 "id" uuid NOT NULL,
 "sku" text,
 "name" text NOT NULL,
 "unit" text NOT NULL,
 "currency_code" text,
 "unit_cost" numeric(20,4) NOT NULL,
 "quantity_on_hand" numeric(20,4) NOT NULL,
 "reorder_level" numeric(20,4) NOT NULL,
 "is_active" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."inventory_items104"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."inventory_movements"(
 "id" uuid NOT NULL,
 "item_id" uuid NOT NULL,
 "movement_type" text NOT NULL,
 "quantity" numeric(20,4) NOT NULL,
 "unit_cost" numeric(20,4),
 "reference" text,
 "movement_date" date NOT NULL,
 "created_by" uuid,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."inventory_movements104"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "created_by" uuid
);

CREATE TABLE "public"."journal_entries"(
 "id" uuid NOT NULL,
 "entry_no" text NOT NULL,
 "transaction_date" date NOT NULL,
 "memo" text,
 "reference" text,
 "status" journal_status NOT NULL,
 "source" text NOT NULL,
 "submitted_by" uuid,
 "posted_by" uuid,
 "posted_at" timestamp with time zone,
 "void_reason" text,
 "voided_by" uuid,
 "voided_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "accounting_period_id" uuid,
 "adjustment_for_entry_id" uuid,
 "period_finding_id" uuid,
 "correction_status" text NOT NULL,
 "corrected_by_entry_id" uuid,
 "review_note" text NOT NULL
);

CREATE TABLE "public"."journal_lines"(
 "id" uuid NOT NULL,
 "journal_entry_id" uuid NOT NULL,
 "line_no" integer NOT NULL,
 "account_id" uuid NOT NULL,
 "sub_account_id" uuid,
 "description" text,
 "currency_code" text NOT NULL,
 "debit" numeric(20,2) NOT NULL,
 "credit" numeric(20,2) NOT NULL,
 "line_date" date,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."journal_sources14253"(
 "journal_line_id" uuid NOT NULL,
 "source_line_id" uuid NOT NULL,
 "report_id" uuid NOT NULL,
 "source_entry_no" text,
 "submitter_id" uuid NOT NULL,
 "submitter_name" text NOT NULL,
 "source_date" date NOT NULL,
 "source_memo" text,
 "source_reference" text,
 "source_amount" numeric NOT NULL
);

CREATE TABLE "public"."legal_documents"(
 "id" uuid NOT NULL,
 "file_name" text NOT NULL,
 "storage_path" text NOT NULL,
 "mime_type" text,
 "size_bytes" bigint,
 "document_type" text,
 "expiry_date" date,
 "uploaded_by" uuid NOT NULL,
 "uploaded_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."menu_categories104"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."menu_ingredients105"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."menu_item_ingredients"(
 "menu_item_id" uuid NOT NULL,
 "inventory_item_id" uuid NOT NULL,
 "quantity" numeric(20,4) NOT NULL
);

CREATE TABLE "public"."menu_items"(
 "id" uuid NOT NULL,
 "name" text NOT NULL,
 "category" text,
 "selling_price" numeric(20,2) NOT NULL,
 "currency_code" text,
 "is_available" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."menu_items104"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."menu_sales108"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "created_by" uuid,
 "updated_by" uuid
);

CREATE TABLE "public"."opening_state14234"(
 "id" boolean NOT NULL,
 "generation" uuid NOT NULL,
 "closed" boolean NOT NULL,
 "request_key" text,
 "payload" jsonb,
 "result" jsonb
);

CREATE TABLE "public"."operation_receipts14228"(
 "actor_id" uuid NOT NULL,
 "request_key" text NOT NULL,
 "operation" text NOT NULL,
 "payload" jsonb NOT NULL,
 "result" jsonb NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."operational_reports"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid NOT NULL,
 "budget_request_id14316" uuid
);

CREATE TABLE "public"."payroll_employees"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid NOT NULL
);

CREATE TABLE "public"."payroll_leave_records"(
 "id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid NOT NULL
);

CREATE TABLE "public"."payroll_lines"(
 "id" uuid NOT NULL,
 "payroll_run_id" uuid NOT NULL,
 "employee_id" uuid NOT NULL,
 "gross_pay" numeric(20,2) NOT NULL,
 "employee_sso" numeric(20,2) NOT NULL,
 "employer_sso" numeric(20,2) NOT NULL,
 "pit" numeric(20,2) NOT NULL,
 "other_deductions" numeric(20,2) NOT NULL,
 "net_pay" numeric(20,2) NOT NULL
);

CREATE TABLE "public"."payroll_runs"(
 "id" uuid NOT NULL,
 "period_start" date NOT NULL,
 "period_end" date NOT NULL,
 "status" text NOT NULL,
 "created_by" uuid,
 "approved_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "data" jsonb,
 "version" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "updated_by" uuid
);

CREATE TABLE "public"."period_findings"(
 "id" uuid NOT NULL,
 "finding_no" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
 "accounting_period_id" uuid NOT NULL,
 "journal_entry_id" uuid,
 "finding_type" text NOT NULL,
 "description" text NOT NULL,
 "status" text NOT NULL,
 "adjustment_entry_id" uuid,
 "resolution_note" text,
 "reported_by" uuid NOT NULL,
 "resolved_by" uuid,
 "reported_at" timestamp with time zone NOT NULL,
 "resolved_at" timestamp with time zone,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."pos_cash118"(
 "id" uuid NOT NULL,
 "shift_id" uuid NOT NULL,
 "amount" numeric NOT NULL,
 "reason" text NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "created_by" uuid NOT NULL
);

CREATE TABLE "public"."pos_config118"(
 "id" boolean NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL
);

CREATE TABLE "public"."pos_orders118"(
 "id" uuid NOT NULL,
 "number" bigint NOT NULL,
 "status" text NOT NULL,
 "data" jsonb NOT NULL,
 "version" integer NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "created_by" uuid NOT NULL,
 "paid_at" timestamp with time zone,
 "refunded_at" timestamp with time zone
);

CREATE TABLE "public"."pos_shifts118"(
 "id" uuid NOT NULL,
 "cashier" uuid NOT NULL,
 "opened_at" timestamp with time zone NOT NULL,
 "closed_at" timestamp with time zone,
 "opening" numeric NOT NULL,
 "counted" numeric,
 "expected" numeric
);

CREATE TABLE "public"."pos_stock118"(
 "id" uuid NOT NULL,
 "order_id" uuid NOT NULL,
 "item_id" uuid NOT NULL,
 "quantity" numeric NOT NULL,
 "kind" text NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "created_by" uuid NOT NULL
);

CREATE TABLE "public"."presentation_settings113"(
 "area" text NOT NULL,
 "data" jsonb NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."print_settings"(
 "id" boolean NOT NULL,
 "header_path" text,
 "footer_path" text,
 "page_size" text NOT NULL,
 "orientation" text NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."profiles"(
 "id" uuid NOT NULL,
 "email" text NOT NULL,
 "full_name" text NOT NULL,
 "role" app_role NOT NULL,
 "status" record_status NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "deactivated_at14253" timestamp with time zone,
 "deleted_at14253" timestamp with time zone,
 "deleted_identity14253" jsonb
);

CREATE TABLE "public"."record_deletions108"(
 "id" uuid NOT NULL,
 "table_name" text NOT NULL,
 "record_id" uuid NOT NULL,
 "record_data" jsonb NOT NULL,
 "deleted_at" timestamp with time zone NOT NULL,
 "deleted_by" uuid NOT NULL
);

CREATE TABLE "public"."recovery_attempts14320"(
 "actor_id" uuid NOT NULL,
 "started_at" timestamp with time zone NOT NULL,
 "attempts" integer NOT NULL
);

CREATE TABLE "public"."recovery_audit113"(
 "id" uuid NOT NULL,
 "user_id" uuid,
 "event" text NOT NULL,
 "created_at" timestamp with time zone
);

CREATE TABLE "public"."recovery_sessions113"(
 "token_hash" text NOT NULL,
 "user_id" uuid NOT NULL,
 "expires_at" timestamp with time zone NOT NULL,
 "created_at" timestamp with time zone
);

CREATE TABLE "public"."recovery_tickets14320"(
 "token_hash" text NOT NULL,
 "actor_id" uuid NOT NULL,
 "expires" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."recovery_vault113"(
 "id" boolean NOT NULL,
 "ciphertext" text NOT NULL,
 "iv" text NOT NULL,
 "version" integer NOT NULL,
 "updated_by" uuid,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."recovery_vaults14320"(
 "id" boolean NOT NULL,
 "version" integer NOT NULL,
 "ciphertext" text NOT NULL,
 "iv" text NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."recurring_reminders"(
 "id" uuid NOT NULL,
 "recurring_transaction_id" uuid NOT NULL,
 "quantity" integer NOT NULL,
 "unit" text NOT NULL
);

CREATE TABLE "public"."recurring_transactions"(
 "id" uuid NOT NULL,
 "memo" text NOT NULL,
 "frequency" text NOT NULL,
 "next_due_date" date NOT NULL,
 "amount" numeric(20,2) NOT NULL,
 "currency_code" text NOT NULL,
 "debit_account_id" uuid,
 "credit_account_id" uuid,
 "reference" text,
 "is_paused" boolean NOT NULL,
 "created_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."report_types14253"(
 "id" uuid NOT NULL,
 "name" text NOT NULL,
 "active" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."restaurant_members121"(
 "user_id" uuid NOT NULL,
 "email" text NOT NULL,
 "display_name" text NOT NULL,
 "enabled" boolean NOT NULL,
 "permissions" jsonb NOT NULL,
 "must_change_password" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."review_routes14229"(
 "journal_id" uuid NOT NULL,
 "current_reviewer" uuid,
 "final_approved" boolean NOT NULL,
 "stage" integer NOT NULL,
 "steps" jsonb NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."scheduled_journal_occurrences"(
 "id" uuid NOT NULL,
 "schedule_id" uuid,
 "occurrence_date" date NOT NULL,
 "journal_entry_id" uuid NOT NULL,
 "posted_at" timestamp with time zone NOT NULL,
 "posted_early" boolean NOT NULL,
 "reviewed_by" uuid,
 "reviewed_at" timestamp with time zone,
 "schedule_snapshot" jsonb,
 "cancelled_at" timestamp with time zone,
 "cancelled_by" uuid,
 "cancel_reason" text
);

CREATE TABLE "public"."scheduled_journals"(
 "id" uuid NOT NULL,
 "schedule_no" text NOT NULL,
 "title" text NOT NULL,
 "memo" text NOT NULL,
 "currency_code" text,
 "debit_account_id" uuid,
 "credit_account_id" uuid,
 "amount" numeric(20,2),
 "frequency" text NOT NULL,
 "day_rule" text NOT NULL,
 "anchor_day" integer NOT NULL,
 "start_date" date NOT NULL,
 "next_due" date NOT NULL,
 "end_date" date,
 "max_occurrences" integer,
 "posted_count" integer NOT NULL,
 "reminder_days" integer NOT NULL,
 "auto_post" boolean NOT NULL,
 "status" text NOT NULL,
 "last_error" text,
 "created_by" uuid,
 "is_sample" boolean NOT NULL,
 "sample_data" jsonb,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "credit_amount" numeric(20,2)
);

CREATE TABLE "public"."session_policy1443"(
 "id" boolean NOT NULL,
 "timeout_minutes" integer NOT NULL,
 "warning_minutes" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."staff_entry_sequences"(
 "user_id" uuid NOT NULL,
 "last_number" bigint NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."staff_journal_lines"(
 "id" uuid NOT NULL,
 "staff_journal_id" uuid NOT NULL,
 "line_no" integer NOT NULL,
 "transaction_date" date NOT NULL,
 "direction" text NOT NULL,
 "account_id" uuid NOT NULL,
 "memo" text NOT NULL,
 "reference" text NOT NULL,
 "amount" numeric(20,2) NOT NULL,
 "currency_code" text NOT NULL,
 "journal_entry_id" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "fund_account_id" uuid,
 "workspace_entry_no" text,
 "entry_kind" text NOT NULL,
 "client_key" text,
 "editor_group1437" text,
 "editor_snapshot1437" jsonb
);

CREATE TABLE "public"."staff_journals"(
 "id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "period_start" date NOT NULL,
 "period_end" date NOT NULL,
 "status" text NOT NULL,
 "return_note" text,
 "submitted_at" timestamp with time zone,
 "reviewed_by" uuid,
 "reviewed_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "seed_key" text,
 "is_sample" boolean NOT NULL,
 "report_types14253" jsonb NOT NULL
);

CREATE TABLE "public"."sub_accounts"(
 "id" uuid NOT NULL,
 "parent_account_id" uuid NOT NULL,
 "code" text NOT NULL,
 "name" text NOT NULL,
 "description" text,
 "is_active" boolean NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "currency_code" text,
 "posting_account_id14285" uuid
);

CREATE TABLE "public"."tax_sso_records"(
 "id" uuid NOT NULL,
 "record_type" text NOT NULL,
 "period_start" date NOT NULL,
 "period_end" date NOT NULL,
 "due_date" date,
 "amount" numeric(20,2) NOT NULL,
 "status" text NOT NULL,
 "reference" text,
 "paid_at" date,
 "journal_entry_id" uuid,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."todo_completions1443"(
 "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
 "todo_id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "title" text NOT NULL,
 "steps" jsonb NOT NULL,
 "completed_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."transaction_template_lines"(
 "id" uuid NOT NULL,
 "template_id" uuid NOT NULL,
 "line_no" integer NOT NULL,
 "account_id" uuid NOT NULL,
 "description" text,
 "entry_side" text NOT NULL
);

CREATE TABLE "public"."transaction_templates"(
 "id" uuid NOT NULL,
 "name" text NOT NULL,
 "created_by" uuid NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."upcoming_reminders14229"(
 "owner_id" uuid NOT NULL,
 "revision" bigint NOT NULL,
 "items" jsonb NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."user_fund_assignments"(
 "id" uuid NOT NULL,
 "user_id" uuid NOT NULL,
 "account_id" uuid NOT NULL,
 "assigned_amount" numeric(20,2) NOT NULL,
 "currency_code" text NOT NULL,
 "is_active" boolean NOT NULL,
 "assigned_by" uuid,
 "assigned_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."user_permissions"(
 "user_id" uuid NOT NULL,
 "user_type" text NOT NULL,
 "manager_id" uuid,
 "job_title" text NOT NULL,
 "modules" text[] NOT NULL,
 "can_approve" boolean NOT NULL,
 "can_post_directly" boolean NOT NULL,
 "can_void" boolean NOT NULL,
 "can_export" boolean NOT NULL,
 "updated_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "allow_any_account" boolean NOT NULL,
 "allowed_account_ids" uuid[] NOT NULL,
 "default_out_credit_account_id" uuid,
 "default_in_debit_account_id" uuid,
 "allowed_directions" text[] NOT NULL,
 "journal_template" text NOT NULL,
 "submission_frequency" text NOT NULL,
 "allowed_currency_codes" text[] NOT NULL,
 "destination_account_ids" uuid[] NOT NULL,
 "assigned_fund_account_ids" uuid[] NOT NULL,
 "fund_allocations" jsonb NOT NULL,
 "can_manage_data" boolean NOT NULL,
 "allow_multiple_funds" boolean NOT NULL,
 "money_in_counterpart_account_id" uuid,
 "entry_prefix" text NOT NULL,
 "entry_initials" text,
 "entry_digits" integer NOT NULL,
 "module_actions113" jsonb,
 "department14229" text NOT NULL,
 "ledger_account_ids14281" uuid[] NOT NULL
);

CREATE TABLE "public"."user_print_preferences1434"(
 "owner_id" uuid NOT NULL,
 "data" jsonb NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."voucher_sequences14299"(
 "year_no" integer NOT NULL,
 "kind" text NOT NULL,
 "next_no" integer NOT NULL
);

CREATE TABLE "public"."voucher_settings14299"(
 "id" integer NOT NULL,
 "prefix" text NOT NULL,
 "handwritten_code" text NOT NULL,
 "editor_code" text NOT NULL,
 "handwritten_label" text NOT NULL,
 "editor_label" text NOT NULL,
 "digits" integer NOT NULL,
 "year_digits" integer NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."voucher_versions14299"(
 "id" uuid NOT NULL,
 "voucher_id" uuid NOT NULL,
 "version" integer NOT NULL,
 "data" jsonb NOT NULL,
 "reason" text NOT NULL,
 "changed_by" uuid,
 "changed_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."vouchers14299"(
 "id" uuid NOT NULL,
 "request_key" uuid NOT NULL,
 "batch_key" uuid NOT NULL,
 "request_payload" jsonb NOT NULL,
 "number" text NOT NULL,
 "journal_number" text,
 "year_no" integer NOT NULL,
 "ordinal" integer NOT NULL,
 "kind" text NOT NULL,
 "status" text NOT NULL,
 "voucher_date" date NOT NULL,
 "data" jsonb NOT NULL,
 "journal_entry_id" uuid,
 "version" integer NOT NULL,
 "created_by" uuid,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."workspace_actor_audit138"(
 "id" uuid NOT NULL,
 "actor_id" uuid NOT NULL,
 "effective_user_id" uuid NOT NULL,
 "operation" text NOT NULL,
 "table_name" text,
 "row_id" text,
 "before_data" jsonb,
 "after_data" jsonb,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."workspace_hook_config138"(
 "id" boolean NOT NULL,
 "previous_hook" regprocedure
);

CREATE TABLE "public"."workspace_notifications"(
 "id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "notification_type" text NOT NULL,
 "title" text NOT NULL,
 "message" text NOT NULL,
 "related_table" text NOT NULL,
 "related_id" uuid NOT NULL,
 "payload" jsonb NOT NULL,
 "read_at" timestamp with time zone,
 "created_at" timestamp with time zone NOT NULL
);

CREATE TABLE "public"."workspace_todos136"(
 "id" uuid NOT NULL,
 "owner_id" uuid NOT NULL,
 "title" text NOT NULL,
 "due_date" date,
 "sequential" boolean NOT NULL,
 "steps" jsonb NOT NULL,
 "created_at" timestamp with time zone NOT NULL,
 "updated_at" timestamp with time zone NOT NULL,
 "todo_config1438" jsonb NOT NULL,
 "is_template1438" boolean NOT NULL
);

CREATE TABLE "public"."year_closings136"(
 "year" integer NOT NULL,
 "actor" uuid NOT NULL,
 "closed_at" timestamp with time zone NOT NULL,
 "balances" jsonb NOT NULL,
 "closing_entries" jsonb NOT NULL,
 "anchor_entry" uuid NOT NULL
);


-- FUNCTIONS
CREATE OR REPLACE FUNCTION public._fund_summary113(p_owner uuid, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;start_date date;end_date date;
begin

 start_date:=date_trunc('month',p_month)::date;end_date:=(start_date+interval '1 month')::date;
 with assigned as (
 select a.id,a.name,coalesce(to_jsonb(a)->>'currency_code',to_jsonb(a)->>'currency','LAK') currency
 from public.accounts a join public.user_permissions u on u.user_id=p_owner
 where coalesce(to_jsonb(u)->'assigned_fund_account_ids','[]') ? a.id::text
 ),ledger as (
 select a.id,a.name,a.currency,
 coalesce(sum(l.debit-l.credit) filter(where start_date is not null and coalesce(l.line_date,j.transaction_date)<start_date),0) opening,
 coalesce(sum(l.debit) filter(where start_date is null or coalesce(l.line_date,j.transaction_date)>=start_date),0) received,
 coalesce(sum(l.credit) filter(where start_date is null or coalesce(l.line_date,j.transaction_date)>=start_date),0) outflow,
 coalesce(sum(l.debit-l.credit),0) closing
 from assigned a left join (public.journal_lines l join public.journal_entries j on j.id=l.journal_entry_id and j.status='posted') on l.account_id=a.id and (end_date is null or coalesce(l.line_date,j.transaction_date)<end_date)
 group by a.id,a.name,a.currency
 ),drafts as (
 select l.fund_account_id,coalesce(sum(l.amount) filter(where l.direction='in'),0) draft_in,coalesce(sum(l.amount) filter(where l.direction<>'in'),0) draft_out
 from public.staff_journal_lines l join public.staff_journals j on j.id=l.staff_journal_id where j.owner_id=p_owner and j.status in ('draft','returned','submitted','approved_pending_post') and (start_date is null or l.transaction_date>=start_date and l.transaction_date<end_date) group by l.fund_account_id
 ),handovers as (
 select l.fund_account_id,sum(l.amount) amount from public.staff_journal_lines l join public.staff_journals s on s.id=l.staff_journal_id
 where s.owner_id=p_owner and s.status='posted' and to_jsonb(l)->>'entry_kind'='handover'
 and (start_date is null or l.transaction_date>=start_date and l.transaction_date<end_date)
 and exists(select 1 from public.journal_entries j where j.status='posted' and j.id::text in (to_jsonb(s)->>'posted_journal_entry_id',to_jsonb(s)->>'journal_entry_id',to_jsonb(l)->>'journal_entry_id',to_jsonb(l)->>'posted_journal_entry_id')) group by l.fund_account_id
 )
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
 select g.*,least(greatest(coalesce(h.amount,0),0),g.outflow) handover,g.outflow-least(greatest(coalesce(h.amount,0),0),g.outflow) used,coalesce(d.draft_in,0) draft_in,coalesce(d.draft_out,0) draft_out from ledger g left join drafts d on d.fund_account_id=g.id left join handovers h on h.fund_account_id=g.id
 ) x;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.account_request_gate14258()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
   BEGIN
    PERFORM public.password_gate14257();
    PERFORM public.workspace_pre_request138();
    PERFORM public.password_gate14257();
   END $function$
;

CREATE OR REPLACE FUNCTION public.accounting_archive_audit126()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare history jsonb; deletions jsonb:='[]'::jsonb;
begin
  if not public.is_admin() or auth.uid() is null then
    raise exception 'Administrator access required';
  end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at),'[]'::jsonb)
    into history from public.audit_log a;
  if to_regclass('public.record_deletions108') is not null then
    execute 'select coalesce(jsonb_agg(to_jsonb(d)),''[]''::jsonb) from public.record_deletions108 d'
      into deletions;
  end if;
  return jsonb_build_object('audit_log',history,'record_deletions108',deletions);
end $function$
;

CREATE OR REPLACE FUNCTION public.accounting_archive_clear126(p_pack jsonb, p_apply boolean DEFAULT false, p_confirmation text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare t record; fk record; trig record; actual jsonb; expected jsonb;
        counts jsonb:='{}'::jsonb; remaining jsonb:='{}'::jsonb;
        total bigint:=0; n bigint; predicate text; referenced boolean;
begin
  if not public.is_admin() or auth.uid() is null then
    raise exception 'Administrator access required';
  end if;
  if p_pack->>'format'<>'oonjai-data-113' or p_pack->>'project' is null
     or jsonb_typeof(p_pack->'tables')<>'object'
     or p_pack->>'from' is not null or p_pack->>'to' is not null then
    raise exception 'Select a full, all-time Application data backup from this project';
  end if;
  -- The project URL is checked against the connected project in the browser.
  -- Prevent concurrent preview/purge operations.
  perform pg_advisory_xact_lock(126, 1);
  create temporary table if not exists archive_clear_tables126(name text primary key) on commit drop;
  truncate pg_temp.archive_clear_tables126;
  insert into pg_temp.archive_clear_tables126 values
    ('journal_lines'),('journal_entries'),('staff_journal_lines'),('staff_journals'),
    ('accounting_periods'),('period_findings'),('entry_submissions'),
    ('fund_adjustment_lines'),('fund_adjustment_requests'),('user_fund_assignments'),
    ('scheduled_journal_occurrences'),('scheduled_journals'),
    ('payroll_runs'),('payroll_employees'),('payroll_leave_records'),
    ('tax_sso_records'),('employees'),('operational_reports'),
    ('sub_accounts'),('accounts'),('recurring_transactions'),
    ('transaction_template_lines'),('transaction_templates'),
    ('cashier_currency_counts'),('cashier_shift_tenders'),('cashier_shift_closes'),
    ('recurring_reminders'),('workspace_notifications'),
    ('accounting_feature_samples');
  insert into pg_temp.archive_clear_tables126(name)
    select 'payroll_lines' where to_regclass('public.payroll_lines') is not null;
  insert into pg_temp.archive_clear_tables126(name)
    select 'company_reports82' where to_regclass('public.company_reports82') is not null;
  -- Require exact rows, including IDs, as they were exported. Any later edit
  -- invalidates the preview and forces a fresh backup.
  for t in select name from pg_temp.archive_clear_tables126 order by name loop
    if to_regclass(format('public.%I',t.name)) is null then
      raise exception 'Accounting table % is missing; no records were deleted',t.name;
    end if;
    if not p_pack->'tables' ? t.name
       or jsonb_typeof(p_pack->'tables'->t.name)<>'array' then
      raise exception 'Backup lacks accounting table %; no records were deleted',t.name;
    end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb),count(*) from public.%I x',t.name)
      into actual,n;
    select coalesce(jsonb_agg(value order by value::text),'[]'::jsonb)
      into expected from jsonb_array_elements(p_pack->'tables'->t.name);
    if actual is distinct from expected then
      raise exception 'Backup does not match current rows in %. Export again; no records were deleted',t.name;
    end if;
    counts:=counts||jsonb_build_object(t.name,n); total:=total+n;
  end loop;
  -- User roles and logins remain. Their account selections cannot retain IDs
  -- from the chart that is about to be removed.
  if jsonb_typeof(p_pack->'tables'->'user_permissions')<>'array' then
    raise exception 'Backup lacks user permissions; no records were deleted';
  end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]'::jsonb)
    into actual from public.user_permissions x;
  select coalesce(jsonb_agg(value order by value::text),'[]'::jsonb)
    into expected from jsonb_array_elements(p_pack->'tables'->'user_permissions');
  if actual is distinct from expected then
    raise exception 'User account selections changed since backup. Export again; nothing was deleted';
  end if;
  -- No protected table may lose a referenced accounting row. This catches
  -- cashier shifts and other linked restaurant records as well as payroll lines.
  for fk in select c.conrelid,c.confrelid,c.conkey,c.confkey,c.conname,
                   ch.relname child_name,pa.relname parent_name
    from pg_constraint c join pg_class ch on ch.oid=c.conrelid
    join pg_class pa on pa.oid=c.confrelid
    join pg_temp.archive_clear_tables126 a on a.name=pa.relname
    where c.contype='f' and ch.relname<>'user_permissions' and not exists
      (select 1 from pg_temp.archive_clear_tables126 b where b.name=ch.relname)
  loop
    select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ')
      into predicate
      from unnest(fk.conkey,fk.confkey) pair(child_att,parent_att)
      join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=pair.child_att
      join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=pair.parent_att;
    execute format('select exists(select 1 from %s c join %s p on %s)',
                   fk.conrelid::regclass,fk.confrelid::regclass,predicate)
      into referenced;
    if referenced then
      raise exception 'Protected table % still references % (%). No records were deleted',
        fk.child_name,fk.parent_name,fk.conname;
    end if;
  end loop;
  if not p_apply then
    return jsonb_build_object('mode','preview','counts',counts,'total',total,
      'scope','Accounting records and chart/sub-accounts; users, ID settings and restaurant data stay');
  end if;
  if p_confirmation is distinct from 'CLEAR ACCOUNTING DATA' then
    raise exception 'Type CLEAR ACCOUNTING DATA to confirm';
  end if;
  -- One-time practice exception. Future emergency resets require the separate
  -- two-administrator and verified Google Drive workflow.
  if now() at time zone 'Asia/Vientiane' >= timestamp '2026-10-01 00:00:00'
     or exists(select 1 from public.backup_audit113 where kind='sample_accounting_clear130') then
    raise exception 'Practice reset expired or was already used; nothing was deleted';
  end if;
  update public.user_permissions set
    default_out_credit_account_id=null,default_in_debit_account_id=null,
    money_in_counterpart_account_id=null,allowed_account_ids='{}'::uuid[],
    destination_account_ids='{}'::uuid[],assigned_fund_account_ids='{}'::uuid[],
    fund_allocations='[]'::jsonb
  where default_out_credit_account_id is not null
     or default_in_debit_account_id is not null
     or money_in_counterpart_account_id is not null
     or cardinality(allowed_account_ids)>0
     or cardinality(destination_account_ids)>0
     or cardinality(assigned_fund_account_ids)>0
     or fund_allocations<>'[]'::jsonb;
  -- This is one transaction. Save trigger definitions/modes and FK definitions;
  -- all schema and data changes roll back together on any exception.
  create temporary table archive_triggers126(tbl text,tname text,mode char(1)) on commit drop;
  insert into pg_temp.archive_triggers126
    select c.relname,t.tgname,t.tgenabled from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_temp.archive_clear_tables126 a on a.name=c.relname
    join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and not t.tgisinternal and t.tgenabled<>'D';
  for trig in select * from pg_temp.archive_triggers126 loop
    execute format('alter table public.%I disable trigger %I',trig.tbl,trig.tname);
  end loop;
  create temporary table archive_fks126(tbl text,cname text,definition text,valid boolean) on commit drop;
  insert into pg_temp.archive_fks126
    select ch.relname,c.conname,pg_get_constraintdef(c.oid,true),c.convalidated
    from pg_constraint c join pg_class ch on ch.oid=c.conrelid
    join pg_class pa on pa.oid=c.confrelid
    join pg_temp.archive_clear_tables126 a on a.name=ch.relname
    join pg_temp.archive_clear_tables126 b on b.name=pa.relname
    where c.contype='f';
  for fk in select * from pg_temp.archive_fks126 loop
    execute format('alter table public.%I drop constraint %I',fk.tbl,fk.cname);
  end loop;
  for t in select name from pg_temp.archive_clear_tables126 order by name loop
    execute format('delete from public.%I',t.name);
  end loop;
  for fk in select * from pg_temp.archive_fks126 loop
    execute format('alter table public.%I add constraint %I %s',
       fk.tbl,fk.cname,fk.definition);
  end loop;
  for trig in select * from pg_temp.archive_triggers126 loop
    execute format('alter table public.%I %s trigger %I',trig.tbl,
      case trig.mode when 'R' then 'enable replica'
                     when 'A' then 'enable always' else 'enable' end,trig.tname);
  end loop;
  for t in select name from pg_temp.archive_clear_tables126 order by name loop
    execute format('select count(*) from public.%I',t.name) into n;
    if n<>0 then raise exception 'Verification failed for %, rolled back',t.name;end if;
    remaining:=remaining||jsonb_build_object(t.name,n);
  end loop;
  insert into public.backup_audit113(actor,kind,detail)
    values(auth.uid(),'sample_accounting_clear130',jsonb_build_object('counts',counts,'total',total,'time',now()));
  return jsonb_build_object('mode','cleared','deleted',counts,'remaining',remaining,'total',total);
end $function$
;

CREATE OR REPLACE FUNCTION public.accounting_archive_preview127(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare t record; items jsonb:='{}'::jsonb; counts jsonb:='{}'::jsonb;
        categories jsonb:='{}'::jsonb; rows jsonb; n bigint; total bigint:=0;
begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Administrator access required';end if;
 if p_from is null or p_to is null or p_from>p_to then
   raise exception 'Choose a valid date range';end if;
 create temporary table if not exists archive_selection127(
   name text not null,id uuid not null,category text not null,primary key(name,id)
 ) on commit drop;
 truncate pg_temp.archive_selection127;
 insert into pg_temp.archive_selection127
   select 'journal_entries',id,'Transactions' from public.journal_entries
   where transaction_date between p_from and p_to;
 insert into pg_temp.archive_selection127
   select 'journal_lines',l.id,'Transactions' from public.journal_lines l
   join pg_temp.archive_selection127 s on s.name='journal_entries' and s.id=l.journal_entry_id;
 insert into pg_temp.archive_selection127
   select 'accounting_periods',id,'Transactions' from public.accounting_periods
   where period_month>=p_from and (period_month+interval '1 month'-interval '1 day')::date<=p_to;
 insert into pg_temp.archive_selection127
   select 'period_findings',f.id,'Transactions' from public.period_findings f
   join pg_temp.archive_selection127 s on s.name='accounting_periods' and s.id=f.accounting_period_id;
 insert into pg_temp.archive_selection127
   select 'entry_submissions',id,'Transactions' from public.entry_submissions
   where transaction_date between p_from and p_to;
 insert into pg_temp.archive_selection127
   select 'scheduled_journal_occurrences',id,'Transactions' from public.scheduled_journal_occurrences
   where occurrence_date between p_from and p_to;
 insert into pg_temp.archive_selection127
   select 'staff_journals',id,'Sub-users' from public.staff_journals
   where period_start>=p_from and period_end<=p_to;
 insert into pg_temp.archive_selection127
   select 'staff_journal_lines',l.id,'Sub-users' from public.staff_journal_lines l
   where l.transaction_date between p_from and p_to
     or exists(select 1 from pg_temp.archive_selection127 s
       where s.name='staff_journals' and s.id=l.staff_journal_id);
 insert into pg_temp.archive_selection127
   select 'fund_adjustment_requests',id,'Sub-users' from public.fund_adjustment_requests
   where created_at::date between p_from and p_to;
 insert into pg_temp.archive_selection127
   select 'fund_adjustment_lines',l.id,'Sub-users' from public.fund_adjustment_lines l
   join pg_temp.archive_selection127 s on s.name='fund_adjustment_requests' and s.id=l.request_id;
 insert into pg_temp.archive_selection127
   select 'workspace_notifications',id,'Sub-users' from public.workspace_notifications
   where created_at::date between p_from and p_to;
 insert into pg_temp.archive_selection127
   select 'payroll_leave_records',id,'HR' from public.payroll_leave_records
   where data->>'from'>=p_from::text and data->>'to'<=p_to::text
     and data->>'from'~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     and data->>'to'~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
 insert into pg_temp.archive_selection127
   select 'payroll_runs',id,'Payroll' from public.payroll_runs
   where period_start>=p_from and period_end<=p_to;
 insert into pg_temp.archive_selection127
   select 'payroll_lines',l.id,'Payroll' from public.payroll_lines l
   join pg_temp.archive_selection127 s on s.name='payroll_runs' and s.id=l.payroll_run_id;
 insert into pg_temp.archive_selection127
   select 'tax_sso_records',id,'Taxes' from public.tax_sso_records
   where period_start>=p_from and period_end<=p_to;
 insert into pg_temp.archive_selection127
   select 'operational_reports',id,'Reports' from public.operational_reports
   where data->>'from'>=p_from::text and data->>'to'<=p_to::text
     and data->>'from'~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     and data->>'to'~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
 for t in select distinct name,category from pg_temp.archive_selection127 order by category,name loop
   execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb),count(*) from public.%I r join pg_temp.archive_selection127 s on s.name=%L and s.id=r.id',t.name,t.name)
     into rows,n;
   items:=items||jsonb_build_object(t.name,rows);
   counts:=counts||jsonb_build_object(t.name,n);
   categories:=categories||jsonb_build_object(t.category,
     coalesce((categories->>t.category)::bigint,0)+n);
   total:=total+n;
 end loop;
 return jsonb_build_object('format','oonjai-archive-selection-127','from',p_from,'to',p_to,
   'rows',items,'counts',counts,'categories',categories,'total',total,
   'note','Selection for download and review. Nothing is deleted. Master accounts, employees and settings remain live.');
end $function$
;

CREATE OR REPLACE FUNCTION public.accounting_archive_staff_parents128(p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare result jsonb;
begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Administrator access required';end if;
 if coalesce(array_length(p_ids,1),0)>10000 then raise exception 'Too many journal dependencies';end if;
 select coalesce(jsonb_agg(to_jsonb(j) order by j.id),'[]'::jsonb) into result
 from public.staff_journals j where j.id=any(coalesce(p_ids,array[]::uuid[]));
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.accounting_workspace_allowed123()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.active_account14228() AND (public.is_admin() OR NOT EXISTS(
  SELECT 1 FROM public.restaurant_members121 WHERE user_id=auth.uid()))
$function$
;

CREATE OR REPLACE FUNCTION public.ack_period14317(p_month date, p_revision text, p_acknowledged boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE current_check jsonb; context jsonb; key text=to_char(p_month,'YYYY-MM');
BEGIN
 -- Hold submissions and their lines stable until the closing transaction commits.
 LOCK TABLE public.staff_journals,public.staff_journal_lines IN SHARE MODE;
 current_check=public.period_pending14317(p_month);
 IF p_revision IS DISTINCT FROM current_check->>'revision' THEN RAISE EXCEPTION 'Pending submissions changed. Review the current warning and acknowledge again.';END IF;
 IF jsonb_array_length(current_check->'items')>0 AND p_acknowledged IS DISTINCT FROM true THEN RAISE EXCEPTION 'Acknowledge pending submissions before closing or locking.';END IF;
 context=coalesce(nullif(current_setting('app.period_ack14317',true),'')::jsonb,'{}'::jsonb);
 PERFORM set_config('app.period_ack14317',(context||jsonb_build_object(key,jsonb_build_object('actor',auth.uid(),'revision',p_revision)))::text,true);
 IF jsonb_array_length(current_check->'items')>0 THEN
  INSERT INTO public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  VALUES('accounting_periods',key,'UPDATE',current_check,'Acknowledged unposted submissions; excluded from closing and retained for a later open posting period',auth.uid());
 END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.active_account14228()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND status='active')
$function$
;

CREATE OR REPLACE FUNCTION public.add_staff_workspace_entry(p_journal_id uuid, p_transaction_date date, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_currency_code text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  j public.staff_journals;
  p public.user_permissions;
  cfg public.accounting_id_settings;
  parts text[];
  initials text;
  next_number bigint;
  next_line integer;
  new_line_id uuid;
  new_entry_no text;
begin
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or not (j.owner_id=auth.uid() or public.has_user_permission('approve')) then raise exception 'Workspace journal not found'; end if;
  if j.status not in ('draft','returned') then raise exception 'This workspace is locked'; end if;
  if p_transaction_date is null or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description, and positive amount are required'; end if;
  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The employee has no account assignment'; end if;
  if not (p_fund_account_id=any(p.assigned_fund_account_ids)) then raise exception 'Main account is not assigned to this employee'; end if;
  if not p.allow_any_account and not (p_account_id=any(p.destination_account_ids) or p_account_id=any(p.allowed_account_ids)) then raise exception 'Entry account is not assigned to this employee'; end if;
  select * into cfg from public.accounting_id_settings where id=true;
  parts:=regexp_split_to_array(trim(coalesce((select full_name from public.profiles where id=j.owner_id),'USER')),'\s+');
  initials:=upper(left(parts[1],1)||case when array_length(parts,1)>1 then left(parts[array_length(parts,1)],1) else '' end);
  insert into public.staff_entry_sequences(user_id,last_number) values(j.owner_id,1)
  on conflict(user_id) do update set last_number=public.staff_entry_sequences.last_number+1,updated_at=now()
  returning last_number into next_number;
  new_entry_no:=upper(regexp_replace(coalesce(nullif(trim(cfg.sub_user_prefix),''),'SJR'),'[^A-Za-z0-9]','','g'))||'-'||initials||'-'||lpad(next_number::text,coalesce(cfg.sub_user_digits,4),'0');
  select coalesce(max(line_no),0)+1 into next_line from public.staff_journal_lines where staff_journal_id=j.id;
  insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no)
  values(j.id,next_line,p_transaction_date,'out',p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_currency_code,new_entry_no)
  returning id into new_line_id;
  return query select new_line_id,new_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_save_access14281(p_user uuid, p_name text, p_role text, p_permissions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; ids uuid[];
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
 IF p_permissions ? 'ledger_account_ids14281' THEN
  IF jsonb_typeof(p_permissions->'ledger_account_ids14281') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ledger accounts must be an array'; END IF;
  SELECT coalesce(array_agg(DISTINCT v::uuid),'{}'::uuid[]) INTO ids FROM jsonb_array_elements_text(p_permissions->'ledger_account_ids14281') AS x(v);
  IF EXISTS(SELECT 1 FROM unnest(ids) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=x AND is_posting)) THEN RAISE EXCEPTION 'Choose valid posting accounts for ledger access'; END IF;
 ELSE SELECT coalesce(ledger_account_ids14281,'{}') INTO ids FROM user_permissions WHERE user_id=p_user;
 END IF;
 result:=public.admin_save_access1441(p_user,p_name,p_role,p_permissions);
 UPDATE user_permissions SET ledger_account_ids14281=coalesce(ids,'{}') WHERE user_id=p_user;
 RETURN result||jsonb_build_object('ledger_saved',true);
END $function$
;

CREATE OR REPLACE FUNCTION public.admin_save_access1441(p_user uuid, p_name text, p_role text, p_permissions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active' AND role='admin') THEN
  RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501';
 END IF;
 IF p_user IS NULL OR p_role NOT IN ('admin','submitter') OR p_role IS NULL OR nullif(btrim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Invalid user details';END IF;
 IF jsonb_typeof(p_permissions) IS DISTINCT FROM 'object' OR p_permissions->>'user_id' IS DISTINCT FROM p_user::text
  OR jsonb_typeof(p_permissions->'module_actions113') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid permission map';END IF;
 IF (p_role='admin') IS DISTINCT FROM (p_permissions->>'user_type'='admin') THEN RAISE EXCEPTION 'Role and user type must agree';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e WHERE jsonb_typeof(e.value)<>'array') THEN RAISE EXCEPTION 'Every module must contain an action list';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e CROSS JOIN LATERAL jsonb_array_elements_text(e.value) a WHERE a NOT IN ('view','edit','export','approve','post','void')) THEN RAISE EXCEPTION 'Invalid module action';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_permissions->'module_actions113') e WHERE jsonb_array_length(e.value)>0 AND NOT(e.value ? 'view')) THEN RAISE EXCEPTION 'Module actions require View';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_permissions->'assigned_fund_account_ids','[]')) f WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=f::uuid AND is_active AND is_posting))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(p_permissions->'destination_account_ids','[]')) f WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE id=f::uuid AND is_active AND is_posting)) THEN RAISE EXCEPTION 'Assignments require active posting accounts';END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found. Refresh Users.';END IF;
 UPDATE public.profiles SET (full_name,role)=(SELECT r.full_name,r.role FROM jsonb_populate_record(NULL::public.profiles,jsonb_build_object('full_name',p_name,'role',p_role)) r) WHERE id=p_user;
 INSERT INTO public.user_permissions (user_id,user_type,manager_id,job_title,department14229,modules,can_approve,can_post_directly,can_void,can_export,can_manage_data,module_actions113,allow_any_account,allowed_account_ids,destination_account_ids,assigned_fund_account_ids,fund_allocations,default_out_credit_account_id,default_in_debit_account_id,allowed_directions,allow_multiple_funds,money_in_counterpart_account_id,entry_prefix,entry_initials,entry_digits,updated_by,updated_at)
 SELECT r.user_id,r.user_type,r.manager_id,coalesce(r.job_title,(SELECT saved.job_title FROM public.user_permissions saved WHERE saved.user_id=p_user),''),coalesce(r.department14229,'') ,r.modules,r.can_approve,r.can_post_directly,r.can_void,r.can_export,r.can_manage_data,r.module_actions113,r.allow_any_account,r.allowed_account_ids,r.destination_account_ids,r.assigned_fund_account_ids,r.fund_allocations,r.default_out_credit_account_id,r.default_in_debit_account_id,r.allowed_directions,r.allow_multiple_funds,r.money_in_counterpart_account_id,r.entry_prefix,r.entry_initials,r.entry_digits,r.updated_by,r.updated_at FROM jsonb_populate_record(NULL::public.user_permissions,
  p_permissions||jsonb_build_object('user_id',p_user,'updated_by',actor,'updated_at',now())) r
 ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type,manager_id=EXCLUDED.manager_id,job_title=EXCLUDED.job_title,department14229=EXCLUDED.department14229,modules=EXCLUDED.modules,can_approve=EXCLUDED.can_approve,can_post_directly=EXCLUDED.can_post_directly,can_void=EXCLUDED.can_void,can_export=EXCLUDED.can_export,can_manage_data=EXCLUDED.can_manage_data,module_actions113=EXCLUDED.module_actions113,allow_any_account=EXCLUDED.allow_any_account,allowed_account_ids=EXCLUDED.allowed_account_ids,destination_account_ids=EXCLUDED.destination_account_ids,assigned_fund_account_ids=EXCLUDED.assigned_fund_account_ids,fund_allocations=EXCLUDED.fund_allocations,default_out_credit_account_id=EXCLUDED.default_out_credit_account_id,default_in_debit_account_id=EXCLUDED.default_in_debit_account_id,allowed_directions=EXCLUDED.allowed_directions,allow_multiple_funds=EXCLUDED.allow_multiple_funds,money_in_counterpart_account_id=EXCLUDED.money_in_counterpart_account_id,entry_prefix=EXCLUDED.entry_prefix,entry_initials=EXCLUDED.entry_initials,entry_digits=EXCLUDED.entry_digits,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at;
 RETURN jsonb_build_object('user_id',p_user,'saved',true);
END $function$
;

CREATE OR REPLACE FUNCTION public.approve_entry_submission(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.entry_submissions; new_entry_id uuid; new_entry_no text;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  select * into s from public.entry_submissions where id=p_submission_id for update;
  if NOT FOUND OR NOT public.can_workspace113(s.submitted_by) OR NOT public.can_action113('user-entry-review','approve') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Assigned approval and journal posting permissions required';END IF;
  IF s.status='approved' AND s.journal_entry_id IS NOT NULL THEN RETURN s.journal_entry_id;END IF;
  if s.status<>'pending' then raise exception 'Pending submission not found'; end if;
  PERFORM public.validate_journal14228(s.transaction_date,s.memo,jsonb_build_array(jsonb_build_object('account_id',s.debit_account_id,'currency_code',s.currency_code,'debit',s.amount,'credit',0),jsonb_build_object('account_id',s.credit_account_id,'currency_code',s.currency_code,'debit',0,'credit',s.amount)));
  new_entry_no := 'OJM-' || lpad(nextval('public.journal_entry_number_seq')::text,6,'0');
  insert into public.journal_entries(entry_no,transaction_date,memo,reference,status,source,submitted_by,posted_by,posted_at)
  values(new_entry_no,s.transaction_date,s.memo,s.reference,'posted','staff_submission',s.submitted_by,auth.uid(),now()) returning id into new_entry_id;
  insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
  (new_entry_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,s.transaction_date),
  (new_entry_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,s.transaction_date);
  update public.entry_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),journal_entry_id=new_entry_id where id=p_submission_id;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('entry_submissions',p_submission_id::text,'APPROVE',jsonb_build_object('journal_entry_id',new_entry_id),'Approved and posted',auth.uid());
  return new_entry_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.approve_fund_adjustment_v49(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare request_row public.fund_adjustment_requests; line_row public.fund_adjustment_lines; before_value numeric; after_value numeric; result jsonb:='[]'::jsonb;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  select * into request_row from public.fund_adjustment_requests where id=p_request_id for update;
  if not found then raise exception 'Adjustment request not found'; end if;
  if request_row.status='approved_applied' then
    return (select coalesce(jsonb_agg(jsonb_build_object('activity',activity_key,'current_before',current_before,'difference_applied',difference_applied,'current_after',current_after)),'[]'::jsonb) from public.fund_adjustment_lines where request_id=p_request_id);
  end if;
  if request_row.status<>'submitted' then raise exception 'Only submitted adjustments can be approved'; end if;
  for line_row in select * from public.fund_adjustment_lines where request_id=p_request_id for update loop
    before_value:=public.workspace_live_activity_v49(request_row.owner_id,request_row.fund_account_id,line_row.activity_key);
    after_value:=before_value+line_row.difference;
    update public.fund_adjustment_lines set current_before=before_value,difference_applied=line_row.difference,current_after=after_value where id=line_row.id;
    result:=result||jsonb_build_array(jsonb_build_object('activity',line_row.activity_key,'submitted_original',line_row.original_value,'submitted_requested',line_row.requested_value,'difference',line_row.difference,'current_before',before_value,'difference_applied',line_row.difference,'current_after',after_value));
  end loop;
  update public.fund_adjustment_requests set status='approved_applied',reviewed_by=auth.uid(),reviewed_at=now(),applied_at=now(),updated_at=now() where id=p_request_id;
  insert into public.workspace_notifications(owner_id,notification_type,title,message,related_table,related_id,payload)
  values(request_row.owner_id,'adjustment_approved','Fund adjustment approved','The submitted difference was applied once to the current tracked activity.','fund_adjustment_requests',p_request_id,result)
  on conflict(owner_id,notification_type,related_id) do update set payload=excluded.payload,message=excluded.message;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('fund_adjustment_requests',p_request_id::text,'APPROVE_APPLY_DIFFERENCE',result,'Difference applied to approval-time values; no stale total was overwritten',auth.uid());
  return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.approve_report1443(p_journal uuid, p_expected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE pack jsonb;next_id uuid;r review_routes14229;
BEGIN
 IF NOT public.review_current14229(p_journal) THEN RAISE EXCEPTION 'This report is assigned to a different reviewer';END IF;
 PERFORM public.review_exact14229(p_journal,p_expected);
 SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=auth.uid();
 IF NOT public.is_admin() AND next_id IS NOT NULL THEN RAISE EXCEPTION 'Review and forward this report to your direct supervisor';END IF;
 pack:=public.approve_report_worker14229(p_journal,p_expected);
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal FOR UPDATE;
 IF NOT coalesce(r.final_approved,false) THEN
 INSERT INTO review_routes14229(journal_id,current_reviewer,final_approved,stage,steps) VALUES(p_journal,auth.uid(),true,1,
 jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'by_name',(SELECT full_name FROM profiles WHERE id=auth.uid()),'action','final_approval','at',now())))
 ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=auth.uid(),final_approved=true,stage=review_routes14229.stage+1,
 steps=review_routes14229.steps||EXCLUDED.steps,updated_at=now();
 END IF;
 RETURN pack;
END $function$
;

CREATE OR REPLACE FUNCTION public.approve_report_worker14229(p_journal uuid, p_expected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.staff_journals%rowtype; source_lines jsonb; account_rows jsonb; pack jsonb;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.report_access1443(j.owner_id,true) THEN RAISE EXCEPTION 'Approval permission required for this user'; END IF;
 SELECT snapshot INTO pack FROM approved_reports1443 WHERE journal_id=p_journal;
 IF FOUND THEN RETURN pack; END IF;
 IF j.status::text<>'submitted' THEN RAISE EXCEPTION 'Only a submitted report can be approved'; END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]'::jsonb) INTO source_lines FROM staff_journal_lines l WHERE staff_journal_id=p_journal;
 IF jsonb_array_length(source_lines)=0 THEN RAISE EXCEPTION 'Cannot approve an empty report'; END IF;
 -- Exact source comparison prevents approval of changes not seen by the reviewer.
 IF (SELECT jsonb_agg(x ORDER BY x->>'id') FROM jsonb_array_elements(coalesce(p_expected,'[]'::jsonb)) x) IS DISTINCT FROM source_lines THEN RAISE EXCEPTION 'The report changed. Reload and inspect it before approving'; END IF;
 WITH RECURSIVE ids(id) AS (
 SELECT a.id FROM accounts a WHERE a.id IN(SELECT account_id FROM staff_journal_lines WHERE staff_journal_id=p_journal UNION SELECT fund_account_id FROM staff_journal_lines WHERE staff_journal_id=p_journal)
 UNION SELECT parent.id FROM accounts parent JOIN accounts child ON parent.code=to_jsonb(child)->>'parent_code' JOIN ids selected ON selected.id=child.id
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb) INTO account_rows FROM accounts a JOIN ids ON ids.id=a.id;
 pack=jsonb_build_object('snapshot1443',true,'approved_at',now(),'journal',to_jsonb(j)||jsonb_build_object('status','approved','lines',source_lines),'accounts',account_rows,'posted','[]'::jsonb,
 'user',(SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role) FROM profiles p WHERE p.id=j.owner_id),
 'approver',(SELECT jsonb_build_object('id',p.id,'full_name',p.full_name) FROM profiles p WHERE p.id=auth.uid()));
 INSERT INTO approved_reports1443(journal_id,owner_id,approved_by,snapshot) VALUES(p_journal,j.owner_id,auth.uid(),pack);
 RETURN pack;
END $function$
;

CREATE OR REPLACE FUNCTION public.approve_staff_journal(p_journal_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.staff_journals; p public.user_permissions; l public.staff_journal_lines; new_entry_id uuid; entry_no text; count_posted integer:=0;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or j.status<>'submitted' then raise exception 'Submitted journal not found'; end if;
  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The user has no account mapping'; end if;
  if p.default_out_credit_account_id is null or p.default_in_debit_account_id is null then raise exception 'The user has incomplete default account mapping'; end if;
  for l in select * from public.staff_journal_lines where staff_journal_id=j.id order by line_no loop
    if not p.allow_any_account and not (l.account_id=any(p.allowed_account_ids)) then raise exception 'Line % uses an account not allowed for this user',l.line_no; end if;
    if not (l.direction=any(p.allowed_directions)) then raise exception 'Line % uses a direction not allowed for this user',l.line_no; end if;
    entry_no:='OJM-SJ-'||lpad(nextval('public.journal_entry_number_seq')::text,6,'0');
    insert into public.journal_entries(entry_no,transaction_date,memo,reference,status,source,submitted_by,posted_by,posted_at)
    values(entry_no,l.transaction_date,l.memo,l.reference,'posted','staff_journal',j.owner_id,auth.uid(),now()) returning id into new_entry_id;
    if l.direction='out' then
      insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
        (new_entry_id,1,l.account_id,l.memo,l.currency_code,l.amount,0,l.transaction_date),
        (new_entry_id,2,p.default_out_credit_account_id,l.memo,l.currency_code,0,l.amount,l.transaction_date);
    else
      insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
        (new_entry_id,1,p.default_in_debit_account_id,l.memo,l.currency_code,l.amount,0,l.transaction_date),
        (new_entry_id,2,l.account_id,l.memo,l.currency_code,0,l.amount,l.transaction_date);
    end if;
    update public.staff_journal_lines set journal_entry_id=new_entry_id where id=l.id; count_posted:=count_posted+1;
  end loop;
  update public.staff_journals set status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=j.id;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',j.id::text,'APPROVE_AND_POST',jsonb_build_object('entries_posted',count_posted),'Staff journal converted to double-entry journals',auth.uid());
  return count_posted;
end $function$
;

CREATE OR REPLACE FUNCTION public.approved_report1443(p_journal uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE a approved_reports1443; r review_routes14229;
BEGIN
 IF NOT public.journal_visible14229(p_journal) THEN RAISE EXCEPTION 'Report unavailable or access denied: not assigned to you';END IF;
 SELECT * INTO a FROM approved_reports1443 WHERE journal_id=p_journal;
 IF NOT FOUND OR NOT public.report_access1443(a.owner_id) THEN RAISE EXCEPTION 'Approved report unavailable or access denied';END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 RETURN a.snapshot||jsonb_build_object('review_route14229',to_jsonb(r),'approver',CASE WHEN r.journal_id IS NULL THEN a.snapshot->'approver' WHEN r.final_approved THEN (SELECT jsonb_build_object('full_name',p.full_name) FROM profiles p WHERE p.id=r.current_reviewer) ELSE NULL END);
END $function$
;

CREATE OR REPLACE FUNCTION public.assert_final_review14229(p_journal uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r review_routes14229;
BEGIN
 IF NOT public.review_current14229(p_journal) THEN RAISE EXCEPTION 'This report is assigned to a different reviewer';END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 IF FOUND AND NOT r.final_approved THEN RAISE EXCEPTION 'Final approval is required before posting';END IF;
 IF NOT FOUND AND NOT public.is_admin() AND EXISTS(SELECT 1 FROM user_permissions WHERE user_id=auth.uid() AND manager_id IS NOT NULL) THEN RAISE EXCEPTION 'Forward this report before posting';END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.assigned_ledger14281(p_owner uuid, p_account uuid DEFAULT NULL::uuid, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE ids uuid[]; opening numeric; closing numeric; rows jsonb; account_list jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.accounting_workspace_allowed123() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_owner AND status='active') OR NOT (auth.uid()=p_owner OR (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') AND public.can_workspace113(p_owner))) THEN RAISE EXCEPTION 'This ledger is not accessible' USING ERRCODE='42501'; END IF;
 SELECT ledger_account_ids14281 INTO ids FROM user_permissions WHERE user_id=p_owner;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name,'currency',currency_code) ORDER BY code),'[]') INTO account_list FROM accounts WHERE id=ANY(coalesce(ids,'{}')) AND is_posting;
 IF p_account IS NULL THEN RETURN jsonb_build_object('accounts',account_list); END IF;
 IF NOT coalesce(p_account=ANY(ids),false) THEN RAISE EXCEPTION 'Ledger account not assigned' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to>p_from+366 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'Choose a valid monthly or quarterly period'; END IF;
 SELECT coalesce(sum(l.debit-l.credit),0) INTO opening FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<p_from;
 SELECT opening+coalesce(sum(l.debit-l.credit),0) INTO closing FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to;
 WITH running AS (
 SELECT l.id,coalesce(l.line_date,e.transaction_date) AS date,e.entry_no AS reference,e.memo AS general_description,coalesce(nullif(l.description,''),e.memo,'') AS description,l.debit,l.credit,
 opening+sum(l.debit-l.credit) OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS balance,
 row_number() OVER(ORDER BY coalesce(l.line_date,e.transaction_date),e.created_at,e.id,l.line_no,l.id) AS ordinal
 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id
 WHERE l.account_id=p_account AND e.status::text='posted' AND coalesce(l.line_date,e.transaction_date) BETWEEN p_from AND p_to
 ), page AS (SELECT * FROM running ORDER BY ordinal LIMIT 500 OFFSET p_offset)
 SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY ordinal),'[]') INTO rows FROM page;
 RETURN jsonb_build_object('accounts',account_list,'opening',opening,'closing',closing,'rows',rows);
END $function$
;

CREATE OR REPLACE FUNCTION public.audit_month1434(p_month date, p_confirm boolean DEFAULT false, p_audit_ids text[] DEFAULT ARRAY[]::text[], p_deletion_ids text[] DEFAULT ARRAY[]::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare start_at timestamptz; end_at timestamptz; audit_ids text[]; deletion_ids text[]; removed integer:=0; n integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_month<>date_trunc('month',p_month)::date then raise exception 'Select a valid month'; end if;
 start_at:=p_month::timestamp at time zone 'UTC';
 end_at:=(p_month+interval '1 month')::timestamp at time zone 'UTC';
 if not p_confirm then
  select coalesce(array_agg(id::text),array[]::text[]) into audit_ids from public.audit_log
   where created_at>=start_at and created_at<end_at
   and table_name in ('journal_entries','accounting_periods','period_findings','scheduled_journals');
  if to_regclass('public.record_deletions108') is not null then
   execute 'select coalesce(array_agg(id::text),array[]::text[]) from public.record_deletions108 where deleted_at >= $1 and deleted_at < $2' into deletion_ids using start_at,end_at;
  end if;
  return jsonb_build_object('audit_ids',audit_ids,'deletion_ids',coalesce(deletion_ids,array[]::text[]));
 end if;
 -- Delete only the IDs previewed and explicitly confirmed. New arrivals survive.
 delete from public.audit_log where id::text=any(p_audit_ids) and created_at>=start_at and created_at<end_at
  and table_name in ('journal_entries','accounting_periods','period_findings','scheduled_journals');
 get diagnostics n=row_count; removed:=removed+n;
 if to_regclass('public.record_deletions108') is not null then
  execute 'delete from public.record_deletions108 where id::text=any($1) and deleted_at >= $2 and deleted_at < $3' using p_deletion_ids,start_at,end_at;
  get diagnostics n=row_count; removed:=removed+n;
 end if;
 return jsonb_build_object('deleted',removed);
end $function$
;

CREATE OR REPLACE FUNCTION public.audit_schedule92()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a text;r text;
begin
 if tg_op='DELETE' then
  a:='DELETE_SCHEDULE';r:=nullif(trim(current_setting('app.schedule_delete_reason92',true)),'');
  if r is null then raise exception 'Deletion reason required';end if;
 elsif tg_op='INSERT' then a:='CREATE_SCHEDULE';r:='Scheduled journal created';
 else
  if new.posted_count is distinct from old.posted_count then a:='SCHEDULE_POST_ADVANCE';r:='Occurrence posted; next date advanced';else a:='UPDATE_SCHEDULE';r:='Future scheduled entry updated';end if;
 end if;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 values('scheduled_journals',coalesce(new.id,old.id)::text,a,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,r,auth.uid());
 return coalesce(new,old);
end $function$
;

CREATE OR REPLACE FUNCTION public.audit_snapshot14232()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE names text[]; name text; items jsonb; data jsonb='{}';BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Active accounting administrator required';END IF;
 SELECT array_agg(DISTINCT t ORDER BY t) INTO names FROM (
  SELECT jsonb_array_elements_text(s->'tables') t FROM jsonb_array_elements(public.reset_scope_catalog14232()) s
  UNION SELECT unnest(ARRAY['accounts','sub_accounts','currencies','profiles','user_permissions','user_fund_assignments','business_settings','accounting_id_settings','print_settings','presentation_settings113','voucher_settings14299','voucher_sequences14299','budget_templates14313','budget_settings14313','entry_prefix_reservations','staff_entry_sequences'])
 ) x WHERE to_regclass(format('public.%I',t)) IS NOT NULL;
 FOREACH name IN ARRAY names LOOP EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM public.%I r',name) INTO items;data=data||jsonb_build_object(name,items);END LOOP;
 RETURN jsonb_build_object('format','oonjai-data-113','tables',data,'storage','[]'::jsonb,'auditTrail','{}'::jsonb,'purpose14232','audit_working_copy','copiedAt14232',statement_timestamp());
END $function$
;

CREATE OR REPLACE FUNCTION public.backup_export113(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare t record;f record;rows jsonb;outdata jsonb:='{}';keys jsonb:='{}';changed integer;passes integer:=0;files jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required';end if;
 if (p_from is null)<>(p_to is null) or p_to<p_from then raise exception 'Invalid date range';end if;
 create temporary table if not exists export_rows113(t text,rowdata jsonb,rowhash text generated always as (md5(rowdata::text)) stored,primary key(t,rowhash)) on commit drop;
 truncate pg_temp.export_rows113;
 for t in select * from public.backup_registry113 loop
 -- Undated child rows are included below through their foreign keys. Reference tables stay whole.
 if p_from is null or t.date_path is not null or not exists(select 1 from pg_constraint fk join public.backup_registry113 p on p.table_name=(select relname from pg_class where oid=fk.confrelid) where fk.contype='f' and fk.conrelid=to_regclass('public.'||t.table_name) and p.date_path is not null) then
 execute format('insert into pg_temp.export_rows113(t,rowdata) select %L,to_jsonb(r) from public.%I r where $1 is null or $3 is null or coalesce((to_jsonb(r)#>>$3),'''')='''' or left((to_jsonb(r)#>>$3)||''-01'',10) between $1::text and $2::text on conflict do nothing',t.table_name,t.table_name) using p_from,p_to,t.date_path;
 end if;
 end loop;
 -- Include children of selected dated parents (e.g. journal lines) and referenced ancestors.
 for f in select ch.relname child,pa.relname parent,ca.attname childcol,aa.attname parentcol from pg_constraint k join pg_class ch on ch.oid=k.conrelid join pg_class pa on pa.oid=k.confrelid join public.backup_registry113 pc on pc.table_name=pa.relname and pc.date_path is not null join public.backup_registry113 cc on cc.table_name=ch.relname and cc.date_path is null join pg_attribute ca on ca.attrelid=ch.oid and ca.attnum=k.conkey[1] join pg_attribute aa on aa.attrelid=pa.oid and aa.attnum=k.confkey[1] where k.contype='f' and cardinality(k.conkey)=1 loop
 execute format('insert into pg_temp.export_rows113(t,rowdata) select %L,to_jsonb(c) from public.%I c where exists(select 1 from pg_temp.export_rows113 p where p.t=%L and p.rowdata->>%L=to_jsonb(c)->>%L) on conflict do nothing',f.child,f.child,f.parent,f.parentcol,f.childcol);
 end loop;
 loop
 changed:=0;passes:=passes+1;
 for f in select ch.relname child,pa.relname parent,ca.attname childcol,aa.attname parentcol from pg_constraint k join pg_class ch on ch.oid=k.conrelid join pg_class pa on pa.oid=k.confrelid join public.backup_registry113 pc on pc.table_name=pa.relname join public.backup_registry113 cc on cc.table_name=ch.relname join pg_attribute ca on ca.attrelid=ch.oid and ca.attnum=k.conkey[1] join pg_attribute aa on aa.attrelid=pa.oid and aa.attnum=k.confkey[1] where k.contype='f' and cardinality(k.conkey)=1 loop
 execute format('insert into pg_temp.export_rows113(t,rowdata) select %L,to_jsonb(p) from public.%I p where exists(select 1 from pg_temp.export_rows113 c where c.t=%L and c.rowdata->>%L=to_jsonb(p)->>%L) on conflict do nothing',f.parent,f.parent,f.child,f.childcol,f.parentcol);
 get diagnostics passes=row_count;changed:=changed+passes;
 if exists(select 1 from public.backup_registry113 where table_name=f.parent and date_path is not null) and exists(select 1 from public.backup_registry113 where table_name=f.child and date_path is null) then
 execute format('insert into pg_temp.export_rows113(t,rowdata) select %L,to_jsonb(c) from public.%I c where exists(select 1 from pg_temp.export_rows113 p where p.t=%L and p.rowdata->>%L=to_jsonb(c)->>%L) on conflict do nothing',f.child,f.child,f.parent,f.parentcol,f.childcol);
 get diagnostics passes=row_count;changed:=changed+passes;
 end if;
 end loop;
 exit when changed=0;
 end loop;
 for t in select * from public.backup_registry113 order by table_name loop
 select coalesce(jsonb_agg(rowdata),'[]') into rows from pg_temp.export_rows113 where export_rows113.t=t.table_name;
 outdata:=outdata||jsonb_build_object(t.table_name,rows);keys:=keys||jsonb_build_object(t.table_name,to_jsonb(t.pk_columns));end loop;
 if to_regclass('storage.objects') is not null then execute 'select coalesce(jsonb_agg(jsonb_build_object(''bucket'',bucket_id,''name'',name)),''[]'') from storage.objects' into files;else files:='[]';end if;
 insert into public.backup_audit113(actor,kind,detail) values(auth.uid(),'export',jsonb_build_object('from',p_from,'to',p_to));
 return jsonb_build_object('format','oonjai-data-113','createdAt',now(),'from',p_from,'to',p_to,'tables',outdata,'keys',keys,'storage',files,'includes','Public application rows and referenced records. Auth users, server secrets, SQL schema and vault are separate.');
end $function$
;

CREATE OR REPLACE FUNCTION public.backup_import113(p_pack jsonb, p_apply boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare t record;r jsonb;existing jsonb;predicate text;columns text;inserted integer:=0;same integer:=0;conflicts jsonb:='[]';pending integer;progress integer;err text;errors jsonb:='[]';
begin
 if not public.is_admin() then raise exception 'Administrator access required';end if;
 if p_pack->>'format'<>'oonjai-data-113' or jsonb_typeof(p_pack->'tables')<>'object' then raise exception 'Invalid backup format';end if;
 perform pg_advisory_xact_lock(113,115);
 create temporary table if not exists import_rows113(t text,r jsonb,done boolean default false) on commit drop;
 truncate pg_temp.import_rows113;
 for t in select key as name,value as rows from jsonb_each(p_pack->'tables') loop
 if not exists(select 1 from public.backup_registry113 where table_name=t.name) then raise exception 'Unknown table: %. Install the matching schema first.',t.name;end if;
 if jsonb_typeof(t.rows)<>'array' then raise exception 'Invalid table rows';end if;
 for r in select value from jsonb_array_elements(t.rows) loop
 if exists(select 1 from public.backup_registry113 b cross join lateral unnest(b.pk_columns) k where b.table_name=t.name and (not r ? k or r->k='null'::jsonb)) then raise exception 'Missing primary key in %',t.name;end if;
 select string_agg(format('to_jsonb(x)->%L = $1->%L',k,k),' and ') into predicate from public.backup_registry113 b cross join lateral unnest(b.pk_columns) k where b.table_name=t.name;
 execute format('select to_jsonb(x) from public.%I x where %s',t.name,predicate) into existing using r;
 if existing is not null then
 if existing=r then same:=same+1;else conflicts:=conflicts||jsonb_build_array(jsonb_build_object('table',t.name,'key',(select jsonb_object_agg(k,r->k) from public.backup_registry113 b cross join lateral unnest(b.pk_columns) k where b.table_name=t.name),'resolution','Keep existing record'));end if;
 else insert into pg_temp.import_rows113(t,r) values(t.name,r);end if;
 end loop;end loop;
 select count(*) into pending from pg_temp.import_rows113;
 if p_apply then
 -- Dependency ordered retry. One transaction: any unresolved record rolls the entire import back.
 loop
 progress:=0;errors:='[]';
 for t in select ctid tid,* from pg_temp.import_rows113 where not done loop
 begin
 select string_agg(quote_ident(a.attname),',' order by a.attnum) into columns from pg_attribute a where a.attrelid=to_regclass('public.'||t.t) and a.attnum>0 and not a.attisdropped and a.attgenerated='' and t.r ? a.attname;
 execute format('insert into public.%I (%s) overriding system value select %s from jsonb_populate_record(null::public.%I,$1)',t.t,columns,columns,t.t) using t.r;
 update pg_temp.import_rows113 set done=true where ctid=t.tid;progress:=progress+1;inserted:=inserted+1;
 exception when foreign_key_violation then errors:=errors||jsonb_build_array(jsonb_build_object('table',t.t,'error',sqlerrm));
 end;
 end loop;
 exit when not exists(select 1 from pg_temp.import_rows113 where not done);
 if progress=0 then raise exception 'Import rolled back. Missing dependencies: %',errors;end if;
 end loop;
 insert into public.backup_audit113(actor,kind,detail) values(auth.uid(),'import',jsonb_build_object('inserted',inserted,'same',same,'conflicts',jsonb_array_length(conflicts)));
 end if;
 return jsonb_build_object('new',pending,'inserted',inserted,'identical',same,'conflicts',conflicts,'mode',case when p_apply then 'applied' else 'preview' end);
end $function$
;

CREATE OR REPLACE FUNCTION public.begin_book_session136(p_month date, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();p accounting_periods;s book_sessions136; BEGIN
 SELECT * INTO p FROM accounting_periods WHERE period_month=date_trunc('month',p_month)::date FOR UPDATE;
 IF p.id IS NULL OR p.status<>'closed' THEN RAISE EXCEPTION 'Only a closed, unlocked book can be reopened';END IF;
 IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'A reason is required';END IF;
 SELECT * INTO s FROM book_sessions136 WHERE period_id=p.id AND status='editing';
 IF s.id IS NOT NULL THEN IF s.owner_id<>actor THEN RAISE EXCEPTION 'Another administrator is already editing this book';END IF;RETURN to_jsonb(s)||jsonb_build_object('month',p.period_month);END IF;
 INSERT INTO book_sessions136(period_id,owner_id,reason,original) VALUES(p.id,actor,trim(p_reason),public.book_snapshot136(p.id)) RETURNING * INTO s;
 RETURN to_jsonb(s)||jsonb_build_object('month',p.period_month);END $function$
;

CREATE OR REPLACE FUNCTION public.block_unreviewed_archive91()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if new.status in ('closed','locked') and (tg_op='INSERT' or old.status is distinct from new.status) and exists(
  select 1 from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id
  where date_trunc('month',j.transaction_date)::date=new.period_month and o.reviewed_at is null and j.status='posted'
 ) then raise exception 'Review all automated journals before closing this period';end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.book_sessions_list136()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136(); BEGIN RETURN coalesce((SELECT jsonb_agg(to_jsonb(s)||jsonb_build_object('month',p.period_month)) FROM book_sessions136 s JOIN accounting_periods p ON p.id=s.period_id WHERE s.owner_id=actor AND s.status='editing'),'[]'); END $function$
;

CREATE OR REPLACE FUNCTION public.book_snapshot136(p_period uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT coalesce(jsonb_agg(jsonb_build_object('entry',to_jsonb(e),'lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.line_no),'[]') FROM journal_lines l WHERE l.journal_entry_id=e.id)) ORDER BY e.id),'[]') FROM journal_entries e JOIN accounting_periods p ON p.id=p_period WHERE date_trunc('month',e.transaction_date)::date=p.period_month
$function$
;

CREATE OR REPLACE FUNCTION public.branch_home14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE people jsonb;balances jsonb; reports jsonb;
BEGIN
 IF NOT public.can_action113('sub-users-home14229','view') THEN RAISE EXCEPTION 'Main Home permission required';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,
 'can_open',public.can_workspace113(p.id),'user_permissions',jsonb_build_object('job_title',u.job_title,'department14229',u.department14229,
 'manager_id',u.manager_id,'assigned_fund_account_ids',u.assigned_fund_account_ids))), '[]') INTO people
 FROM profiles p JOIN user_permissions u ON u.user_id=p.id WHERE p.status='active' AND (p.role<>'admin' OR p.id=auth.uid())
 AND public.in_branch14229(p.id) AND NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=p.id);
 SELECT coalesce(jsonb_object_agg(owner,rows),'{}') INTO balances FROM (
 SELECT u.user_id::text owner,jsonb_agg(jsonb_build_object('account_id',a.id,'name',a.name,'currency',a.currency_code,
 'opening',0,'received',coalesce(s.dr,0),'used',coalesce(s.cr,0),'handover',0,'closing',coalesce(s.dr,0)-coalesce(s.cr,0))) rows
 FROM user_permissions u JOIN profiles p ON p.id=u.user_id AND p.status='active'
 JOIN accounts a ON a.id=ANY(u.assigned_fund_account_ids)
 LEFT JOIN LATERAL (SELECT sum(l.debit) dr,sum(l.credit) cr FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE l.account_id=a.id AND e.status::text='posted') s ON true
 WHERE public.in_branch14229(u.user_id) AND NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=u.user_id) GROUP BY u.user_id) q;
 SELECT coalesce(jsonb_agg(to_jsonb(j)||jsonb_build_object('review_route14229',to_jsonb(r))),'[]') INTO reports
 FROM staff_journals j LEFT JOIN review_routes14229 r ON r.journal_id=j.id
 WHERE public.in_branch14229(j.owner_id) AND public.can_action113('user-entry-review','view') AND public.journal_visible14229(j.id);
 RETURN jsonb_build_object('users',people,'balances',balances,'reports',reports);
END $function$
;

CREATE OR REPLACE FUNCTION public.budget_capabilities14316()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$ BEGIN IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;RETURN jsonb_build_object('version',14316);END $function$
;

CREATE OR REPLACE FUNCTION public.budget_link_guard14316()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE parent public.operational_reports%ROWTYPE;
BEGIN
 NEW.budget_request_id14316=NULLIF(NEW.data->>'requestId14316','')::uuid;
 IF TG_OP='UPDATE' THEN
  IF OLD.data->>'kind'='finance' AND OLD.data->>'status'='finalized' AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'Finalized fund allocation is read-only'; END IF;
  IF OLD.data->>'kind'='finance' AND EXISTS(SELECT 1 FROM public.operational_reports WHERE budget_request_id14316=OLD.id) AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'Budget request has allocations; create a new request for changes'; END IF;
 END IF;
 IF NEW.budget_request_id14316 IS NOT NULL THEN
  SELECT * INTO parent FROM public.operational_reports WHERE id=NEW.budget_request_id14316 FOR UPDATE;
  IF NOT FOUND OR parent.data->>'kind' IS DISTINCT FROM 'finance' OR parent.data->>'mode'='utilization' OR parent.budget_request_id14316 IS NOT NULL OR NEW.data->>'mode' IS DISTINCT FROM 'utilization' OR NEW.data->>'kind' IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Choose an original saved budget request'; END IF;
  IF NEW.data->'lines' IS DISTINCT FROM parent.data->'lines' OR (NEW.data->>'requestVersion14316')::integer IS DISTINCT FROM parent.version THEN RAISE EXCEPTION 'Budget request changed. Reopen its current version'; END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.can_action113(p_target text, p_action text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare p jsonb; a jsonb; parent text;
begin
 if NOT public.accounting_workspace_allowed123() then return false; end if;
 if public.is_admin() then return true; end if; IF p_target='sub-users-home14229' THEN SELECT module_actions113->p_target INTO a FROM public.user_permissions WHERE user_id=auth.uid(); RETURN p_action='view' AND coalesce(a ? 'view',false); END IF;
 if p_target in ('settings-users','settings-system','settings-backup113','settings-recovery113','settings-appearance113','settings-organization14229') then return false;end if;
 select to_jsonb(u) into p from public.user_permissions u where user_id=auth.uid();
 if p->'module_actions113' is not null and p->'module_actions113'<>'null'::jsonb then
  a:=p->'module_actions113'->p_target;
  return coalesce(a ? 'view' and a ? p_action,false);
 end if;
 -- Old accounts retain their previous action flags until their matrix is saved.
 parent:=case when p_target like 'menu-%' then 'menu' when p_target like 'inv-%' then 'inventory' when p_target like 'sub-users-%' then 'sub-users' when p_target like 'settings-%' then 'settings' when p_target like 'report-%' then 'reports' when p_target like 'payroll-%' or p_target like 'hr-%' then 'payroll' when p_target like 'tax-%' then 'tax-sso' when p_target like 'sec-%' or p_target in ('trial-balance','account-balances') then 'accounts' when p_target='dashboard' then 'dashboard' else 'transactions' end;
 if p_action='view' then return exists(select 1 from jsonb_array_elements_text(case when jsonb_typeof(p->'modules')='array' then p->'modules' else '[]'::jsonb end) m where m=p_target or m=parent or m='all:'||parent or m like '%:'||p_target);end if;
 return public.can_action113(p_target,'view') AND coalesce((p->>case p_action when 'edit' then 'can_manage_data' when 'export' then 'can_export' when 'approve' then 'can_approve' when 'post' then 'can_post_directly' when 'void' then 'can_void' else '' end)::boolean,false);
end $function$
;

CREATE OR REPLACE FUNCTION public.can_use_staff_account(p_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select public.is_admin() or (public.can_action113('sub-users-workspace','view') AND exists(
    select 1 from public.user_permissions p join public.profiles u on u.id=p.user_id
    where p.user_id=auth.uid() and u.status='active'
      and (p.allow_any_account or p_account_id=any(p.allowed_account_ids))
  ));
$function$
;

CREATE OR REPLACE FUNCTION public.can_workspace113(p_owner uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin()
 OR (auth.uid()=p_owner AND public.can_action113('sub-users-workspace','view'))
 OR (public.can_action113('user-entry-review','view') AND (
 EXISTS(SELECT 1 FROM user_permissions WHERE user_id=p_owner AND manager_id=auth.uid())
 OR EXISTS(SELECT 1 FROM review_routes14229 r JOIN staff_journals j ON j.id=r.journal_id WHERE j.owner_id=p_owner AND
 (r.current_reviewer=auth.uid() OR r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text)))))))
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_scheduled_posting93(p_occurrence uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.scheduled_journal_occurrences;j public.journal_entries;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Cancellation reason required';end if;
 select * into o from public.scheduled_journal_occurrences where id=p_occurrence for update;
 if not found then raise exception 'Scheduled posting not found';end if;
 if o.cancelled_at is not null then return;end if;
 select * into j from public.journal_entries where id=o.journal_entry_id for update;
 if not found then raise exception 'Journal entry not found';end if;
 if j.status<>'posted' then raise exception 'This journal is already voided or unavailable';end if;
 if exists(select 1 from public.accounting_periods where period_month=date_trunc('month',j.transaction_date)::date and status<>'open') then raise exception 'Reopen the posting period before cancelling this journal';end if;
 perform public.void_journal_entry(j.id,'Cancelled scheduled occurrence '||o.occurrence_date::text||': '||trim(p_reason));
 if exists(select 1 from public.journal_entries where id=j.id and status='posted') then raise exception 'The journal was not voided';end if;
 update public.scheduled_journal_occurrences set cancelled_at=now(),cancelled_by=auth.uid(),cancel_reason=trim(p_reason),reviewed_at=null,reviewed_by=null where id=o.id;
 -- Keep the consumed occurrence and schedule's next_due. Cancellation never reposts it.
end $function$
;

CREATE OR REPLACE FUNCTION public.capture_report_funds14254()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE period date; balances jsonb;
BEGIN
 period := (NEW.snapshot->'journal'->>'period_start')::date;
 IF period IS NULL THEN RAISE EXCEPTION 'Report period is required'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO balances FROM (
  SELECT a.id account_id,a.name,a.currency_code currency,
   coalesce(sum(l.debit-l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)<period),0) opening,
   coalesce(sum(l.debit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) received,
   coalesce(sum(l.credit) FILTER(WHERE coalesce(l.line_date,e.transaction_date)>=period),0) used,
   0::numeric handover,coalesce(sum(l.debit-l.credit),0) closing
  FROM public.accounts a
  LEFT JOIN public.journal_lines l ON l.account_id=a.id AND EXISTS(
   SELECT 1 FROM public.journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted'
   AND coalesce(l.line_date,h.transaction_date)<(period+interval '1 month')::date)
  LEFT JOIN public.journal_entries e ON e.id=l.journal_entry_id
  WHERE a.id IN (SELECT s.fund_account_id FROM public.staff_journal_lines s WHERE s.staff_journal_id=NEW.journal_id)
   OR a.id::text IN (SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]'::jsonb))
     FROM public.user_permissions up WHERE up.user_id=NEW.owner_id)
  GROUP BY a.id,a.name,a.currency_code,a.code ORDER BY a.code
 ) t;
 NEW.snapshot := NEW.snapshot || jsonb_build_object(
  'fund_snapshot14254',coalesce(balances,'[]'::jsonb),
  'fund_snapshot_at14254',now());
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.check_ledger_entry14228(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE e public.journal_entries;
BEGIN
 SELECT * INTO e FROM journal_entries WHERE id=p_id;
 IF NOT FOUND OR e.status::text<>'posted' THEN RETURN;END IF;
 IF (SELECT count(*) FROM journal_lines WHERE journal_entry_id=p_id)<2 THEN RAISE EXCEPTION 'A posted journal requires at least two lines';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_id AND
   (l.currency_code IS DISTINCT FROM a.currency_code OR NOT a.is_posting OR NOT a.is_active
    OR coalesce(l.line_date,e.transaction_date)<>e.transaction_date)) THEN RAISE EXCEPTION 'Journal account, currency or date mismatch';END IF;
 IF EXISTS(SELECT 1 FROM journal_lines WHERE journal_entry_id=p_id GROUP BY currency_code HAVING sum(debit)<>sum(credit))
  THEN RAISE EXCEPTION 'Every currency must balance';END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.check_workspace_request123()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare endpoint text;begin
 if auth.uid() is null then return;end if;
 if public.accounting_workspace_allowed123() then return;end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then
  raise insufficient_privilege using message='Active account required';
 end if;
 endpoint:=regexp_replace(rtrim(coalesce(current_setting('request.path',true),''),'/'),'^.*/','');
 if endpoint = any(array['profiles','restaurant_members121','restaurant_presentation121',
 'inventory_items104','inventory_movements104','menu_ingredients105','menu_items104','menu_categories104','menu_sales108',
 'pos_config118','pos_orders118','pos_shifts118','pos_cash118','pos_stock118',
 'is_admin','accounting_workspace_allowed123','restaurant_can121','restaurant_signed_in121','restaurant_table_can121','restaurant_delete121',
 'pos_snapshot118','pos_order118','pos_manage118','pos_import_online_menu120']) then return;end if;
 raise insufficient_privilege using message='Restaurant accounts cannot access Accounting data or operations';
end $function$
;

CREATE OR REPLACE FUNCTION public.close_opening_setup14234()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN UPDATE opening_state14234 SET closed=true WHERE id AND NOT closed;RETURN NEW;END $function$
;

CREATE OR REPLACE FUNCTION public.close_year136(p_year integer, p_confirmation text, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();checkup jsonb;cur text;r record;retained uuid;net numeric;entry uuid;ids jsonb:='[]';seq integer;prefix text;digits integer;numbering integer;anchor uuid;result jsonb;BEGIN
 IF p_confirmation IS DISTINCT FROM 'CLOSE YEAR '||p_year THEN RAISE EXCEPTION 'Confirmation must be CLOSE YEAR %',p_year;END IF;
 PERFORM pg_advisory_xact_lock(136,p_year);LOCK TABLE accounting_periods,journal_entries,journal_lines,staff_journals,entry_submissions IN SHARE ROW EXCLUSIVE MODE;
 checkup:=public.year_preflight136(p_year);IF coalesce((checkup->>'completed')::boolean,false) THEN RETURN checkup;END IF;
 IF jsonb_array_length(checkup->'blockers')>0 THEN RAISE EXCEPTION 'Year-end checks failed: %',checkup->'blockers';END IF;
 IF p_fingerprint IS DISTINCT FROM checkup->>'fingerprint' THEN RAISE EXCEPTION 'Balances changed; run the year-end checks again';END IF;
 SELECT id INTO anchor FROM journal_entries WHERE extract(year FROM transaction_date)=p_year AND status::text='posted' ORDER BY transaction_date LIMIT 1;
 SELECT journal_prefix,journal_digits INTO prefix,digits FROM accounting_id_settings WHERE id=true;prefix:=coalesce(nullif(prefix,''),'JRN');digits:=greatest(3,least(9,coalesce(digits,6)));
 INSERT INTO accounting_operations136 VALUES(pg_backend_pid(),txid_current(),actor);
 -- Authorised system closing only. Locked user records stay immutable.
 UPDATE accounting_periods SET status='open' WHERE period_month=make_date(p_year,12,1);
 INSERT INTO accounting_periods(period_month,status,updated_by) VALUES(make_date(p_year,12,1),'open',actor) ON CONFLICT(period_month) DO NOTHING;
 FOR cur IN SELECT DISTINCT value->>'currency' FROM jsonb_array_elements(checkup->'balances') WHERE upper(value->>'type') IN ('REVENUE','INCOME','EXPENSE') LOOP
  SELECT id INTO retained FROM accounts WHERE parent_code='3100' AND account_type='EQUITY' AND currency_code=cur AND is_posting AND is_active ORDER BY code LIMIT 1;
  SELECT coalesce(max(nullif(substring(entry_no FROM '([0-9]+)$'),'')::integer),0)+1 INTO numbering FROM journal_entries WHERE entry_no LIKE prefix||'-%';
  INSERT INTO journal_entries(entry_no,transaction_date,memo,reference,status,source,posted_by,posted_at,accounting_period_id)
  VALUES(prefix||'-'||lpad(numbering::text,digits,'0'),make_date(p_year,12,31),'Year-end closing '||p_year||' · '||cur,'YEAR-CLOSE-'||p_year||'-'||cur,'posted','system',actor,now(),(SELECT id FROM accounting_periods WHERE period_month=make_date(p_year,12,1))) RETURNING id INTO entry;
  seq:=0;net:=0;
  FOR r IN SELECT value FROM jsonb_array_elements(checkup->'balances') WHERE value->>'currency'=cur AND upper(value->>'type') IN ('REVENUE','INCOME','EXPENSE') LOOP
   seq:=seq+1;net:=net+(r.value->>'balance')::numeric;
   INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description) VALUES(entry,seq,(r.value->>'account_id')::uuid,cur,greatest(0,-(r.value->>'balance')::numeric),greatest(0,(r.value->>'balance')::numeric),make_date(p_year,12,31),'Close income/expense balance');
  END LOOP;
  IF net<>0 THEN INSERT INTO journal_lines(journal_entry_id,line_no,account_id,currency_code,debit,credit,line_date,description) VALUES(entry,seq+1,retained,cur,greatest(net,0),greatest(-net,0),make_date(p_year,12,31),'Transfer annual result to retained earnings');END IF;
  ids:=ids||jsonb_build_array(entry);
 END LOOP;
 -- Empty months are finalized too, preventing later backdated entries into the completed year.
 INSERT INTO accounting_periods(period_month,status,closed_at,locked_at,updated_by) SELECT make_date(p_year,m,1),'locked',now(),now(),actor FROM generate_series(1,12) m ON CONFLICT(period_month) DO UPDATE SET status='locked',locked_at=now(),updated_by=actor,updated_at=now();
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO result FROM (SELECT a.id account_id,a.code,a.name,a.account_type type,l.currency_code currency,sum(l.debit-l.credit) balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<make_date(p_year+1,1,1) GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0) x;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE')) THEN RAISE EXCEPTION 'Income or expense balance did not close';END IF;
 INSERT INTO year_closings136(year,actor,balances,closing_entries,anchor_entry) VALUES(p_year,actor,result,ids,anchor);
 INSERT INTO accounting_periods(period_month,status,updated_by) VALUES(make_date(p_year+1,1,1),'open',actor) ON CONFLICT(period_month) DO NOTHING;
 DELETE FROM accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 RETURN jsonb_build_object('completed',true,'year',p_year,'nextYear',p_year+1,'balances',result,'closingEntries',ids);
END $function$
;

CREATE OR REPLACE FUNCTION public.close_year14317(p_year integer, p_confirmation text, p_fingerprint text, p_acknowledgments jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE m integer; d date; a jsonb;
BEGIN
 FOR m IN 1..12 LOOP
  d=make_date(p_year,m,1);a=p_acknowledgments->to_char(d,'YYYY-MM');
  PERFORM public.ack_period14317(d,a->>'revision',coalesce((a->>'acknowledged')::boolean,false));
 END LOOP;
 PERFORM public.close_year136(p_year,p_confirmation,p_fingerprint);
 RETURN jsonb_build_object('year',p_year,'closed',true);
END $function$
;

CREATE OR REPLACE FUNCTION public.correct_scheduled_date92(p_occurrence uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.scheduled_journal_occurrences;j public.journal_entries;v_after jsonb;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into o from public.scheduled_journal_occurrences where id=p_occurrence for update;
 if not found or not o.posted_early then raise exception 'Early posting not found';end if;
 select * into j from public.journal_entries where id=o.journal_entry_id for update;
 if j.status<>'posted' then raise exception 'Only posted journals can be corrected';end if;
 if j.transaction_date=o.occurrence_date then return;end if;
 if exists(select 1 from public.accounting_periods where period_month in (date_trunc('month',j.transaction_date)::date,date_trunc('month',o.occurrence_date)::date) and status<>'open') then raise exception 'Reopen both affected periods before correcting the date';end if;
 update public.journal_entries set transaction_date=o.occurrence_date where id=j.id;
 update public.journal_lines set line_date=o.occurrence_date where journal_entry_id=j.id;
 select to_jsonb(e) into v_after from public.journal_entries e where e.id=j.id;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id) values('journal_entries',j.id::text,'UPDATE',to_jsonb(j),v_after,'Corrected earlier automatic posting to its scheduled occurrence date',auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.create_scheduled_journal91(p_title text, p_memo text, p_currency text, p_debit uuid, p_credit uuid, p_amount numeric, p_frequency text, p_rule text, p_start date, p_end date, p_count integer, p_reminder integer, p_auto boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;v_currency text;v_other text;v_day integer;v_first date;v_anchor date;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_title),'') is null or nullif(trim(p_memo),'') is null then raise exception 'Name and memo are required';end if;
 if p_frequency not in ('weekly','monthly','quarterly','yearly') or p_rule not in ('same_day','last_day') then raise exception 'Invalid frequency or date rule';end if;
 if p_amount is null or p_amount<=0 or p_debit is null or p_credit is null or p_debit=p_credit then raise exception 'Choose two different accounts and a positive amount';end if;
 select currency_code into v_currency from public.accounts where id=p_debit and is_active=true;
 select currency_code into v_other from public.accounts where id=p_credit and is_active=true;
 if v_currency is null or v_other is distinct from v_currency or v_currency is distinct from p_currency then raise exception 'Debit and credit accounts must use the selected currency';end if;
 if p_start is null or p_end is not null and p_end<p_start or p_count is not null and p_count<1 or p_reminder not between 0 and 90 then raise exception 'Invalid schedule dates, count or reminder';end if;
 v_day:=extract(day from p_start)::integer;
 v_first:=public.schedule_next_date91(p_start,p_frequency,p_rule,v_day,0);
 if p_end is not null and p_end<v_first then raise exception 'End date precedes first posting';end if;
 insert into public.scheduled_journals(schedule_no,title,memo,currency_code,debit_account_id,credit_account_id,amount,frequency,day_rule,anchor_day,start_date,next_due,end_date,max_occurrences,reminder_days,auto_post,created_by)
 values(public.next_schedule_no91(),trim(p_title),trim(p_memo),p_currency,p_debit,p_credit,p_amount,p_frequency,p_rule,v_day,p_start,v_first,p_end,p_count,p_reminder,p_auto,auth.uid()) returning id into v_id;
 return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.create_scheduled_journal92(p_title text, p_memo text, p_currency text, p_debit uuid, p_credit uuid, p_amount numeric, p_credit_amount numeric, p_frequency text, p_start date, p_end date, p_reminder integer, p_auto boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
 if p_amount is null or p_credit_amount is null or p_amount<=0 or p_credit_amount<=0 or p_amount::text='NaN' or p_credit_amount::text='NaN' or round(p_amount,2)<>round(p_credit_amount,2) then raise exception 'Positive debit and credit amounts must balance';end if;
 v_id:=public.create_scheduled_journal91(p_title,p_memo,p_currency,p_debit,p_credit,p_amount,p_frequency,'same_day',p_start,p_end,null,p_reminder,p_auto);
 update public.scheduled_journals set credit_amount=p_credit_amount where id=v_id;
 return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.current_access14228()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting account required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('profile',(SELECT to_jsonb(p) FROM profiles p WHERE p.id=auth.uid()),'permissions',(SELECT to_jsonb(u) FROM user_permissions u WHERE u.user_id=auth.uid()));
END $function$
;

CREATE OR REPLACE FUNCTION public.delete_budget14316(p_id uuid, p_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE target public.operational_reports%ROWTYPE; r public.operational_reports%ROWTYPE; deleted jsonb='[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 -- Prevent a linked allocation being inserted between selection and deletion.
 LOCK TABLE public.operational_reports IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO target FROM public.operational_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR target.version IS DISTINCT FROM p_version OR target.data->>'kind' IS DISTINCT FROM 'finance' THEN RAISE EXCEPTION 'Budget changed or is unavailable. Reopen History.'; END IF;
 FOR r IN SELECT * FROM public.operational_reports WHERE data->>'requestId14316'=p_id::text ORDER BY id LOOP
  -- Use the existing deletion journal. Support both deployed ID argument types.
  IF to_regprocedure('public.delete_record108(text,uuid,integer)') IS NOT NULL THEN
   EXECUTE 'SELECT public.delete_record108($1,$2::uuid,$3)' USING 'operational_reports',r.id,r.version;
  ELSIF to_regprocedure('public.delete_record108(text,text,integer)') IS NOT NULL THEN
   EXECUTE 'SELECT public.delete_record108($1,$2::text,$3)' USING 'operational_reports',r.id,r.version;
  ELSE RAISE EXCEPTION 'Install the existing audited record deletion function first'; END IF;
  deleted=deleted||jsonb_build_array(r.id);
 END LOOP;
 IF to_regprocedure('public.delete_record108(text,uuid,integer)') IS NOT NULL THEN
  EXECUTE 'SELECT public.delete_record108($1,$2::uuid,$3)' USING 'operational_reports',target.id,target.version;
 ELSIF to_regprocedure('public.delete_record108(text,text,integer)') IS NOT NULL THEN
  EXECUTE 'SELECT public.delete_record108($1,$2::text,$3)' USING 'operational_reports',target.id,target.version;
 ELSE RAISE EXCEPTION 'Install the existing audited record deletion function first'; END IF;
 RETURN jsonb_build_object('deletedIds',deleted||jsonb_build_array(target.id));
END $function$
;

CREATE OR REPLACE FUNCTION public.delete_one_audit1437(p_source text, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required';END IF;
 IF p_id IS NULL OR btrim(p_id)='' THEN RAISE EXCEPTION 'Choose one audit record';END IF;
 IF p_source='audit_log' THEN
  DELETE FROM public.audit_log WHERE id::text=p_id;
 ELSIF p_source='record_deletions108' AND to_regclass('public.record_deletions108') IS NOT NULL THEN
  EXECUTE 'DELETE FROM public.record_deletions108 WHERE id::text=$1' USING p_id;
 ELSE RAISE EXCEPTION 'Unknown audit source';END IF;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>1 THEN RAISE EXCEPTION 'Single-record deletion must not affect multiple records';END IF;
 RETURN jsonb_build_object('deleted',n,'id',p_id,'source',p_source);
END $function$
;

CREATE OR REPLACE FUNCTION public.delete_record108(p_table text, p_id uuid, p_version integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare count_deleted integer;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_table<>all(array['payroll_employees','payroll_leave_records','payroll_runs','operational_reports','company_documents105','inventory_items104','menu_ingredients105','menu_items104','menu_categories104','menu_sales108']) then raise exception 'Record type does not support deletion'; end if;
 execute format('delete from public.%I where id=$1 and version=$2',p_table) using p_id,p_version;
 get diagnostics count_deleted=row_count;
 if count_deleted<>1 then raise exception 'Record changed or was already deleted. Reload before trying again.'; end if;
 return true;
end $function$
;

CREATE OR REPLACE FUNCTION public.delete_scheduled_journal92(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.scheduled_journals;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Deletion reason required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule already deleted or unavailable';end if;
 perform set_config('app.schedule_delete_reason92',trim(p_reason),true);
 delete from public.scheduled_journals where id=p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.employee_photo113(p_user uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare photo text;
begin
 if not(public.is_admin() or auth.uid()=p_user) then raise exception 'This account is not assigned to you';end if;
 select e.data->>'photoData' into photo from public.payroll_employees e join public.profiles p on p.id=p_user
 where e.data->>'userId'=p.id::text or (nullif(lower(e.data->>'email'),'')=lower(p.email)) order by (e.data->>'userId'=p.id::text) desc nulls last limit 1;
 return photo;
end $function$
;

CREATE OR REPLACE FUNCTION public.finish_book_session136(p_session uuid, p_cancel boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();s book_sessions136;p accounting_periods;op jsonb;v jsonb; BEGIN
 SELECT * INTO s FROM book_sessions136 WHERE id=p_session FOR UPDATE;
 IF s.owner_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Correction session is unavailable';END IF;
 IF s.status<>'editing' THEN RETURN to_jsonb(s);END IF;
 SELECT * INTO p FROM accounting_periods WHERE id=s.period_id FOR UPDATE;
 IF p_cancel THEN UPDATE book_sessions136 SET status='cancelled',finished_at=now() WHERE id=s.id;RETURN jsonb_build_object('status','cancelled');END IF;
 LOCK TABLE journal_entries,journal_lines IN SHARE ROW EXCLUSIVE MODE;
 IF p.status<>'closed' OR public.book_snapshot136(p.id)<>s.original THEN RAISE EXCEPTION 'Book changed after reopening; cancel and review the latest data';END IF;
 INSERT INTO accounting_operations136 VALUES(pg_backend_pid(),txid_current(),actor);
 UPDATE accounting_periods SET status='open' WHERE id=p.id;
 FOR op IN SELECT value FROM jsonb_array_elements(s.operations) LOOP
  v:=op->'payload';
  IF op->>'kind'='post' THEN
   PERFORM public.post_manual_journal(p_transaction_date=>(v->>'p_transaction_date')::date,p_memo=>v->>'p_memo',p_lines=>v->'p_lines',p_prefix=>v->>'p_prefix',p_digits=>(v->>'p_digits')::integer);
  ELSIF op->>'kind'='revise' THEN
   PERFORM public.revise_open_journal_entry(p_entry_id=>(v->>'p_entry_id')::uuid,p_reason=>v->>'p_reason',p_transaction_date=>(v->>'p_transaction_date')::date,p_memo=>v->>'p_memo',p_lines=>v->'p_lines');
  ELSE PERFORM public.void_journal_entry(p_entry_id=>(v->>'p_entry_id')::uuid,p_reason=>v->>'p_reason');END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND date_trunc('month',coalesce(l.line_date,e.transaction_date))::date=p.period_month GROUP BY l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005) THEN RAISE EXCEPTION 'Corrected book does not balance';END IF;
 UPDATE accounting_periods SET status='closed',closed_at=now(),updated_at=now(),updated_by=actor WHERE id=p.id;
 UPDATE book_sessions136 SET status='committed',finished_at=now() WHERE id=s.id;
 DELETE FROM accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
 RETURN jsonb_build_object('status','committed');END $function$
;

CREATE OR REPLACE FUNCTION public.finish_book_session14317(p_session uuid, p_month date, p_revision text, p_acknowledged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE book jsonb;
BEGIN
 SELECT to_jsonb(b) INTO book FROM public.book_sessions136 b WHERE b.id=p_session;
 IF book IS NULL OR date_trunc('month',coalesce(book->>'month',book->>'period_month')::date)::date IS DISTINCT FROM date_trunc('month',p_month)::date THEN RAISE EXCEPTION 'Correction session month changed. Reopen the current session.';END IF;
 PERFORM public.ack_period14317(p_month,p_revision,p_acknowledged);
 PERFORM public.finish_book_session136(p_session,false);
 RETURN jsonb_build_object('closed',true);
END $function$
;

CREATE OR REPLACE FUNCTION public.fund_balances136(p_owner uuid, p_month date DEFAULT NULL::date)
 RETURNS TABLE(account_id uuid, name text, currency text, opening numeric, received numeric, used numeric, handover numeric, closing numeric, draft_in numeric, draft_out numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();BEGIN
 IF NOT public.can_workspace113(p_owner) THEN RAISE EXCEPTION 'Current workspace access required';END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active account required';END IF;
 RETURN QUERY SELECT a.id,a.name,a.currency_code,
 coalesce(sum(l.debit-l.credit) FILTER(WHERE p_month IS NOT NULL AND coalesce(l.line_date,e.transaction_date)<p_month),0),
 coalesce(sum(l.debit) FILTER(WHERE p_month IS NULL OR coalesce(l.line_date,e.transaction_date)>=p_month),0),
 coalesce(sum(l.credit) FILTER(WHERE p_month IS NULL OR coalesce(l.line_date,e.transaction_date)>=p_month),0),0::numeric,
 coalesce(sum(l.debit-l.credit),0),
 coalesce((SELECT sum(s.amount) FROM staff_journal_lines s JOIN staff_journals j ON j.id=s.staff_journal_id JOIN accounts counterpart ON counterpart.id=s.account_id WHERE j.owner_id=p_owner AND j.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.direction='in' AND counterpart.account_type<>'ASSET' AND (p_month IS NULL OR date_trunc('month',s.transaction_date)::date=p_month)),0),
 coalesce((SELECT sum(s.amount) FROM staff_journal_lines s JOIN staff_journals j ON j.id=s.staff_journal_id WHERE j.owner_id=p_owner AND j.status IN ('draft','returned','submitted') AND s.journal_entry_id IS NULL AND s.fund_account_id=a.id AND s.direction='out' AND (p_month IS NULL OR date_trunc('month',s.transaction_date)::date=p_month)),0)
 FROM accounts a JOIN user_permissions up ON up.user_id=p_owner AND a.id::text IN(SELECT jsonb_array_elements_text(coalesce(to_jsonb(up)->'assigned_fund_account_ids','[]')))
 LEFT JOIN journal_lines l ON l.account_id=a.id AND EXISTS(SELECT 1 FROM journal_entries h WHERE h.id=l.journal_entry_id AND h.status::text='posted' AND (p_month IS NULL OR coalesce(l.line_date,h.transaction_date)<(p_month+interval '1 month')::date))
 LEFT JOIN journal_entries e ON e.id=l.journal_entry_id GROUP BY a.id,a.name,a.currency_code ORDER BY a.code;
END $function$
;

CREATE OR REPLACE FUNCTION public.fund_request_guard14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE own uuid;fund uuid;review boolean;
BEGIN
 own:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
 fund:=CASE WHEN TG_OP='DELETE' THEN OLD.fund_account_id ELSE NEW.fund_account_id END;
 IF NOT public.can_workspace113(own) THEN RAISE EXCEPTION 'Assigned workspace access required';END IF;
 review:=TG_OP<>'INSERT' AND (TG_OP='DELETE' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by);
 IF NOT public.is_admin() AND (review OR own<>auth.uid()) AND NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer approval required';END IF;
 IF NOT review AND NOT public.can_action113(CASE WHEN own=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace edit permission required';END IF;
 IF TG_OP='UPDATE' AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.fund_account_id IS DISTINCT FROM OLD.fund_account_id) THEN RAISE EXCEPTION 'Adjustment owner and fund cannot be changed';END IF;
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM user_permissions WHERE user_id=own AND fund=ANY(assigned_fund_account_ids)) THEN RAISE EXCEPTION 'Fund is not assigned';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.fund_summary113(p_owner uuid, p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
 if not (public.can_workspace113(p_owner) and (public.is_admin() or public.can_action113('sub-users-workspace') or public.can_action113('user-entry-review'))) then raise exception 'This workspace is not assigned to you';end if;
 return public._fund_summary113(p_owner,p_month);
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_actions113()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare target text; action text := 'edit'; rowdata jsonb; olddata jsonb; matrix_set boolean;
begin
 if NOT public.accounting_workspace_allowed123() then raise exception 'Active accounting access required'; end if;
 if public.is_admin() then if tg_op='DELETE' then return old;else return new;end if;end if;
 select module_actions113 is not null into matrix_set from public.user_permissions where user_id=auth.uid();
 -- Both legacy and matrix accounts pass the same current action checks.
 rowdata:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 olddata:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 target:=tg_argv[0];
 if tg_op='DELETE' or rowdata->>'status' in ('voided','cancelled') then action:='void';
 elsif rowdata->>'status' is distinct from olddata->>'status' and rowdata->>'status' in ('posted','finalized') then action:='post';
 elsif rowdata->>'status' is distinct from olddata->>'status' and rowdata->>'status' like 'approved%' then action:='approve';end if;
 if target='staff' then
  target:=case when rowdata->>'owner_id'=auth.uid()::text then 'sub-users-workspace' else 'user-entry-review' end;
  if tg_table_name='staff_journal_lines' then
   if exists(select 1 from public.staff_journals where id::text=rowdata->>'staff_journal_id' and owner_id=auth.uid()) then target:='sub-users-workspace';else target:='user-entry-review';end if;
  end if;
 end if;
 if tg_argv[0]='staff' then
  if tg_table_name='staff_journals' and not public.can_workspace113((rowdata->>'owner_id')::uuid) then raise exception 'Workspace not assigned';end if;
  if tg_table_name='staff_journal_lines' and not exists(select 1 from public.staff_journals s where s.id::text=rowdata->>'staff_journal_id' and public.can_workspace113(s.owner_id)) then raise exception 'Workspace not assigned';end if;
 end if;
 if tg_table_name='journal_lines' AND tg_op='INSERT' THEN action:='post';END IF;
 if tg_table_name='accounting_periods' AND tg_op='INSERT' AND rowdata->>'status'='open' AND public.can_action113('journal','post') THEN RETURN NEW;END IF;
 if tg_table_name='staff_journal_lines' AND tg_op='UPDATE' AND rowdata->>'journal_entry_id' IS DISTINCT FROM olddata->>'journal_entry_id' THEN action:='post';end if;
 if not public.can_action113(target,action) then raise exception 'Permission denied: % / %',target,action;end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_delete108()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_table_name='payroll_runs' and old.data->>'status'='finalized' then raise exception 'Finalized payroll is immutable. Use a correction run.'; end if;
 if tg_table_name='payroll_employees' then
  lock table public.payroll_leave_records,public.payroll_runs in share row exclusive mode;
  if exists(select 1 from public.payroll_leave_records where data->>'employeeId'=old.id::text)
   or exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(coalesce(r.data->'rows','[]')) e where e->>'employeeId'=old.id::text)
   or jsonb_array_length(coalesce(old.data->'contracts99','[]'))>0 or jsonb_array_length(coalesce(old.data->'assessments99','[]'))>0 then raise exception 'Employee has linked history. Archive instead.'; end if;
 end if;
 if tg_table_name='payroll_leave_records' then
  lock table public.payroll_runs in share row exclusive mode;
  if old.data->>'status'='approved' then raise exception 'Cancel an approved leave record before deleting it.'; end if;
  if exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(coalesce(r.data->'rows','[]')) e where r.data->>'status'='finalized' and r.data->>'month'=old.data->>'month' and e->>'employeeId'=old.data->>'employeeId') then raise exception 'Leave included in finalized payroll is immutable.'; end if;
 end if;
 if tg_table_name in ('menu_items104','menu_ingredients105','menu_categories104') then
  lock table public.menu_items104,public.menu_sales108 in share row exclusive mode;
  if tg_table_name='menu_categories104' and exists(select 1 from public.menu_items104 where data->>'category'=old.id::text) then raise exception 'Category is in use.'; end if;
  if tg_table_name in ('menu_items104','menu_ingredients105') and exists(select 1 from public.menu_items104 m cross join lateral jsonb_array_elements(coalesce(m.data->'recipe','[]')) line where line->>'itemId'=old.id::text) then raise exception 'Component is used in a recipe or bundle.'; end if;
  if tg_table_name='menu_items104' and exists(select 1 from public.menu_sales108 where data->>'productId'=old.id::text) then raise exception 'Product has sales history. Make it unavailable instead.'; end if;
 end if;
 if tg_table_name='inventory_items104' then
  lock table public.inventory_movements104 in share row exclusive mode;
  if exists(select 1 from public.inventory_movements104 where data->>'itemId'=old.id::text) then raise exception 'Stock movements exist. Make the item inactive instead.'; end if;
 end if;
 insert into public.record_deletions108(table_name,record_id,record_data) values(tg_table_name,old.id,to_jsonb(old));
 return old;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_hr_calendar14306()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF NOT public.is_admin() OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active administrator access required'; END IF;
 IF TG_OP='UPDATE' AND NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Record changed elsewhere; reopen before saving'; END IF;
 IF TG_OP='INSERT' AND NEW.version<>1 THEN RAISE EXCEPTION 'New records must start at version 1'; END IF;
 NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
 INSERT INTO public.hr_calendar_history14306(record_table,record_id,before_data,after_data,changed_by)
 VALUES(TG_TABLE_NAME,NEW.id::text,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),auth.uid());
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.guard_ledger_assignment14281()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF (TG_OP='INSERT' AND cardinality(NEW.ledger_account_ids14281)>0)
 OR (TG_OP='UPDATE' AND NEW.ledger_account_ids14281 IS DISTINCT FROM OLD.ledger_account_ids14281) THEN
  IF auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Only an administrator may assign ledger access' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.guard_payroll_report_record82()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_op='UPDATE' then
  if new.version<>old.version+1 then raise exception 'Record version conflict'; end if;
  if tg_table_name='payroll_runs' and old.data->>'status'='finalized' then raise exception 'Finalized payroll is immutable. Create a new correction run.'; end if;
  new.created_at=old.created_at;
 end if;

 if tg_table_name='payroll_employees' and (coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'name'),'')='') then raise exception 'Employee code and name are required'; end if;
 if tg_table_name='payroll_runs' then
  if coalesce(new.data->>'status','') not in ('draft','finalized') or coalesce(new.data->>'month','') !~ '^\d{4}-(0[1-9]|1[0-2])$' or jsonb_typeof(new.data->'rows') is distinct from 'array' then raise exception 'Invalid payroll run'; end if;
  if new.data->>'status'='finalized' and (jsonb_typeof(new.data->'results') is distinct from 'array' or jsonb_typeof(new.data->'config') is distinct from 'object' or jsonb_array_length(new.data->'results')=0) then raise exception 'Finalized payroll requires calculated results and applied rules'; end if;
 end if;
 if tg_table_name='payroll_leave_records' then
  if coalesce(new.data->>'status','') not in ('pending','approved','cancelled') or not exists(select 1 from public.payroll_employees where id::text=new.data->>'employeeId') then raise exception 'Invalid leave record or employee'; end if;
  if exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=new.data->>'month' and employee->>'employeeId'=new.data->>'employeeId') then raise exception 'Payroll for this employee and month is finalized; retain the leave record and document corrections in a later period'; end if;
  if tg_op='UPDATE' and exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=old.data->>'month' and employee->>'employeeId'=old.data->>'employeeId') then raise exception 'Leave included in finalized payroll is immutable'; end if;
 end if;
 if tg_table_name='operational_reports' and coalesce(new.data->>'kind','') not in ('subuser','finance') then raise exception 'Invalid report type'; end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_payroll_report_record83()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if new.data is null then
  if tg_op='UPDATE' and old.data is not null then raise exception 'Cannot remove an application payroll snapshot'; end if;
  new.updated_at=now();new.updated_by=auth.uid();return new;
 end if;
 if jsonb_typeof(new.data)<>'object' then raise exception 'Invalid record data'; end if;
 if tg_op='UPDATE' then
  if new.version<>old.version+1 then raise exception 'Record version conflict'; end if;
  if tg_table_name='payroll_runs' and old.data->>'status'='finalized' then raise exception 'Finalized payroll is immutable. Create a new correction run.'; end if;
  new.created_at=old.created_at;
 end if;

 if tg_table_name='payroll_employees' and (coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'name'),'')='') then raise exception 'Employee code and name are required'; end if;
 if tg_table_name='payroll_runs' then
  if coalesce(new.data->>'status','') not in ('draft','finalized') or coalesce(new.data->>'month','') !~ '^\d{4}-(0[1-9]|1[0-2])$' or jsonb_typeof(new.data->'rows') is distinct from 'array' then raise exception 'Invalid payroll run'; end if;
  if new.data->>'status'='finalized' and (jsonb_typeof(new.data->'results') is distinct from 'array' or jsonb_typeof(new.data->'config') is distinct from 'object' or jsonb_array_length(new.data->'results')=0) then raise exception 'Finalized payroll requires calculated results and applied rules'; end if;
 end if;
 if tg_table_name='payroll_runs' then
  new.period_start=((new.data->>'month')||'-01')::date;
  new.period_end=(new.period_start+interval '1 month - 1 day')::date;
  new.status=new.data->>'status';
  if tg_op='INSERT' then new.created_by=auth.uid(); end if;
  if new.status='finalized' then
   if coalesce((new.data->>'isSample')::boolean,false) then raise exception 'Examples cannot be finalized as actual payroll'; end if;
   new.approved_by=auth.uid();
  end if;
 end if;
 if tg_table_name='payroll_leave_records' then
  if coalesce(new.data->>'status','') not in ('pending','approved','cancelled') or not exists(select 1 from public.payroll_employees where id::text=new.data->>'employeeId') then raise exception 'Invalid leave record or employee'; end if;
  if exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=new.data->>'month' and employee->>'employeeId'=new.data->>'employeeId') then raise exception 'Payroll for this employee and month is finalized; retain the leave record and document corrections in a later period'; end if;
  if tg_op='UPDATE' and exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=old.data->>'month' and employee->>'employeeId'=old.data->>'employeeId') then raise exception 'Leave included in finalized payroll is immutable'; end if;
 end if;
 if tg_table_name='operational_reports' and coalesce(new.data->>'kind','') not in ('subuser','finance') then raise exception 'Invalid report type'; end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_period_ack14317()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE current_check jsonb; acknowledgment jsonb;
BEGIN
 IF NEW.status IN('closed','locked') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
  current_check=public.period_pending14317(NEW.period_month);
  IF jsonb_array_length(current_check->'items')>0 THEN
   acknowledgment=coalesce(nullif(current_setting('app.period_ack14317',true),'')::jsonb,'{}'::jsonb)->to_char(NEW.period_month,'YYYY-MM');
   IF acknowledgment->>'actor' IS DISTINCT FROM auth.uid()::text OR acknowledgment->>'revision' IS DISTINCT FROM current_check->>'revision' THEN RAISE EXCEPTION 'Pending submissions require acknowledgment before closing or locking this month.';END IF;
  END IF;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.guard_sales108()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_op='UPDATE' and new.version<>old.version+1 then raise exception 'Record version conflict'; end if;
 if (new.data->>'date')::date is null or (new.data->>'quantity')::numeric<=0 or (new.data->>'unitCost')::numeric<=0 or (new.data->>'revenue')::numeric<0 or not (new.data ?& array['date','quantity','unitCost','revenue','productId','currency']) then raise exception 'Invalid sales values'; end if;
 if not exists(select 1 from public.menu_items104 where id::text=new.data->>'productId' and data->>'currency'=new.data->>'currency') then raise exception 'Product or currency no longer matches'; end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_separate_members123()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if exists(select 1 from profiles where id=new.user_id and role='admin') then return new;end if;
 if tg_table_name='restaurant_members121' then
  if exists(select 1 from user_permissions u where u.user_id=new.user_id and
    (coalesce(to_jsonb(u)->'modules','[]') not in ('[]'::jsonb,'null'::jsonb)
     or coalesce(to_jsonb(u)->'assigned_fund_account_ids','[]') not in ('[]'::jsonb,'null'::jsonb))) then
   raise exception 'Keep this Accounting account unchanged. Create a separate Restaurant staff account.';
  end if;
 elsif exists(select 1 from restaurant_members121 where user_id=new.user_id) then
  raise exception 'This is a Restaurant staff account. Create a separate Accounting sub-user account.';
 end if;return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do nothing;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.has_user_permission(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR CASE p_permission
 WHEN 'post' THEN public.can_action113('journal','post')
 WHEN 'approve' THEN public.can_action113('user-entry-review','approve')
 WHEN 'void' THEN public.can_action113('journal','void')
 WHEN 'export' THEN public.can_action113('journal','export') OR public.can_action113('document-editor105','export')
 WHEN 'data' THEN public.can_action113('journal','edit') ELSE false END)
$function$
;

CREATE OR REPLACE FUNCTION public.in_branch14229(p_owner uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR p_owner=auth.uid() OR EXISTS(
 WITH RECURSIVE branch(id,path) AS (
 SELECT user_id,ARRAY[auth.uid(),user_id] FROM user_permissions WHERE manager_id=auth.uid() AND user_id<>auth.uid()
 UNION ALL SELECT p.user_id,b.path||p.user_id FROM user_permissions p JOIN branch b ON p.manager_id=b.id WHERE NOT p.user_id=ANY(b.path)
 ) SELECT 1 FROM branch WHERE id=p_owner))
$function$
;

CREATE OR REPLACE FUNCTION public.install_catalog106()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare bundle jsonb := $catalog${"ingredients":[{"id":"696e4596-e261-429f-a589-05b2816f476c","data":{"code":"ING-01","name":"Brown rice","unit":"kg","cost":30000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":30000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"957e3b09-69f0-42ee-ac0d-33fa39145f65","data":{"code":"ING-02","name":"Firm tofu","unit":"kg","cost":45000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":45000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"dac45dbb-5d8c-4abc-a2b5-cbc6d77f0b21","data":{"code":"ING-03","name":"Cooked black beans","unit":"kg","cost":40000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":40000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"38af4174-4135-49d2-aa14-4a34abee9a04","data":{"code":"ING-04","name":"Cooked chickpeas","unit":"kg","cost":50000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":50000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"26934352-fbe1-4555-ab9b-416c28c87455","data":{"code":"ING-05","name":"Lettuce","unit":"kg","cost":30000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":30000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"955a533d-5245-484c-a5ff-171b966d7133","data":{"code":"ING-06","name":"Tomato","unit":"kg","cost":25000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":25000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"147f27a6-09d8-40b0-a1c4-d58ce3136371","data":{"code":"ING-07","name":"Carrot","unit":"kg","cost":18000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":18000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"c130b7e1-fc53-4b08-a76d-b268249d3764","data":{"code":"ING-08","name":"Avocado","unit":"kg","cost":80000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":80000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"091c75ba-fc62-413a-aeac-822291233e20","data":{"code":"ING-09","name":"Wholegrain bread","unit":"slice","cost":5000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":5000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"63ccdb39-5e8a-4408-a3c7-dd7fc42e618b","data":{"code":"ING-10","name":"Burger bun","unit":"each","cost":8000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":8000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"47410bd5-c8a4-4bff-a30f-280feb20184c","data":{"code":"ING-11","name":"Tortilla","unit":"each","cost":7000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":7000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"68955761-5cfc-440f-afd8-72ddd441558c","data":{"code":"ING-12","name":"Dry pasta","unit":"kg","cost":45000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":45000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"1b0f5377-778d-458e-abac-ae933f209df3","data":{"code":"ING-13","name":"Mushrooms","unit":"kg","cost":60000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":60000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"391ce603-419e-4a45-a510-53e44d924ea7","data":{"code":"ING-14","name":"Coconut milk","unit":"L","cost":30000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":30000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"62f00957-52c0-41f7-a362-fc0f8df18efe","data":{"code":"ING-15","name":"Banana","unit":"kg","cost":15000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":15000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"53b19c39-d7f8-4d44-a6c9-6f1f305408fc","data":{"code":"ING-16","name":"Mango","unit":"kg","cost":35000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":35000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"a53c23a0-74e4-41d3-a261-1a8532f5a562","data":{"code":"ING-17","name":"Mixed berries","unit":"kg","cost":100000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":100000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"ddca890e-1666-4c11-a2f9-661c8a9a8854","data":{"code":"ING-18","name":"Oat milk","unit":"L","cost":45000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":45000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"161f2308-4a3f-45a6-a931-518a260e128c","data":{"code":"ING-19","name":"Pitted dates","unit":"kg","cost":80000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":80000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"dc05391c-09f5-4b42-ab4a-013a0bd5feac","data":{"code":"ING-20","name":"Peanut butter","unit":"kg","cost":70000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":70000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"755e3f46-f171-4fa7-af9b-92a1998cbef5","data":{"code":"ING-21","name":"Lemon juice","unit":"L","cost":55000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":55000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"8c57388d-18b8-427e-a71d-c14973988504","data":{"code":"ING-22","name":"Ginger","unit":"kg","cost":30000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":30000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"797ad28a-8602-4bf0-a090-35670f66d4e4","data":{"code":"ING-23","name":"Potato","unit":"kg","cost":20000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":20000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"6a02681d-74f3-458a-a092-7dabf548bd59","data":{"code":"ING-24","name":"Cooking oil","unit":"L","cost":40000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":40000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"742156e3-5c99-4fdd-a990-12b51f201346","data":{"code":"ING-25","name":"House sauce","unit":"L","cost":60000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":60000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"1a94d912-36fe-479b-a031-309801261834","data":{"code":"ING-26","name":"Onion","unit":"kg","cost":22000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":22000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"6c3405ac-89c2-4081-ac1c-976969752e3d","data":{"code":"ING-27","name":"Spinach","unit":"kg","cost":30000,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":30000},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"997bcca7-a5c8-41a9-a679-3a5c842ec5ee","data":{"code":"ING-28","name":"Food packaging","unit":"each","cost":2500,"currency":"LAK","active":true,"purchaseQuantity":1,"purchasePrice":2500},"version":1,"created_at":"2026-09-01T00:00:00Z"}],"menu":[{"id":"314dd64c-69b8-44f3-af93-c2700743b141","data":{"code":"MENU-01","name":"Tofu Garden Bowl","category":"ae02b282-e240-429c-afa0-f216d7f06f50","price":65000,"currency":"LAK","active":true,"recipe":[{"itemId":"696e4596-e261-429f-a589-05b2816f476c","quantity":0.12},{"itemId":"957e3b09-69f0-42ee-ac0d-33fa39145f65","quantity":0.12},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.04},{"itemId":"147f27a6-09d8-40b0-a1c4-d58ce3136371","quantity":0.04},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"cd2e8365-701a-4596-a770-ecced5dfd30a","data":{"code":"MENU-02","name":"Chickpea Nourish Bowl","category":"ae02b282-e240-429c-afa0-f216d7f06f50","price":70000,"currency":"LAK","active":true,"recipe":[{"itemId":"696e4596-e261-429f-a589-05b2816f476c","quantity":0.12},{"itemId":"38af4174-4135-49d2-aa14-4a34abee9a04","quantity":0.15},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.06},{"itemId":"c130b7e1-fc53-4b08-a76d-b268249d3764","quantity":0.05},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"64ddcdef-a933-4717-a87e-9553f4e28078","data":{"code":"MENU-03","name":"Black Bean Bowl","category":"ae02b282-e240-429c-afa0-f216d7f06f50","price":60000,"currency":"LAK","active":true,"recipe":[{"itemId":"696e4596-e261-429f-a589-05b2816f476c","quantity":0.12},{"itemId":"dac45dbb-5d8c-4abc-a2b5-cbc6d77f0b21","quantity":0.15},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.05},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.05}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"1b2ef5ea-535d-40d0-aaec-1b20f94832a1","data":{"code":"MENU-04","name":"Mushroom Rice Bowl","category":"ae02b282-e240-429c-afa0-f216d7f06f50","price":70000,"currency":"LAK","active":true,"recipe":[{"itemId":"696e4596-e261-429f-a589-05b2816f476c","quantity":0.12},{"itemId":"1b0f5377-778d-458e-abac-ae933f209df3","quantity":0.12},{"itemId":"6c3405ac-89c2-4081-ac1c-976969752e3d","quantity":0.06},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"93904036-b3ed-45b1-ab21-7550644336b2","data":{"code":"MENU-05","name":"Classic Bean Burger","category":"34777e61-1266-41d3-ab4a-3b2e504013e8","price":75000,"currency":"LAK","active":true,"recipe":[{"itemId":"63ccdb39-5e8a-4408-a3c7-dd7fc42e618b","quantity":1},{"itemId":"dac45dbb-5d8c-4abc-a2b5-cbc6d77f0b21","quantity":0.13},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.03},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.04},{"itemId":"797ad28a-8602-4bf0-a090-35670f66d4e4","quantity":0.15},{"itemId":"6a02681d-74f3-458a-a092-7dabf548bd59","quantity":0.015}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"24e6215b-d887-4aeb-ab61-f05b394a8958","data":{"code":"MENU-06","name":"Tofu Burger","category":"34777e61-1266-41d3-ab4a-3b2e504013e8","price":80000,"currency":"LAK","active":true,"recipe":[{"itemId":"63ccdb39-5e8a-4408-a3c7-dd7fc42e618b","quantity":1},{"itemId":"957e3b09-69f0-42ee-ac0d-33fa39145f65","quantity":0.15},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.03},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03},{"itemId":"797ad28a-8602-4bf0-a090-35670f66d4e4","quantity":0.15}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"115c7b5d-b2b3-47f2-adba-69254541a8da","data":{"code":"MENU-07","name":"Mushroom Burger","category":"34777e61-1266-41d3-ab4a-3b2e504013e8","price":85000,"currency":"LAK","active":true,"recipe":[{"itemId":"63ccdb39-5e8a-4408-a3c7-dd7fc42e618b","quantity":1},{"itemId":"1b0f5377-778d-458e-abac-ae933f209df3","quantity":0.14},{"itemId":"1a94d912-36fe-479b-a031-309801261834","quantity":0.03},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03},{"itemId":"797ad28a-8602-4bf0-a090-35670f66d4e4","quantity":0.15}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"bf7e7c28-6fb6-4412-a115-2d167ab0ea46","data":{"code":"MENU-08","name":"Avocado Sandwich","category":"5ed52395-a1a0-4c31-a187-b24ec248b3a0","price":65000,"currency":"LAK","active":true,"recipe":[{"itemId":"091c75ba-fc62-413a-aeac-822291233e20","quantity":2},{"itemId":"c130b7e1-fc53-4b08-a76d-b268249d3764","quantity":0.1},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.05},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"a5036177-9007-4ad7-a9ee-96b802a3f3d6","data":{"code":"MENU-09","name":"Chickpea Sandwich","category":"5ed52395-a1a0-4c31-a187-b24ec248b3a0","price":60000,"currency":"LAK","active":true,"recipe":[{"itemId":"091c75ba-fc62-413a-aeac-822291233e20","quantity":2},{"itemId":"38af4174-4135-49d2-aa14-4a34abee9a04","quantity":0.12},{"itemId":"147f27a6-09d8-40b0-a1c4-d58ce3136371","quantity":0.04},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"3fac7569-783b-4807-a550-dff74f222685","data":{"code":"MENU-10","name":"Tofu Club Sandwich","category":"5ed52395-a1a0-4c31-a187-b24ec248b3a0","price":75000,"currency":"LAK","active":true,"recipe":[{"itemId":"091c75ba-fc62-413a-aeac-822291233e20","quantity":3},{"itemId":"957e3b09-69f0-42ee-ac0d-33fa39145f65","quantity":0.12},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.04},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.04}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"850da61c-51ce-4a0c-a898-b04551125c70","data":{"code":"MENU-11","name":"Bean Burrito","category":"eb9a812d-b82a-4593-a73b-ccf63026fc28","price":70000,"currency":"LAK","active":true,"recipe":[{"itemId":"47410bd5-c8a4-4bff-a30f-280feb20184c","quantity":1},{"itemId":"dac45dbb-5d8c-4abc-a2b5-cbc6d77f0b21","quantity":0.13},{"itemId":"696e4596-e261-429f-a589-05b2816f476c","quantity":0.06},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.05},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"b65d1843-e13b-463c-a454-a611a39ac153","data":{"code":"MENU-12","name":"Tofu Wrap","category":"eb9a812d-b82a-4593-a73b-ccf63026fc28","price":65000,"currency":"LAK","active":true,"recipe":[{"itemId":"47410bd5-c8a4-4bff-a30f-280feb20184c","quantity":1},{"itemId":"957e3b09-69f0-42ee-ac0d-33fa39145f65","quantity":0.12},{"itemId":"26934352-fbe1-4555-ab9b-416c28c87455","quantity":0.05},{"itemId":"147f27a6-09d8-40b0-a1c4-d58ce3136371","quantity":0.04},{"itemId":"742156e3-5c99-4fdd-a990-12b51f201346","quantity":0.03}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"8852f103-324d-48f2-a063-d5d10cce2565","data":{"code":"MENU-13","name":"Tomato Mushroom Pasta","category":"fd443eab-a0dc-43e5-a2b4-2c2c211cf37d","price":85000,"currency":"LAK","active":true,"recipe":[{"itemId":"68955761-5cfc-440f-afd8-72ddd441558c","quantity":0.12},{"itemId":"955a533d-5245-484c-a5ff-171b966d7133","quantity":0.18},{"itemId":"1b0f5377-778d-458e-abac-ae933f209df3","quantity":0.08},{"itemId":"6a02681d-74f3-458a-a092-7dabf548bd59","quantity":0.01}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"edef9611-a4f6-42b3-ae13-7688c8ff9118","data":{"code":"MENU-14","name":"Creamy Coconut Pasta","category":"fd443eab-a0dc-43e5-a2b4-2c2c211cf37d","price":90000,"currency":"LAK","active":true,"recipe":[{"itemId":"68955761-5cfc-440f-afd8-72ddd441558c","quantity":0.12},{"itemId":"391ce603-419e-4a45-a510-53e44d924ea7","quantity":0.12},{"itemId":"6c3405ac-89c2-4081-ac1c-976969752e3d","quantity":0.05},{"itemId":"1b0f5377-778d-458e-abac-ae933f209df3","quantity":0.08}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"ab85c6e7-e6f0-4410-a671-f1d55a78536b","data":{"code":"MENU-15","name":"Banana Date Smoothie","category":"e4951e34-fa11-4907-a844-c158b1cc8359","price":45000,"currency":"LAK","active":true,"recipe":[{"itemId":"62f00957-52c0-41f7-a362-fc0f8df18efe","quantity":0.15},{"itemId":"161f2308-4a3f-45a6-a931-518a260e128c","quantity":0.03},{"itemId":"ddca890e-1666-4c11-a2f9-661c8a9a8854","quantity":0.18}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"4db262e5-50ad-4a1f-a91f-68a913bbacdd","data":{"code":"MENU-16","name":"Mango Smoothie","category":"e4951e34-fa11-4907-a844-c158b1cc8359","price":50000,"currency":"LAK","active":true,"recipe":[{"itemId":"53b19c39-d7f8-4d44-a6c9-6f1f305408fc","quantity":0.18},{"itemId":"62f00957-52c0-41f7-a362-fc0f8df18efe","quantity":0.07},{"itemId":"ddca890e-1666-4c11-a2f9-661c8a9a8854","quantity":0.15}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"11a4a2ef-c955-486b-a28e-9df650ce5379","data":{"code":"MENU-17","name":"Berry Smoothie","category":"e4951e34-fa11-4907-a844-c158b1cc8359","price":60000,"currency":"LAK","active":true,"recipe":[{"itemId":"a53c23a0-74e4-41d3-a261-1a8532f5a562","quantity":0.12},{"itemId":"62f00957-52c0-41f7-a362-fc0f8df18efe","quantity":0.08},{"itemId":"ddca890e-1666-4c11-a2f9-661c8a9a8854","quantity":0.18}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"300388bb-a83a-4e3b-a5df-083087953c3c","data":{"code":"MENU-18","name":"Peanut Banana Smoothie","category":"e4951e34-fa11-4907-a844-c158b1cc8359","price":55000,"currency":"LAK","active":true,"recipe":[{"itemId":"62f00957-52c0-41f7-a362-fc0f8df18efe","quantity":0.15},{"itemId":"dc05391c-09f5-4b42-ab4a-013a0bd5feac","quantity":0.03},{"itemId":"ddca890e-1666-4c11-a2f9-661c8a9a8854","quantity":0.18},{"itemId":"161f2308-4a3f-45a6-a931-518a260e128c","quantity":0.02}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"57568a31-a3f1-429f-a4e2-fe45a3824097","data":{"code":"MENU-19","name":"Lemon Ginger Refresher","category":"39eb9c08-d318-45e5-a0fb-071eed25dc57","price":35000,"currency":"LAK","active":true,"recipe":[{"itemId":"755e3f46-f171-4fa7-af9b-92a1998cbef5","quantity":0.04},{"itemId":"8c57388d-18b8-427e-a71d-c14973988504","quantity":0.01}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"3b00ea2d-ee3b-438d-ab28-ba1b30efdf0d","data":{"code":"MENU-20","name":"Carrot Ginger Refresher","category":"39eb9c08-d318-45e5-a0fb-071eed25dc57","price":45000,"currency":"LAK","active":true,"recipe":[{"itemId":"147f27a6-09d8-40b0-a1c4-d58ce3136371","quantity":0.25},{"itemId":"8c57388d-18b8-427e-a71d-c14973988504","quantity":0.01},{"itemId":"755e3f46-f171-4fa7-af9b-92a1998cbef5","quantity":0.02}],"description":""},"version":1,"created_at":"2026-09-01T00:00:00Z"}],"categories":[{"id":"ae02b282-e240-429c-afa0-f216d7f06f50","data":{"code":"CAT-0","name":"Bowls"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"34777e61-1266-41d3-ab4a-3b2e504013e8","data":{"code":"CAT-1","name":"Burgers"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"5ed52395-a1a0-4c31-a187-b24ec248b3a0","data":{"code":"CAT-2","name":"Sandwiches"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"eb9a812d-b82a-4593-a73b-ccf63026fc28","data":{"code":"CAT-3","name":"Tex-Mex"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"fd443eab-a0dc-43e5-a2b4-2c2c211cf37d","data":{"code":"CAT-4","name":"Pasta"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"e4951e34-fa11-4907-a844-c158b1cc8359","data":{"code":"CAT-5","name":"Smoothies"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"39eb9c08-d318-45e5-a0fb-071eed25dc57","data":{"code":"CAT-6","name":"Refreshers"},"version":1,"created_at":"2026-09-01T00:00:00Z"}],"items":[{"id":"84cdf888-92f1-42a5-ad9b-3452368f3dae","data":{"code":"SALE-0","name":"Bottled water","unit":"each","cost":10000,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"6d803bfa-c96c-45cc-ae55-1e2b1876d924","data":{"code":"SALE-1","name":"House granola pack","unit":"each","cost":12500,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"6738ba48-6799-4265-a1b6-5d8bb307554e","data":{"code":"SALE-2","name":"Peanut butter jar","unit":"each","cost":15000,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"29e23c8a-a34c-40e1-a974-2bba10a2dd66","data":{"code":"SALE-3","name":"Herbal tea pack","unit":"each","cost":17500,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"3196abc9-0560-40f9-a031-f9c066b9e5f1","data":{"code":"SALE-4","name":"Dried mango pack","unit":"each","cost":20000,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"67f0bd22-ada6-4796-a662-408e0fd84066","data":{"code":"SALE-5","name":"Coffee beans bag","unit":"each","cost":22500,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"d32579fb-49a5-407c-a576-1bbbbac9ef49","data":{"code":"SALE-6","name":"Reusable cup","unit":"each","cost":25000,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"513163d9-6abe-43b3-a8b4-ad0f285df5e5","data":{"code":"SALE-7","name":"Canvas tote bag","unit":"each","cost":27500,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"c16ec05f-d9ce-4d4f-a372-9abba85a9f2c","data":{"code":"SALE-8","name":"Oat cookies pack","unit":"each","cost":30000,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"7ed93ba4-78d2-4d80-a313-fa44fe2631be","data":{"code":"SALE-9","name":"Gift voucher","unit":"each","cost":32500,"currency":"LAK","reorder":5,"active":true},"version":1,"created_at":"2026-09-01T00:00:00Z"}],"moves":[{"id":"cbf5c462-e928-46cc-a1fc-95fac958ddba","data":{"kind":"in","itemId":"84cdf888-92f1-42a5-ad9b-3452368f3dae","itemName":"Bottled water","date":"2026-09-01","quantity":20,"cost":10000,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"3759a48e-86f0-44ea-acfa-ab5e16af7113","data":{"kind":"in","itemId":"6d803bfa-c96c-45cc-ae55-1e2b1876d924","itemName":"House granola pack","date":"2026-09-01","quantity":20,"cost":12500,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"15038eba-c8ac-40d6-a4ba-4c2297c5301d","data":{"kind":"in","itemId":"6738ba48-6799-4265-a1b6-5d8bb307554e","itemName":"Peanut butter jar","date":"2026-09-01","quantity":20,"cost":15000,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"edcf5d99-3336-4705-a1bd-150b7fba355e","data":{"kind":"in","itemId":"29e23c8a-a34c-40e1-a974-2bba10a2dd66","itemName":"Herbal tea pack","date":"2026-09-01","quantity":20,"cost":17500,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"7f0d975c-1430-478d-aded-64f453f47ba4","data":{"kind":"in","itemId":"3196abc9-0560-40f9-a031-f9c066b9e5f1","itemName":"Dried mango pack","date":"2026-09-01","quantity":20,"cost":20000,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"7e838fe8-e97d-4818-a204-b5811b971f52","data":{"kind":"in","itemId":"67f0bd22-ada6-4796-a662-408e0fd84066","itemName":"Coffee beans bag","date":"2026-09-01","quantity":20,"cost":22500,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"7a7b5e83-83b2-4be4-a909-63b4a14ac6ed","data":{"kind":"in","itemId":"d32579fb-49a5-407c-a576-1bbbbac9ef49","itemName":"Reusable cup","date":"2026-09-01","quantity":20,"cost":25000,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"de5bb080-1802-45bf-a5de-7aad9842bbe7","data":{"kind":"in","itemId":"513163d9-6abe-43b3-a8b4-ad0f285df5e5","itemName":"Canvas tote bag","date":"2026-09-01","quantity":20,"cost":27500,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"18271612-f062-4a14-a297-c912860c5dd2","data":{"kind":"in","itemId":"c16ec05f-d9ce-4d4f-a372-9abba85a9f2c","itemName":"Oat cookies pack","date":"2026-09-01","quantity":20,"cost":30000,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"},{"id":"0c551a6b-0007-436a-a013-c7b6b86ed061","data":{"kind":"in","itemId":"7ed93ba4-78d2-4d80-a313-fa44fe2631be","itemName":"Gift voucher","date":"2026-09-01","quantity":20,"cost":32500,"currency":"LAK","reference":"OPENING-CATALOG-106"},"version":1,"created_at":"2026-09-01T00:00:00Z"}]}$catalog$::jsonb; r jsonb; d jsonb; actual uuid; mapping jsonb := '{}'::jsonb;
begin
if not public.is_admin() then raise exception 'Administrator access required'; end if;
perform pg_advisory_xact_lock(106,2026);
if exists(select 1 from public.catalog_installations106 where name='initial-catalog') then return; end if;
for r in select value from jsonb_array_elements(bundle->'ingredients') loop
d:=r->'data';
select id into actual from public.menu_ingredients105 where lower(data->>'code')=lower(d->>'code');
if actual is null then insert into public.menu_ingredients105(id,data) values((r->>'id')::uuid,d) returning id into actual; end if;
mapping:=mapping||jsonb_build_object(r->>'id',actual::text);
end loop;
for r in select value from jsonb_array_elements(bundle->'categories') loop
d:=r->'data';
select id into actual from public.menu_categories104 where lower(data->>'code')=lower(d->>'code');
if actual is null then insert into public.menu_categories104(id,data) values((r->>'id')::uuid,d) returning id into actual; end if;
mapping:=mapping||jsonb_build_object(r->>'id',actual::text);
end loop;
for r in select value from jsonb_array_elements(bundle->'items') loop
d:=r->'data';
select id into actual from public.inventory_items104 where lower(data->>'code')=lower(d->>'code');
if actual is null then insert into public.inventory_items104(id,data) values((r->>'id')::uuid,d) returning id into actual; end if;
mapping:=mapping||jsonb_build_object(r->>'id',actual::text);
end loop;
for r in select value from jsonb_array_elements(bundle->'menu') loop
d:=r->'data';
d:=jsonb_set(d,'{category}',mapping->(d->>'category'));
d:=jsonb_set(d,'{recipe}',(select jsonb_agg(jsonb_set(l,'{itemId}',mapping->(l->>'itemId'))) from jsonb_array_elements(d->'recipe') l));
if not exists(select 1 from public.menu_items104 where lower(data->>'code')=lower(d->>'code')) then insert into public.menu_items104(id,data) values((r->>'id')::uuid,d);end if;
end loop;
for r in select value from jsonb_array_elements(bundle->'moves') loop
d:=r->'data';actual:=(mapping->>(d->>'itemId'))::uuid;
-- Opening stock is added only for newly installed products without movements.
if actual=(d->>'itemId')::uuid and not exists(select 1 from public.inventory_movements104 where data->>'itemId'=actual::text) then
insert into public.inventory_movements104(id,data) values((r->>'id')::uuid,d);end if;
end loop;
insert into public.catalog_installations106(name) values('initial-catalog');
end $function$
;

CREATE OR REPLACE FUNCTION public.installation_status14320()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')
 OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('installation',(SELECT to_jsonb(i) FROM installation14320 i WHERE id),
  'company',(SELECT to_jsonb(b) FROM business_settings b WHERE id),
  'accounts',(SELECT to_jsonb(b) FROM budget_settings14313 b WHERE id));
END $function$
;

CREATE OR REPLACE FUNCTION public.internal_operation136()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.accounting_operations136 WHERE backend=pg_backend_pid() AND transaction_id=txid_current() AND actor=auth.uid())
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and status='active')
$function$
;

CREATE OR REPLACE FUNCTION public.journal_receipt14228(p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.operation_receipts14228;
BEGIN
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal permission required';END IF;
 SELECT * INTO r FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key AND operation='journal';
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result);
END $function$
;

CREATE OR REPLACE FUNCTION public.journal_visible14229(p_journal uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.accounting_workspace_allowed123() AND EXISTS(
 SELECT 1 FROM staff_journals j WHERE j.id=p_journal AND (public.is_admin()
 OR (j.owner_id=auth.uid() AND public.can_action113('sub-users-workspace','view'))
 OR (public.can_action113('user-entry-review','view') AND (
 EXISTS(SELECT 1 FROM user_permissions WHERE user_id=j.owner_id AND manager_id=auth.uid())
 OR EXISTS(SELECT 1 FROM review_routes14229 r WHERE r.journal_id=j.id AND (r.current_reviewer=auth.uid()
 OR r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text))))))))
$function$
;

CREATE OR REPLACE FUNCTION public.ledger_boundary136()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE d date;s text;eid uuid; BEGIN
 IF public.internal_operation136() THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_TABLE_NAME='accounting_periods' THEN
  IF TG_OP='UPDATE' AND NEW.status='locked' AND EXISTS(SELECT 1 FROM book_sessions136 WHERE period_id=OLD.id AND status='editing') THEN RAISE EXCEPTION 'Finish or cancel the correction session before locking';END IF;
  IF TG_OP='UPDATE' AND OLD.status='locked' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Locked periods are final; add an audit review and post any adjustment in an open period';END IF;
  IF TG_OP='UPDATE' AND OLD.status='closed' AND NEW.status='open' THEN RAISE EXCEPTION 'Use a correction session to reopen a closed book';END IF;
  IF TG_OP='DELETE' AND OLD.status='locked' THEN RAISE EXCEPTION 'Locked periods cannot be removed through ordinary actions';END IF;
 ELSE
  IF TG_TABLE_NAME='journal_entries' THEN
   IF TG_OP<>'INSERT' THEN
    SELECT status INTO s FROM accounting_periods WHERE period_month=date_trunc('month',OLD.transaction_date)::date FOR SHARE;
    IF s IN ('closed','locked') THEN RAISE EXCEPTION 'Closed or locked transactions cannot be changed directly'; END IF;
   END IF;
   IF TG_OP<>'DELETE' THEN d:=NEW.transaction_date; ELSE d:=OLD.transaction_date; END IF;
  ELSE
   IF TG_OP<>'INSERT' THEN
    SELECT transaction_date INTO d FROM journal_entries WHERE id=OLD.journal_entry_id;
    SELECT status INTO s FROM accounting_periods WHERE period_month=date_trunc('month',d)::date FOR SHARE;
    IF s IN ('closed','locked') THEN RAISE EXCEPTION 'Closed or locked journal lines cannot be changed directly';END IF;
   END IF;
   IF TG_OP<>'DELETE' THEN eid:=NEW.journal_entry_id;d:=NEW.line_date; ELSE eid:=OLD.journal_entry_id;d:=OLD.line_date;END IF;
   d:=coalesce(d,(SELECT transaction_date FROM journal_entries WHERE id=eid));
  END IF;
  SELECT status INTO s FROM accounting_periods WHERE period_month=date_trunc('month',d)::date FOR SHARE;
  IF s IN ('closed','locked') OR EXISTS(SELECT 1 FROM year_closings136 WHERE year=extract(year FROM d)::integer) THEN RAISE EXCEPTION 'Posting date belongs to a finalized period';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.ledger_integrity14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF TG_TABLE_NAME='journal_entries' THEN
  IF TG_OP<>'DELETE' THEN PERFORM public.check_ledger_entry14228(NEW.id);END IF;
 ELSE
  IF TG_OP<>'INSERT' THEN PERFORM public.check_ledger_entry14228(OLD.journal_entry_id);END IF;
  IF TG_OP<>'DELETE' THEN PERFORM public.check_ledger_entry14228(NEW.journal_entry_id);END IF;
 END IF;
 RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.ledger_lock14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 -- Serialize concurrent edits to the same aggregate before deferred validation.
 PERFORM 1 FROM journal_entries WHERE id=ANY(ARRAY[
  CASE WHEN TG_OP='INSERT' THEN NULL::uuid ELSE OLD.journal_entry_id END,
  CASE WHEN TG_OP='DELETE' THEN NULL::uuid ELSE NEW.journal_entry_id END]) ORDER BY id FOR UPDATE;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.link_account14320(p_actor uuid, p_email text, p_user uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE r account_provisioning14320;BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Administrator required';END IF;
 SELECT * INTO r FROM account_provisioning14320 WHERE email=p_email FOR UPDATE;
 IF r.email IS NULL OR r.actor_id<>p_actor OR r.full_name<>p_name OR (r.user_id IS NOT NULL AND r.user_id<>p_user) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=p_email AND raw_app_meta_data->>'provision_request14320'=r.request_id::text) THEN RAISE EXCEPTION 'Account request mismatch';END IF;
 -- Auth may already have created the profile through its normal trigger.
 INSERT INTO profiles(id,email,full_name,role,status) VALUES(p_user,p_email,p_name,'submitter','active') ON CONFLICT(id) DO NOTHING;
 IF r.user_id IS NULL THEN
  INSERT INTO private.password_reset14257(user_id,request_id,temporary_hash,required,issued_by)
  SELECT p_user,r.request_id,encrypted_password,true,p_actor FROM auth.users WHERE id=p_user
  ON CONFLICT(user_id) DO NOTHING;
 END IF;
 UPDATE account_provisioning14320 SET user_id=p_user WHERE email=p_email;
 RETURN jsonb_build_object('user_id',p_user);
END $function$
;

CREATE OR REPLACE FUNCTION public.link_recorded_workspace_handover(p_line_id uuid, p_entry_no text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare source_line public.staff_journal_lines; journal_row public.staff_journals; posted_id uuid;
begin
 if not public.has_user_permission('approve') then raise exception 'Reviewer permission required'; end if;
 select j.* into journal_row from public.staff_journals j join public.staff_journal_lines l on l.staff_journal_id=j.id where l.id=p_line_id for update of j;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer required';END IF;
 select * into source_line from public.staff_journal_lines where id=p_line_id for update;
 if not found or source_line.entry_kind<>'handover' or source_line.journal_entry_id is not null or journal_row.status<>'submitted' then raise exception 'Choose an unlinked handover awaiting review'; end if;
 select id into posted_id from public.journal_entries where entry_no=trim(p_entry_no) and status='posted' and transaction_date=source_line.transaction_date for update;
 if posted_id is null then raise exception 'No posted entry with that number and handover date'; end if;
 if exists(select 1 from public.staff_journal_lines where journal_entry_id=posted_id) then raise exception 'This journal entry is already linked to a workspace report'; end if;
 if (select count(*) from public.journal_lines where journal_entry_id=posted_id)<>2
 or not exists(select 1 from public.journal_lines where journal_entry_id=posted_id and account_id=source_line.account_id and debit=source_line.amount and credit=0 and currency_code=source_line.currency_code)
 or not exists(select 1 from public.journal_lines where journal_entry_id=posted_id and account_id=source_line.fund_account_id and credit=source_line.amount and debit=0 and currency_code=source_line.currency_code) then raise exception 'The posted entry must exactly match the receiving account debit, clearing credit, currency and amount'; end if;
 update public.staff_journal_lines set journal_entry_id=posted_id where id=p_line_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journal_lines',p_line_id::text,'LINK',jsonb_build_object('journal_entry_id',posted_id),'Existing cash handover linked to prevent duplicate posting',auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.mark_journal_entry_under_review(p_entry_id uuid, p_note text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old public.journal_entries;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_old from public.journal_entries where id=p_entry_id for update;
  if not found or v_old.status<>'posted' then raise exception 'Posted journal entry not found'; end if;
  update public.journal_entries set correction_status='under_review',review_note=coalesce(p_note,''),updated_at=now() where id=p_entry_id;
  insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('journal_entries',p_entry_id::text,'MARK_UNDER_REVIEW',to_jsonb(v_old),jsonb_build_object('correction_status','under_review'),coalesce(p_note,''),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.next_adjustment_no89()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p text;d integer;n text;
begin
 select adjustment_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.fund_adjustment_request_seq')::text;
 return coalesce(p,'ADJ')||'-'||lpad(n,greatest(coalesce(d,4),length(n)),'0');
end $function$
;

CREATE OR REPLACE FUNCTION public.next_schedule_no91()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p text;d integer;n text;
begin
 select schedule_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.scheduled_journal_number_seq')::text;
 return coalesce(p,'SCH')||'-'||lpad(n,greatest(coalesce(d,4),length(n)),'0');
end $function$
;

CREATE OR REPLACE FUNCTION public.no_duplicate_release136()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NEW.direction='in' AND NEW.entry_kind<>'collection' AND EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND account_type='ASSET') THEN RAISE EXCEPTION 'Fund release acknowledgements cannot be posted as new income';END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.ojm_guard_postable_account_20260929()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE key text; account_uuid uuid; permitted boolean;
BEGIN
  FOREACH key IN ARRAY TG_ARGV LOOP
    account_uuid := NULLIF(to_jsonb(NEW)->>key,'')::uuid;
    IF account_uuid IS NOT NULL THEN
      SELECT a.is_posting AND a.is_active INTO permitted FROM public.accounts a WHERE a.id=account_uuid;
      IF permitted IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Account % must be an active posting child',account_uuid;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.opening_status14234()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s opening_state14234;BEGIN
 PERFORM public.require_admin136();SELECT * INTO s FROM opening_state14234 WHERE id;
 RETURN jsonb_build_object('available',NOT s.closed AND NOT EXISTS(SELECT 1 FROM journal_entries),'generation',s.generation);
END $function$
;

CREATE OR REPLACE FUNCTION public.operational_data_backup142()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare t record; rows jsonb; data jsonb:='{}'::jsonb; keys jsonb:='{}'::jsonb; pk jsonb;
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Administrator access required';end if;
  for t in select v.name from (values
('journal_lines'),('journal_entries'),('staff_journal_lines'),('staff_journals'),('accounting_periods'),('period_findings'),('entry_submissions'),('fund_adjustment_lines'),('fund_adjustment_requests'),('user_fund_assignments'),('scheduled_journal_occurrences'),('scheduled_journals'),('payroll_lines'),('payroll_runs'),('payroll_employees'),('payroll_leave_records'),('tax_sso_records'),('employees'),('operational_reports'),('company_reports82'),('company_documents105'),('legal_documents'),('recurring_transactions'),('recurring_reminders'),('transaction_template_lines'),('transaction_templates'),('workspace_notifications'),('workspace_todos136'),('workspace_actor_audit138'),('year_closings136'),('book_sessions136'),('accounting_operations136'),('audit_reviews136'),('accounting_feature_samples'),('record_deletions108'),('audit_log'),('backup_audit113'),('recovery_audit113'),('accounts'),('sub_accounts'),('currencies'),('business_settings'),('accounting_id_settings'),('presentation_settings113'),('profiles'),('user_permissions'),('entry_prefix_reservations')
  ) v(name) where to_regclass(format('public.%I',v.name)) is not null order by v.name loop
    execute format('lock table public.%I in share mode',t.name);
    execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r',t.name) into rows;
    data:=data||jsonb_build_object(t.name,rows);
    select jsonb_agg(a.attname order by k.n) into pk from pg_constraint c
      cross join lateral unnest(c.conkey) with ordinality k(attnum,n)
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
      where c.contype='p' and c.conrelid=to_regclass(format('public.%I',t.name));
    keys:=keys||jsonb_build_object(t.name,coalesce(pk,'[]'::jsonb));
  end loop;
  return jsonb_build_object('format','oonjai-data-113','createdAt',now(),'from',null,'to',null,
    'tables',data,'keys',keys,'storage','[]'::jsonb,
    'includes','Version 142 accounting operational rows, chart and settings. Uploaded file bytes, authentication and recovery vault stay on the server; reset does not delete them.');
end $function$
;

CREATE OR REPLACE FUNCTION public.operational_data_reset142(p_pack jsonb, p_apply boolean DEFAULT false, p_confirmation text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  t record; fk record; trig record; seq record;
  actual jsonb; expected jsonb; counts jsonb:='{}'::jsonb;
  remaining jsonb:='{}'::jsonb; preserved jsonb:='{}'::jsonb;
  preserved_after jsonb:='{}'::jsonb; preserved_fingerprint text;
  total bigint:=0; n bigint; predicate text; referenced boolean;
begin
  if auth.uid() is null or public.is_admin() is not true then
    raise exception 'Administrator access required';
  end if;
  if p_pack->>'format' is distinct from 'oonjai-data-113'
     or p_pack->>'project' is null
     or jsonb_typeof(p_pack->'tables') is distinct from 'object'
     or p_pack->>'from' is not null
     or p_pack->>'to' is not null then
    raise exception 'Use a full all-time application backup from this project';
  end if;

  perform pg_advisory_xact_lock(142,1);

  create temporary table reset_clear142(name text primary key) on commit drop;
  insert into pg_temp.reset_clear142(name)
  select v.name from (values
    ('journal_lines'),('journal_entries'),
    ('staff_journal_lines'),('staff_journals'),
    ('accounting_periods'),('period_findings'),('entry_submissions'),
    ('fund_adjustment_lines'),('fund_adjustment_requests'),('user_fund_assignments'),
    ('scheduled_journal_occurrences'),('scheduled_journals'),
    ('payroll_lines'),('payroll_runs'),('payroll_employees'),('payroll_leave_records'),
    ('tax_sso_records'),('employees'),('operational_reports'),('company_reports82'),
    ('company_documents105'),('legal_documents'),
    ('recurring_transactions'),('recurring_reminders'),
    ('transaction_template_lines'),('transaction_templates'),
    ('workspace_notifications'),('workspace_todos136'),('workspace_actor_audit138'),
    ('year_closings136'),('book_sessions136'),('accounting_operations136'),('audit_reviews136'),
    ('accounting_feature_samples'),
    ('record_deletions108'),('audit_log'),('backup_audit113'),('recovery_audit113')
  ) as v(name)
  where to_regclass(format('public.%I',v.name)) is not null;

  if not exists(select 1 from pg_temp.reset_clear142) then
    raise exception 'No Version 142 operational tables were found';
  end if;

  create temporary table reset_preserve142(name text primary key) on commit drop;
  insert into pg_temp.reset_preserve142(name)
  select v.name from (values
    ('accounts'),('sub_accounts'),('currencies'),
    ('business_settings'),('accounting_id_settings'),('presentation_settings113'),
    ('profiles'),('user_permissions'),('entry_prefix_reservations'),('backup_registry113'),
    ('recovery_vault113'),('recovery_sessions113')
  ) as v(name)
  where to_regclass(format('public.%I',v.name)) is not null;

  -- Block concurrent writes before comparing backup rows. Locks last until commit.
  -- All writers use the normal PostgreSQL table locks, not only this RPC's advisory lock.
  for t in select name from pg_temp.reset_clear142 union select name from pg_temp.reset_preserve142 order by name loop
    execute format('lock table public.%I in access exclusive mode',t.name);
  end loop;

  -- Fingerprint every preserved row before any clearing work.
  for t in select name from pg_temp.reset_preserve142 order by name loop
    execute format(
      'select md5(coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)::text from public.%I x),''[]''))',
      t.name
    ) into predicate;
    preserved:=preserved||jsonb_build_object(t.name,predicate);
  end loop;
  preserved_fingerprint:=md5(preserved::text);

  -- The downloaded backup must contain the exact current rows of every table
  -- that will be cleared. Any difference forces a new backup and preview.
  for t in select name from pg_temp.reset_clear142 order by name loop
    if not p_pack->'tables' ? t.name
       or jsonb_typeof(p_pack->'tables'->t.name)<>'array' then
      raise exception 'Backup lacks operational table %. Nothing was deleted',t.name;
    end if;
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb),count(*) from public.%I x',
      t.name
    ) into actual,n;
    select coalesce(jsonb_agg(value order by value::text),'[]'::jsonb)
      into expected from jsonb_array_elements(p_pack->'tables'->t.name);
    if actual is distinct from expected then
      raise exception 'Data in % changed after the backup. Prepare a new backup; nothing was deleted',t.name;
    end if;
    counts:=counts||jsonb_build_object(t.name,n);total:=total+n;
  end loop;

  -- A protected table outside the reset scope may not retain a foreign-key
  -- reference to a row being cleared.
  for fk in
    select c.conrelid,c.confrelid,c.conkey,c.confkey,c.conname,
           ch.relname child_name,pa.relname parent_name
    from pg_constraint c
    join pg_class ch on ch.oid=c.conrelid
    join pg_class pa on pa.oid=c.confrelid
    join pg_temp.reset_clear142 a on a.name=pa.relname
    where c.contype='f'
      and not exists(select 1 from pg_temp.reset_clear142 b where b.name=ch.relname)
  loop
    select string_agg(format('c.%I=p.%I',ca.attname,pa.attname),' and ')
      into predicate
    from unnest(fk.conkey,fk.confkey) pair(child_att,parent_att)
    join pg_attribute ca on ca.attrelid=fk.conrelid and ca.attnum=pair.child_att
    join pg_attribute pa on pa.attrelid=fk.confrelid and pa.attnum=pair.parent_att;
    execute format('select exists(select 1 from %s c join %s p on %s)',fk.conrelid::regclass,fk.confrelid::regclass,predicate)
      into referenced;
    if referenced then
      raise exception 'Protected table % still references % (%). Nothing was deleted',fk.child_name,fk.parent_name,fk.conname;
    end if;
  end loop;

  if not p_apply then
    return jsonb_build_object(
      'mode','preview','counts',counts,'total',total,
      'preserved',(select jsonb_agg(name order by name) from pg_temp.reset_preserve142),
      'preservedFingerprint',preserved_fingerprint,
      'nextGeneratedNumber',1
    );
  end if;
  if p_confirmation is distinct from 'RESET OPERATIONAL DATA' then
    raise exception 'Type RESET OPERATIONAL DATA to confirm';
  end if;

  create temporary table reset_triggers142(tbl text,tname text,mode char(1)) on commit drop;
  insert into pg_temp.reset_triggers142
  select c.relname,tg.tgname,tg.tgenabled
  from pg_trigger tg join pg_class c on c.oid=tg.tgrelid
  join pg_namespace ns on ns.oid=c.relnamespace
  join pg_temp.reset_clear142 r on r.name=c.relname
  where ns.nspname='public' and not tg.tgisinternal and tg.tgenabled<>'D';
  for trig in select * from pg_temp.reset_triggers142 loop
    execute format('alter table public.%I disable trigger %I',trig.tbl,trig.tname);
  end loop;

  create temporary table reset_fks142(tbl text,cname text,definition text,valid boolean) on commit drop;
  insert into pg_temp.reset_fks142
  select ch.relname,c.conname,pg_get_constraintdef(c.oid,true),c.convalidated
  from pg_constraint c join pg_class ch on ch.oid=c.conrelid
  join pg_class pa on pa.oid=c.confrelid
  join pg_temp.reset_clear142 a on a.name=ch.relname
  join pg_temp.reset_clear142 b on b.name=pa.relname
  where c.contype='f' and ch.relnamespace='public'::regnamespace and pa.relnamespace='public'::regnamespace;
  for fk in select * from pg_temp.reset_fks142 loop
    execute format('alter table public.%I drop constraint %I',fk.tbl,fk.cname);
  end loop;

  for t in select name from pg_temp.reset_clear142 order by name loop
    execute format('delete from public.%I',t.name);
  end loop;

  for fk in select * from pg_temp.reset_fks142 loop
    execute format('alter table public.%I add constraint %I %s',fk.tbl,fk.cname,fk.definition);
  end loop;
  for trig in select * from pg_temp.reset_triggers142 loop
    execute format('alter table public.%I %s trigger %I',trig.tbl,
      case trig.mode when 'R' then 'enable replica' when 'A' then 'enable always' else 'enable' end,trig.tname);
  end loop;

  -- Restart only sequences owned by cleared tables. UUID keys need no reset.
  for seq in
    select distinct ns.nspname schema_name,s.relname sequence_name
    from pg_class s join pg_namespace ns on ns.oid=s.relnamespace
    join pg_depend d on d.objid=s.oid and d.classid='pg_class'::regclass and d.deptype in('a','i')
    join pg_class tbl on tbl.oid=d.refobjid
    join pg_temp.reset_clear142 r on r.name=tbl.relname
    where s.relkind='S' and ns.nspname='public' and tbl.relnamespace='public'::regnamespace
  loop
    execute format('alter sequence %I.%I restart with 1',seq.schema_name,seq.sequence_name);
  end loop;

  -- These v142 generators are standalone sequences rather than column-owned identities.
  for seq in select v.name from (values
    ('journal_entry_number_seq'),('fund_adjustment_request_seq'),('scheduled_journal_number_seq')
  ) v(name) join pg_class c on c.relname=v.name and c.relnamespace='public'::regnamespace and c.relkind='S' loop
    execute format('alter sequence public.%I restart with 1',seq.name);
  end loop;

  for t in select name from pg_temp.reset_clear142 order by name loop
    execute format('select count(*) from public.%I',t.name) into n;
    if n<>0 then raise exception 'Verification failed for %. The entire reset was rolled back',t.name;end if;
    remaining:=remaining||jsonb_build_object(t.name,n);
  end loop;

  -- Verify the preserved records are byte-for-byte unchanged.
  for t in select name from pg_temp.reset_preserve142 order by name loop
    execute format(
      'select md5(coalesce((select jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)::text from public.%I x),''[]''))',
      t.name
    ) into predicate;
    preserved_after:=preserved_after||jsonb_build_object(t.name,predicate);
  end loop;
  if preserved_after is distinct from preserved then
    raise exception 'A protected Chart of Accounts or Settings record changed. The entire reset was rolled back';
  end if;

  if to_regclass('public.backup_audit113') is not null then
    execute 'insert into public.backup_audit113(actor,kind,detail) values($1,$2,$3)'
      using auth.uid(),'operational_reset142',jsonb_build_object('counts',counts,'total',total,'completed_at',now());
  end if;

  return jsonb_build_object(
    'mode','cleared','deleted',counts,'remaining',remaining,'total',total,
    'preservedFingerprint',preserved_fingerprint,'nextGeneratedNumber',1
  );
end
$function$
;

CREATE OR REPLACE FUNCTION public.organization_guard14229()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE next_id uuid;seen uuid[]:=ARRAY[NEW.user_id]; supervisor record;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('organization14229',0));
 IF length(NEW.job_title)>100 OR length(NEW.department14229)>100 THEN RAISE EXCEPTION 'Position and department must be at most 100 characters';END IF;
 next_id:=NEW.manager_id;
 IF next_id IS NOT NULL THEN
 SELECT p.*,u.module_actions113,u.can_approve INTO supervisor FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE p.id=next_id;
 IF NOT FOUND OR supervisor.status<>'active' OR EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=next_id) THEN RAISE EXCEPTION 'Choose an active Accounting supervisor';END IF;
 IF supervisor.role<>'admin' AND NOT (CASE WHEN supervisor.module_actions113 IS NULL THEN coalesce(supervisor.can_approve,false)
 ELSE coalesce(supervisor.module_actions113->'user-entry-review' @> '["view","approve"]',false) END) THEN RAISE EXCEPTION 'Supervisor needs View and Approve in Entry Submission Review';END IF;
 END IF;
 WHILE next_id IS NOT NULL LOOP
 IF next_id=ANY(seen) THEN RAISE EXCEPTION 'A person cannot report to themselves or create a reporting loop';END IF;
 seen:=seen||next_id;SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=next_id;
 END LOOP;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.password_change_required14257()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'private'
AS $function$
 SELECT EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required)
$function$
;

CREATE OR REPLACE FUNCTION public.password_change_status14257()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'private'
AS $function$
 SELECT jsonb_build_object('required',EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required))
$function$
;

CREATE OR REPLACE FUNCTION public.password_gate14257()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'private'
AS $function$
BEGIN
 IF auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=auth.uid() AND required)
 AND coalesce(current_setting('request.path',true),'') NOT IN ('/rpc/password_change_status14257','/rpc/password_change_required14257')
 THEN RAISE SQLSTATE 'PT403' USING MESSAGE='PASSWORD_CHANGE_REQUIRED'; END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.password_reset_service14257(p_action text, p_user uuid, p_actor uuid DEFAULT NULL::uuid, p_request uuid DEFAULT NULL::uuid, p_password text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'private'
AS $function$
DECLARE row private.password_reset14257; current_hash text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_action='prepare' THEN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND status='active')
  OR EXISTS(SELECT 1 FROM private.password_reset14257 WHERE user_id=p_actor AND required)
  THEN RAISE EXCEPTION 'Active administrator required' USING ERRCODE='42501'; END IF;
  IF p_user=p_actor THEN RAISE EXCEPTION 'Use your own password-change form instead'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND status='active') THEN RAISE EXCEPTION 'Active target user required'; END IF;
  INSERT INTO private.password_reset14257(user_id,request_id,issued_by) VALUES(p_user,p_request,p_actor)
  ON CONFLICT(user_id) DO UPDATE SET request_id=excluded.request_id,temporary_hash=NULL,required=true,issued_by=excluded.issued_by,issued_at=now()
  WHERE private.password_reset14257.temporary_hash IS NOT NULL OR private.password_reset14257.issued_at<now()-interval '2 minutes' OR NOT private.password_reset14257.required;
  IF NOT FOUND THEN RAISE EXCEPTION 'Another reset is still in progress. Retry after two minutes.'; END IF;
  RETURN jsonb_build_object('prepared',true);
 END IF;
 SELECT * INTO row FROM private.password_reset14257 WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND OR NOT row.required THEN RETURN jsonb_build_object('required',false); END IF;
 SELECT encrypted_password INTO current_hash FROM auth.users WHERE id=p_user;
 IF p_action='confirm' THEN
  IF row.request_id IS DISTINCT FROM p_request OR row.issued_by IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Reset request changed'; END IF;
  IF current_hash IS NULL OR current_hash='' THEN RAISE EXCEPTION 'Password update unconfirmed'; END IF;
  UPDATE private.password_reset14257 SET temporary_hash=current_hash WHERE user_id=p_user;
  RETURN jsonb_build_object('confirmed',true);
 ELSIF p_action='complete' THEN
  IF row.temporary_hash IS NULL THEN RAISE EXCEPTION 'Temporary password setup is incomplete. Ask the administrator to retry.'; END IF;
  IF p_password IS NULL OR extensions.crypt(p_password,current_hash) IS DISTINCT FROM current_hash OR extensions.crypt(p_password,row.temporary_hash)=row.temporary_hash THEN RAISE EXCEPTION 'Set and confirm a different new password before continuing'; END IF;
  UPDATE private.password_reset14257 SET required=false,temporary_hash=NULL WHERE user_id=p_user;
  RETURN jsonb_build_object('completed',true);
 ELSIF p_action='status' THEN RETURN jsonb_build_object('required',row.required);
 ELSE RAISE EXCEPTION 'Unsupported operation'; END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.period_pending14317(p_month date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE items jsonb; first_day date=date_trunc('month',p_month)::date;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active administrator required';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb) INTO items FROM (
  SELECT j.id,j.owner_id,coalesce(u.full_name,u.email,'Former user') owner_name,j.status,
   min(l.transaction_date) AS "from",max(l.transaction_date) AS "to",count(*) AS count,
   jsonb_agg(to_jsonb(l) ORDER BY l.id) AS source_rows
  FROM public.staff_journals j JOIN public.staff_journal_lines l ON l.staff_journal_id=j.id LEFT JOIN public.profiles u ON u.id=j.owner_id
  WHERE j.status IN('draft','returned','submitted') AND l.journal_entry_id IS NULL
    AND l.transaction_date>=first_day AND l.transaction_date<(first_day+interval '1 month')
  GROUP BY j.id,j.owner_id,u.full_name,u.email,j.status
 ) p;
 RETURN jsonb_build_object('month',first_day,'items',items,'revision',md5(items::text));
END $function$
;

CREATE OR REPLACE FUNCTION public.post_journal_batch14228(p_request_key text, p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();receipt public.operation_receipts14228;entry jsonb;saved record;result jsonb:='[]';
BEGIN
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal posting permission required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 THEN RAISE EXCEPTION 'A stable posting reference is required';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Posting entries must be an array';END IF;
 IF jsonb_array_length(p_entries) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 posting dates';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data';END IF;
  RETURN receipt.result;
 END IF;
 -- Preflight every date and lock periods in consistent order before inserting headers.
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) ORDER BY value->>'p_transaction_date' LOOP
  PERFORM public.validate_journal14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines');
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  SELECT * INTO saved FROM public.post_manual_worker14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines',coalesce(entry->>'p_prefix','OJM'),coalesce((entry->>'p_digits')::integer,6));
  result:=result||jsonb_build_array(jsonb_build_object('date',entry->>'p_transaction_date','entry_id',saved.entry_id,'entry_no',saved.entry_no));
 END LOOP;
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'journal',p_entries,result);
 RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION public.post_manual_journal(p_transaction_date date, p_memo text, p_lines jsonb, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS TABLE(entry_id uuid, entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.internal_operation136() THEN RAISE EXCEPTION 'Refresh the app: posting requires a stable request reference';END IF;
 RETURN QUERY SELECT * FROM public.post_manual_worker14228(p_transaction_date,p_memo,p_lines,p_prefix,p_digits);
END $function$
;

CREATE OR REPLACE FUNCTION public.post_manual_journal14228(p_transaction_date date, p_memo text, p_lines jsonb, p_prefix text, p_digits integer, p_request_key text)
 RETURNS TABLE(entry_id uuid, entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb;
BEGIN
 result:=public.post_journal_batch14228(p_request_key,jsonb_build_array(jsonb_build_object(
  'p_transaction_date',p_transaction_date,'p_memo',p_memo,'p_lines',p_lines,'p_prefix',p_prefix,'p_digits',p_digits)));
 RETURN QUERY SELECT (result->0->>'entry_id')::uuid,result->0->>'entry_no';
END $function$
;

CREATE OR REPLACE FUNCTION public.post_manual_worker14228(p_transaction_date date, p_memo text, p_lines jsonb, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS TABLE(entry_id uuid, entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_entry_id uuid;
  v_entry_no text;
  v_prefix text;
  v_digits integer;
  v_line jsonb;
  v_line_no integer := 0;
  v_attempt integer := 0;
  v_debit numeric(20,2);
  v_credit numeric(20,2);
begin
  if not public.has_user_permission('post') then
    raise exception 'Direct journal posting permission required';
  end if;
  if p_transaction_date is null or nullif(trim(p_memo),'') is null then
    raise exception 'Transaction date and memo are required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then
    raise exception 'At least two journal lines are required';
  end if;

  PERFORM public.validate_journal14228(p_transaction_date,p_memo,p_lines);
  v_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g'));
  PERFORM public.validate_journal14228(p_transaction_date,p_memo,p_lines);
  v_prefix := left(coalesce(nullif(v_prefix,''),'OJM'),8);
  v_digits := greatest(3,least(9,coalesce(p_digits,6)));

  -- Sequence allocation and collision retry also skip headers left by older,
  -- non-atomic posting attempts.
  loop
    v_attempt := v_attempt + 1;
    if v_attempt>1000 then raise exception 'Unable to allocate a unique journal number'; end if;
    v_entry_no := v_prefix||'-'||lpad(nextval('public.journal_entry_number_seq')::text,v_digits,'0');
    begin
      insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
      values(v_entry_no,p_transaction_date,trim(p_memo),'posted','manual',auth.uid(),now())
      returning id into v_entry_id;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_line_no := v_line_no + 1;
    if nullif(v_line->>'account_id','') is null then
      raise exception 'Line % has no account ID',v_line_no;
    end if;
    v_debit := coalesce((v_line->>'debit')::numeric,0);
    v_credit := coalesce((v_line->>'credit')::numeric,0);
    if not ((v_debit>0 and v_credit=0) or (v_credit>0 and v_debit=0)) then
      raise exception 'Line % must contain either a debit or a credit',v_line_no;
    end if;
    insert into public.journal_lines(
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,p_transaction_date
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.post_opening_balances14234(p_generation uuid, p_request_key text, p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s opening_state14234;r jsonb;BEGIN
 PERFORM public.require_admin136();
 -- Same lock order as the supported full transaction reset.
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO s FROM opening_state14234 WHERE id FOR UPDATE;
 IF s.generation IS DISTINCT FROM p_generation THEN RAISE EXCEPTION 'This setup belongs to an earlier reset. Reopen Opening Balances.';END IF;
 IF s.request_key=p_request_key THEN
  IF s.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Opening reference already used with different amounts';END IF;
  RETURN s.result;
 END IF;
 IF s.closed OR EXISTS(SELECT 1 FROM journal_entries) THEN RAISE EXCEPTION 'Opening balances are closed. Use a normal correcting journal for later changes.';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' OR jsonb_array_length(p_entries)<>1 OR p_entries->0->>'p_memo' IS DISTINCT FROM 'Opening Balances' THEN RAISE EXCEPTION 'Provide one dated Opening Balances journal';END IF;
 r=public.post_journal_batch14228(p_request_key,p_entries);
 UPDATE opening_state14234 SET closed=true,request_key=p_request_key,payload=p_entries,result=r WHERE id;
 RETURN r;
END $function$
;

CREATE OR REPLACE FUNCTION public.post_review_adjustment136(p_review uuid, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();r audit_reviews136;old_ids uuid[];entry uuid;BEGIN
 SELECT * INTO r FROM audit_reviews136 WHERE id=p_review FOR UPDATE;
 IF r.status='resolved' AND r.adjustment_id IS NOT NULL THEN RETURN r.adjustment_id;END IF;
 IF r.id IS NULL OR r.status<>'open' THEN RAISE EXCEPTION 'Review is unavailable or already resolved';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',(p_payload->>'p_transaction_date')::date)::date AND status='open') THEN RAISE EXCEPTION 'Choose an open posting period';END IF;
 LOCK TABLE journal_entries IN SHARE ROW EXCLUSIVE MODE;
 SELECT array_agg(id) INTO old_ids FROM journal_entries;
 PERFORM public.post_manual_worker14228(p_transaction_date=>(p_payload->>'p_transaction_date')::date,p_memo=>p_payload->>'p_memo',p_lines=>p_payload->'p_lines',p_prefix=>p_payload->>'p_prefix',p_digits=>(p_payload->>'p_digits')::integer);
 SELECT id INTO entry FROM journal_entries WHERE NOT(id=ANY(coalesce(old_ids,'{}'::uuid[]))) AND posted_by=actor LIMIT 1;
 IF entry IS NULL THEN RAISE EXCEPTION 'Adjustment posting was not confirmed';END IF;
 UPDATE journal_entries SET adjustment_for_entry_id=r.entry_id WHERE id=entry;
 UPDATE audit_reviews136 SET adjustment_id=entry,status='resolved' WHERE id=r.id;
 RETURN entry;END $function$
;

CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;
begin
 if auth.uid() is not null and not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=s.next_due;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
 select status into v_status from public.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('public.journal_entry_number_seq')::text;
  v_no:=coalesce(v_prefix,'AUTO')||'-'||lpad(v_num,greatest(coalesce(v_digits,4),length(v_num)),'0');
  begin
   insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post);
 insert into public.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update public.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'AUTO_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal posted',auth.uid());
 return v_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.post_scheduled_one92(p_id uuid, p_expected_due date, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.scheduled_journals;n text;entry_status text;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_expected_due is null then raise exception 'Scheduled date required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule was deleted or is unavailable';end if;
 select j.entry_no,j.status into n,entry_status from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id where o.schedule_id=p_id and o.occurrence_date=p_expected_due;
 if found then
  if entry_status<>'posted' then raise exception 'This occurrence was cancelled and will not be reposted';end if;
  return n;
 end if;
 if s.next_due<>p_expected_due then raise exception 'Schedule changed. Refresh before posting';end if;
 return public.post_scheduled_one91(p_id,p_early);
end $function$
;

CREATE OR REPLACE FUNCTION public.post_summary14253(p_journal uuid, p_date date, p_memo text, p_lines jsonb, p_prefix text, p_digits integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j staff_journals;snapshot jsonb;expected jsonb;actual jsonb;posted record;item jsonb;src record;line_id uuid;summary_line_no integer:=0;owner_name text;receipt operation_receipts14228;payload jsonb;answer jsonb;
BEGIN
 IF NOT public.has_user_permission('approve') OR NOT public.has_user_permission('post') OR NOT public.can_action113('user-entry-review','post') OR NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Review and journal posting permissions required';END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Workspace access denied';END IF;
 PERFORM public.assert_final_review14229(p_journal);
 payload=jsonb_build_object('date',p_date,'memo',p_memo,'lines',p_lines,'prefix',p_prefix,'digits',p_digits);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key='summary:'||p_journal::text;
 IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Report already posted with different data';END IF;RETURN receipt.result;END IF;
 IF j.status<>'submitted' THEN RAISE EXCEPTION 'Report is not awaiting posting';END IF;
 SELECT a.snapshot INTO snapshot FROM approved_reports1443 a WHERE a.journal_id=p_journal;
 IF NOT FOUND THEN RAISE EXCEPTION 'Approve the exact detailed report before summary posting';END IF;
 IF p_date IS NULL OR date_trunc('month',p_date)<date_trunc('month',j.period_start) THEN RAISE EXCEPTION 'Choose the reporting month or a later open posting month';END IF;
 IF date_trunc('month',p_date)>date_trunc('month',j.period_start) AND NOT EXISTS(SELECT 1 FROM public.accounting_periods WHERE period_month=date_trunc('month',j.period_start)::date AND status IN('closed','locked')) THEN RAISE EXCEPTION 'Use the original reporting month while it is open';END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open') THEN RAISE EXCEPTION 'Reporting period is closed';END IF;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 -- Compare immutable reviewed content, ignoring only links filled by previous postings.
 IF (SELECT jsonb_agg(to_jsonb(l)-'journal_entry_id' ORDER BY l.id) FROM staff_journal_lines l WHERE staff_journal_id=p_journal)
 IS DISTINCT FROM (SELECT jsonb_agg(x-'journal_entry_id' ORDER BY x->>'id') FROM jsonb_array_elements(snapshot->'journal'->'lines') x) THEN RAISE EXCEPTION 'Source changed after approval';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines)<2 THEN RAISE EXCEPTION 'No balanced summary supplied';END IF;
 -- Derive each account/currency/side and its exact source IDs on the server.
 WITH sides AS (
 SELECT l.id,l.currency_code,l.amount,l.account_id AS account_id,CASE WHEN l.direction='in' THEN 'credit' ELSE 'debit' END AS side FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 UNION ALL SELECT l.id,l.currency_code,l.amount,l.fund_account_id,CASE WHEN l.direction='in' THEN 'debit' ELSE 'credit' END FROM staff_journal_lines l WHERE l.staff_journal_id=p_journal AND NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) AND l.journal_entry_id IS NULL
 ), grouped AS (SELECT account_id,currency_code,side,sum(amount) amount,jsonb_agg(id::text ORDER BY id::text) ids FROM sides GROUP BY account_id,currency_code,side)
 SELECT jsonb_agg(jsonb_build_object('account',account_id,'currency',currency_code,'side',side,'amount',amount,'ids',ids) ORDER BY account_id,currency_code,side) INTO expected FROM grouped;
 SELECT jsonb_agg(jsonb_build_object('account',(x->>'account_id')::uuid,'currency',x->>'currency_code','side',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END,'amount',greatest((x->>'debit')::numeric,(x->>'credit')::numeric),'ids',(SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements_text(x->'source_ids') v)) ORDER BY (x->>'account_id')::uuid,x->>'currency_code',CASE WHEN (x->>'debit')::numeric>0 THEN 'debit' ELSE 'credit' END) INTO actual FROM jsonb_array_elements(p_lines) x;
 IF expected IS NULL OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Summary accounts, amounts or source references do not match the approved report';END IF;
 SELECT * INTO posted FROM public.post_manual_worker14228(p_date,p_memo,p_lines,p_prefix,p_digits);
 owner_name=coalesce(snapshot->'user'->>'full_name',(SELECT full_name FROM profiles WHERE id=j.owner_id),'Former user');
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
 summary_line_no=summary_line_no+1;SELECT l.id INTO STRICT line_id FROM journal_lines l WHERE l.journal_entry_id=posted.entry_id AND l.line_no=summary_line_no;
 FOR src IN SELECT l.* FROM staff_journal_lines l WHERE l.id IN(SELECT value::uuid FROM jsonb_array_elements_text(item->'source_ids')) LOOP
 INSERT INTO journal_sources14253 VALUES(line_id,src.id,p_journal,src.workspace_entry_no,j.owner_id,owner_name,src.transaction_date,src.memo,src.reference,src.amount);
 END LOOP;END LOOP;
 UPDATE staff_journal_lines SET journal_entry_id=posted.entry_id WHERE staff_journal_id=p_journal AND NOT (entry_kind='collection' AND account_id=fund_account_id) AND journal_entry_id IS NULL;
 UPDATE staff_journals SET status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=p_journal;
 answer=jsonb_build_object('entry_id',posted.entry_id,'entry_no',posted.entry_no,'report_id',p_journal);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),'summary:'||p_journal::text,'workspace-summary',payload,answer);
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('staff_journals',p_journal::text,'POST',answer,'Approved detailed report posted as account summary',auth.uid());
 RETURN answer;
END $function$
;

CREATE OR REPLACE FUNCTION public.post_workspace_review_v3(p_journal_id uuid, p_groups jsonb, p_prefix text, p_digits integer, p_memo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare receipt public.operation_receipts14228;request_payload jsonb;actor uuid:=auth.uid();journal_row public.staff_journals; grp jsonb; posted record; result jsonb:='[]'::jsonb; posting_date date;
begin
 PERFORM public.assert_final_review14229(p_journal_id);
 if not public.has_user_permission('approve') or not public.has_user_permission('post') then raise exception 'Review and posting permissions are required'; end if;
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','post') THEN RAISE EXCEPTION 'Assigned review posting permission required';END IF;
 request_payload:=jsonb_build_object('groups',p_groups,'prefix',p_prefix,'digits',p_digits,'memo',p_memo);
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key='workspace:'||p_journal_id::text;
 IF FOUND THEN
  IF receipt.payload IS DISTINCT FROM request_payload THEN RAISE EXCEPTION 'This submission was already posted with different data';END IF;RETURN receipt.result;
 END IF;
 if journal_row.status<>'submitted' then raise exception 'Submission is no longer awaiting review; refresh before continuing'; end if;
 if NOT EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=p_journal_id) THEN RAISE EXCEPTION 'Approve the exact source report before posting';END IF;
 if jsonb_typeof(p_groups) is distinct from 'array' or jsonb_array_length(p_groups)=0 then raise exception 'No journal lines supplied'; end if;
 if (select count(*) from jsonb_array_elements(p_groups))<>(select count(distinct value->>'date') from jsonb_array_elements(p_groups)) then raise exception 'Duplicate posting dates'; end if;
 if exists(select 1 from public.staff_journal_lines l where l.staff_journal_id=p_journal_id and NOT (l.entry_kind='collection' AND l.account_id=l.fund_account_id) and l.journal_entry_id is null and not exists(select 1 from jsonb_array_elements(p_groups) g where (g->>'date')::date=l.transaction_date)) then raise exception 'Some submission dates are missing'; end if;
 for grp in select value from jsonb_array_elements(p_groups) loop
   posting_date:=(grp->>'date')::date;
   if posting_date is null or not exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and transaction_date=posting_date and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null) then raise exception 'Posting date is not part of this submission'; end if;
   if exists(select 1 from public.accounting_periods where period_month=date_trunc('month',posting_date)::date and status<>'open') then raise exception 'Reopen the accounting period before posting'; end if;
   if jsonb_typeof(grp->'lines') is distinct from 'array' or jsonb_array_length(grp->'lines')<2 then raise exception 'At least two journal lines are required'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l where nullif(l->>'account_id','') is null or coalesce((l->>'debit')::numeric,0)<0 or coalesce((l->>'credit')::numeric,0)<0 or ((coalesce((l->>'debit')::numeric,0)>0)::integer+(coalesce((l->>'credit')::numeric,0)>0)::integer)<>1) then raise exception 'Every line needs an account and one positive debit or credit'; end if;
   if exists(select 1 from jsonb_array_elements(grp->'lines') l group by l->>'currency_code' having abs(sum(coalesce((l->>'debit')::numeric,0)-coalesce((l->>'credit')::numeric,0)))>=0.001) then raise exception 'Each currency must balance'; end if;
   select * into posted from public.post_manual_worker14228(posting_date,p_memo,grp->'lines',p_prefix,p_digits);
   update public.staff_journal_lines set journal_entry_id=posted.entry_id where staff_journal_id=p_journal_id and transaction_date=posting_date and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null;
   result:=result||jsonb_build_array(jsonb_build_object('date',posting_date,'entry_id',posted.entry_id,'entry_no',posted.entry_no,'lines',grp->'lines'));
 end loop;
 update public.staff_journals set status='posted',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'POST',jsonb_build_object('posted_entries',result),'Reviewed workspace posted atomically; legacy report-only collections excluded',auth.uid());
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,'workspace:'||p_journal_id::text,'workspace',request_payload,result);
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.preview_journal_number14257(p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE next_number bigint; prefix text; digits integer; attempts integer:=0;
BEGIN
 IF NOT public.can_action113('journal','view') THEN RAISE EXCEPTION 'Journal access required' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END INTO next_number FROM public.journal_entry_number_seq;
 prefix:=left(coalesce(nullif(upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g')),''),'OJM'),8);
 digits:=greatest(3,least(9,coalesce(p_digits,6)));
 WHILE EXISTS(SELECT 1 FROM public.journal_entries WHERE entry_no=prefix||'-'||lpad(next_number::text,digits,'0')) LOOP
  next_number:=next_number+1;attempts:=attempts+1;
  IF attempts>1000 THEN RAISE EXCEPTION 'Unable to preview a unique journal number'; END IF;
 END LOOP;
 RETURN next_number;
END $function$
;

CREATE OR REPLACE FUNCTION public.preview_staff_workspace_entry_no(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare permission public.user_permissions; number_next bigint; number_prefix text;
begin
 if NOT public.can_workspace113(p_user_id) then raise exception 'Current assigned workspace access required';end if;
 select * into permission from public.user_permissions where user_id=p_user_id;
 if not found then raise exception 'User permissions not configured'; end if;
 number_prefix:=coalesce(nullif(permission.entry_initials,''),'U')||'-';
 select greatest(
   coalesce((select last_number from public.staff_entry_sequences where user_id=p_user_id),0),
   coalesce(max(case when substring(workspace_entry_no from length(number_prefix)+1) ~ '^[0-9]+$' then substring(workspace_entry_no from length(number_prefix)+1)::bigint else 0 end),0)
 )+1
 into number_next
 from public.staff_journal_lines
 where left(workspace_entry_no,length(number_prefix))=number_prefix;
 return number_prefix||lpad(number_next::text,greatest(permission.entry_digits,length(number_next::text)),'0');
end $function$
;

CREATE OR REPLACE FUNCTION public.process_due_scheduled_journals91()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare item record;v_today date:=(now() at time zone 'Asia/Vientiane')::date;
begin
 if auth.uid() is not null then raise exception 'Scheduler only';end if;
 for item in select id from public.scheduled_journals where status='active' and auto_post and not is_sample and next_due<=v_today order by next_due for update skip locked loop
  begin
   perform public.post_scheduled_one91(item.id,false);
  exception when others then
   update public.scheduled_journals set status='failed',last_error=sqlerrm,updated_at=now() where id=item.id;
  end;
 end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.protect_approved_source1443()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE jid uuid;
BEGIN
 IF TG_TABLE_NAME='staff_journals' THEN jid=OLD.id; ELSE jid=CASE WHEN TG_OP='INSERT' THEN NEW.staff_journal_id ELSE OLD.staff_journal_id END; END IF;
 -- Parent row locking serializes approval against concurrent source edits.
 PERFORM 1 FROM staff_journals WHERE id=jid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=jid) THEN
  IF TG_TABLE_NAME='staff_journals' THEN
   IF TG_OP='DELETE' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.period_start IS DISTINCT FROM OLD.period_start OR NEW.status::text IN('draft','returned','rejected') THEN RAISE EXCEPTION 'Approved reports cannot be returned or removed'; END IF;
  ELSIF TG_OP<>'UPDATE' THEN RAISE EXCEPTION 'Approved source entries are immutable';
  ELSIF (to_jsonb(NEW)-'journal_entry_id'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'journal_entry_id'-'updated_at') THEN RAISE EXCEPTION 'Approved source entries are immutable'; END IF;
 END IF;
 IF TG_TABLE_NAME='staff_journal_lines' AND TG_OP='UPDATE' THEN
 IF NEW.staff_journal_id IS DISTINCT FROM OLD.staff_journal_id THEN
  PERFORM 1 FROM staff_journals WHERE id=NEW.staff_journal_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM approved_reports1443 WHERE journal_id=NEW.staff_journal_id) THEN RAISE EXCEPTION 'Cannot move entries into an approved report'; END IF;
 END IF; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.protect_linked_workspace_line()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if old.journal_entry_id is not null then raise exception 'This workspace entry is linked to a posted journal and cannot be changed or voided'; end if;
 if tg_op='DELETE' then return old;end if;return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.protect_todo1443()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE i int; before_step jsonb; after_step jsonb; next_steps jsonb; reset_cycle boolean; all_done boolean; blocked boolean=false;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active sign-in required'; END IF;
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id) THEN RAISE EXCEPTION 'Archive completed checklists instead of deleting them'; END IF; RETURN OLD;
 END IF;
 IF NEW.owner_id<>auth.uid() OR (TG_OP='UPDATE' AND NEW.owner_id<>OLD.owner_id) THEN RAISE EXCEPTION 'Private checklist access required'; END IF;
 IF TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF OLD.is_template1438 THEN RETURN NEW; END IF;
 IF NEW.is_template1438 AND (EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done'='true') OR EXISTS(SELECT 1 FROM todo_completions1443 WHERE todo_id=OLD.id)) THEN RAISE EXCEPTION 'Copy a completed checklist to create a template'; END IF;
 reset_cycle=coalesce((NEW.todo_config1438->>'completedCycles')::int,0)=coalesce((OLD.todo_config1438->>'completedCycles')::int,0)+1;
 IF coalesce((NEW.todo_config1438->>'completedCycles')::int,0)<>coalesce((OLD.todo_config1438->>'completedCycles')::int,0) AND NOT reset_cycle THEN RAISE EXCEPTION 'Completed cycle count cannot be changed'; END IF;
 next_steps=CASE WHEN reset_cycle THEN NEW.todo_config1438->'lastCompletedSteps' ELSE NEW.steps END;
 IF reset_cycle AND (OLD.todo_config1438->>'type'<>'recurring' OR jsonb_array_length(NEW.steps)<>jsonb_array_length(OLD.steps) OR (NEW.todo_config1438->>'dueAt')::timestamptz<=(OLD.todo_config1438->>'dueAt')::timestamptz) THEN RAISE EXCEPTION 'Invalid recurring checklist reset'; END IF;
 IF next_steps IS NULL OR jsonb_typeof(next_steps)<>'array' THEN RAISE EXCEPTION 'Invalid checklist'; END IF;
 FOR i IN 0..jsonb_array_length(OLD.steps)-1 LOOP
  before_step=OLD.steps->i;after_step=next_steps->i;
  IF before_step->>'done'='true' AND (after_step IS NULL OR (before_step-'done') IS DISTINCT FROM (after_step-'done')) THEN RAISE EXCEPTION 'Recorded step text cannot be removed, moved or edited'; END IF;
 END LOOP;
 FOR i IN 0..jsonb_array_length(next_steps)-1 LOOP
  after_step=next_steps->i;
  IF OLD.sequential AND blocked AND after_step->>'done'='true' THEN RAISE EXCEPTION 'Complete checklist steps in order'; END IF;
  IF coalesce(after_step->>'done','false')<>'true' THEN blocked=true; END IF;
 END LOOP;
 all_done=jsonb_array_length(next_steps)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(next_steps) x WHERE x->>'done' IS DISTINCT FROM 'true');
 IF reset_cycle THEN
  IF NOT all_done OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.steps) WITH ORDINALITY AS x(step,n) WHERE step->>'done' IS DISTINCT FROM 'false' OR (step-'done') IS DISTINCT FROM ((next_steps->(n::int-1))-'done')) THEN RAISE EXCEPTION 'Only a fully completed cycle can restart'; END IF;
 END IF;
 IF all_done AND (reset_cycle OR EXISTS(SELECT 1 FROM jsonb_array_elements(OLD.steps) x WHERE x->>'done' IS DISTINCT FROM 'true')) THEN INSERT INTO todo_completions1443(todo_id,owner_id,title,steps) VALUES(OLD.id,OLD.owner_id,NEW.title,next_steps); END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.provisioned_account14320(p_actor uuid, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') OR NOT EXISTS(SELECT 1 FROM account_provisioning14320 WHERE email=p_email AND actor_id=p_actor) THEN RAISE EXCEPTION 'Account request unavailable';END IF;
 RETURN jsonb_build_object('user_id',(SELECT u.id FROM auth.users u JOIN account_provisioning14320 r ON r.email=lower(u.email) WHERE r.email=p_email AND r.actor_id=p_actor AND u.raw_app_meta_data->>'provision_request14320'=r.request_id::text));
END $function$
;

CREATE OR REPLACE FUNCTION public.recipe_view113()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;
begin
 if not (public.can_action113('menu-recipe') or public.can_action113('menu-details')) then raise exception 'Recipe view permission required';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'code',m.data->>'code','name',m.data->>'name','description',m.data->>'description','photoData',m.data->>'photoData','recipe',coalesce((select jsonb_agg(jsonb_build_object('name',coalesce(i.data->>'name',component.data->>'name'),'unit',coalesce(i.data->>'unit','serving'),'quantity',l->'quantity')) from jsonb_array_elements(coalesce(m.data->'recipe','[]')) l left join public.menu_ingredients105 i on i.id::text=l->>'itemId' left join public.menu_items104 component on component.id::text=l->>'itemId'),'[]'::jsonb)) order by m.data->>'name'),'[]'::jsonb) into result from public.menu_items104 m where coalesce((m.data->>'active')::boolean,true);
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.recovery_attempt14320(p_actor uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE r recovery_attempts14320;BEGIN
 INSERT INTO recovery_attempts14320(actor_id) VALUES(p_actor) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM recovery_attempts14320 WHERE actor_id=p_actor FOR UPDATE;
 IF r.started_at<now()-interval '15 minutes' THEN UPDATE recovery_attempts14320 SET started_at=now(),attempts=1 WHERE actor_id=p_actor;RETURN true;END IF;
 IF r.attempts>=5 THEN RETURN false;END IF;
 UPDATE recovery_attempts14320 SET attempts=attempts+1 WHERE actor_id=p_actor;RETURN true;
END $function$
;

CREATE OR REPLACE FUNCTION public.reject_entry_submission(p_submission_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A rejection reason is required'; end if;
  update public.entry_submissions set status='rejected',rejection_reason=p_reason,reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission_id and status='pending';
  if not found then raise exception 'Pending submission not found'; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.reminder_load14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.can_action113('transactions-recurring','view') THEN RAISE EXCEPTION 'Upcoming Transactions permission required';END IF;
 RETURN coalesce((SELECT jsonb_build_object('revision',revision,'items',items) FROM upcoming_reminders14229 WHERE owner_id=auth.uid()),'{"revision":0,"items":[]}');
END $function$
;

CREATE OR REPLACE FUNCTION public.reminder_save14229(p_key text, p_revision bigint, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE old_revision bigint;payload jsonb;receipt operation_receipts14228;result jsonb;x jsonb;
BEGIN
 IF NOT public.can_action113('transactions-recurring','edit') THEN RAISE EXCEPTION 'Upcoming Transactions editing permission required';END IF;
 IF length(p_key) NOT BETWEEN 10 AND 200 OR p_key IS NULL OR p_revision IS NULL OR p_revision<0 THEN RAISE EXCEPTION 'Valid save reference and revision required';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Reminder list required';END IF;
 IF jsonb_array_length(p_items)>1000 OR octet_length(p_items::text)>524288 THEN RAISE EXCEPTION 'Reminder list is too large';END IF;
 payload:=jsonb_build_object('revision',p_revision,'items',p_items);
 PERFORM pg_advisory_xact_lock(hashtextextended('reminders14229:'||auth.uid()::text,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_key;
 IF FOUND THEN IF receipt.operation<>'reminders14229' OR receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'This save reference has different data';END IF;RETURN receipt.result;END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_items))<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Reminder IDs must be unique';END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
 IF jsonb_typeof(x)<>'object' OR nullif(btrim(x->>'memo'),'') IS NULL OR length(x->>'memo')>300 OR nullif(x->>'id','') IS NULL OR (x->>'id') !~ '^[A-Za-z0-9_-]{1,100}$'
 OR nullif(x->>'nextDate','') IS NULL OR length(x->>'nextDate')<>10 THEN RAISE EXCEPTION 'Reminder ID, description and due date required';END IF;
 PERFORM (x->>'nextDate')::date;
 END LOOP;
 INSERT INTO upcoming_reminders14229(owner_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 SELECT revision INTO old_revision FROM upcoming_reminders14229 WHERE owner_id=auth.uid() FOR UPDATE;
 IF old_revision<>p_revision THEN RAISE EXCEPTION 'Reminders changed on another device. Reload before saving';END IF;
 UPDATE upcoming_reminders14229 SET revision=revision+1,items=p_items,updated_at=now() WHERE owner_id=auth.uid();
 result:=jsonb_build_object('revision',old_revision+1,'saved',true);
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(auth.uid(),p_key,'reminders14229',payload,result);
 RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION public.reopen_staff_journal(p_journal_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.staff_journals;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'A reopening reason is required'; end if;
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or j.owner_id<>auth.uid() or j.status<>'submitted' then raise exception 'Only your own in-review submission can be reopened'; end if;
  if NOT public.can_workspace113(j.owner_id) OR NOT public.can_action113(CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace reopen permission required';END IF;
  update public.staff_journals set status='returned',return_note='Reopened by submitter: '||trim(p_reason),reviewed_at=now(),updated_at=now() where id=j.id;
  insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('staff_journals',j.id::text,'REOPEN_BY_SUBMITTER',jsonb_build_object('status','submitted'),jsonb_build_object('status','returned'),trim(p_reason),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.report_access1443(p_owner uuid, p_approve boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT public.accounting_workspace_allowed123() AND (public.is_admin() OR
 (NOT p_approve AND p_owner=auth.uid() AND public.can_action113('sub-users-workspace','view') AND public.can_action113('document-editor105','export')) OR
 (p_owner<>auth.uid() AND public.can_workspace113(p_owner) AND
 public.can_action113('user-entry-review',CASE WHEN p_approve THEN 'approve' ELSE 'export' END)
 AND (p_approve OR public.can_action113('document-editor105','export'))))
$function$
;

CREATE OR REPLACE FUNCTION public.report_history14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
  'journal_id',a.journal_id,'owner_id',a.owner_id,
  'period_start',a.snapshot->'journal'->>'period_start',
  'approved_at',a.approved_at,'approved_by',a.approved_by,
  'review_route14229',to_jsonb(r)) ORDER BY a.approved_at DESC)
 FROM public.approved_reports1443 a LEFT JOIN public.review_routes14229 r ON r.journal_id=a.journal_id
 WHERE public.journal_visible14229(a.journal_id) AND public.report_access1443(a.owner_id)),'[]');
END $function$
;

CREATE OR REPLACE FUNCTION public.report_labels_lock14253()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN IF OLD.status NOT IN ('draft','returned') AND NEW.report_types14253 IS DISTINCT FROM OLD.report_types14253 THEN RAISE EXCEPTION 'Submitted report types are locked';END IF;RETURN NEW;END $function$
;

CREATE OR REPLACE FUNCTION public.require_admin136()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid(); BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'An active administrator is required'; END IF;
 RETURN actor; END $function$
;

CREATE OR REPLACE FUNCTION public.reserve_account14320(p_actor uuid, p_email text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE r account_provisioning14320;BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Administrator required';END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=p_email) AND NOT EXISTS(SELECT 1 FROM account_provisioning14320 WHERE email=p_email AND actor_id=p_actor) THEN RAISE EXCEPTION 'This email already has an account. Open it in Users instead';END IF;
 INSERT INTO account_provisioning14320(email,actor_id,full_name) VALUES(p_email,p_actor,p_name) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM account_provisioning14320 WHERE email=p_email FOR UPDATE;
 IF r.actor_id<>p_actor OR r.full_name<>p_name THEN RAISE EXCEPTION 'Account request changed. Retry the original details';END IF;
 RETURN jsonb_build_object('user_id',r.user_id,'request_id',r.request_id);
END $function$
;

CREATE OR REPLACE FUNCTION public.reserve_entry_prefix89(p_stem text, p_owner text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare taken text;
begin
 if p_stem is null or p_stem='' then return; end if;
 insert into public.entry_prefix_reservations(stem,owner_key) values(upper(p_stem),p_owner) on conflict(stem) do nothing;
 select owner_key into taken from public.entry_prefix_reservations where stem=upper(p_stem);
 if taken is distinct from p_owner then raise exception 'Prefix % is already reserved for %',p_stem,taken;end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.reset_scope_catalog14232()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT jsonb_set('[{"id":"journal","group":"Transactions","label":"Journal and transaction history","tables":["journal_entries","journal_lines","vouchers14299","voucher_versions14299"]},{"id":"periods","group":"Transactions","label":"Period closing and review","tables":["accounting_periods","period_findings","year_closings136","book_sessions136","audit_reviews136","correction_sessions136"]},{"id":"submissions","group":"Transactions","label":"Entry submissions","tables":["entry_submissions"]},{"id":"scheduled","group":"Transactions","label":"Scheduled transactions","tables":["scheduled_journals","scheduled_journal_lines","scheduled_journal_occurrences","recurring_transactions"]},{"id":"reminders","group":"Transactions","label":"Upcoming reminders","tables":["recurring_reminders","upcoming_reminders14229"]},{"id":"todos","group":"Transactions","label":"To-do lists","tables":["workspace_todos136","todo_completions1443"]},{"id":"staff","group":"Sub-users","label":"Entries, reports and review routing","tables":["staff_journals","staff_journal_lines","approved_reports1443","review_routes14229","report_review_steps14229"]},{"id":"funds","group":"Sub-users","label":"Fund adjustments and activity","tables":["fund_adjustment_requests","fund_adjustment_lines","workspace_notifications"]},{"id":"payroll","group":"Payroll","label":"Payroll runs and lines","tables":["payroll_runs","payroll_lines"]},{"id":"hr","group":"Human Resources","label":"Employees and leave records","tables":["payroll_employees","payroll_leave_records","employees","legal_documents"]},{"id":"tax","group":"Tax & SSO","label":"Tax and SSO records","tables":["tax_sso_records"]},{"id":"reports","group":"Reports & Documents","label":"Saved operational reports","tables":["operational_reports"]},{"id":"documents","group":"Reports & Documents","label":"Saved documents","tables":["company_documents105"]},{"id":"audit","group":"Auditing","label":"Audit log","tables":["audit_log"]},{"id":"deleted","group":"Auditing","label":"Deleted-record history","tables":["record_deletions108"]}]'::jsonb,'{0,label}','"Journal, vouchers and transaction history"'::jsonb)
$function$
;

CREATE OR REPLACE FUNCTION public.reset_scope_tables14232(p_scopes text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE result text[];BEGIN
 IF p_scopes IS NULL OR cardinality(p_scopes)=0 OR EXISTS(SELECT 1 FROM unnest(p_scopes) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.reset_scope_catalog14232()) s WHERE s->>'id'=x)) THEN RAISE EXCEPTION 'Choose valid reset modules'; END IF;
 SELECT array_agg(DISTINCT t ORDER BY t) INTO result FROM jsonb_array_elements(public.reset_scope_catalog14232()) s CROSS JOIN LATERAL jsonb_array_elements_text(s->'tables') t WHERE s->>'id'=ANY(p_scopes) AND to_regclass(format('public.%I',t)) IS NOT NULL;
 IF cardinality(result) IS NULL THEN RAISE EXCEPTION 'No installed tables for this selection'; END IF;RETURN result;END $function$
;

CREATE OR REPLACE FUNCTION public.resolve_audit_review136(p_review uuid, p_adjustment uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();BEGIN
 IF p_adjustment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM journal_entries e JOIN accounting_periods p ON p.period_month=date_trunc('month',e.transaction_date)::date WHERE e.id=p_adjustment AND e.status::text='posted' AND p.status='open') THEN RAISE EXCEPTION 'Adjustment must be a posted transaction in an open period';END IF;
 UPDATE audit_reviews136 SET status='resolved',adjustment_id=p_adjustment WHERE id=p_review;END $function$
;

CREATE OR REPLACE FUNCTION public.restaurant_can121(p_scope text, p_action text DEFAULT 'view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.active_account14228() and (public.is_admin() or exists(
 select 1 from public.restaurant_members121 m where m.user_id=auth.uid() and m.enabled and not m.must_change_password
 and m.permissions->p_scope->>'view'='true' and m.permissions->p_scope->>p_action='true'))
$function$
;

CREATE OR REPLACE FUNCTION public.restaurant_signed_in121()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select public.active_account14228() and (public.is_admin() or exists(select 1 from restaurant_members121 where user_id=auth.uid() and enabled and not must_change_password))
$function$
;

CREATE OR REPLACE FUNCTION public.return_fund_adjustment_v49(p_request_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare request_row public.fund_adjustment_requests;
begin
  if not public.has_user_permission('approve') then raise exception 'Approval permission required'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A return reason is required'; end if;
  select * into request_row from public.fund_adjustment_requests where id=p_request_id for update;
  if not found or request_row.status<>'submitted' then raise exception 'Submitted adjustment not found'; end if;
  update public.fund_adjustment_requests set status='returned',return_note=trim(p_reason),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_request_id;
  insert into public.audit_log(table_name,record_id,action,reason,actor_id) values('fund_adjustment_requests',p_request_id::text,'RETURN',trim(p_reason),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.review_collection_report(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals;
begin
 PERFORM public.assert_final_review14229(p_journal_id);
 if not public.has_user_permission('approve') then raise exception 'Reviewer access required'; end if;
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned reviewer required';END IF;
 if not found or journal_row.status<>'submitted' then raise exception 'Submitted report not found'; end if;
 if exists(select 1 from public.staff_journal_lines where staff_journal_id=p_journal_id and NOT (entry_kind='collection' AND account_id=fund_account_id) and journal_entry_id is null) then raise exception 'This report has entries requiring journal preparation'; end if;
 update public.staff_journals set status='reviewed',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,reason,actor_id) values('staff_journals',p_journal_id::text,'REVIEW','Collection report reviewed; no revenue posted. Month-end sales entry remains separate.',auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.review_current14229(p_journal uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r review_routes14229; j staff_journals; manager uuid;
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RETURN false;END IF;
 IF public.is_admin() THEN RETURN EXISTS(SELECT 1 FROM staff_journals WHERE id=p_journal);END IF;
 IF NOT public.can_action113('user-entry-review','approve') THEN RETURN false;END IF;
 SELECT * INTO j FROM staff_journals WHERE id=p_journal;IF NOT FOUND OR j.owner_id=auth.uid() THEN RETURN false;END IF;
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal;
 IF FOUND THEN RETURN r.current_reviewer=auth.uid();END IF;
 SELECT manager_id INTO manager FROM user_permissions WHERE user_id=j.owner_id;
 RETURN coalesce(manager=auth.uid(),false);
END $function$
;

CREATE OR REPLACE FUNCTION public.review_directory14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('user_permissions',to_jsonb(u)) ORDER BY p.full_name)
 FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE NOT EXISTS(SELECT 1 FROM restaurant_members121 WHERE user_id=p.id)
 AND (public.is_admin() OR p.id=auth.uid() OR public.can_workspace113(p.id))),'[]');
END $function$
;

CREATE OR REPLACE FUNCTION public.review_exact14229(p_journal uuid, p_expected jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actual jsonb;
BEGIN
 PERFORM 1 FROM staff_journals WHERE id=p_journal FOR UPDATE;
 PERFORM 1 FROM staff_journal_lines WHERE staff_journal_id=p_journal FOR UPDATE;
 SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') INTO actual FROM staff_journal_lines l WHERE staff_journal_id=p_journal;
 IF jsonb_array_length(actual)=0 OR jsonb_typeof(p_expected) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'A complete source report is required';END IF;
 IF (SELECT jsonb_agg(x ORDER BY x->>'id') FROM jsonb_array_elements(p_expected) x) IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Report changed. Reload before reviewing';END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.review_forward14229(p_journal uuid, p_expected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r review_routes14229;next_id uuid;pack jsonb;report_owner uuid;
BEGIN
 PERFORM 1 FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT public.journal_visible14229(p_journal) OR NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Review permission required';END IF;
 PERFORM public.review_exact14229(p_journal,p_expected);
 SELECT * INTO r FROM review_routes14229 WHERE journal_id=p_journal FOR UPDATE;
 IF FOUND AND r.steps @> jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'action','forward')) THEN RETURN to_jsonb(r);END IF;
 IF NOT public.review_current14229(p_journal) OR coalesce(r.final_approved,false) THEN RAISE EXCEPTION 'This report is not awaiting your review';END IF;
 SELECT manager_id INTO next_id FROM user_permissions WHERE user_id=auth.uid();
 IF next_id IS NULL THEN RAISE EXCEPTION 'No higher supervisor is assigned. Use final approval';END IF;
 SELECT j.owner_id INTO report_owner FROM staff_journals j WHERE id=p_journal;
 IF next_id=auth.uid() OR next_id=report_owner OR NOT EXISTS(SELECT 1 FROM profiles p LEFT JOIN user_permissions u ON u.user_id=p.id WHERE p.id=next_id AND p.status='active' AND (p.role='admin' OR u.module_actions113->'user-entry-review' @> '["view","approve"]')) THEN RAISE EXCEPTION 'The next supervisor must have current review permission';END IF;
 pack:=public.approve_report_worker14229(p_journal,p_expected);
 INSERT INTO review_routes14229(journal_id,current_reviewer,stage,steps) VALUES(p_journal,next_id,1,
 jsonb_build_array(jsonb_build_object('by',auth.uid()::text,'by_name',(SELECT full_name FROM profiles WHERE id=auth.uid()),'to',next_id::text,'to_name',(SELECT full_name FROM profiles WHERE id=next_id),'action','forward','at',now())))
 ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=next_id,stage=review_routes14229.stage+1,
 steps=review_routes14229.steps||EXCLUDED.steps,updated_at=now();
 INSERT INTO audit_log(table_name,record_id,action,reason,actor_id,new_data) VALUES('staff_journals',p_journal::text,'REVIEW_FORWARD','Reviewed exact source and forwarded; no ledger posting',auth.uid(),jsonb_build_object('to',next_id));
 RETURN (SELECT to_jsonb(x) FROM review_routes14229 x WHERE journal_id=p_journal);
END $function$
;

CREATE OR REPLACE FUNCTION public.review_inbox14229()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Current accounting access required';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(j)||jsonb_build_object('review_route14229',to_jsonb(r),'lines',
 (SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.transaction_date,l.id),'[]') FROM staff_journal_lines l WHERE l.staff_journal_id=j.id)) ORDER BY j.submitted_at DESC NULLS LAST)
 FROM staff_journals j LEFT JOIN review_routes14229 r ON r.journal_id=j.id WHERE public.journal_visible14229(j.id)),'[]');
END $function$
;

CREATE OR REPLACE FUNCTION public.review_scheduled_occurrence91(p_occurrence uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 update public.scheduled_journal_occurrences set reviewed_by=auth.uid(),reviewed_at=now() where id=p_occurrence and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.status='posted');
 if not found then raise exception 'Posted occurrence not found';end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.revise_open_journal_entry(p_entry_id uuid, p_reason text, p_transaction_date date, p_memo text, p_lines jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_entry public.journal_entries; v_old jsonb; v_new jsonb; v_line jsonb;
 v_month date; v_status text; v_n integer:=0; v_dr numeric; v_cr numeric;
begin
 if auth.uid() is null or not public.has_user_permission('post') then
  raise exception 'Direct journal posting permission required';
 end if;
 if nullif(trim(p_reason),'') is null then raise exception 'A modification reason is required'; end if;
 if p_transaction_date is null or nullif(trim(p_memo),'') is null then raise exception 'Date and description are required'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Journal lines must be an array'; end if;
 if jsonb_array_length(p_lines)<2 then raise exception 'At least two journal lines are required'; end if;
 select * into v_entry from public.journal_entries where id=p_entry_id for update;
 if not found or v_entry.status<>'posted' then raise exception 'Posted journal entry not found'; end if;
 -- Lock all affected periods in stable order. A closed/locked period is never bypassed.
 for v_month in
  select distinct month_key from (
   select date_trunc('month',v_entry.transaction_date)::date as month_key
   union select date_trunc('month',coalesce(line_date,v_entry.transaction_date))::date from public.journal_lines where journal_entry_id=p_entry_id
   union select date_trunc('month',p_transaction_date)::date
  ) m order by month_key
 loop
  insert into public.accounting_periods(period_month,status,updated_by)
   values(v_month,'open',auth.uid()) on conflict(period_month) do nothing;
  select status into v_status from public.accounting_periods where period_month=v_month for update;
  if v_status<>'open' then raise exception 'Period % must be reopened before editing',v_month; end if;
 end loop;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_n:=v_n+1;
  v_dr:=coalesce((v_line->>'debit')::numeric,0); v_cr:=coalesce((v_line->>'credit')::numeric,0);
  if not ((v_dr>0 and v_cr=0) or (v_cr>0 and v_dr=0)) then raise exception 'Line % requires either debit or credit',v_n; end if;
  if v_dr<>round(v_dr,2) or v_cr<>round(v_cr,2) then raise exception 'Line % supports at most two decimal places',v_n; end if;
  if coalesce(nullif(v_line->>'line_date','')::date,p_transaction_date)<>p_transaction_date then raise exception 'Edited entry must have one transaction date'; end if;
  if not exists(select 1 from public.accounts a where a.id=(v_line->>'account_id')::uuid and a.is_active and a.currency_code=v_line->>'currency_code') then raise exception 'Line % has an invalid account or currency',v_n; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_lines) l group by l->>'currency_code'
  having sum(coalesce((l->>'debit')::numeric,0))<>sum(coalesce((l->>'credit')::numeric,0))) then raise exception 'Every currency must balance'; end if;
 select to_jsonb(v_entry)||jsonb_build_object('lines',coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('account_name',a.name) order by l.line_no),'[]'::jsonb))
  into v_old from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_entry_id;
 -- Atomic replacement of lines: the journal header and its ID remain unchanged.
 delete from public.journal_lines where journal_entry_id=p_entry_id;
 v_n:=0;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  v_n:=v_n+1;
  insert into public.journal_lines(journal_entry_id,line_no,account_id,line_date,description,currency_code,debit,credit)
   values(p_entry_id,v_n,(v_line->>'account_id')::uuid,p_transaction_date,coalesce(v_line->>'description',p_memo),v_line->>'currency_code',coalesce((v_line->>'debit')::numeric,0),coalesce((v_line->>'credit')::numeric,0));
 end loop;
 update public.journal_entries set transaction_date=p_transaction_date,memo=trim(p_memo),updated_at=now(),
  accounting_period_id=(select id from public.accounting_periods where period_month=date_trunc('month',p_transaction_date)::date)
  where id=p_entry_id;
 select to_jsonb(e)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('account_name',a.name) order by l.line_no),'[]'::jsonb) from public.journal_lines l join public.accounts a on a.id=l.account_id where l.journal_entry_id=p_entry_id))
  into v_new from public.journal_entries e where e.id=p_entry_id;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('journal_entries',p_entry_id::text,'UPDATE',v_old,v_new,trim(p_reason),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.save_audit_review136(p_month date, p_entry uuid, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136();p accounting_periods;r audit_reviews136;BEGIN
 SELECT * INTO p FROM accounting_periods WHERE period_month=date_trunc('month',p_month)::date;
 IF p.status IS DISTINCT FROM 'locked' THEN RAISE EXCEPTION 'Audit reviews apply to locked months; reopen an unlocked closed book to edit';END IF;
 IF p_entry IS NOT NULL AND NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=p_entry AND date_trunc('month',transaction_date)::date=p.period_month) THEN RAISE EXCEPTION 'Transaction does not belong to this month';END IF;
 INSERT INTO audit_reviews136(period_id,entry_id,description,actor) VALUES(p.id,p_entry,trim(p_description),actor) RETURNING * INTO r;RETURN to_jsonb(r);END $function$
;

CREATE OR REPLACE FUNCTION public.save_installation14320(p_request_key uuid, p_expected_version integer, p_expected_budget_version integer, p_mode text, p_company jsonb, p_accounts jsonb, p_deployment jsonb, p_incoming uuid, p_checks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE s installation14320;b budget_settings14313;payload jsonb;receipt handover_history14320;r jsonb;k text;v text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin' AND status='active')
 OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'A save reference is required';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 -- Whitelist fields before even the retry/audit payload is persisted.
 p_company=jsonb_build_object('name',p_company->>'name','email',p_company->>'email');
 p_accounts=jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId');
 p_deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl','repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant');
 p_checks=jsonb_build_object('github',p_checks->'github','supabase',p_checks->'supabase','recovery',p_checks->'recovery','login',p_checks->'login','gmail',p_checks->'gmail','chatgpt',p_checks->'chatgpt');
 payload=jsonb_build_object('version',p_expected_version,'budgetVersion',p_expected_budget_version,'mode',p_mode,'company',p_company,'accounts',p_accounts,'deployment',p_deployment,'incoming',p_incoming,'checks',p_checks);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 SELECT * INTO receipt FROM handover_history14320 WHERE request_key=p_request_key;
 IF FOUND THEN IF receipt.actor_id<>auth.uid() OR receipt.payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Save reference already used';END IF;RETURN receipt.result;END IF;
 SELECT * INTO s FROM installation14320 WHERE id FOR UPDATE;
 SELECT * INTO b FROM budget_settings14313 WHERE id FOR UPDATE;
 IF s.id IS NULL OR s.version IS DISTINCT FROM p_expected_version OR coalesce(b.version,0) IS DISTINCT FROM p_expected_budget_version THEN RAISE EXCEPTION 'Company settings changed elsewhere. Reopen before saving';END IF;
 IF p_mode NOT IN ('install','settings','handover') OR p_mode IS NULL THEN RAISE EXCEPTION 'Choose a valid operation';END IF;
 IF (p_mode='install')=s.initialized THEN RAISE EXCEPTION 'Installation state changed. Reopen setup';END IF;
 IF jsonb_typeof(p_company) IS DISTINCT FROM 'object' OR jsonb_typeof(p_accounts) IS DISTINCT FROM 'object' OR jsonb_typeof(p_deployment) IS DISTINCT FROM 'object' OR jsonb_typeof(p_checks) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid settings';END IF;
 IF length(btrim(coalesce(p_company->>'name','')))<1 OR length(p_company->>'name')>160 THEN RAISE EXCEPTION 'Enter the company name';END IF;
 FOREACH k IN ARRAY ARRAY['emailSender','chatgptAccountEmail','trialEmailTo','companyEmail'] LOOP
  v=coalesce(CASE WHEN k='companyEmail' THEN p_company->>'email' ELSE p_accounts->>k END,'');
  IF length(v)>254 OR (v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$') THEN RAISE EXCEPTION 'Enter a valid email address: %',k;END IF;
 END LOOP;
 IF length(coalesce(p_accounts->>'emails',''))>4000 THEN RAISE EXCEPTION 'Recipient list is too long';END IF;
 FOR v IN SELECT btrim(value) FROM regexp_split_to_table(coalesce(p_accounts->>'emails',''),'[,;]') value LOOP
  IF v<>'' AND v!~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$' THEN RAISE EXCEPTION 'Enter valid recipient addresses';END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['siteUrl','accounting','publicRestaurant','restaurant'] LOOP
  v=coalesce(p_deployment->>k,'');
  IF (k IN ('siteUrl','accounting') AND v='') OR (v<>'' AND (length(v)>2048 OR v!~ '^https?://[^/[:space:]@]+([/?#][^[:space:]]*)?$')) THEN RAISE EXCEPTION 'Enter a published HTTP or HTTPS URL: %',k;END IF;
 END LOOP;
 IF coalesce(p_deployment->>'repository','')!~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' OR coalesce(p_deployment->>'branch','')!~ '^[A-Za-z0-9_./-]+$' THEN RAISE EXCEPTION 'Enter repository owner/name and branch';END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_incoming AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Choose an active administrator';END IF;
 IF p_mode='handover' AND p_incoming=auth.uid() THEN RAISE EXCEPTION 'Choose the incoming administrator';END IF;
 IF p_mode IN ('install','handover') THEN
  FOREACH k IN ARRAY ARRAY['github','supabase','recovery','login'] LOOP
   IF p_checks->k IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Complete the service check: %',k;END IF;
  END LOOP;
  IF coalesce(p_accounts->>'emailSender','')<>'' AND p_checks->'gmail' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm Gmail authorization';END IF;
  IF coalesce(p_accounts->>'chatgptAccountEmail','')<>'' AND p_checks->'chatgpt' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm the ChatGPT task handover';END IF;
 END IF;
 -- Preserve unrelated company fields and every budget category/template preference.
 INSERT INTO business_settings(id,legal_name,display_name,email,updated_at,updated_by)
 VALUES(true,btrim(p_company->>'name'),btrim(p_company->>'name'),coalesce(p_company->>'email',''),now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET legal_name=excluded.legal_name,display_name=excluded.display_name,email=excluded.email,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 INSERT INTO budget_settings14313(id,data,version,updated_at,updated_by)
 VALUES(true,coalesce(b.data,'{}')||jsonb_build_object('emailSender',p_accounts->>'emailSender','emails',p_accounts->>'emails','trialEmailTo',p_accounts->>'trialEmailTo','chatgptAccountEmail',p_accounts->>'chatgptAccountEmail','gmailClientId',p_accounts->>'gmailClientId'),coalesce(b.version,0)+1,now(),auth.uid())
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 UPDATE installation14320 SET initialized=true,version=version+1,
 deployment=jsonb_build_object('siteUrl',p_deployment->>'siteUrl','repository',p_deployment->>'repository','branch',p_deployment->>'branch','accounting',p_deployment->>'accounting','publicRestaurant',p_deployment->>'publicRestaurant','restaurant',p_deployment->>'restaurant'),
 incoming_admin=p_incoming,checks=p_checks,updated_at=now(),updated_by=auth.uid() WHERE id;
 r=public.installation_status14320();
 INSERT INTO handover_history14320 VALUES(p_request_key,auth.uid(),payload,r,now());RETURN r;
END $function$
;

CREATE OR REPLACE FUNCTION public.save_report_type14253(p_id uuid, p_name text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r report_types14253;
BEGIN
 IF NOT public.is_admin() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active administrator required';END IF;
 IF p_id IS NULL THEN INSERT INTO report_types14253(name,active) VALUES(trim(p_name),p_active) RETURNING * INTO r;
 ELSE UPDATE report_types14253 SET name=trim(p_name),active=p_active WHERE id=p_id RETURNING * INTO r;IF NOT FOUND THEN RAISE EXCEPTION 'Report type not found';END IF;END IF;
 RETURN to_jsonb(r);
END $function$
;

CREATE OR REPLACE FUNCTION public.save_staff_editor1437(p_owner uuid, p_key text, p_items jsonb, p_snapshot jsonb, p_edit_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE receipt public.operation_receipts14228;request_payload jsonb;item jsonb; saved record; line_id uuid; position integer:=0; ids uuid[]:=ARRAY[]::uuid[];
 old_id uuid; existing_ids uuid[]; snapshot jsonb; n integer; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Active login required';END IF;
 IF p_owner IS NULL OR NOT public.can_workspace113(p_owner) OR NOT public.can_action113(CASE WHEN actor=p_owner THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Current workspace edit access required';END IF;
 IF p_key IS NULL OR length(p_key)<10 OR length(p_key)>160 THEN RAISE EXCEPTION 'Invalid save reference';END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>500 THEN RAISE EXCEPTION 'Provide 1 to 500 complete entries';END IF;
 IF jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object' OR p_snapshot->'components1437' IS DISTINCT FROM p_items THEN RAISE EXCEPTION 'Editor snapshot must match the supplied entries';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 request_payload:=jsonb_build_object('owner',p_owner,'items',p_items,'snapshot',p_snapshot,'edit_ids',coalesce(p_edit_ids,ARRAY[]::uuid[]));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_key;
 IF FOUND THEN
  IF receipt.operation<>'staff-editor' OR receipt.payload IS DISTINCT FROM request_payload THEN RAISE EXCEPTION 'Save reference already used for different data';END IF;
  RETURN receipt.result||jsonb_build_object('already_saved',true);
 END IF;
 SELECT array_agg(l.id),min(l.editor_snapshot1437::text)::jsonb INTO existing_ids,snapshot
 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE j.owner_id=p_owner AND left(l.editor_group1437,length(p_key)+1)=p_key||':';
 IF cardinality(existing_ids)>0 THEN
  IF snapshot IS DISTINCT FROM p_snapshot THEN RAISE EXCEPTION 'Save reference already used; refresh before retrying';END IF;
  RETURN jsonb_build_object('line_ids',existing_ids,'already_saved',true);
 END IF;
 IF cardinality(p_edit_ids)>0 THEN
  SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
  WHERE l.id=ANY(p_edit_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
  IF n<>cardinality(p_edit_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be changed';END IF;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  position:=position+1;old_id:=p_edit_ids[position];
  SELECT * INTO saved FROM public.save_staff_workspace_entry_v3(
   p_owner_id=>p_owner,p_line_id=>old_id,p_client_key=>p_key||':'||position,
   p_transaction_date=>(item->>'date')::date,p_direction=>item->>'direction',
   p_fund_account_id=>(item->>'fund')::uuid,p_account_id=>(item->>'account')::uuid,
   p_memo=>item->>'memo',p_reference=>coalesce(item->>'reference',''),
   p_amount=>(item->>'amount')::numeric,p_entry_kind=>item->>'kind');
  line_id:=saved.line_id;
  IF line_id IS NULL THEN RAISE EXCEPTION 'Entry save returned no record';END IF;
  UPDATE public.staff_journal_lines l SET editor_group1437=p_key||':'||(item->>'date'),editor_snapshot1437=p_snapshot
  FROM public.staff_journals j WHERE l.id=line_id AND j.id=l.staff_journal_id AND j.owner_id=p_owner;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Saved entry owner did not match';END IF;
  ids:=array_append(ids,line_id);
 END LOOP;
 FOREACH old_id IN ARRAY coalesce(p_edit_ids,ARRAY[]::uuid[]) LOOP
  IF NOT old_id=ANY(ids) THEN PERFORM public.void_staff_workspace_entry(p_line_id=>old_id,p_reason=>'Replaced while editing the personal journal transaction');END IF;
 END LOOP;
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_key,'staff-editor',request_payload,jsonb_build_object('line_ids',ids,'already_saved',false));
 RETURN jsonb_build_object('line_ids',ids,'already_saved',false);
END $function$
;

CREATE OR REPLACE FUNCTION public.save_staff_workspace_entry_v2(p_line_id uuid, p_journal_id uuid, p_transaction_date date, p_direction text, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_currency_code text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  j public.staff_journals;
  p public.user_permissions;
  cfg public.accounting_id_settings;
  existing_line public.staff_journal_lines;
  parts text[];
  initials text;
  next_number bigint;
  next_line integer;
  new_line_id uuid;
  new_entry_no text;
begin
  select * into j from public.staff_journals where id=p_journal_id for update;
  if not found or not (j.owner_id=auth.uid() or public.has_user_permission('approve')) then raise exception 'Workspace journal not found'; end if;
  if j.status not in ('draft','returned') then raise exception 'This workspace is locked'; end if;
  if p_transaction_date is null or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description, and positive amount are required'; end if;
  if p_direction not in ('out','in') then raise exception 'Direction must be Money Out or Money In'; end if;

  select * into p from public.user_permissions where user_id=j.owner_id;
  if not found then raise exception 'The employee has no account assignment'; end if;
  if not (p_direction=any(coalesce(p.allowed_directions,'{}'::text[]))) then raise exception 'This direction is not enabled for the employee'; end if;
  if not (p_fund_account_id=any(coalesce(p.assigned_fund_account_ids,'{}'::uuid[]))) then raise exception 'Main account is not assigned to this employee'; end if;
  if p_direction='out' and not (p_account_id=any(coalesce(p.destination_account_ids,'{}'::uuid[])) or p_account_id=any(coalesce(p.allowed_account_ids,'{}'::uuid[]))) then raise exception 'Entry or spending account is not assigned to this employee'; end if;
  if p_direction='in' and (p.money_in_counterpart_account_id is null or p_account_id<>p.money_in_counterpart_account_id) then raise exception 'Money In must use the configured counterpart account'; end if;

  if p_line_id is not null then
    select * into existing_line from public.staff_journal_lines where id=p_line_id and staff_journal_id=p_journal_id for update;
    if not found then raise exception 'Workspace line not found'; end if;
    update public.staff_journal_lines set transaction_date=p_transaction_date,direction=p_direction,fund_account_id=p_fund_account_id,account_id=p_account_id,memo=trim(p_memo),reference=coalesce(p_reference,''),amount=p_amount,currency_code=p_currency_code where id=p_line_id;
    return query select p_line_id,existing_line.workspace_entry_no;
    return;
  end if;

  select * into cfg from public.accounting_id_settings where id=true;
  parts:=regexp_split_to_array(trim(coalesce((select full_name from public.profiles where id=j.owner_id),'USER')),'\s+');
  initials:=upper(left(parts[1],1)||case when array_length(parts,1)>1 then left(parts[array_length(parts,1)],1) else '' end);
  insert into public.staff_entry_sequences(user_id,last_number) values(j.owner_id,1)
  on conflict(user_id) do update set last_number=public.staff_entry_sequences.last_number+1,updated_at=now()
  returning last_number into next_number;
  new_entry_no:=upper(regexp_replace(coalesce(nullif(trim(cfg.sub_user_prefix),''),'SJR'),'[^A-Za-z0-9]','','g'))||'-'||initials||'-'||lpad(next_number::text,coalesce(cfg.sub_user_digits,4),'0');
  select coalesce(max(line_no),0)+1 into next_line from public.staff_journal_lines where staff_journal_id=j.id;
  insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no)
  values(j.id,next_line,p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_currency_code,new_entry_no)
  returning id into new_line_id;
  return query select new_line_id,new_entry_no;
end $function$
;

CREATE OR REPLACE FUNCTION public.save_staff_workspace_entry_v3(p_owner_id uuid, p_line_id uuid, p_client_key text, p_transaction_date date, p_direction text, p_fund_account_id uuid, p_account_id uuid, p_memo text, p_reference text, p_amount numeric, p_entry_kind text)
 RETURNS TABLE(line_id uuid, workspace_entry_no text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare permission public.user_permissions; journal_row public.staff_journals; existing_line public.staff_journal_lines;
 month_start date; number_next bigint; number_prefix text; number_text text; sequence_line integer; new_id uuid; fund_currency text;
begin
 if p_owner_id IS NULL OR NOT public.can_workspace113(p_owner_id) OR NOT public.can_action113(CASE WHEN p_owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') then raise exception 'Current workspace edit access required';end if;
 if p_transaction_date is null or p_amount is null or p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<>round(p_amount,2) or p_amount<=0 or nullif(trim(p_memo),'') is null then raise exception 'Date, description and positive amount are required'; end if;
 if p_direction is null or p_direction not in ('in','out') or p_entry_kind is null or p_entry_kind not in ('collection','payment','handover') then raise exception 'Invalid activity'; end if;
 if (p_entry_kind='collection')<>(p_direction='in') then raise exception 'Collection must use Money In; payments and handovers must use Money Out'; end if;
 select * into permission from public.user_permissions where user_id=p_owner_id;
 if not found then raise exception 'User permissions not configured'; end if;
 if not coalesce(p_direction=any(permission.allowed_directions),false) then raise exception 'This direction is not allowed'; end if;
 if p_fund_account_id is null or not coalesce(p_fund_account_id=any(permission.assigned_fund_account_ids),false) then raise exception 'Main account not assigned'; end if;
 if not permission.allow_multiple_funds and cardinality(permission.assigned_fund_account_ids)>1 then raise exception 'Multiple funds must be enabled'; end if;
 if p_account_id is null then raise exception 'Account is required'; end if;
 if p_direction='in' and p_account_id<>p_fund_account_id and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Money In category not assigned'; end if;
 if p_direction='out' and not coalesce(p_account_id=any(permission.destination_account_ids) or p_account_id=any(permission.allowed_account_ids),false) then raise exception 'Entry account not assigned'; end if;
 if p_direction='out' and p_account_id=p_fund_account_id then raise exception 'The receiving/spending account must differ from the fund'; end if;
 select currency_code into fund_currency from public.accounts where id=p_fund_account_id;
 if fund_currency is null then raise exception 'Main account currency missing'; end if;
 if (select currency_code from public.accounts where id=p_account_id) is distinct from fund_currency then raise exception 'Main and entry accounts must use the same currency'; end if;
 month_start:=date_trunc('month',p_transaction_date)::date;
 -- Serialize creation/saving for one owner. Client key prevents duplicate retries.
 perform pg_advisory_xact_lock(hashtext('workspace:'||p_owner_id::text));
 if p_line_id IS NULL AND (p_client_key IS NULL OR length(p_client_key) NOT BETWEEN 10 AND 200) THEN RAISE EXCEPTION 'Stable save reference required';END IF;
 if p_line_id is null and p_client_key is not null then
   select line.* into existing_line from public.staff_journal_lines line join public.staff_journals journal on journal.id=line.staff_journal_id where line.client_key=p_client_key and journal.owner_id=p_owner_id;
   if found then
    IF (existing_line.transaction_date,existing_line.direction,existing_line.fund_account_id,existing_line.account_id,existing_line.memo,existing_line.reference,existing_line.amount,existing_line.entry_kind)
      IS DISTINCT FROM (p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,p_entry_kind)
      THEN RAISE EXCEPTION 'Save reference already used for different data';END IF;
    return query select existing_line.id,existing_line.workspace_entry_no;return;end if;
 end if;
 insert into public.staff_journals(owner_id,period_start,period_end,status) values(p_owner_id,month_start,(month_start+interval '1 month - 1 day')::date,'draft') on conflict(owner_id,period_start) do nothing;
 select * into journal_row from public.staff_journals where owner_id=p_owner_id and period_start=month_start for update;
 if journal_row.status not in ('draft','returned') then raise exception 'This period is submitted or posted; reopen it before changing entries'; end if;
 if p_line_id is not null then
   select * into existing_line from public.staff_journal_lines where id=p_line_id and staff_journal_id=journal_row.id for update;
   if not found or existing_line.journal_entry_id is not null then raise exception 'Entry unavailable or already posted'; end if;
   insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
   values('staff_journal_lines',p_line_id::text,'EDIT',to_jsonb(existing_line),jsonb_build_object('transaction_date',p_transaction_date,'direction',p_direction,'fund_account_id',p_fund_account_id,'account_id',p_account_id,'memo',p_memo,'reference',p_reference,'amount',p_amount,'entry_kind',p_entry_kind),coalesce(journal_row.return_note,'Workspace draft edited'),auth.uid());
   update public.staff_journal_lines set transaction_date=p_transaction_date,direction=p_direction,fund_account_id=p_fund_account_id,account_id=p_account_id,memo=trim(p_memo),reference=coalesce(p_reference,''),amount=p_amount,currency_code=fund_currency,entry_kind=p_entry_kind where id=p_line_id;
   return query select p_line_id,existing_line.workspace_entry_no;return;
 end if;
 perform pg_advisory_xact_lock(hashtext('workspace-entry-number'));
 number_text:=public.preview_staff_workspace_entry_no(p_owner_id);
 number_next:=substring(number_text from '[0-9]+$')::bigint;
 insert into public.staff_entry_sequences(user_id,last_number) values(p_owner_id,number_next) on conflict(user_id) do update set last_number=greatest(public.staff_entry_sequences.last_number,excluded.last_number),updated_at=now();
 select coalesce(max(line_no),0)+1 into sequence_line from public.staff_journal_lines where staff_journal_id=journal_row.id;
 insert into public.staff_journal_lines(staff_journal_id,line_no,transaction_date,direction,fund_account_id,account_id,memo,reference,amount,currency_code,workspace_entry_no,entry_kind,client_key)
 values(journal_row.id,sequence_line,p_transaction_date,p_direction,p_fund_account_id,p_account_id,trim(p_memo),coalesce(p_reference,''),p_amount,fund_currency,number_text,p_entry_kind,p_client_key) returning id into new_id;
 return query select new_id,number_text;
end $function$
;

CREATE OR REPLACE FUNCTION public.schedule_admin91()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')$function$
;

CREATE OR REPLACE FUNCTION public.schedule_next_date91(p_anchor date, p_frequency text, p_rule text, p_day integer, p_index integer)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare first_month date;result_month date;
begin
 if p_frequency='weekly' then return p_anchor+(7*p_index);end if;
 first_month:=date_trunc('month',p_anchor)::date;
 result_month:=(first_month+(case p_frequency when 'quarterly' then 3 when 'yearly' then 12 else 1 end*p_index||' months')::interval)::date;
 if p_rule='last_day' then return (result_month+interval '1 month - 1 day')::date;end if;
 return result_month+least(p_day,extract(day from (result_month+interval '1 month - 1 day'))::int)-1;
end $function$
;

CREATE OR REPLACE FUNCTION public.scoped_reset14232(p_backup jsonb, p_apply boolean DEFAULT false, p_confirmation text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE scopes text[];names text[];name text;current_pack jsonb;missing text[];total bigint;BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 IF p_backup->>'format' IS DISTINCT FROM 'oonjai-reset-14232' OR p_backup->>'owner' IS DISTINCT FROM auth.uid()::text OR p_backup->>'instance' IS DISTINCT FROM (SELECT instance::text FROM public.data_tools_state14232 WHERE id=1) THEN RAISE EXCEPTION 'Select the backup prepared for this administrator and database';END IF;
 SELECT array_agg(v) INTO scopes FROM jsonb_array_elements_text(p_backup->'scopes') v;names=public.reset_scope_tables14232(scopes);
 FOREACH name IN ARRAY names LOOP EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',name);END LOOP;
 current_pack=public.scoped_reset_backup14232(scopes);
 IF p_backup->'tables' IS DISTINCT FROM current_pack->'tables' THEN RAISE EXCEPTION 'Selected data changed after backup; prepare a new backup'; END IF;
 SELECT array_agg(DISTINCT child.relname ORDER BY child.relname) INTO missing FROM pg_constraint c JOIN pg_class parent ON parent.oid=c.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace WHERE c.contype='f' AND pn.nspname='public' AND parent.relname=ANY(names) AND (cn.nspname<>'public' OR NOT child.relname=ANY(names));
 IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(names) AND NOT t.tgisinternal AND (t.tgtype::integer & 32)>0) THEN RAISE EXCEPTION 'A selected table has a custom reset trigger; its side effects must be reviewed before resetting';END IF;
 SELECT coalesce(sum(v::bigint),0) INTO total FROM jsonb_each_text(current_pack->'counts') x(k,v);
 IF NOT coalesce(p_apply,false) THEN RETURN jsonb_build_object('mode','preview','counts',current_pack->'counts','total',total,'requiredTables',coalesce(to_jsonb(missing),'[]'::jsonb),'fingerprint',current_pack->>'fingerprint','preserved','Accounts, settings, users, access rules and generated number continuity');END IF;
 IF p_confirmation IS DISTINCT FROM 'RESET SELECTED DATA' THEN RAISE EXCEPTION 'Type RESET SELECTED DATA'; END IF;
 IF cardinality(missing)>0 THEN RAISE EXCEPTION 'Selected tables are linked to unselected tables: %. Include their modules; nothing was deleted.',array_to_string(missing,', ');END IF;
 -- No CASCADE and no RESTART IDENTITY. Foreign-key restrictions remain authoritative.
 EXECUTE 'TRUNCATE TABLE '||(SELECT string_agg(format('public.%I',n),', ' ORDER BY n) FROM unnest(names) n)||' RESTRICT';
 IF ARRAY['journal','periods','staff','submissions']::text[] <@ scopes THEN UPDATE public.opening_state14234 SET generation=gen_random_uuid(),closed=false,request_key=NULL,payload=NULL,result=NULL WHERE id;END IF;
 RETURN jsonb_build_object('mode','cleared','counts',current_pack->'counts','total',total,'scopes',scopes);END $function$
;

CREATE OR REPLACE FUNCTION public.scoped_reset_backup14232(p_scopes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE names text[];name text;list jsonb;data jsonb='{}';counts jsonb='{}';BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') OR NOT public.accounting_workspace_allowed123() THEN RAISE EXCEPTION 'Active accounting administrator required'; END IF;
 names=public.reset_scope_tables14232(p_scopes);
 FOREACH name IN ARRAY names LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE MODE',name);END LOOP;
 FOREACH name IN ARRAY names LOOP EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),''[]''::jsonb) FROM public.%I r',name) INTO list;data=data||jsonb_build_object(name,list);counts=counts||jsonb_build_object(name,jsonb_array_length(list));END LOOP;
 RETURN jsonb_build_object('format','oonjai-reset-14232','instance',(SELECT instance FROM public.data_tools_state14232 WHERE id=1),'owner',auth.uid(),'scopes',p_scopes,'tables',data,'counts',counts,'fingerprint',md5(data::text));END $function$
;

CREATE OR REPLACE FUNCTION public.set_accounting_period_status(p_month date, p_status text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_period_id uuid; v_open_findings integer; v_old_status text;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_month <> date_trunc('month',p_month)::date then raise exception 'Period must be the first day of a month'; end if;
  if p_status not in ('open','review','closed','locked') then raise exception 'Invalid period status'; end if;

  insert into public.accounting_periods(period_month,status,updated_by)
  values(p_month,'open',auth.uid()) on conflict(period_month) do nothing;
  select id,status into v_period_id,v_old_status from public.accounting_periods where period_month=p_month for update;
  select count(*) into v_open_findings from public.period_findings where accounting_period_id=v_period_id and status in ('open','adjustment_prepared');
  if p_status='closed' and v_open_findings>0 then raise exception 'Resolve all open findings before closing the period'; end if;
  if p_status='locked' and v_old_status<>'closed' then raise exception 'Close the period before locking it'; end if;

  update public.accounting_periods set status=p_status,updated_by=auth.uid(),updated_at=now(),
    review_started_at=case when p_status='review' then coalesce(review_started_at,now()) else review_started_at end,
    closed_at=case when p_status='closed' then now() when p_status='open' then null else closed_at end,
    locked_at=case when p_status='locked' then now() when p_status='open' then null else locked_at end
  where id=v_period_id;
  insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('accounting_periods',v_period_id::text,'PERIOD_STATUS',jsonb_build_object('status',v_old_status),jsonb_build_object('status',p_status),'Accounting period status changed',auth.uid());
  return v_period_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_period_status14317(p_month date, p_status text, p_revision text, p_acknowledged boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF p_status NOT IN('closed','locked') THEN RAISE EXCEPTION 'Choose closing or locking';END IF;
 PERFORM public.ack_period14317(p_month,p_revision,p_acknowledged);
 -- Preserve the installed permissions, balance, finding and period-state checks.
 PERFORM public.set_accounting_period_status(p_month,p_status);
 RETURN jsonb_build_object('month',p_month,'status',p_status);
END $function$
;

CREATE OR REPLACE FUNCTION public.set_scheduled_status91(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status';end if;
 update public.scheduled_journals set status=p_status,last_error=null,updated_at=now() where id=p_id and not is_sample and status in ('active','paused','failed');
 if not found then raise exception 'Schedule cannot be changed';end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.snapshot_scheduled_occurrence92()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 select to_jsonb(s) into new.schedule_snapshot from public.scheduled_journals s where s.id=new.schedule_id;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_report1434(p_journal uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.staff_journals%rowtype; actor_permissions jsonb; owner_permissions jsonb;
 source_lines jsonb; posted_entries jsonb; account_rows jsonb; user_data jsonb;
 linked uuid[]; permitted boolean; reviewer boolean;
begin
 IF NOT public.journal_visible14229(p_journal) THEN RAISE EXCEPTION 'Report access denied';END IF;
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Active sign-in required'; end if;
 select * into j from public.staff_journals where id=p_journal;
 if not found then raise exception 'Saved report not found'; end if;
 if exists(select 1 from public.approved_reports1443 where journal_id=p_journal) then return public.approved_report1443(p_journal); end if;
 select to_jsonb(p) into actor_permissions from public.user_permissions p where user_id=auth.uid();
 select to_jsonb(p) into owner_permissions from public.user_permissions p where user_id=j.owner_id;
 permitted:=public.report_access1443(j.owner_id);
 reviewer:=coalesce(actor_permissions->'module_actions113'->'user-entry-review','[]'::jsonb) @> '["view","export"]'::jsonb
  and owner_permissions->>'manager_id'=auth.uid()::text;
 if not public.is_admin() then
  if not coalesce(permitted,false) or not ((j.owner_id=auth.uid() and coalesce(actor_permissions->'module_actions113'->'sub-users-workspace','[]'::jsonb) @> '["view"]'::jsonb) or coalesce(reviewer,false)) then raise exception 'Report print permission required'; end if;
  if j.status::text not in ('approved','posted','reviewed','approved_posted') then raise exception 'Only approved reports can be printed'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.transaction_date,l.line_no),'[]'::jsonb),
  coalesce(array_agg(distinct l.journal_entry_id) filter(where l.journal_entry_id is not null),array[]::uuid[])
 into source_lines,linked from public.staff_journal_lines l where staff_journal_id=j.id;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',
  (select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id))),'[]'::jsonb)
 into posted_entries from public.journal_entries e where e.id=any(linked) and e.status::text='posted';
 if jsonb_array_length(posted_entries)<>cardinality(linked) then raise exception 'A linked journal is missing or no longer posted. Review this report before printing'; end if;
 with recursive report_account_ids(id) as (
  select a.id from public.accounts a where a.id in (
   select account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select fund_account_id from public.staff_journal_lines where staff_journal_id=j.id
   union select account_id from public.journal_lines where journal_entry_id=any(linked)
  )
  union
  select parent.id from public.accounts parent join public.accounts child
   on parent.code=to_jsonb(child)->>'parent_code'
  join report_account_ids selected on selected.id=child.id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,
  'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb)
 into account_rows from public.accounts a join report_account_ids selected on selected.id=a.id;
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role,'job_title',owner_permissions->>'job_title') into user_data
 from public.profiles p where p.id=j.owner_id;
 return jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',source_lines),
  'user',user_data,'accounts',account_rows,'posted',posted_entries);
end $function$
;

CREATE OR REPLACE FUNCTION public.staff_rules14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j public.staff_journals;p public.user_permissions;target text;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.staff_journal_id ELSE NEW.staff_journal_id END FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) THEN RAISE EXCEPTION 'Current workspace access required';END IF;
 target:=CASE WHEN j.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'journal_entry_id')=(to_jsonb(OLD)-'journal_entry_id') THEN
  IF NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id AND NOT public.can_action113('user-entry-review','post') THEN RAISE EXCEPTION 'Review posting permission required';END IF;
  RETURN NEW;
 END IF;
 IF NOT public.can_action113(target,CASE WHEN TG_OP='DELETE' THEN 'void' ELSE 'edit' END) OR j.status NOT IN ('draft','returned') THEN RAISE EXCEPTION 'This workspace is not editable';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;
 IF TG_OP='UPDATE' AND (NEW.staff_journal_id IS DISTINCT FROM OLD.staff_journal_id OR NEW.client_key IS DISTINCT FROM OLD.client_key OR NEW.workspace_entry_no IS DISTINCT FROM OLD.workspace_entry_no) THEN RAISE EXCEPTION 'Entry identity cannot be changed';END IF;
 SELECT * INTO p FROM user_permissions WHERE user_id=j.owner_id;
 IF NOT FOUND OR coalesce(NEW.direction=ANY(p.allowed_directions),false) IS NOT TRUE
  OR coalesce(NEW.fund_account_id=ANY(p.assigned_fund_account_ids),false) IS NOT TRUE THEN RAISE EXCEPTION 'Unassigned direction or fund';END IF;
 IF NEW.entry_kind NOT IN ('payment','handover','collection') OR (NEW.entry_kind='collection')<>(NEW.direction='in') THEN RAISE EXCEPTION 'Invalid workspace activity';END IF;
 IF NEW.direction='in' AND NEW.account_id IS DISTINCT FROM NEW.fund_account_id AND NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false) THEN RAISE EXCEPTION 'Unassigned Money In category';END IF;
 IF NEW.direction='out' AND (NEW.account_id=NEW.fund_account_id OR
  NOT coalesce(NEW.account_id=ANY(p.allowed_account_ids) OR NEW.account_id=ANY(p.destination_account_ids),false)) THEN RAISE EXCEPTION 'Unassigned spending or receiving account';END IF;
 IF NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.fund_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
  OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND is_active AND is_posting AND currency_code=NEW.currency_code) THEN RAISE EXCEPTION 'Invalid workspace account or currency';END IF;
 IF NEW.transaction_date<j.period_start OR NEW.transaction_date>j.period_end THEN RAISE EXCEPTION 'Entry date must belong to this workspace period';END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.stage_book_operation136(p_session uuid, p_kind text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE request_key text:=p_payload->>'p_request_key';existing jsonb;actor uuid:=public.require_admin136();s book_sessions136;m date;d date;op jsonb;BEGIN
 SELECT * INTO s FROM book_sessions136 WHERE id=p_session FOR UPDATE;
 IF s.owner_id IS DISTINCT FROM actor OR s.status<>'editing' THEN RAISE EXCEPTION 'Correction session is unavailable';END IF;
 SELECT period_month INTO m FROM accounting_periods WHERE id=s.period_id AND status='closed';IF m IS NULL THEN RAISE EXCEPTION 'The book is no longer closed and unlocked';END IF;
 IF p_kind NOT IN ('post','revise','void') OR jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Invalid staged operation';END IF;
 IF p_kind='post' THEN d:=(p_payload->>'p_transaction_date')::date;
 ELSE SELECT transaction_date INTO d FROM journal_entries WHERE id=(p_payload->>'p_entry_id')::uuid;END IF;
 IF d IS NULL OR date_trunc('month',d)::date<>m THEN RAISE EXCEPTION 'Changes must belong to this book';END IF;
 IF p_kind='revise' AND date_trunc('month',(p_payload->>'p_transaction_date')::date)::date<>m THEN RAISE EXCEPTION 'A correction cannot move the transaction to another month';END IF;
 IF request_key IS NOT NULL THEN
 SELECT x INTO existing FROM jsonb_array_elements(coalesce(s.operations,'[]')) x WHERE x->>'request_key14228'=request_key;
 IF FOUND THEN IF existing->>'kind' IS DISTINCT FROM p_kind OR existing->'payload' IS DISTINCT FROM (p_payload-'p_request_key') THEN RAISE EXCEPTION 'Correction request reference already used';END IF;RETURN to_jsonb(s)||jsonb_build_object('month',m);END IF;END IF;
 op:=jsonb_build_object('id',gen_random_uuid(),'kind',p_kind,'payload',p_payload-'p_request_key','request_key14228',request_key);
 UPDATE book_sessions136 SET operations=operations||jsonb_build_array(op) WHERE id=s.id RETURNING * INTO s;
 RETURN to_jsonb(s)||jsonb_build_object('month',m);END $function$
;

CREATE OR REPLACE FUNCTION public.stamp_inventory_menu104()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare on_hand numeric;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_table_name='inventory_movements104' then
  if tg_op<>'INSERT' then raise exception 'Stock movements are immutable; create a correcting movement'; end if;
  if not exists(select 1 from public.inventory_items104 where id::text=new.data->>'itemId') then raise exception 'Inventory item does not exist'; end if;
  if (new.data->>'quantity')::numeric<=0 or new.data->>'kind' not in ('in','out','adjust-in','adjust-out') then raise exception 'Invalid stock movement'; end if;
  -- Serialize movements on this item so two simultaneous issues cannot overspend stock.
  perform 1 from public.inventory_items104 where id::text=new.data->>'itemId' for update;
  if new.data->>'kind' in ('out','adjust-out') then
   select coalesce(sum(case when data->>'kind' in ('in','adjust-in') then (data->>'quantity')::numeric else -(data->>'quantity')::numeric end),0) into on_hand
   from public.inventory_movements104 where data->>'itemId'=new.data->>'itemId';
   if on_hand<(new.data->>'quantity')::numeric then raise exception 'Insufficient stock';end if;
  end if;
  new.created_by=auth.uid(); return new;
 end if;
 if coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'name'),'')='' then raise exception 'Code and name are required'; end if;
 new.updated_by=auth.uid();new.updated_at=now();
 if tg_op='UPDATE' then
  if new.version<>old.version+1 then raise exception 'Record changed; reload before editing'; end if;
 else new.version=1;end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.stamp_workspace105()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if current_user not in ('postgres','supabase_admin') and not public.is_admin() then raise exception 'Administrator access required';end if;
 if tg_op='UPDATE' and new.version<>old.version+1 then raise exception 'Record changed; reload before editing';end if;
 if tg_op='INSERT' then new.version=1;end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.submission_guard14228()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE p public.user_permissions;own uuid;cur text;outgoing boolean;incoming boolean;
BEGIN
 own:=CASE WHEN TG_OP='DELETE' THEN OLD.submitted_by ELSE NEW.submitted_by END;
 IF NOT public.can_workspace113(own) THEN RAISE EXCEPTION 'Current assigned workspace access required';END IF;
 IF TG_OP<>'INSERT' THEN
  IF NOT public.is_admin() AND NOT public.can_action113('user-entry-review','approve') THEN RAISE EXCEPTION 'Assigned approval permission required';END IF;
  IF TG_OP='DELETE' THEN RETURN OLD;END IF;
  IF NEW.submitted_by IS DISTINCT FROM OLD.submitted_by THEN RAISE EXCEPTION 'Submission owner cannot be changed';END IF;
 ELSE
  IF NOT public.can_action113(CASE WHEN own=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Submission edit permission required';END IF;
 END IF;
 SELECT * INTO p FROM user_permissions WHERE user_id=own;
 outgoing:=coalesce('out'=ANY(p.allowed_directions) AND NEW.credit_account_id=ANY(p.assigned_fund_account_ids)
  AND (NEW.debit_account_id=ANY(p.allowed_account_ids) OR NEW.debit_account_id=ANY(p.destination_account_ids)),false);
 incoming:=coalesce('in'=ANY(p.allowed_directions) AND NEW.debit_account_id=ANY(p.assigned_fund_account_ids)
  AND NEW.credit_account_id=p.money_in_counterpart_account_id,false);
 IF NOT outgoing AND NOT incoming THEN RAISE EXCEPTION 'Submission uses unassigned accounts or direction';END IF;
 IF NEW.debit_account_id=NEW.credit_account_id OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.debit_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code)
  OR NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.credit_account_id AND is_active AND is_posting AND currency_code=NEW.currency_code) THEN RAISE EXCEPTION 'Submission account or currency mismatch';END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.submit_fund_adjustment_v49(p_owner_id uuid, p_fund_account_id uuid, p_original jsonb, p_requested jsonb, p_explanation text, p_report_reference text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare permission public.user_permissions; request_id uuid; key text; old_value numeric; new_value numeric; changes integer:=0;
begin
  if auth.uid() is null or (p_owner_id<>auth.uid() and not public.has_user_permission('approve')) then raise exception 'Workspace access denied'; end if;
  if nullif(trim(p_explanation),'') is null then raise exception 'An explanation is required'; end if;
  select * into permission from public.user_permissions where user_id=p_owner_id;
  if not found or not(p_fund_account_id=any(permission.assigned_fund_account_ids)) then raise exception 'This main account is not assigned to the user'; end if;
  insert into public.fund_adjustment_requests(owner_id,fund_account_id,explanation,report_reference,submitted_by)
  values(p_owner_id,p_fund_account_id,trim(p_explanation),coalesce(trim(p_report_reference),''),auth.uid()) returning id into request_id;
  foreach key in array array['received','used','handover'] loop
    old_value:=coalesce((p_original->>key)::numeric,0);new_value:=coalesce((p_requested->>key)::numeric,0);
    if old_value<>new_value then
      insert into public.fund_adjustment_lines(request_id,activity_key,original_value,requested_value,difference)
      values(request_id,key,old_value,new_value,new_value-old_value);changes:=changes+1;
    end if;
  end loop;
  if changes=0 then raise exception 'Change at least one value'; end if;
  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('fund_adjustment_requests',request_id::text,'SUBMIT',jsonb_build_object('owner_id',p_owner_id,'fund_account_id',p_fund_account_id,'changes',changes),trim(p_explanation),auth.uid());
  return request_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.submit_report14253(p_journal uuid, p_types uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE labels jsonb;j staff_journals;n integer;
BEGIN
 SELECT * INTO j FROM staff_journals WHERE id=p_journal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_workspace113(j.owner_id) OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Workspace unavailable';END IF;
 SELECT count(DISTINCT x) INTO n FROM unnest(p_types) x;
 IF n=0 OR n>10 OR n<>cardinality(p_types) THEN RAISE EXCEPTION 'Choose one to ten distinct report types';END IF;
 SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name) INTO labels FROM report_types14253 WHERE id=ANY(p_types) AND active;
 IF coalesce(jsonb_array_length(labels),0)<>n THEN RAISE EXCEPTION 'A report type is inactive or missing';END IF;
 -- Existing RPC enforces owner/reviewer authorization, directions, assignments and locks.
 UPDATE staff_journals SET report_types14253=labels WHERE id=p_journal;
 PERFORM public.submit_staff_journal(p_journal);
END $function$
;

CREATE OR REPLACE FUNCTION public.submit_route14229()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE manager uuid;
BEGIN
 IF NEW.status='submitted' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
 SELECT manager_id INTO manager FROM user_permissions WHERE user_id=NEW.owner_id;
 IF manager IS NOT NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE id=manager AND status='active') THEN RAISE EXCEPTION 'Your assigned supervisor is inactive. Ask the administrator to update Reports to';END IF;
 INSERT INTO review_routes14229(journal_id,current_reviewer) VALUES(NEW.id,manager) ON CONFLICT(journal_id) DO UPDATE SET current_reviewer=manager,updated_at=now() WHERE NOT review_routes14229.final_approved AND review_routes14229.stage=0;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.submit_staff_journal(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals; permission public.user_permissions; line_row public.staff_journal_lines; count_lines integer;
begin
 select * into journal_row from public.staff_journals where id=p_journal_id for update;
 if not found or auth.uid() is null or (journal_row.owner_id<>auth.uid() and not public.has_user_permission('approve')) then raise exception 'Workspace access denied'; end if;
 if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113(CASE WHEN journal_row.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'edit') THEN RAISE EXCEPTION 'Workspace submit permission required';END IF;
 if journal_row.status not in ('draft','returned') then raise exception 'Journal cannot be submitted'; end if;
 select * into permission from public.user_permissions where user_id=journal_row.owner_id;
 select count(*) into count_lines from public.staff_journal_lines where staff_journal_id=p_journal_id;
 if count_lines=0 then raise exception 'Add at least one complete row'; end if;
 for line_row in select * from public.staff_journal_lines where staff_journal_id=p_journal_id loop
   if not(line_row.direction=any(permission.allowed_directions)) or not(line_row.fund_account_id=any(permission.assigned_fund_account_ids)) then raise exception 'An entry uses an unassigned direction or fund'; end if;
   if line_row.direction='out' and not(line_row.account_id=any(permission.destination_account_ids) or line_row.account_id=any(permission.allowed_account_ids)) then raise exception 'An entry uses an unassigned spending account'; end if;
   if line_row.entry_kind='collection' and line_row.account_id<>line_row.fund_account_id and not(line_row.account_id=any(permission.destination_account_ids) or line_row.account_id=any(permission.allowed_account_ids)) then raise exception 'Unassigned Money In category'; end if;
 end loop;
 update public.staff_journals set status='submitted',submitted_at=now(),return_note=null,updated_at=now() where id=p_journal_id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('staff_journals',p_journal_id::text,'SUBMIT',jsonb_build_object('line_count',count_lines),'Workspace submitted for review',auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_id_digits89()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 update public.user_permissions set entry_digits=new.journal_digits where entry_digits is distinct from new.journal_digits;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_subaccount_parent14285()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM public.sub_accounts WHERE parent_account_id=NEW.id) THEN
  IF NEW.is_posting IS DISTINCT FROM false THEN RAISE EXCEPTION 'A grouping account with sub-accounts must remain non-posting.'; END IF;
  IF OLD.account_type IS DISTINCT FROM NEW.account_type AND EXISTS(SELECT 1 FROM public.journal_lines l JOIN public.sub_accounts s ON s.posting_account_id14285=l.account_id WHERE s.parent_account_id=NEW.id) THEN RAISE EXCEPTION 'Sub-accounts have journal history. Keep their parent classification.'; END IF;
  UPDATE public.accounts a SET parent_code=NEW.code,account_type=NEW.account_type FROM public.sub_accounts s WHERE s.parent_account_id=NEW.id AND a.id=s.posting_account_id14285;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.sync_subaccount_posting14285()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE p public.accounts%ROWTYPE; a public.accounts%ROWTYPE; child uuid; posted boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') THEN
  RAISE EXCEPTION 'An active administrator is required to change sub-accounts' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN
  IF OLD.posting_account_id14285 IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=OLD.posting_account_id14285) THEN RAISE EXCEPTION 'This sub-account has journal history. Deactivate it instead.'; END IF;
   DELETE FROM public.accounts WHERE id=OLD.posting_account_id14285;
  END IF;
  RETURN OLD;
 END IF;
 SELECT * INTO p FROM public.accounts WHERE id=NEW.parent_account_id FOR SHARE;
 IF p.id IS NULL OR p.is_posting IS DISTINCT FROM false OR p.is_active IS FALSE THEN RAISE EXCEPTION 'Choose an active non-posting parent grouping account.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.currencies WHERE code=NEW.currency_code AND is_active) THEN RAISE EXCEPTION 'Choose an active currency.'; END IF;
 IF TG_OP='UPDATE' AND NEW.posting_account_id14285 IS DISTINCT FROM OLD.posting_account_id14285 THEN RAISE EXCEPTION 'The posting account link cannot be changed.'; END IF;
 child:=CASE WHEN TG_OP='UPDATE' THEN OLD.posting_account_id14285 ELSE NULL END;
 IF child IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.accounts WHERE code=NEW.code) THEN RAISE EXCEPTION 'This code already belongs to a chart account. Choose a unique sub-account code.'; END IF;
  child:=gen_random_uuid();
  INSERT INTO public.accounts(id,code,name,currency_code,account_type,description,account_purpose,is_posting,is_active,parent_code,created_by)
  VALUES(child,NEW.code,NEW.name,NEW.currency_code,p.account_type,NEW.description,'regular',true,NEW.is_active,p.code,auth.uid());
 ELSE
  SELECT * INTO a FROM public.accounts WHERE id=child FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'The linked posting account is missing.'; END IF;
  posted:=EXISTS(SELECT 1 FROM public.journal_lines WHERE account_id=child);
  IF posted AND (a.currency_code IS DISTINCT FROM NEW.currency_code OR a.account_type IS DISTINCT FROM p.account_type) THEN RAISE EXCEPTION 'Keep the currency and classification of a sub-account with journal history. Create a new sub-account for a different currency or type.'; END IF;
  UPDATE public.accounts SET code=NEW.code,name=NEW.name,currency_code=NEW.currency_code,account_type=p.account_type,description=NEW.description,parent_code=p.code,is_active=NEW.is_active,is_posting=true WHERE id=child;
 END IF;
 NEW.posting_account_id14285:=child;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.team_funds113(p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;
begin
 if not public.can_action113('sub-users-summary113') then raise exception 'Team summary permission required';end if;
 select coalesce(jsonb_agg(jsonb_build_object('owner',p.id,'name',p.full_name,'canOpen',public.can_workspace113(p.id),'accounts',public._fund_summary113(p.id,p_month))),'[]') into result from public.profiles p join public.user_permissions u on u.user_id=p.id where jsonb_array_length(case when jsonb_typeof(to_jsonb(u)->'assigned_fund_account_ids')='array' then to_jsonb(u)->'assigned_fund_account_ids' else '[]'::jsonb end)>0;
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.unreview_scheduled_header91()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if new.status is distinct from old.status or new.transaction_date is distinct from old.transaction_date or new.memo is distinct from old.memo then
 update public.scheduled_journal_occurrences set reviewed_by=null,reviewed_at=null where journal_entry_id=new.id;
 end if;return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.unreview_scheduled_journal91()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 update public.scheduled_journal_occurrences set reviewed_by=null,reviewed_at=null where journal_entry_id=coalesce(new.journal_entry_id,old.journal_entry_id);
 return coalesce(new,old);
end $function$
;

CREATE OR REPLACE FUNCTION public.update_future_schedule91(p_id uuid, p_title text, p_memo text, p_currency text, p_debit uuid, p_credit uuid, p_amount numeric, p_reminder integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_currency text;v_other text;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select currency_code into v_currency from public.accounts where id=p_debit and is_active=true;
 select currency_code into v_other from public.accounts where id=p_credit and is_active=true;
 if nullif(trim(p_title),'') is null or nullif(trim(p_memo),'') is null or p_amount<=0 or p_debit=p_credit or v_currency is null or v_currency is distinct from p_currency or v_other is distinct from p_currency or p_reminder not between 0 and 90 then raise exception 'Enter a name, memo, two active accounts of one currency, amount, and valid reminder';end if;
 update public.scheduled_journals set title=trim(p_title),memo=trim(p_memo),currency_code=p_currency,debit_account_id=p_debit,credit_account_id=p_credit,amount=p_amount,reminder_days=p_reminder,updated_at=now() where id=p_id and status in ('active','paused','failed') and not is_sample;
 if not found then raise exception 'Schedule is unavailable for editing';end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.update_future_schedule92(p_id uuid, p_title text, p_memo text, p_currency text, p_debit uuid, p_credit uuid, p_amount numeric, p_credit_amount numeric, p_reminder integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if p_amount is null or p_credit_amount is null or p_amount<=0 or p_credit_amount<=0 or p_amount::text='NaN' or p_credit_amount::text='NaN' or round(p_amount,2)<>round(p_credit_amount,2) then raise exception 'Positive debit and credit amounts must balance';end if;
 perform public.update_future_schedule91(p_id,p_title,p_memo,p_currency,p_debit,p_credit,p_amount,p_reminder);
 update public.scheduled_journals set credit_amount=p_credit_amount where id=p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.user_lifecycle14253(p_user uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u profiles;c record;used boolean:=false;found_ref boolean;
BEGIN
 -- Serialize changes so two administrators cannot deactivate each other concurrently.
 PERFORM pg_advisory_xact_lock(14253,1);
 IF NOT public.is_admin() OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active' AND deleted_at14253 IS NULL) THEN RAISE EXCEPTION 'Active administrator required';END IF;
 IF p_user=auth.uid() THEN RAISE EXCEPTION 'You cannot deactivate or delete your own account';END IF;
 SELECT * INTO u FROM profiles WHERE id=p_user FOR UPDATE;
 IF NOT FOUND OR u.deleted_at14253 IS NOT NULL THEN RAISE EXCEPTION 'User no longer available';END IF;
 IF p_action NOT IN ('deactivate','reactivate','delete') THEN RAISE EXCEPTION 'Invalid user action';END IF;
 IF p_action<>'reactivate' AND u.role='admin' AND NOT EXISTS(SELECT 1 FROM profiles WHERE id<>p_user AND role='admin' AND status='active' AND deleted_at14253 IS NULL) THEN RAISE EXCEPTION 'Keep at least one active administrator';END IF;
 IF p_action='delete' THEN
 IF u.status='active' THEN RAISE EXCEPTION 'Deactivate the user before deleting their login';END IF;
 -- Detect retained activity through every public FK to the profile, not just one report table.
 FOR c IN SELECT n.nspname,t.relname,a.attname FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.conkey[1] WHERE k.contype='f' AND k.confrelid='public.profiles'::regclass AND n.nspname='public' AND array_length(k.conkey,1)=1 AND t.relname NOT IN ('user_permissions','user_fund_assignments') LOOP
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I=$1)',c.nspname,c.relname,c.attname) INTO found_ref USING p_user;used=used OR found_ref;
 END LOOP;
 IF used AND (u.deactivated_at14253 IS NULL OR u.deactivated_at14253>now()-interval '5 years') THEN RAISE EXCEPTION 'Users with retained activity must be inactive for five years before login deletion';END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE owner_id=p_user AND status IN ('draft','returned','submitted')) THEN RAISE EXCEPTION 'Resolve outstanding reports before deleting this login';END IF;
 -- Refuse an unknown public Auth cascade rather than deleting financial data.
 FOR c IN SELECT n.nspname,t.relname,a.attname FROM pg_constraint k JOIN pg_class t ON t.oid=k.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.conkey[1] WHERE k.contype='f' AND k.confrelid='auth.users'::regclass AND n.nspname<>'auth' AND n.nspname NOT LIKE 'pg_%' LOOP
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE %I=$1)',c.nspname,c.relname,c.attname) INTO found_ref USING p_user;
 IF found_ref THEN RAISE EXCEPTION 'Another public record still references this login; preserve that link before deletion';END IF;
 END LOOP;
 UPDATE profiles SET deleted_at14253=now(),deleted_identity14253=jsonb_build_object('id',u.id,'full_name',u.full_name,'email',u.email),email='deleted+'||u.id::text||'@retired.invalid' WHERE id=p_user;
 DELETE FROM auth.users WHERE id=p_user;
 ELSIF p_action='deactivate' THEN
 UPDATE profiles SET status='inactive',deactivated_at14253=coalesce(deactivated_at14253,now()) WHERE id=p_user;
 UPDATE auth.users SET banned_until='infinity'::timestamptz WHERE id=p_user;
 DELETE FROM auth.sessions WHERE user_id=p_user;
 ELSE
 UPDATE profiles SET status='active',deactivated_at14253=NULL WHERE id=p_user;
 UPDATE auth.users SET banned_until=NULL WHERE id=p_user;
 END IF;
 INSERT INTO audit_log(table_name,record_id,action,new_data,reason,actor_id) VALUES('profiles',p_user::text,'UPDATE',jsonb_build_object('lifecycle',p_action),'User login lifecycle; historical identity retained',auth.uid());
 RETURN jsonb_build_object('user_id',p_user,'action',p_action,'saved',true);
END $function$
;

CREATE OR REPLACE FUNCTION public.validate_id_settings89()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 new.journal_prefix:=upper(trim(new.journal_prefix));new.sub_user_prefix:=upper(trim(new.sub_user_prefix));
 new.automated_prefix:=upper(trim(new.automated_prefix));new.schedule_prefix:=upper(trim(new.schedule_prefix));new.adjustment_prefix:=upper(trim(new.adjustment_prefix));
 if new.journal_digits not between 3 and 9 then raise exception 'Number digits must be 3 to 9';end if;
 if new.journal_prefix!~'^[A-Z0-9]{1,8}$' or new.sub_user_prefix!~'^[A-Z0-9]{1,8}$' or new.automated_prefix!~'^[A-Z0-9]{1,8}$' or new.schedule_prefix!~'^[A-Z0-9]{1,8}$' or new.adjustment_prefix!~'^[A-Z0-9]{1,8}$' then raise exception 'Prefixes require 1 to 8 letters or numbers';end if;
 new.sub_user_digits:=new.journal_digits;
 perform public.reserve_entry_prefix89(new.journal_prefix,'main');
 perform public.reserve_entry_prefix89(new.automated_prefix,'automated');
 perform public.reserve_entry_prefix89(new.schedule_prefix,'schedule');
 perform public.reserve_entry_prefix89(new.adjustment_prefix,'adjustment');
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_journal14228(p_date date, p_memo text, p_lines jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE l jsonb; dr numeric;cr numeric;
BEGIN
 IF p_date IS NULL OR nullif(btrim(p_memo),'') IS NULL THEN RAISE EXCEPTION 'Date and memo are required';END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Journal lines must be an array';END IF;
 IF jsonb_array_length(p_lines)<2 OR jsonb_array_length(p_lines)>500 THEN RAISE EXCEPTION 'Provide 2 to 500 journal lines';END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  dr:=coalesce((l->>'debit')::numeric,0);cr:=coalesce((l->>'credit')::numeric,0);
  IF dr::text IN ('NaN','Infinity','-Infinity') OR cr::text IN ('NaN','Infinity','-Infinity')
   OR NOT ((dr>0 AND cr=0) OR (cr>0 AND dr=0)) OR dr<>round(dr,2) OR cr<>round(cr,2)
   THEN RAISE EXCEPTION 'Use one positive debit or credit, with at most two decimals';END IF;
  IF NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=(l->>'account_id')::uuid AND a.is_active AND a.is_posting
    AND a.currency_code=l->>'currency_code') THEN RAISE EXCEPTION 'Invalid posting account or account currency';END IF;
  IF coalesce(nullif(l->>'line_date','')::date,p_date) IS DISTINCT FROM p_date THEN RAISE EXCEPTION 'Each entry must use one transaction date';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_lines) x GROUP BY x->>'currency_code'
  HAVING sum(coalesce((x->>'debit')::numeric,0))<>sum(coalesce((x->>'credit')::numeric,0)))
  THEN RAISE EXCEPTION 'Every currency must balance';END IF;
 -- Serialize posting with close/lock, including the first posting in a new month.
 INSERT INTO accounting_periods(period_month,status,updated_by)
 VALUES(date_trunc('month',p_date)::date,'open',auth.uid()) ON CONFLICT(period_month) DO NOTHING;
 PERFORM 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date FOR SHARE;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month=date_trunc('month',p_date)::date AND status<>'open')
  AND NOT public.internal_operation136() THEN RAISE EXCEPTION 'Reopen the accounting period before posting';END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.validate_user_prefix89()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 new.entry_prefix:=upper(trim(new.entry_prefix));new.entry_initials:=upper(trim(new.entry_initials));
 select journal_digits into new.entry_digits from public.accounting_id_settings where id=true;
 new.entry_digits:=coalesce(new.entry_digits,4);
 if coalesce(new.entry_initials,'')<>'' then
  if new.entry_prefix!~'^[A-Z0-9]{1,8}$' or new.entry_initials!~'^[A-Z0-9]{1,8}$' then raise exception 'Prefix and initials require 1 to 8 letters or numbers';end if;
  perform public.reserve_entry_prefix89(new.entry_prefix||'-'||new.entry_initials,'user:'||new.user_id::text);
 end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.void_journal_entry(p_entry_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old public.journal_entries;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A void reason is required'; end if;
  select * into v_old from public.journal_entries where id=p_entry_id for update;
  if not found then raise exception 'Journal entry not found'; end if;
  if v_old.status='voided' then raise exception 'This transaction is already voided'; end if;
  update public.journal_entries
    set status='voided', correction_status='voided', void_reason=trim(p_reason),
        voided_by=auth.uid(), voided_at=now(), updated_at=now()
  where id=p_entry_id;
  insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
  values('journal_entries',p_entry_id::text,'VOID',to_jsonb(v_old),
    jsonb_build_object('status','voided','correction_status','voided'),trim(p_reason),auth.uid());
end $function$
;

CREATE OR REPLACE FUNCTION public.void_staff_editor1437(p_owner uuid, p_ids uuid[], p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE n integer;line_id uuid;
BEGIN
 IF NOT public.can_workspace113(p_owner) OR NOT public.can_action113(CASE WHEN p_owner=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'void') THEN RAISE EXCEPTION 'Current workspace void permission required';END IF;
 IF cardinality(p_ids) IS NULL OR cardinality(p_ids)<1 OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Choose entries and provide a reason';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':desktop-editor',0));
 SELECT count(*) INTO n FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id
 WHERE l.id=ANY(p_ids) AND j.owner_id=p_owner AND j.status IN ('draft','returned') AND l.journal_entry_id IS NULL;
 IF n<>cardinality(p_ids) THEN RAISE EXCEPTION 'Only editable entries in this personal journal can be removed';END IF;
 FOREACH line_id IN ARRAY p_ids LOOP
  PERFORM public.void_staff_workspace_entry(p_line_id=>line_id,p_reason=>p_reason);
 END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.void_staff_workspace_entry(p_line_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare journal_row public.staff_journals; line_row public.staff_journal_lines;
begin
  if nullif(trim(p_reason),'') is null then raise exception 'A void reason is required'; end if;
  select * into line_row from public.staff_journal_lines where id=p_line_id for update;
  if not found then raise exception 'Workspace entry not found'; end if;
  select * into journal_row from public.staff_journals where id=line_row.staff_journal_id for update;
  if not found then raise exception 'Workspace journal not found'; end if;
  if NOT public.can_workspace113(journal_row.owner_id) OR NOT public.can_action113(CASE WHEN journal_row.owner_id=auth.uid() THEN 'sub-users-workspace' ELSE 'user-entry-review' END,'void') then raise exception 'Current workspace void access required'; end if;
  if journal_row.status not in ('draft','returned') then raise exception 'Only draft or returned entries can be voided'; end if;
  insert into public.audit_log(table_name,record_id,action,old_data,reason,actor_id)
  values('staff_journal_lines',p_line_id::text,'VOID',to_jsonb(line_row),trim(p_reason),auth.uid());
  delete from public.staff_journal_lines where id=p_line_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.voucher_admin14299()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND status='active') AND public.accounting_workspace_allowed123()
$function$
;

CREATE OR REPLACE FUNCTION public.voucher_config14299(p_prefix text, p_handwritten_code text, p_editor_code text, p_handwritten_label text, p_editor_label text, p_digits integer, p_year_digits integer DEFAULT 2)
 RETURNS voucher_settings14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE result public.voucher_settings14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required'; END IF;
 UPDATE public.voucher_settings14299 SET prefix=upper(trim(p_prefix)),handwritten_code=upper(trim(p_handwritten_code)),editor_code=upper(trim(p_editor_code)),handwritten_label=trim(p_handwritten_label),editor_label=trim(p_editor_label),digits=p_digits,year_digits=p_year_digits,updated_at=now() WHERE id=1 RETURNING * INTO result;
 RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION public.voucher_issue14299(p_kind text, p_count integer, p_date date, p_data jsonb, p_request_key uuid)
 RETURNS SETOF vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE setting public.voucher_settings14299; n integer; first_no integer; yr integer; code text; item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('H','E') OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 50 OR p_date IS NULL OR p_request_key IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid voucher request';END IF;
 IF p_kind='E' AND (p_count<>1 OR length(coalesce(p_data->>'tentative_number',''))<8 OR length(coalesce(p_data->>'html',''))<30) THEN RAISE EXCEPTION 'Editor voucher content and tentative number required';END IF;
 IF p_kind='E' AND (coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB')) THEN RAISE EXCEPTION 'Valid voucher amount and currency required';END IF;
 -- A retried request yields its original result and never consumes another ID.
 IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key) THEN
   IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key AND request_payload IS DISTINCT FROM jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data)) THEN RAISE EXCEPTION 'Voucher request reference already used for different data';END IF;
   RETURN QUERY SELECT * FROM public.vouchers14299 WHERE batch_key=p_request_key ORDER BY ordinal; RETURN;
 END IF;
 SELECT * INTO setting FROM public.voucher_settings14299 WHERE id=1 FOR SHARE;
 yr=extract(year FROM p_date)::integer;
 INSERT INTO public.voucher_sequences14299(year_no,kind,next_no) VALUES(yr,p_kind,1) ON CONFLICT DO NOTHING;
 SELECT next_no INTO first_no FROM public.voucher_sequences14299 WHERE year_no=yr AND kind=p_kind FOR UPDATE;
 -- Recheck after the sequence lock for concurrent retries.
 IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key) THEN
   IF EXISTS(SELECT 1 FROM public.vouchers14299 WHERE batch_key=p_request_key AND request_payload IS DISTINCT FROM jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data)) THEN RAISE EXCEPTION 'Voucher request reference already used for different data';END IF;
   RETURN QUERY SELECT * FROM public.vouchers14299 WHERE batch_key=p_request_key ORDER BY ordinal; RETURN;
 END IF;
 IF first_no+p_count-1>power(10,setting.digits)-1 THEN RAISE EXCEPTION 'Voucher number sequence exhausted';END IF;
 UPDATE public.voucher_sequences14299 SET next_no=next_no+p_count WHERE year_no=yr AND kind=p_kind;
 code=CASE WHEN p_kind='H' THEN setting.handwritten_code ELSE setting.editor_code END;
 FOR n IN 0..p_count-1 LOOP
   INSERT INTO public.vouchers14299(request_key,batch_key,request_payload,number,year_no,ordinal,kind,status,voucher_date,data,created_by)
   VALUES(CASE WHEN n=0 THEN p_request_key ELSE gen_random_uuid() END,p_request_key,jsonb_build_object('kind',p_kind,'count',p_count,'date',p_date,'data',p_data),
     setting.prefix||'-'||right(yr::text,setting.year_digits)||code||'-'||lpad((first_no+n)::text,setting.digits,'0'),yr,first_no+n,p_kind,
     CASE WHEN p_kind='H' THEN 'reserved' ELSE 'issued' END,p_date,
     (CASE WHEN p_kind='E' THEN jsonb_set(p_data,'{html}',to_jsonb(replace(p_data->>'html',coalesce(p_data->>'tentative_number',''),setting.prefix||'-'||right(yr::text,setting.year_digits)||code||'-'||lpad((first_no+n)::text,setting.digits,'0'))),true)-'tentative_number' ELSE p_data END)||jsonb_build_object('date',p_date,'id_format',jsonb_build_object('prefix',setting.prefix,'code',code,'digits',setting.digits,'year_digits',setting.year_digits,'label',CASE WHEN p_kind='H' THEN setting.handwritten_label ELSE setting.editor_label END)),
     auth.uid()) RETURNING * INTO item;
   INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,1,item.data,'Issued',auth.uid());
   RETURN NEXT item;
 END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION public.voucher_link14299(p_id uuid, p_entry_id uuid)
 RETURNS vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE item public.vouchers14299; entry public.journal_entries; snapshot jsonb; lines jsonb; journal_total numeric; setting public.voucher_settings14299; entry_ordinal text; linked_number text;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 SELECT * INTO entry FROM public.journal_entries WHERE id=p_entry_id AND status='posted' FOR SHARE;
 IF item.id IS NULL OR entry.id IS NULL OR item.status='void' THEN RAISE EXCEPTION 'Choose an available voucher and posted journal entry';END IF;
 IF item.journal_entry_id=p_entry_id THEN RETURN item;END IF;
 IF item.journal_entry_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.vouchers14299 WHERE journal_entry_id=p_entry_id) THEN RAISE EXCEPTION 'Voucher or journal entry is already linked';END IF;
 IF item.kind='E' AND item.data ? 'total' THEN
   SELECT coalesce(sum(l.debit),0) INTO journal_total FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.currency_code=item.data->>'currency';
   IF EXISTS(SELECT 1 FROM public.journal_lines l WHERE l.journal_entry_id=p_entry_id AND l.debit>0 AND l.currency_code IS DISTINCT FROM item.data->>'currency')
      OR journal_total IS DISTINCT FROM (item.data->>'total')::numeric THEN
      RAISE EXCEPTION 'Voucher total/currency differs from the posted journal. Correct the voucher or choose a matching entry';
   END IF;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('account_id',l.account_id,'account',a.name,'code',a.code,'description',coalesce(nullif(l.description,''),entry.memo),'debit',l.debit,'credit',l.credit,'currency',l.currency_code) ORDER BY l.id::text),'[]'::jsonb) INTO lines
 FROM public.journal_lines l LEFT JOIN public.accounts a ON a.id=l.account_id WHERE l.journal_entry_id=p_entry_id;
 SELECT * INTO setting FROM public.voucher_settings14299 WHERE id=1 FOR SHARE;
 entry_ordinal=substring(entry.entry_no FROM '([0-9]+)$');
 IF entry_ordinal IS NULL THEN RAISE EXCEPTION 'Journal Entry ID needs a numeric suffix';END IF;
 entry_ordinal=(entry_ordinal::bigint)::text;
 linked_number=coalesce(item.data->'id_format'->>'prefix',setting.prefix)||'-'||right(extract(year FROM entry.transaction_date)::integer::text,coalesce((item.data->'id_format'->>'year_digits')::integer,setting.year_digits))||coalesce(item.data->'id_format'->>'code',CASE WHEN item.kind='H' THEN setting.handwritten_code ELSE setting.editor_code END)||'-'||lpad(entry_ordinal,greatest(coalesce((item.data->'id_format'->>'digits')::integer,setting.digits),length(entry_ordinal)),'0');
 snapshot=jsonb_build_object('entry_id',entry.id,'entry_no',entry.entry_no,'date',entry.transaction_date,'memo',entry.memo,'lines',lines);
 UPDATE public.vouchers14299 SET journal_entry_id=p_entry_id,journal_number=linked_number,status='linked',data=item.data||jsonb_build_object('journal',snapshot),version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,'Linked to journal '||entry.entry_no,auth.uid());
 RETURN item;
END $function$
;

CREATE OR REPLACE FUNCTION public.voucher_update14299(p_id uuid, p_version integer, p_date date, p_data jsonb, p_reason text)
 RETURNS vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF length(trim(coalesce(p_reason,'')))<4 OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Explain the correction and provide voucher data';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.kind<>'E' OR item.status NOT IN ('issued','linked') THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 IF p_date IS NULL THEN RAISE EXCEPTION 'Voucher date is required';END IF;
 IF coalesce(p_data->>'total','') !~ '^[0-9]+([.][0-9]{1,2})?$' OR coalesce(p_data->>'currency','') NOT IN ('LAK','USD','THB') THEN RAISE EXCEPTION 'Valid voucher amount and currency required';END IF;
 IF item.journal_entry_id IS NOT NULL AND ((p_data->>'total') IS DISTINCT FROM (item.data->>'total') OR (p_data->>'currency') IS DISTINCT FROM (item.data->>'currency')) THEN RAISE EXCEPTION 'Linked voucher amount and currency must agree with the journal';END IF;
 UPDATE public.vouchers14299 SET data=(p_data-'journal'-'id_format')||jsonb_build_object('journal',item.data->'journal','date',p_date,'id_format',item.data->'id_format'),voucher_date=p_date,version=version+1,updated_at=now()
 WHERE id=p_id AND version=p_version AND kind='E' AND status IN ('issued','linked') RETURNING * INTO item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Voucher changed or cannot be edited; refresh the register';END IF;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,p_reason,auth.uid());
 RETURN item;
END $function$
;

CREATE OR REPLACE FUNCTION public.voucher_void14299(p_id uuid, p_version integer, p_reason text)
 RETURNS vouchers14299
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE item public.vouchers14299;
BEGIN
 IF NOT public.voucher_admin14299() THEN RAISE EXCEPTION 'Accounting administrator required';END IF;
 IF length(trim(coalesce(p_reason,'')))<4 THEN RAISE EXCEPTION 'Explain why the voucher is unused';END IF;
 SELECT * INTO item FROM public.vouchers14299 WHERE id=p_id FOR UPDATE;
 IF item.id IS NULL OR item.version<>p_version OR item.status='void' OR item.journal_entry_id IS NOT NULL THEN RAISE EXCEPTION 'Only an unchanged, unlinked voucher can be marked unused';END IF;
 UPDATE public.vouchers14299 SET status='void',version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO item;
 INSERT INTO public.voucher_versions14299(voucher_id,version,data,reason,changed_by) VALUES(item.id,item.version,item.data,'Unused: '||trim(p_reason),auth.uid());
 RETURN item;
END $function$
;

CREATE OR REPLACE FUNCTION public.workflow_capabilities14253()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND status='active') THEN '{"version":14253}'::jsonb ELSE '{}'::jsonb END
$function$
;

CREATE OR REPLACE FUNCTION public.workspace_actor_log138()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=nullif(current_setting('ojm.workspace_actor138',true),'')::uuid; previous jsonb; next_row jsonb;BEGIN
 IF actor IS NOT NULL THEN
  IF TG_OP<>'INSERT' THEN previous:=to_jsonb(OLD);END IF;
  IF TG_OP<>'DELETE' THEN next_row:=to_jsonb(NEW);END IF;
  INSERT INTO workspace_actor_audit138(actor_id,effective_user_id,operation,table_name,row_id,before_data,after_data)
   VALUES(actor,auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(next_row->>'id',previous->>'id'),previous,next_row);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.workspace_context138()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=nullif(current_setting('ojm.workspace_actor138',true),'')::uuid; effective uuid:=auth.uid();BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND role='admin' AND status='active') THEN
  RAISE EXCEPTION 'Restricted account context was not applied. Install v138 SQL and refresh.' USING ERRCODE='42501';END IF;
 INSERT INTO workspace_actor_audit138(actor_id,effective_user_id,operation) VALUES(actor,effective,'switch_account');
 RETURN jsonb_build_object('version',138,'actor',actor,'effective_user',effective);
END $function$
;

CREATE OR REPLACE FUNCTION public.workspace_live_activity_v49(p_owner_id uuid, p_fund_account_id uuid, p_activity_key text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result_value numeric;
begin
  if auth.uid() is null or (p_owner_id<>auth.uid() and not public.has_user_permission('approve')) then raise exception 'Workspace access denied'; end if;
  select coalesce((
    select sum(case
      when p_activity_key='received' and (l.entry_kind='collection' or l.direction='in') then l.amount
      when p_activity_key='used' and l.direction='out' and l.entry_kind in ('legacy','payment') then l.amount
      when p_activity_key='handover' and l.entry_kind='handover' then l.amount
      else 0 end)
    from public.staff_journal_lines l join public.staff_journals j on j.id=l.staff_journal_id
    where j.owner_id=p_owner_id and l.fund_account_id=p_fund_account_id
  ),0) + coalesce((
    select sum(al.difference_applied)
    from public.fund_adjustment_lines al join public.fund_adjustment_requests ar on ar.id=al.request_id
    where ar.owner_id=p_owner_id and ar.fund_account_id=p_fund_account_id
      and ar.status='approved_applied' and al.activity_key=p_activity_key
  ),0) into result_value;
  return result_value;
end
$function$
;

CREATE OR REPLACE FUNCTION public.workspace_pre_request138()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE headers jsonb:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}');
 claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}');
 actor uuid:=auth.uid(); target uuid; p public.profiles; previous regprocedure; ns text; fn text;
BEGIN
 PERFORM set_config('ojm.workspace_actor138','',true);
 IF claims->>'role'='service_role' THEN RETURN;END IF;
 IF nullif(headers->>'x-ojm-workspace','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=actor AND role='admin' AND status='active') THEN
   RAISE EXCEPTION 'Only an active administrator may switch accounts' USING ERRCODE='42501';
  END IF;
  BEGIN target:=(headers->>'x-ojm-workspace')::uuid; EXCEPTION WHEN invalid_text_representation THEN
   RAISE EXCEPTION 'Invalid workspace account' USING ERRCODE='42501'; END;
  SELECT * INTO p FROM profiles WHERE id=target AND status='active' AND role<>'admin';
  IF p.id IS NULL THEN RAISE EXCEPTION 'Choose an active sub-user account' USING ERRCODE='42501';END IF;
  PERFORM set_config('ojm.workspace_actor138',actor::text,true);
  -- Authorization stays in the existing authenticated role; identity-dependent RLS/RPCs see the sub-user.
  claims:=claims||jsonb_build_object('sub',target::text,'email',to_jsonb(p)->>'email');
  claims:=claims-'app_metadata'-'user_metadata';
  PERFORM set_config('request.jwt.claims',claims::text,true);
  PERFORM set_config('request.jwt.claim.sub',target::text,true);
 END IF;
 IF NOT public.active_account14228() THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';END IF;
 IF NOT public.accounting_workspace_allowed123() AND regexp_replace(rtrim(coalesce(current_setting('request.path',true),''),'/'),'^.*/','') <> ALL(ARRAY[
 'profiles','restaurant_members121','restaurant_presentation121','inventory_items104','inventory_movements104','menu_ingredients105','menu_items104','menu_categories104','menu_sales108','pos_config118','pos_orders118','pos_shifts118','pos_cash118','pos_stock118',
 'is_admin','restaurant_can121','restaurant_signed_in121','restaurant_table_can121','restaurant_delete121','pos_snapshot118','pos_order118','pos_manage118','pos_import_online_menu120'])
 THEN RAISE EXCEPTION 'Restaurant staff cannot access Accounting' USING ERRCODE='42501';END IF;
 SELECT previous_hook INTO previous FROM workspace_hook_config138 WHERE id;
 IF previous IS NOT NULL AND previous<>'public.workspace_pre_request138()'::regprocedure THEN
  SELECT n.nspname,f.proname INTO ns,fn FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE f.oid=previous::oid;
  IF fn IS NOT NULL THEN EXECUTE format('SELECT %I.%I()',ns,fn);END IF;
 END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.workspace_write_scope14229()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE owner_id uuid;jid uuid;
BEGIN
 IF public.is_admin() THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_TABLE_NAME='staff_journals' THEN owner_id:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
 ELSE jid:=CASE WHEN TG_OP='DELETE' THEN OLD.staff_journal_id ELSE NEW.staff_journal_id END;SELECT j.owner_id INTO owner_id FROM staff_journals j WHERE j.id=jid;END IF;
 IF owner_id=auth.uid() OR EXISTS(SELECT 1 FROM user_permissions WHERE user_id=owner_id AND manager_id=auth.uid()) THEN
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 -- Forwarded reviewers may finalize/link only the immutable report they received.
 IF TG_OP='UPDATE' AND public.review_current14229(CASE WHEN TG_TABLE_NAME='staff_journals' THEN NEW.id ELSE jid END)
 AND EXISTS(SELECT 1 FROM review_routes14229 WHERE journal_id=CASE WHEN TG_TABLE_NAME='staff_journals' THEN NEW.id ELSE jid END AND final_approved)
 AND public.can_action113('user-entry-review','post') THEN
 IF TG_TABLE_NAME='staff_journals' AND (to_jsonb(NEW)-ARRAY['status','reviewed_by','reviewed_at','updated_at'])=(to_jsonb(OLD)-ARRAY['status','reviewed_by','reviewed_at','updated_at']) THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='staff_journal_lines' AND (to_jsonb(NEW)-ARRAY['journal_entry_id','updated_at'])=(to_jsonb(OLD)-ARRAY['journal_entry_id','updated_at']) THEN RETURN NEW;END IF;
 END IF;
 RAISE EXCEPTION 'Only the owner or direct supervisor may edit this workspace';
END $function$
;

CREATE OR REPLACE FUNCTION public.year_preflight136(p_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=public.require_admin136(); start_date date:=make_date(p_year,1,1);end_date date:=make_date(p_year+1,1,1);b jsonb;issues jsonb:='[]';warnings jsonb:='[]';n integer;BEGIN
 IF p_year NOT BETWEEN 1900 AND 2198 THEN RAISE EXCEPTION 'Invalid year';END IF;
 SELECT count(*) INTO n FROM journal_entries WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text='posted';IF n=0 THEN issues:=issues||jsonb_build_array('No posted transactions in this year');END IF;
 IF EXISTS(SELECT 1 FROM year_closings136 WHERE year=p_year) THEN RETURN jsonb_build_object('year',p_year,'completed',true,'record',(SELECT to_jsonb(y) FROM year_closings136 y WHERE year=p_year));END IF;
 IF EXISTS(SELECT 1 FROM journal_entries e LEFT JOIN accounting_periods p ON p.period_month=date_trunc('month',e.transaction_date)::date WHERE e.transaction_date>=start_date AND e.transaction_date<end_date AND e.status::text='posted' AND p.status IS DISTINCT FROM 'locked') THEN issues:=issues||jsonb_build_array('Lock every month containing posted transactions');END IF;
 IF EXISTS(SELECT 1 FROM accounting_periods WHERE period_month>=start_date AND period_month<end_date AND status NOT IN ('closed','locked')) THEN issues:=issues||jsonb_build_array('Close or lock all existing period records in this year');END IF;
 IF EXISTS(SELECT 1 FROM book_sessions136 s JOIN accounting_periods p ON p.id=s.period_id WHERE s.status='editing' AND p.period_month>=start_date AND p.period_month<end_date) THEN issues:=issues||jsonb_build_array('Finish or cancel reopened books');END IF;
 IF EXISTS(SELECT 1 FROM entry_submissions WHERE transaction_date>=start_date AND transaction_date<end_date AND status::text IN ('pending','submitted')) OR EXISTS(SELECT 1 FROM staff_journals j WHERE j.period_start>=start_date AND j.period_start<end_date AND j.status='submitted' AND EXISTS(SELECT 1 FROM staff_journal_lines l WHERE l.staff_journal_id=j.id)) THEN issues:=issues||jsonb_build_array('Resolve submitted entries awaiting approval');END IF;
 IF EXISTS(SELECT 1 FROM audit_reviews136 r JOIN accounting_periods p ON p.id=r.period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND r.status='open') OR EXISTS(SELECT 1 FROM period_findings f JOIN accounting_periods p ON p.id=f.accounting_period_id WHERE p.period_month>=start_date AND p.period_month<end_date AND f.status NOT IN ('closed','corrected')) THEN issues:=issues||jsonb_build_array('Resolve outstanding review findings');END IF;
 IF EXISTS(SELECT 1 FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY e.id,l.currency_code HAVING abs(sum(l.debit-l.credit))>0.005) THEN issues:=issues||jsonb_build_array('A posted transaction is unbalanced by currency');END IF;
 IF EXISTS(SELECT 1 FROM staff_journals WHERE period_start>=start_date AND period_start<end_date AND status IN ('draft','returned')) THEN warnings:=warnings||jsonb_build_array('Unsubmitted employee drafts are excluded from the ledger and carry-forward');END IF;
 IF EXISTS(SELECT 1 FROM payroll_runs WHERE period_start>=start_date AND period_start<end_date AND status='draft') THEN warnings:=warnings||jsonb_build_array('Draft payroll is excluded; confirm all actual payroll was posted');END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,currency),'[]') INTO b FROM (SELECT a.id account_id,a.code,a.name,a.account_type type,l.currency_code currency,sum(l.debit-l.credit) balance FROM journal_lines l JOIN journal_entries e ON e.id=l.journal_entry_id JOIN accounts a ON a.id=l.account_id WHERE e.status::text='posted' AND coalesce(l.line_date,e.transaction_date)<end_date GROUP BY a.id,a.code,a.name,a.account_type,l.currency_code HAVING sum(l.debit-l.credit)<>0) x;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(b) x WHERE upper(x->>'type') IN ('REVENUE','INCOME','EXPENSE') AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.account_type='EQUITY' AND a.parent_code='3100' AND a.is_active AND a.is_posting AND a.currency_code=x->>'currency')) THEN issues:=issues||jsonb_build_array('An active retained-earnings account is missing for a currency');END IF;
 RETURN jsonb_build_object('year',p_year,'nextYear',p_year+1,'transactions',n,'blockers',issues,'warnings',warnings,'balances',b,'fingerprint',md5(b::text));END $function$
;


-- DEFAULTS
ALTER TABLE "private"."password_reset14257" ALTER COLUMN "required" SET DEFAULT true;

ALTER TABLE "private"."password_reset14257" ALTER COLUMN "issued_at" SET DEFAULT now();

ALTER TABLE "public"."account_provisioning14320" ALTER COLUMN "request_id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."account_provisioning14320" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."accounting_feature_samples" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "journal_prefix" SET DEFAULT 'JRN'::text;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "journal_digits" SET DEFAULT 4;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "sub_user_digits" SET DEFAULT 4;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "sub_user_prefix" SET DEFAULT 'SJR'::text;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "automated_prefix" SET DEFAULT 'AUTO'::text;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "schedule_prefix" SET DEFAULT 'SCH'::text;

ALTER TABLE "public"."accounting_id_settings" ALTER COLUMN "adjustment_prefix" SET DEFAULT 'ADJ'::text;

ALTER TABLE "public"."accounting_periods" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."accounting_periods" ALTER COLUMN "status" SET DEFAULT 'open'::text;

ALTER TABLE "public"."accounting_periods" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."accounting_periods" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."accounts" ALTER COLUMN "description" SET DEFAULT ''::text;

ALTER TABLE "public"."accounts" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "public"."accounts" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."accounts" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."accounts" ALTER COLUMN "account_purpose" SET DEFAULT 'regular'::text;

ALTER TABLE "public"."accounts" ALTER COLUMN "is_posting" SET DEFAULT true;

ALTER TABLE "public"."accounts" ALTER COLUMN "is_technical" SET DEFAULT false;

ALTER TABLE "public"."approved_reports1443" ALTER COLUMN "approved_at" SET DEFAULT now();

ALTER TABLE "public"."audit_log" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."audit_reviews136" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."audit_reviews136" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."audit_reviews136" ALTER COLUMN "status" SET DEFAULT 'open'::text;

ALTER TABLE "public"."backup_audit113" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."backup_audit113" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."book_sessions136" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."book_sessions136" ALTER COLUMN "operations" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."book_sessions136" ALTER COLUMN "status" SET DEFAULT 'editing'::text;

ALTER TABLE "public"."book_sessions136" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."budget_settings14313" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."budget_settings14313" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."budget_settings14313" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."budget_settings14313" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."budget_templates14313" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."budget_templates14313" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."budget_templates14313" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."business_settings" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."business_settings" ALTER COLUMN "legal_name" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "display_name" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "enterprise_no" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "tax_id" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "business_license" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "industry" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "phone" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "email" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "website" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "address_line" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "city" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "postal_code" SET DEFAULT ''::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "country" SET DEFAULT 'Laos'::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Vientiane'::text;

ALTER TABLE "public"."business_settings" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."cashier_currency_counts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."cashier_currency_counts" ALTER COLUMN "sort_order" SET DEFAULT 1;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "pos_reporting_currency" SET DEFAULT 'LAK'::text;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "pos_total" SET DEFAULT 0;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "cash_expenses_total" SET DEFAULT 0;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "actual_count_equivalent" SET DEFAULT 0;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "variance" SET DEFAULT 0;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "notes" SET DEFAULT ''::text;

ALTER TABLE "public"."cashier_shift_closes" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."cashier_shift_tenders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."cashier_shift_tenders" ALTER COLUMN "pos_amount" SET DEFAULT 0;

ALTER TABLE "public"."cashier_shift_tenders" ALTER COLUMN "sort_order" SET DEFAULT 1;

ALTER TABLE "public"."catalog_installations106" ALTER COLUMN "installed_at" SET DEFAULT now();

ALTER TABLE "public"."company_documents105" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."company_documents105" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."company_documents105" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."company_documents105" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."company_documents105" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."currencies" ALTER COLUMN "is_base" SET DEFAULT false;

ALTER TABLE "public"."currencies" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "public"."currencies" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."data_tools_state14232" ALTER COLUMN "instance" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."document_download_passwords14312" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."document_download_passwords14312" ALTER COLUMN "prepared_at" SET DEFAULT now();

ALTER TABLE "public"."document_download_passwords14312" ALTER COLUMN "saved_at" SET DEFAULT now();

ALTER TABLE "public"."employees" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."employees" ALTER COLUMN "employment_status" SET DEFAULT 'active'::text;

ALTER TABLE "public"."employees" ALTER COLUMN "base_salary" SET DEFAULT 0;

ALTER TABLE "public"."employees" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."entry_prefix_reservations" ALTER COLUMN "reserved_at" SET DEFAULT now();

ALTER TABLE "public"."entry_submissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."entry_submissions" ALTER COLUMN "reference" SET DEFAULT ''::text;

ALTER TABLE "public"."entry_submissions" ALTER COLUMN "status" SET DEFAULT 'pending'::submission_status;

ALTER TABLE "public"."entry_submissions" ALTER COLUMN "submitted_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."entry_submissions" ALTER COLUMN "submitted_at" SET DEFAULT now();

ALTER TABLE "public"."fund_adjustment_lines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "request_no" SET DEFAULT next_adjustment_no89();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "status" SET DEFAULT 'submitted'::text;

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "report_reference" SET DEFAULT ''::text;

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "submitted_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "submitted_at" SET DEFAULT now();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."fund_adjustment_requests" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."handover_history14320" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."hr_calendar_events14306" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."hr_calendar_events14306" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."hr_calendar_events14306" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."hr_calendar_history14306" ALTER COLUMN "changed_at" SET DEFAULT now();

ALTER TABLE "public"."hr_calendar_settings14306" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."hr_calendar_settings14306" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."hr_calendar_settings14306" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."hr_calendar_settings14306" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."installation14320" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."installation14320" ALTER COLUMN "instance" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."installation14320" ALTER COLUMN "initialized" SET DEFAULT false;

ALTER TABLE "public"."installation14320" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."installation14320" ALTER COLUMN "deployment" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."installation14320" ALTER COLUMN "checks" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."installation14320" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."inventory_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."inventory_items" ALTER COLUMN "unit_cost" SET DEFAULT 0;

ALTER TABLE "public"."inventory_items" ALTER COLUMN "quantity_on_hand" SET DEFAULT 0;

ALTER TABLE "public"."inventory_items" ALTER COLUMN "reorder_level" SET DEFAULT 0;

ALTER TABLE "public"."inventory_items" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "public"."inventory_items" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."inventory_items104" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."inventory_items104" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."inventory_items104" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."inventory_items104" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."inventory_items104" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."inventory_movements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."inventory_movements" ALTER COLUMN "movement_date" SET DEFAULT CURRENT_DATE;

ALTER TABLE "public"."inventory_movements" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."inventory_movements104" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."inventory_movements104" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."inventory_movements104" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."journal_entries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."journal_entries" ALTER COLUMN "memo" SET DEFAULT ''::text;

ALTER TABLE "public"."journal_entries" ALTER COLUMN "reference" SET DEFAULT ''::text;

ALTER TABLE "public"."journal_entries" ALTER COLUMN "status" SET DEFAULT 'posted'::journal_status;

ALTER TABLE "public"."journal_entries" ALTER COLUMN "source" SET DEFAULT 'manual'::text;

ALTER TABLE "public"."journal_entries" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."journal_entries" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."journal_entries" ALTER COLUMN "correction_status" SET DEFAULT 'normal'::text;

ALTER TABLE "public"."journal_entries" ALTER COLUMN "review_note" SET DEFAULT ''::text;

ALTER TABLE "public"."journal_lines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."journal_lines" ALTER COLUMN "description" SET DEFAULT ''::text;

ALTER TABLE "public"."journal_lines" ALTER COLUMN "debit" SET DEFAULT 0;

ALTER TABLE "public"."journal_lines" ALTER COLUMN "credit" SET DEFAULT 0;

ALTER TABLE "public"."journal_lines" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."legal_documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."legal_documents" ALTER COLUMN "document_type" SET DEFAULT 'other'::text;

ALTER TABLE "public"."legal_documents" ALTER COLUMN "uploaded_at" SET DEFAULT now();

ALTER TABLE "public"."menu_categories104" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."menu_categories104" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."menu_categories104" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."menu_categories104" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."menu_categories104" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."menu_ingredients105" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."menu_ingredients105" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."menu_ingredients105" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."menu_ingredients105" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."menu_ingredients105" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."menu_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."menu_items" ALTER COLUMN "selling_price" SET DEFAULT 0;

ALTER TABLE "public"."menu_items" ALTER COLUMN "is_available" SET DEFAULT true;

ALTER TABLE "public"."menu_items" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."menu_items104" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."menu_items104" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."menu_items104" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."menu_items104" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."menu_items104" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "created_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."menu_sales108" ALTER COLUMN "updated_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."opening_state14234" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."opening_state14234" ALTER COLUMN "generation" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."opening_state14234" ALTER COLUMN "closed" SET DEFAULT false;

ALTER TABLE "public"."operation_receipts14228" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."operational_reports" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."operational_reports" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."operational_reports" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."operational_reports" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."operational_reports" ALTER COLUMN "updated_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."payroll_employees" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."payroll_employees" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."payroll_employees" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."payroll_employees" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."payroll_employees" ALTER COLUMN "updated_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."payroll_leave_records" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."payroll_leave_records" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."payroll_leave_records" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."payroll_leave_records" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."payroll_leave_records" ALTER COLUMN "updated_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "gross_pay" SET DEFAULT 0;

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "employee_sso" SET DEFAULT 0;

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "employer_sso" SET DEFAULT 0;

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "pit" SET DEFAULT 0;

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "other_deductions" SET DEFAULT 0;

ALTER TABLE "public"."payroll_lines" ALTER COLUMN "net_pay" SET DEFAULT 0;

ALTER TABLE "public"."payroll_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."payroll_runs" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE "public"."payroll_runs" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."payroll_runs" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."payroll_runs" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."period_findings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."period_findings" ALTER COLUMN "status" SET DEFAULT 'open'::text;

ALTER TABLE "public"."period_findings" ALTER COLUMN "reported_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."period_findings" ALTER COLUMN "reported_at" SET DEFAULT now();

ALTER TABLE "public"."period_findings" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."pos_cash118" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."pos_cash118" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."pos_config118" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."pos_config118" ALTER COLUMN "data" SET DEFAULT '{"methods": ["Cash", "BCEL QR", "Bank"], "cashiers": [], "receiptWidth": 80, "discountLimit": 10, "receiptFooter": "Thank you for visiting."}'::jsonb;

ALTER TABLE "public"."pos_config118" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."pos_orders118" ALTER COLUMN "status" SET DEFAULT 'unpaid'::text;

ALTER TABLE "public"."pos_orders118" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."pos_orders118" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."pos_orders118" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."pos_shifts118" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."pos_shifts118" ALTER COLUMN "opened_at" SET DEFAULT now();

ALTER TABLE "public"."pos_stock118" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."pos_stock118" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."presentation_settings113" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."presentation_settings113" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."print_settings" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."print_settings" ALTER COLUMN "page_size" SET DEFAULT 'A4'::text;

ALTER TABLE "public"."print_settings" ALTER COLUMN "orientation" SET DEFAULT 'portrait'::text;

ALTER TABLE "public"."print_settings" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."profiles" ALTER COLUMN "full_name" SET DEFAULT ''::text;

ALTER TABLE "public"."profiles" ALTER COLUMN "role" SET DEFAULT 'submitter'::app_role;

ALTER TABLE "public"."profiles" ALTER COLUMN "status" SET DEFAULT 'active'::record_status;

ALTER TABLE "public"."profiles" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."profiles" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."record_deletions108" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."record_deletions108" ALTER COLUMN "deleted_at" SET DEFAULT now();

ALTER TABLE "public"."record_deletions108" ALTER COLUMN "deleted_by" SET DEFAULT auth.uid();

ALTER TABLE "public"."recovery_attempts14320" ALTER COLUMN "started_at" SET DEFAULT now();

ALTER TABLE "public"."recovery_attempts14320" ALTER COLUMN "attempts" SET DEFAULT 0;

ALTER TABLE "public"."recovery_audit113" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."recovery_audit113" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."recovery_sessions113" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."recovery_vault113" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."recovery_vault113" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."recovery_vault113" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."recovery_vaults14320" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."recovery_vaults14320" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."recovery_vaults14320" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."recurring_reminders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "amount" SET DEFAULT 0;

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "reference" SET DEFAULT ''::text;

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "is_paused" SET DEFAULT false;

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."recurring_transactions" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."report_types14253" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."report_types14253" ALTER COLUMN "active" SET DEFAULT true;

ALTER TABLE "public"."report_types14253" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "email" SET DEFAULT ''::text;

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "display_name" SET DEFAULT ''::text;

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "enabled" SET DEFAULT true;

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "permissions" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "must_change_password" SET DEFAULT false;

ALTER TABLE "public"."restaurant_members121" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."review_routes14229" ALTER COLUMN "final_approved" SET DEFAULT false;

ALTER TABLE "public"."review_routes14229" ALTER COLUMN "stage" SET DEFAULT 0;

ALTER TABLE "public"."review_routes14229" ALTER COLUMN "steps" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."review_routes14229" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."scheduled_journal_occurrences" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."scheduled_journal_occurrences" ALTER COLUMN "posted_at" SET DEFAULT now();

ALTER TABLE "public"."scheduled_journal_occurrences" ALTER COLUMN "posted_early" SET DEFAULT false;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "posted_count" SET DEFAULT 0;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "reminder_days" SET DEFAULT 3;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "auto_post" SET DEFAULT true;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "status" SET DEFAULT 'active'::text;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "is_sample" SET DEFAULT false;

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."scheduled_journals" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."session_policy1443" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."session_policy1443" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."staff_entry_sequences" ALTER COLUMN "last_number" SET DEFAULT 0;

ALTER TABLE "public"."staff_entry_sequences" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."staff_journal_lines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."staff_journal_lines" ALTER COLUMN "reference" SET DEFAULT ''::text;

ALTER TABLE "public"."staff_journal_lines" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."staff_journal_lines" ALTER COLUMN "entry_kind" SET DEFAULT 'legacy'::text;

ALTER TABLE "public"."staff_journals" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."staff_journals" ALTER COLUMN "status" SET DEFAULT 'draft'::text;

ALTER TABLE "public"."staff_journals" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."staff_journals" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."staff_journals" ALTER COLUMN "is_sample" SET DEFAULT false;

ALTER TABLE "public"."staff_journals" ALTER COLUMN "report_types14253" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."sub_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."sub_accounts" ALTER COLUMN "description" SET DEFAULT ''::text;

ALTER TABLE "public"."sub_accounts" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "public"."sub_accounts" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."sub_accounts" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."tax_sso_records" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."tax_sso_records" ALTER COLUMN "amount" SET DEFAULT 0;

ALTER TABLE "public"."tax_sso_records" ALTER COLUMN "status" SET DEFAULT 'pending'::text;

ALTER TABLE "public"."tax_sso_records" ALTER COLUMN "reference" SET DEFAULT ''::text;

ALTER TABLE "public"."tax_sso_records" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."todo_completions1443" ALTER COLUMN "completed_at" SET DEFAULT now();

ALTER TABLE "public"."transaction_template_lines" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."transaction_template_lines" ALTER COLUMN "description" SET DEFAULT ''::text;

ALTER TABLE "public"."transaction_templates" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."transaction_templates" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."transaction_templates" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."upcoming_reminders14229" ALTER COLUMN "revision" SET DEFAULT 0;

ALTER TABLE "public"."upcoming_reminders14229" ALTER COLUMN "items" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."upcoming_reminders14229" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "assigned_amount" SET DEFAULT 0;

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "currency_code" SET DEFAULT 'LAK'::text;

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "assigned_at" SET DEFAULT now();

ALTER TABLE "public"."user_fund_assignments" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."user_permissions" ALTER COLUMN "user_type" SET DEFAULT 'sub_user'::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "job_title" SET DEFAULT ''::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "modules" SET DEFAULT ARRAY['submissions'::text];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "can_approve" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "can_post_directly" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "can_void" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "can_export" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."user_permissions" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."user_permissions" ALTER COLUMN "allow_any_account" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "allowed_account_ids" SET DEFAULT '{}'::uuid[];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "allowed_directions" SET DEFAULT ARRAY['out'::text];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "journal_template" SET DEFAULT 'general'::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "submission_frequency" SET DEFAULT 'monthly'::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "allowed_currency_codes" SET DEFAULT ARRAY['LAK'::text];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "destination_account_ids" SET DEFAULT '{}'::uuid[];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "assigned_fund_account_ids" SET DEFAULT '{}'::uuid[];

ALTER TABLE "public"."user_permissions" ALTER COLUMN "fund_allocations" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "can_manage_data" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "allow_multiple_funds" SET DEFAULT false;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "entry_prefix" SET DEFAULT 'SJR'::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "entry_digits" SET DEFAULT 4;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "department14229" SET DEFAULT ''::text;

ALTER TABLE "public"."user_permissions" ALTER COLUMN "ledger_account_ids14281" SET DEFAULT '{}'::uuid[];

ALTER TABLE "public"."user_print_preferences1434" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."user_print_preferences1434" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."voucher_sequences14299" ALTER COLUMN "next_no" SET DEFAULT 1;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "id" SET DEFAULT 1;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "prefix" SET DEFAULT 'OJM'::text;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "handwritten_code" SET DEFAULT 'H'::text;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "editor_code" SET DEFAULT 'E'::text;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "handwritten_label" SET DEFAULT 'Handwritten'::text;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "editor_label" SET DEFAULT 'Edited and Printed'::text;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "digits" SET DEFAULT 4;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "year_digits" SET DEFAULT 2;

ALTER TABLE "public"."voucher_settings14299" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."voucher_versions14299" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."voucher_versions14299" ALTER COLUMN "changed_at" SET DEFAULT now();

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "request_payload" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "data" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."vouchers14299" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."workspace_actor_audit138" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."workspace_actor_audit138" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."workspace_hook_config138" ALTER COLUMN "id" SET DEFAULT true;

ALTER TABLE "public"."workspace_notifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."workspace_notifications" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."workspace_notifications" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "sequential" SET DEFAULT false;

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "steps" SET DEFAULT '[]'::jsonb;

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "todo_config1438" SET DEFAULT '{}'::jsonb;

ALTER TABLE "public"."workspace_todos136" ALTER COLUMN "is_template1438" SET DEFAULT false;

ALTER TABLE "public"."year_closings136" ALTER COLUMN "closed_at" SET DEFAULT now();


-- CONSTRAINTS
ALTER TABLE "private"."password_reset14257" ADD CONSTRAINT "password_reset14257_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."account_provisioning14320" ADD CONSTRAINT "account_provisioning14320_pkey" PRIMARY KEY (email);

ALTER TABLE "public"."accounting_feature_samples" ADD CONSTRAINT "accounting_feature_samples_pkey" PRIMARY KEY (sample_key);

ALTER TABLE "public"."accounting_id_settings" ADD CONSTRAINT "accounting_id_settings_id_check" CHECK (id);

ALTER TABLE "public"."accounting_id_settings" ADD CONSTRAINT "accounting_id_settings_journal_digits_check" CHECK (((journal_digits >= 3) AND (journal_digits <= 9)));

ALTER TABLE "public"."accounting_id_settings" ADD CONSTRAINT "accounting_id_settings_sub_user_digits_check" CHECK (((sub_user_digits >= 3) AND (sub_user_digits <= 9)));

ALTER TABLE "public"."accounting_id_settings" ADD CONSTRAINT "accounting_id_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."accounting_operations136" ADD CONSTRAINT "accounting_operations136_pkey" PRIMARY KEY (backend, transaction_id);

ALTER TABLE "public"."accounting_periods" ADD CONSTRAINT "accounting_periods_period_month_check" CHECK ((period_month = (date_trunc('month'::text, (period_month)::timestamp with time zone))::date));

ALTER TABLE "public"."accounting_periods" ADD CONSTRAINT "accounting_periods_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'review'::text, 'closed'::text, 'locked'::text])));

ALTER TABLE "public"."accounting_periods" ADD CONSTRAINT "accounting_periods_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."accounting_periods" ADD CONSTRAINT "accounting_periods_period_month_key" UNIQUE (period_month);

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_account_type_check" CHECK ((account_type = ANY (ARRAY['ASSET'::text, 'LIABILITY'::text, 'EQUITY'::text, 'REVENUE'::text, 'EXPENSE'::text])));

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_purpose_allowed" CHECK ((account_purpose = ANY (ARRAY['regular'::text, 'clearing'::text, 'suspense'::text, 'settlement'::text, 'payroll'::text, 'opening'::text])));

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_code_key" UNIQUE (code);

ALTER TABLE "public"."approved_reports1443" ADD CONSTRAINT "approved_reports1443_pkey" PRIMARY KEY (journal_id);

ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_description_check" CHECK ((length(TRIM(BOTH FROM description)) > 0));

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])));

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."backup_audit113" ADD CONSTRAINT "backup_audit113_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."backup_registry113" ADD CONSTRAINT "backup_registry113_pkey" PRIMARY KEY (table_name);

ALTER TABLE "public"."book_sessions136" ADD CONSTRAINT "book_sessions136_reason_check" CHECK ((length(TRIM(BOTH FROM reason)) > 0));

ALTER TABLE "public"."book_sessions136" ADD CONSTRAINT "book_sessions136_status_check" CHECK ((status = ANY (ARRAY['editing'::text, 'committed'::text, 'cancelled'::text])));

ALTER TABLE "public"."book_sessions136" ADD CONSTRAINT "book_sessions136_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."budget_settings14313" ADD CONSTRAINT "budget_settings14313_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."budget_settings14313" ADD CONSTRAINT "budget_settings14313_id_check" CHECK (id);

ALTER TABLE "public"."budget_settings14313" ADD CONSTRAINT "budget_settings14313_version_check" CHECK ((version > 0));

ALTER TABLE "public"."budget_settings14313" ADD CONSTRAINT "budget_settings14313_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."budget_templates14313" ADD CONSTRAINT "budget_templates14313_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."budget_templates14313" ADD CONSTRAINT "budget_templates14313_version_check" CHECK ((version > 0));

ALTER TABLE "public"."budget_templates14313" ADD CONSTRAINT "budget_templates14313_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."business_settings" ADD CONSTRAINT "business_settings_id_check" CHECK (id);

ALTER TABLE "public"."business_settings" ADD CONSTRAINT "business_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_actual_amount_check" CHECK ((actual_amount >= (0)::numeric));

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_exchange_rate_to_reporting_check" CHECK ((exchange_rate_to_reporting > (0)::numeric));

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_actual_count_equivalent_check" CHECK ((actual_count_equivalent >= (0)::numeric));

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_cash_expenses_total_check" CHECK ((cash_expenses_total >= (0)::numeric));

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_pos_total_check" CHECK ((pos_total >= (0)::numeric));

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_staff_journal_id_key" UNIQUE (staff_journal_id);

ALTER TABLE "public"."cashier_shift_tenders" ADD CONSTRAINT "cashier_shift_tenders_pos_amount_check" CHECK ((pos_amount >= (0)::numeric));

ALTER TABLE "public"."cashier_shift_tenders" ADD CONSTRAINT "cashier_shift_tenders_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."catalog_installations106" ADD CONSTRAINT "catalog_installations106_pkey" PRIMARY KEY (name);

ALTER TABLE "public"."company_documents105" ADD CONSTRAINT "company_documents105_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."currencies" ADD CONSTRAINT "currencies_code_check" CHECK ((code ~ '^[A-Z]{3}$'::text));

ALTER TABLE "public"."currencies" ADD CONSTRAINT "currencies_pkey" PRIMARY KEY (code);

ALTER TABLE "public"."data_tools_state14232" ADD CONSTRAINT "data_tools_state14232_id_check" CHECK ((id = 1));

ALTER TABLE "public"."data_tools_state14232" ADD CONSTRAINT "data_tools_state14232_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."document_download_passwords14312" ADD CONSTRAINT "document_download_passwords14312_filename_check" CHECK (((length(filename) >= 1) AND (length(filename) <= 240)));

ALTER TABLE "public"."document_download_passwords14312" ADD CONSTRAINT "document_download_passwords14312_format_check" CHECK ((format = ANY (ARRAY['pdf'::text, 'docx'::text, 'html'::text, 'txt'::text, 'json'::text])));

ALTER TABLE "public"."document_download_passwords14312" ADD CONSTRAINT "document_download_passwords14312_password_check" CHECK ((length(password) > 0));

ALTER TABLE "public"."document_download_passwords14312" ADD CONSTRAINT "document_download_passwords14312_pkey" PRIMARY KEY (owner_id, id);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_employee_no_key" UNIQUE (employee_no);

ALTER TABLE "public"."entry_prefix_reservations" ADD CONSTRAINT "entry_prefix_reservations_pkey" PRIMARY KEY (stem);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_submission_no_key" UNIQUE (submission_no);

ALTER TABLE "public"."fund_adjustment_lines" ADD CONSTRAINT "fund_adjustment_lines_activity_key_check" CHECK ((activity_key = ANY (ARRAY['received'::text, 'used'::text, 'handover'::text])));

ALTER TABLE "public"."fund_adjustment_lines" ADD CONSTRAINT "fund_adjustment_lines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."fund_adjustment_lines" ADD CONSTRAINT "fund_adjustment_lines_request_id_activity_key_key" UNIQUE (request_id, activity_key);

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_explanation_check" CHECK ((length(TRIM(BOTH FROM explanation)) > 0));

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'returned'::text, 'approved_applied'::text])));

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_request_no_key" UNIQUE (request_no);

ALTER TABLE "public"."handover_history14320" ADD CONSTRAINT "handover_history14320_pkey" PRIMARY KEY (request_key);

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check1" CHECK ((data ?& ARRAY['title'::text, 'type'::text, 'effect'::text, 'status'::text, 'start'::text, 'end'::text]));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check2" CHECK (((length(TRIM(BOTH FROM (data ->> 'title'::text))) >= 1) AND (length(TRIM(BOTH FROM (data ->> 'title'::text))) <= 160)));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check3" CHECK (((data ->> 'type'::text) = ANY (ARRAY['holiday'::text, 'occasion'::text, 'project'::text, 'workday'::text])));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check4" CHECK (((data ->> 'effect'::text) = ANY (ARRAY['none'::text, 'off'::text, 'half'::text, 'work'::text])));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check5" CHECK (((data ->> 'status'::text) = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text])));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_data_check6" CHECK ((((data ->> 'start'::text))::date <= ((data ->> 'end'::text))::date));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_version_check" CHECK ((version > 0));

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."hr_calendar_history14306" ADD CONSTRAINT "hr_calendar_history14306_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."hr_calendar_settings14306" ADD CONSTRAINT "hr_calendar_settings14306_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."hr_calendar_settings14306" ADD CONSTRAINT "hr_calendar_settings14306_id_check" CHECK (id);

ALTER TABLE "public"."hr_calendar_settings14306" ADD CONSTRAINT "hr_calendar_settings14306_version_check" CHECK ((version > 0));

ALTER TABLE "public"."hr_calendar_settings14306" ADD CONSTRAINT "hr_calendar_settings14306_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."installation14320" ADD CONSTRAINT "installation14320_id_check" CHECK (id);

ALTER TABLE "public"."installation14320" ADD CONSTRAINT "installation14320_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_sku_key" UNIQUE (sku);

ALTER TABLE "public"."inventory_items104" ADD CONSTRAINT "inventory_items104_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_movement_type_check" CHECK ((movement_type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text])));

ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_quantity_check" CHECK ((quantity <> (0)::numeric));

ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."inventory_movements104" ADD CONSTRAINT "inventory_movements104_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_correction_status_check" CHECK ((correction_status = ANY (ARRAY['normal'::text, 'under_review'::text, 'corrected'::text, 'voided'::text])));

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_source_check" CHECK ((source = ANY (ARRAY['manual'::text, 'staff_submission'::text, 'staff_journal'::text, 'recurring'::text, 'payroll'::text, 'system'::text])));

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_entry_no_key" UNIQUE (entry_no);

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "debit_or_credit_only" CHECK ((((debit > (0)::numeric) AND (credit = (0)::numeric)) OR ((credit > (0)::numeric) AND (debit = (0)::numeric))));

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_credit_check" CHECK ((credit >= (0)::numeric));

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_debit_check" CHECK ((debit >= (0)::numeric));

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_line_no_check" CHECK ((line_no > 0));

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_line_no_key" UNIQUE (journal_entry_id, line_no);

ALTER TABLE "public"."journal_sources14253" ADD CONSTRAINT "journal_sources14253_pkey" PRIMARY KEY (journal_line_id, source_line_id);

ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_size_bytes_check" CHECK ((size_bytes >= 0));

ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_storage_path_key" UNIQUE (storage_path);

ALTER TABLE "public"."menu_categories104" ADD CONSTRAINT "menu_categories104_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."menu_ingredients105" ADD CONSTRAINT "menu_ingredients105_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE "public"."menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_pkey" PRIMARY KEY (menu_item_id, inventory_item_id);

ALTER TABLE "public"."menu_items" ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."menu_items104" ADD CONSTRAINT "menu_items104_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."menu_sales108" ADD CONSTRAINT "menu_sales108_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."opening_state14234" ADD CONSTRAINT "opening_state14234_id_check" CHECK (id);

ALTER TABLE "public"."opening_state14234" ADD CONSTRAINT "opening_state14234_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."operation_receipts14228" ADD CONSTRAINT "operation_receipts14228_request_key_check" CHECK (((length(request_key) >= 10) AND (length(request_key) <= 200)));

ALTER TABLE "public"."operation_receipts14228" ADD CONSTRAINT "operation_receipts14228_pkey" PRIMARY KEY (actor_id, request_key);

ALTER TABLE "public"."operational_reports" ADD CONSTRAINT "payroll_employees_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."operational_reports" ADD CONSTRAINT "operational_reports_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."payroll_employees" ADD CONSTRAINT "payroll_employees_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."payroll_employees" ADD CONSTRAINT "payroll_employees_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."payroll_leave_records" ADD CONSTRAINT "payroll_employees_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."payroll_leave_records" ADD CONSTRAINT "payroll_leave_records_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."payroll_lines" ADD CONSTRAINT "payroll_lines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_description_check" CHECK ((length(TRIM(BOTH FROM description)) > 0));

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_finding_type_check" CHECK ((finding_type = ANY (ARRAY['classification'::text, 'amount'::text, 'missing'::text, 'document'::text, 'other'::text])));

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'adjustment_prepared'::text, 'corrected'::text, 'closed'::text])));

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_finding_no_key" UNIQUE (finding_no);

ALTER TABLE "public"."pos_cash118" ADD CONSTRAINT "pos_cash118_amount_check" CHECK ((amount <> (0)::numeric));

ALTER TABLE "public"."pos_cash118" ADD CONSTRAINT "pos_cash118_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."pos_config118" ADD CONSTRAINT "pos_config118_id_check" CHECK (id);

ALTER TABLE "public"."pos_config118" ADD CONSTRAINT "pos_config118_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."pos_orders118" ADD CONSTRAINT "pos_orders118_status_check" CHECK ((status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'cancelled'::text, 'refunded'::text])));

ALTER TABLE "public"."pos_orders118" ADD CONSTRAINT "pos_orders118_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."pos_orders118" ADD CONSTRAINT "pos_orders118_number_key" UNIQUE (number);

ALTER TABLE "public"."pos_shifts118" ADD CONSTRAINT "pos_shifts118_opening_check" CHECK ((opening >= (0)::numeric));

ALTER TABLE "public"."pos_shifts118" ADD CONSTRAINT "pos_shifts118_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_kind_check" CHECK ((kind = ANY (ARRAY['sale'::text, 'return'::text])));

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_quantity_check" CHECK ((quantity <> (0)::numeric));

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_order_id_item_id_kind_key" UNIQUE (order_id, item_id, kind);

ALTER TABLE "public"."presentation_settings113" ADD CONSTRAINT "presentation_settings113_pkey" PRIMARY KEY (area);

ALTER TABLE "public"."print_settings" ADD CONSTRAINT "print_settings_id_check" CHECK (id);

ALTER TABLE "public"."print_settings" ADD CONSTRAINT "print_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);

ALTER TABLE "public"."record_deletions108" ADD CONSTRAINT "record_deletions108_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recovery_attempts14320" ADD CONSTRAINT "recovery_attempts14320_pkey" PRIMARY KEY (actor_id);

ALTER TABLE "public"."recovery_audit113" ADD CONSTRAINT "recovery_audit113_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recovery_sessions113" ADD CONSTRAINT "recovery_sessions113_pkey" PRIMARY KEY (token_hash);

ALTER TABLE "public"."recovery_tickets14320" ADD CONSTRAINT "recovery_tickets14320_pkey" PRIMARY KEY (token_hash);

ALTER TABLE "public"."recovery_vault113" ADD CONSTRAINT "recovery_vault113_id_check" CHECK (id);

ALTER TABLE "public"."recovery_vault113" ADD CONSTRAINT "recovery_vault113_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recovery_vaults14320" ADD CONSTRAINT "recovery_vaults14320_id_check" CHECK (id);

ALTER TABLE "public"."recovery_vaults14320" ADD CONSTRAINT "recovery_vaults14320_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recurring_reminders" ADD CONSTRAINT "recurring_reminders_quantity_check" CHECK ((quantity > 0));

ALTER TABLE "public"."recurring_reminders" ADD CONSTRAINT "recurring_reminders_unit_check" CHECK ((unit = ANY (ARRAY['days'::text, 'weeks'::text, 'months'::text])));

ALTER TABLE "public"."recurring_reminders" ADD CONSTRAINT "recurring_reminders_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."recurring_transactions" ADD CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."report_types14253" ADD CONSTRAINT "report_types14253_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)));

ALTER TABLE "public"."report_types14253" ADD CONSTRAINT "report_types14253_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."restaurant_members121" ADD CONSTRAINT "restaurant_members121_permissions_check" CHECK ((jsonb_typeof(permissions) = 'object'::text));

ALTER TABLE "public"."restaurant_members121" ADD CONSTRAINT "restaurant_members121_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."review_routes14229" ADD CONSTRAINT "review_routes14229_pkey" PRIMARY KEY (journal_id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_journal_entry_id_key" UNIQUE (journal_entry_id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_schedule_id_occurrence_date_key" UNIQUE (schedule_id, occurrence_date);

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_dates" CHECK (((end_date IS NULL) OR (end_date >= start_date)));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_anchor_day_check" CHECK (((anchor_day >= 1) AND (anchor_day <= 31)));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_day_rule_check" CHECK ((day_rule = ANY (ARRAY['same_day'::text, 'last_day'::text])));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_frequency_check" CHECK ((frequency = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_max_occurrences_check" CHECK (((max_occurrences IS NULL) OR (max_occurrences > 0)));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_reminder_days_check" CHECK (((reminder_days >= 0) AND (reminder_days <= 90)));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'complete'::text, 'failed'::text, 'sample'::text])));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_real_accounts" CHECK ((is_sample OR ((debit_account_id IS NOT NULL) AND (credit_account_id IS NOT NULL) AND (debit_account_id <> credit_account_id) AND (amount > (0)::numeric) AND (currency_code IS NOT NULL))));

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_schedule_no_key" UNIQUE (schedule_no);

ALTER TABLE "public"."session_policy1443" ADD CONSTRAINT "session_policy1443_id_check" CHECK (id);

ALTER TABLE "public"."session_policy1443" ADD CONSTRAINT "session_policy1443_timeout_minutes_check" CHECK (((timeout_minutes >= 5) AND (timeout_minutes <= 480)));

ALTER TABLE "public"."session_policy1443" ADD CONSTRAINT "session_policy1443_warning_minutes_check" CHECK (((warning_minutes >= 1) AND (warning_minutes <= 30)));

ALTER TABLE "public"."session_policy1443" ADD CONSTRAINT "session_policy1443_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."staff_entry_sequences" ADD CONSTRAINT "staff_entry_sequences_last_number_check" CHECK ((last_number >= 0));

ALTER TABLE "public"."staff_entry_sequences" ADD CONSTRAINT "staff_entry_sequences_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_direction_check" CHECK ((direction = ANY (ARRAY['out'::text, 'in'::text])));

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_line_no_check" CHECK ((line_no > 0));

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_memo_check" CHECK ((length(TRIM(BOTH FROM memo)) > 0));

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "workspace_entry_kind_rule" CHECK ((entry_kind = ANY (ARRAY['legacy'::text, 'collection'::text, 'payment'::text, 'handover'::text])));

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_staff_journal_id_line_no_key" UNIQUE (staff_journal_id, line_no);

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_period_start_check" CHECK ((period_start = (date_trunc('month'::text, (period_start)::timestamp with time zone))::date));

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'returned'::text, 'posted'::text, 'reviewed'::text])));

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_owner_id_period_start_key" UNIQUE (owner_id, period_start);

ALTER TABLE "public"."sub_accounts" ADD CONSTRAINT "sub_accounts_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."sub_accounts" ADD CONSTRAINT "sub_accounts_code_key" UNIQUE (code);

ALTER TABLE "public"."tax_sso_records" ADD CONSTRAINT "tax_sso_records_record_type_check" CHECK ((record_type = ANY (ARRAY['VAT'::text, 'PIT'::text, 'SSO'::text, 'OTHER'::text])));

ALTER TABLE "public"."tax_sso_records" ADD CONSTRAINT "tax_sso_records_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."todo_completions1443" ADD CONSTRAINT "todo_completions1443_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."transaction_template_lines" ADD CONSTRAINT "transaction_template_lines_entry_side_check" CHECK ((entry_side = ANY (ARRAY['debit'::text, 'credit'::text])));

ALTER TABLE "public"."transaction_template_lines" ADD CONSTRAINT "transaction_template_lines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."transaction_template_lines" ADD CONSTRAINT "transaction_template_lines_template_id_line_no_key" UNIQUE (template_id, line_no);

ALTER TABLE "public"."transaction_templates" ADD CONSTRAINT "transaction_templates_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."upcoming_reminders14229" ADD CONSTRAINT "upcoming_reminders14229_pkey" PRIMARY KEY (owner_id);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_assigned_amount_check" CHECK ((assigned_amount >= (0)::numeric));

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_user_id_account_id_key" UNIQUE (user_id, account_id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_check" CHECK (((manager_id IS NULL) OR (manager_id <> user_id)));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_journal_template_check" CHECK ((journal_template = ANY (ARRAY['general'::text, 'expense'::text, 'cashier'::text])));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_submission_frequency_check" CHECK ((submission_frequency = ANY (ARRAY['per_shift'::text, 'daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'manual'::text])));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_user_type_check" CHECK ((user_type = ANY (ARRAY['admin'::text, 'manager'::text, 'sub_user'::text])));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "workspace_number_rules" CHECK (((entry_prefix ~ '^[A-Z0-9]{1,8}$'::text) AND (entry_initials ~ '^[A-Z0-9]{1,8}$'::text) AND ((entry_digits >= 3) AND (entry_digits <= 9))));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "workspace_single_fund_rule" CHECK ((allow_multiple_funds OR (cardinality(assigned_fund_account_ids) <= 1)));

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."user_print_preferences1434" ADD CONSTRAINT "user_print_preferences1434_pkey" PRIMARY KEY (owner_id);

ALTER TABLE "public"."voucher_sequences14299" ADD CONSTRAINT "voucher_sequences14299_kind_check" CHECK ((kind = ANY (ARRAY['H'::text, 'E'::text])));

ALTER TABLE "public"."voucher_sequences14299" ADD CONSTRAINT "voucher_sequences14299_next_no_check" CHECK ((next_no > 0));

ALTER TABLE "public"."voucher_sequences14299" ADD CONSTRAINT "voucher_sequences14299_year_no_check" CHECK (((year_no >= 2000) AND (year_no <= 2199)));

ALTER TABLE "public"."voucher_sequences14299" ADD CONSTRAINT "voucher_sequences14299_pkey" PRIMARY KEY (year_no, kind);

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_check" CHECK ((handwritten_code <> editor_code));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_digits_check" CHECK (((digits >= 4) AND (digits <= 6)));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_editor_code_check" CHECK ((editor_code ~ '^[A-Z]$'::text));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_editor_label_check" CHECK (((length(editor_label) >= 1) AND (length(editor_label) <= 60)));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_handwritten_code_check" CHECK ((handwritten_code ~ '^[A-Z]$'::text));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_handwritten_label_check" CHECK (((length(handwritten_label) >= 1) AND (length(handwritten_label) <= 60)));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_id_check" CHECK ((id = 1));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_prefix_check" CHECK ((prefix ~ '^[A-Z0-9]{1,8}$'::text));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_year_digits_check" CHECK ((year_digits = ANY (ARRAY[2, 4])));

ALTER TABLE "public"."voucher_settings14299" ADD CONSTRAINT "voucher_settings14299_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."voucher_versions14299" ADD CONSTRAINT "voucher_versions14299_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."voucher_versions14299" ADD CONSTRAINT "voucher_versions14299_voucher_id_version_key" UNIQUE (voucher_id, version);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_data_check" CHECK ((jsonb_typeof(data) = 'object'::text));

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_kind_check" CHECK ((kind = ANY (ARRAY['H'::text, 'E'::text])));

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_status_check" CHECK ((status = ANY (ARRAY['reserved'::text, 'issued'::text, 'linked'::text, 'void'::text])));

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_journal_entry_id_key" UNIQUE (journal_entry_id);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_journal_number_key" UNIQUE (journal_number);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_number_key" UNIQUE (number);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_request_key_key" UNIQUE (request_key);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_year_no_kind_ordinal_key" UNIQUE (year_no, kind, ordinal);

ALTER TABLE "public"."workspace_actor_audit138" ADD CONSTRAINT "workspace_actor_audit138_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."workspace_hook_config138" ADD CONSTRAINT "workspace_hook_config138_id_check" CHECK (id);

ALTER TABLE "public"."workspace_hook_config138" ADD CONSTRAINT "workspace_hook_config138_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."workspace_notifications" ADD CONSTRAINT "workspace_notifications_notification_type_check" CHECK ((notification_type = ANY (ARRAY['adjustment_approved'::text, 'submission_returned'::text, 'submission_posted'::text])));

ALTER TABLE "public"."workspace_notifications" ADD CONSTRAINT "workspace_notifications_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."workspace_notifications" ADD CONSTRAINT "workspace_notifications_owner_id_notification_type_related__key" UNIQUE (owner_id, notification_type, related_id);

ALTER TABLE "public"."workspace_todos136" ADD CONSTRAINT "workspace_todos136_steps_check" CHECK ((jsonb_typeof(steps) = 'array'::text));

ALTER TABLE "public"."workspace_todos136" ADD CONSTRAINT "workspace_todos136_title_check" CHECK ((length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE "public"."workspace_todos136" ADD CONSTRAINT "workspace_todos136_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."year_closings136" ADD CONSTRAINT "year_closings136_year_check" CHECK (((year >= 1900) AND (year <= 2199)));

ALTER TABLE "public"."year_closings136" ADD CONSTRAINT "year_closings136_pkey" PRIMARY KEY (year);

ALTER TABLE "private"."password_reset14257" ADD CONSTRAINT "password_reset14257_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."account_provisioning14320" ADD CONSTRAINT "account_provisioning14320_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."account_provisioning14320" ADD CONSTRAINT "account_provisioning14320_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."accounting_id_settings" ADD CONSTRAINT "accounting_id_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."accounting_periods" ADD CONSTRAINT "accounting_periods_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."approved_reports1443" ADD CONSTRAINT "approved_reports1443_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id);

ALTER TABLE "public"."approved_reports1443" ADD CONSTRAINT "approved_reports1443_journal_id_fkey" FOREIGN KEY (journal_id) REFERENCES staff_journals(id);

ALTER TABLE "public"."approved_reports1443" ADD CONSTRAINT "approved_reports1443_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_actor_fkey" FOREIGN KEY (actor) REFERENCES profiles(id);

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_adjustment_id_fkey" FOREIGN KEY (adjustment_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;

ALTER TABLE "public"."audit_reviews136" ADD CONSTRAINT "audit_reviews136_period_id_fkey" FOREIGN KEY (period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE;

ALTER TABLE "public"."book_sessions136" ADD CONSTRAINT "book_sessions136_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."book_sessions136" ADD CONSTRAINT "book_sessions136_period_id_fkey" FOREIGN KEY (period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE;

ALTER TABLE "public"."budget_settings14313" ADD CONSTRAINT "budget_settings14313_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."budget_templates14313" ADD CONSTRAINT "budget_templates14313_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."business_settings" ADD CONSTRAINT "business_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_deposit_account_id_fkey" FOREIGN KEY (deposit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."cashier_currency_counts" ADD CONSTRAINT "cashier_currency_counts_shift_close_id_fkey" FOREIGN KEY (shift_close_id) REFERENCES cashier_shift_closes(id) ON DELETE CASCADE;

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_pos_reporting_currency_fkey" FOREIGN KEY (pos_reporting_currency) REFERENCES currencies(code);

ALTER TABLE "public"."cashier_shift_closes" ADD CONSTRAINT "cashier_shift_closes_staff_journal_id_fkey" FOREIGN KEY (staff_journal_id) REFERENCES staff_journals(id) ON DELETE CASCADE;

ALTER TABLE "public"."cashier_shift_tenders" ADD CONSTRAINT "cashier_shift_tenders_shift_close_id_fkey" FOREIGN KEY (shift_close_id) REFERENCES cashier_shift_closes(id) ON DELETE CASCADE;

ALTER TABLE "public"."company_documents105" ADD CONSTRAINT "company_documents105_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."document_download_passwords14312" ADD CONSTRAINT "document_download_passwords14312_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_salary_currency_fkey" FOREIGN KEY (salary_currency) REFERENCES currencies(code);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_credit_account_id_fkey" FOREIGN KEY (credit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_debit_account_id_fkey" FOREIGN KEY (debit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE "public"."entry_submissions" ADD CONSTRAINT "entry_submissions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id);

ALTER TABLE "public"."fund_adjustment_lines" ADD CONSTRAINT "fund_adjustment_lines_request_id_fkey" FOREIGN KEY (request_id) REFERENCES fund_adjustment_requests(id) ON DELETE CASCADE;

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_fund_account_id_fkey" FOREIGN KEY (fund_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE "public"."fund_adjustment_requests" ADD CONSTRAINT "fund_adjustment_requests_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id);

ALTER TABLE "public"."handover_history14320" ADD CONSTRAINT "handover_history14320_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."hr_calendar_events14306" ADD CONSTRAINT "hr_calendar_events14306_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."hr_calendar_history14306" ADD CONSTRAINT "hr_calendar_history14306_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES profiles(id);

ALTER TABLE "public"."hr_calendar_settings14306" ADD CONSTRAINT "hr_calendar_settings14306_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."installation14320" ADD CONSTRAINT "installation14320_incoming_admin_fkey" FOREIGN KEY (incoming_admin) REFERENCES profiles(id);

ALTER TABLE "public"."installation14320" ADD CONSTRAINT "installation14320_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."inventory_items104" ADD CONSTRAINT "inventory_items104_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_fkey" FOREIGN KEY (item_id) REFERENCES inventory_items(id);

ALTER TABLE "public"."inventory_movements104" ADD CONSTRAINT "inventory_movements104_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_accounting_period_id_fkey" FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_adjustment_for_entry_id_fkey" FOREIGN KEY (adjustment_for_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_corrected_by_entry_id_fkey" FOREIGN KEY (corrected_by_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_period_finding_id_fkey" FOREIGN KEY (period_finding_id) REFERENCES period_findings(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_posted_by_fkey" FOREIGN KEY (posted_by) REFERENCES profiles(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES profiles(id);

ALTER TABLE "public"."journal_entries" ADD CONSTRAINT "journal_entries_voided_by_fkey" FOREIGN KEY (voided_by) REFERENCES profiles(id);

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE;

ALTER TABLE "public"."journal_lines" ADD CONSTRAINT "journal_lines_sub_account_id_fkey" FOREIGN KEY (sub_account_id) REFERENCES sub_accounts(id);

ALTER TABLE "public"."journal_sources14253" ADD CONSTRAINT "journal_sources14253_journal_line_id_fkey" FOREIGN KEY (journal_line_id) REFERENCES journal_lines(id) ON DELETE RESTRICT;

ALTER TABLE "public"."journal_sources14253" ADD CONSTRAINT "journal_sources14253_report_id_fkey" FOREIGN KEY (report_id) REFERENCES staff_journals(id) ON DELETE RESTRICT;

ALTER TABLE "public"."journal_sources14253" ADD CONSTRAINT "journal_sources14253_source_line_id_fkey" FOREIGN KEY (source_line_id) REFERENCES staff_journal_lines(id) ON DELETE RESTRICT;

ALTER TABLE "public"."legal_documents" ADD CONSTRAINT "legal_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id);

ALTER TABLE "public"."menu_categories104" ADD CONSTRAINT "menu_categories104_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."menu_ingredients105" ADD CONSTRAINT "menu_ingredients105_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_inventory_item_id_fkey" FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id);

ALTER TABLE "public"."menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_menu_item_id_fkey" FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;

ALTER TABLE "public"."menu_items" ADD CONSTRAINT "menu_items_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."menu_items104" ADD CONSTRAINT "menu_items104_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."operation_receipts14228" ADD CONSTRAINT "operation_receipts14228_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."operational_reports" ADD CONSTRAINT "budget_request_parent14316" FOREIGN KEY (budget_request_id14316) REFERENCES operational_reports(id) ON DELETE RESTRICT;

ALTER TABLE "public"."payroll_employees" ADD CONSTRAINT "payroll_employees_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(id);

ALTER TABLE "public"."payroll_lines" ADD CONSTRAINT "payroll_lines_payroll_run_id_fkey" FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE;

ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id);

ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."payroll_runs" ADD CONSTRAINT "payroll_runs_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_accounting_period_id_fkey" FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE;

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_adjustment_entry_id_fkey" FOREIGN KEY (adjustment_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES profiles(id);

ALTER TABLE "public"."period_findings" ADD CONSTRAINT "period_findings_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES profiles(id);

ALTER TABLE "public"."pos_cash118" ADD CONSTRAINT "pos_cash118_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."pos_cash118" ADD CONSTRAINT "pos_cash118_shift_id_fkey" FOREIGN KEY (shift_id) REFERENCES pos_shifts118(id);

ALTER TABLE "public"."pos_orders118" ADD CONSTRAINT "pos_orders118_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."pos_shifts118" ADD CONSTRAINT "pos_shifts118_cashier_fkey" FOREIGN KEY (cashier) REFERENCES profiles(id);

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_item_id_fkey" FOREIGN KEY (item_id) REFERENCES inventory_items104(id);

ALTER TABLE "public"."pos_stock118" ADD CONSTRAINT "pos_stock118_order_id_fkey" FOREIGN KEY (order_id) REFERENCES pos_orders118(id);

ALTER TABLE "public"."presentation_settings113" ADD CONSTRAINT "presentation_settings113_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."print_settings" ADD CONSTRAINT "print_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."recovery_attempts14320" ADD CONSTRAINT "recovery_attempts14320_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."recovery_sessions113" ADD CONSTRAINT "recovery_sessions113_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE "public"."recovery_tickets14320" ADD CONSTRAINT "recovery_tickets14320_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."recovery_vault113" ADD CONSTRAINT "recovery_vault113_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."recurring_reminders" ADD CONSTRAINT "recurring_reminders_recurring_transaction_id_fkey" FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_transactions" ADD CONSTRAINT "recurring_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."recurring_transactions" ADD CONSTRAINT "recurring_transactions_credit_account_id_fkey" FOREIGN KEY (credit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."recurring_transactions" ADD CONSTRAINT "recurring_transactions_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."recurring_transactions" ADD CONSTRAINT "recurring_transactions_debit_account_id_fkey" FOREIGN KEY (debit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."restaurant_members121" ADD CONSTRAINT "restaurant_members121_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_routes14229" ADD CONSTRAINT "review_routes14229_current_reviewer_fkey" FOREIGN KEY (current_reviewer) REFERENCES profiles(id);

ALTER TABLE "public"."review_routes14229" ADD CONSTRAINT "review_routes14229_journal_id_fkey" FOREIGN KEY (journal_id) REFERENCES staff_journals(id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES profiles(id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE "public"."scheduled_journal_occurrences" ADD CONSTRAINT "scheduled_journal_occurrences_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES scheduled_journals(id) ON DELETE SET NULL;

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_credit_account_id_fkey" FOREIGN KEY (credit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."scheduled_journals" ADD CONSTRAINT "scheduled_journals_debit_account_id_fkey" FOREIGN KEY (debit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."staff_entry_sequences" ADD CONSTRAINT "staff_entry_sequences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_fund_account_id_fkey" FOREIGN KEY (fund_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."staff_journal_lines" ADD CONSTRAINT "staff_journal_lines_staff_journal_id_fkey" FOREIGN KEY (staff_journal_id) REFERENCES staff_journals(id) ON DELETE CASCADE;

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."staff_journals" ADD CONSTRAINT "staff_journals_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE "public"."sub_accounts" ADD CONSTRAINT "sub_accounts_currency1436_fk" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."sub_accounts" ADD CONSTRAINT "sub_accounts_parent_account_id_fkey" FOREIGN KEY (parent_account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."sub_accounts" ADD CONSTRAINT "sub_accounts_posting_account_id14285_fkey" FOREIGN KEY (posting_account_id14285) REFERENCES accounts(id) ON DELETE RESTRICT;

ALTER TABLE "public"."tax_sso_records" ADD CONSTRAINT "tax_sso_records_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

ALTER TABLE "public"."todo_completions1443" ADD CONSTRAINT "todo_completions1443_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."todo_completions1443" ADD CONSTRAINT "todo_completions1443_todo_id_fkey" FOREIGN KEY (todo_id) REFERENCES workspace_todos136(id);

ALTER TABLE "public"."transaction_template_lines" ADD CONSTRAINT "transaction_template_lines_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE "public"."transaction_template_lines" ADD CONSTRAINT "transaction_template_lines_template_id_fkey" FOREIGN KEY (template_id) REFERENCES transaction_templates(id) ON DELETE CASCADE;

ALTER TABLE "public"."transaction_templates" ADD CONSTRAINT "transaction_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE "public"."upcoming_reminders14229" ADD CONSTRAINT "upcoming_reminders14229_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES profiles(id);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_currency_code_fkey" FOREIGN KEY (currency_code) REFERENCES currencies(code);

ALTER TABLE "public"."user_fund_assignments" ADD CONSTRAINT "user_fund_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_default_in_debit_account_id_fkey" FOREIGN KEY (default_in_debit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_default_out_credit_account_id_fkey" FOREIGN KEY (default_out_credit_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES profiles(id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_money_in_counterpart_account_id_fkey" FOREIGN KEY (money_in_counterpart_account_id) REFERENCES accounts(id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_print_preferences1434" ADD CONSTRAINT "user_print_preferences1434_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."voucher_versions14299" ADD CONSTRAINT "voucher_versions14299_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."voucher_versions14299" ADD CONSTRAINT "voucher_versions14299_voucher_id_fkey" FOREIGN KEY (voucher_id) REFERENCES vouchers14299(id) ON DELETE RESTRICT;

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."vouchers14299" ADD CONSTRAINT "vouchers14299_journal_entry_id_fkey" FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

ALTER TABLE "public"."workspace_actor_audit138" ADD CONSTRAINT "workspace_actor_audit138_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id);

ALTER TABLE "public"."workspace_actor_audit138" ADD CONSTRAINT "workspace_actor_audit138_effective_user_id_fkey" FOREIGN KEY (effective_user_id) REFERENCES profiles(id);

ALTER TABLE "public"."workspace_notifications" ADD CONSTRAINT "workspace_notifications_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."workspace_todos136" ADD CONSTRAINT "workspace_todos136_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id);

ALTER TABLE "public"."year_closings136" ADD CONSTRAINT "year_closings136_actor_fkey" FOREIGN KEY (actor) REFERENCES profiles(id);

ALTER TABLE "public"."year_closings136" ADD CONSTRAINT "year_closings136_anchor_entry_fkey" FOREIGN KEY (anchor_entry) REFERENCES journal_entries(id) ON DELETE CASCADE;


-- INDEXES
CREATE INDEX accounts_type_idx ON public.accounts USING btree (account_type);

CREATE UNIQUE INDEX one_book_session136 ON public.book_sessions136 USING btree (period_id) WHERE (status = 'editing'::text);

CREATE UNIQUE INDEX one_base_currency ON public.currencies USING btree (is_base) WHERE is_base;

CREATE INDEX document_download_passwords14312_date ON public.document_download_passwords14312 USING btree (owner_id, prepared_at DESC, id);

CREATE INDEX entry_submissions_status_idx ON public.entry_submissions USING btree (status, submitted_at DESC);

CREATE INDEX fund_adjustment_owner_status_idx ON public.fund_adjustment_requests USING btree (owner_id, status, submitted_at DESC);

CREATE UNIQUE INDEX inventory_item_code104 ON public.inventory_items104 USING btree (lower((data ->> 'code'::text))) WHERE (COALESCE((data ->> 'code'::text), ''::text) <> ''::text);

CREATE UNIQUE INDEX inventory_one_reversal108 ON public.inventory_movements104 USING btree (((data ->> 'reverses108'::text))) WHERE (data ? 'reverses108'::text);

CREATE INDEX journal_entries_date_idx ON public.journal_entries USING btree (transaction_date DESC);

CREATE INDEX journal_entries_correction_status_idx ON public.journal_entries USING btree (correction_status, transaction_date DESC);

CREATE INDEX journal_lines_entry_idx ON public.journal_lines USING btree (journal_entry_id);

CREATE INDEX journal_lines_account_idx ON public.journal_lines USING btree (account_id);

CREATE UNIQUE INDEX menu_category_code104 ON public.menu_categories104 USING btree (lower((data ->> 'code'::text))) WHERE (COALESCE((data ->> 'code'::text), ''::text) <> ''::text);

CREATE UNIQUE INDEX menu_ingredient_code105 ON public.menu_ingredients105 USING btree (lower((data ->> 'code'::text))) WHERE (COALESCE((data ->> 'code'::text), ''::text) <> ''::text);

CREATE UNIQUE INDEX menu_item_code104 ON public.menu_items104 USING btree (lower((data ->> 'code'::text))) WHERE (COALESCE((data ->> 'code'::text), ''::text) <> ''::text);

CREATE UNIQUE INDEX menu_sales_product_date108 ON public.menu_sales108 USING btree (((data ->> 'productId'::text)), ((data ->> 'date'::text)));

CREATE INDEX operational_reports_budget_parent14316 ON public.operational_reports USING btree (budget_request_id14316);

CREATE UNIQUE INDEX payroll_employee_code_unique ON public.payroll_employees USING btree (lower((data ->> 'code'::text))) WHERE (COALESCE((data ->> 'code'::text), ''::text) <> ''::text);

CREATE INDEX period_findings_period_status_idx ON public.period_findings USING btree (accounting_period_id, status);

CREATE UNIQUE INDEX profiles_email_unique ON public.profiles USING btree (email) WHERE ((email IS NOT NULL) AND (email <> ''::text));

CREATE UNIQUE INDEX report_types14253_name ON public.report_types14253 USING btree (lower(TRIM(BOTH FROM name)));

CREATE INDEX scheduled_review91 ON public.scheduled_journal_occurrences USING btree (occurrence_date) WHERE (reviewed_at IS NULL);

CREATE INDEX scheduled_due91 ON public.scheduled_journals USING btree (next_due) WHERE ((status = 'active'::text) AND auto_post);

CREATE INDEX staff_journal_lines_journal_idx ON public.staff_journal_lines USING btree (staff_journal_id);

CREATE UNIQUE INDEX staff_journal_lines_workspace_entry_no_unique ON public.staff_journal_lines USING btree (workspace_entry_no) WHERE (workspace_entry_no IS NOT NULL);

CREATE UNIQUE INDEX workspace_client_key_unique ON public.staff_journal_lines USING btree (client_key) WHERE (client_key IS NOT NULL);

CREATE INDEX staff_editor_group1437_idx ON public.staff_journal_lines USING btree (editor_group1437);

CREATE INDEX staff_journals_owner_period_idx ON public.staff_journals USING btree (owner_id, period_start DESC);

CREATE UNIQUE INDEX staff_journals_seed_key_unique ON public.staff_journals USING btree (seed_key) WHERE (seed_key IS NOT NULL);

CREATE UNIQUE INDEX sub_accounts_posting14285_unique ON public.sub_accounts USING btree (posting_account_id14285);

CREATE INDEX voucher_versions_fk14299 ON public.voucher_versions14299 USING btree (voucher_id);

CREATE INDEX voucher_date14299 ON public.vouchers14299 USING btree (voucher_date);

CREATE INDEX voucher_batch14299 ON public.vouchers14299 USING btree (batch_key);

CREATE INDEX workspace_notifications_owner_idx ON public.workspace_notifications USING btree (owner_id, read_at, created_at DESC);


-- VIEWS



-- SEEDS
INSERT INTO public.accounting_id_settings("id","updated_at","updated_by","journal_digits","journal_prefix","schedule_prefix","sub_user_digits","sub_user_prefix","automated_prefix","adjustment_prefix") SELECT "id","updated_at","updated_by","journal_digits","journal_prefix","schedule_prefix","sub_user_digits","sub_user_prefix","automated_prefix","adjustment_prefix" FROM jsonb_populate_record(NULL::public.accounting_id_settings,'{"id":true,"updated_at":"2026-10-10T01:28:21.845-06:00","updated_by":null,"journal_digits":4,"journal_prefix":"JRN","schedule_prefix":"SCH","sub_user_digits":4,"sub_user_prefix":"SJR","automated_prefix":"AUTO","adjustment_prefix":"ADJ"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["email"],"table_name":"account_provisioning14320"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["sample_key"],"table_name":"accounting_feature_samples"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"accounting_id_settings"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["backend","transaction_id"],"table_name":"accounting_operations136"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"accounting_periods"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"accounts"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["journal_id"],"table_name":"approved_reports1443"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"audit_reviews136"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"book_sessions136"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"budget_settings14313"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"budget_templates14313"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"business_settings"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"cashier_currency_counts"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"cashier_shift_closes"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"cashier_shift_tenders"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["name"],"table_name":"catalog_installations106"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"company_documents105"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["code"],"table_name":"currencies"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"data_tools_state14232"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["owner_id","id"],"table_name":"document_download_passwords14312"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"employees"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["stem"],"table_name":"entry_prefix_reservations"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"entry_submissions"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"fund_adjustment_lines"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"fund_adjustment_requests"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["request_key"],"table_name":"handover_history14320"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"hr_calendar_events14306"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"hr_calendar_history14306"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"hr_calendar_settings14306"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"installation14320"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"inventory_items"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"inventory_items104"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"inventory_movements"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":["data","date"],"pk_columns":["id"],"table_name":"inventory_movements104"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":["transaction_date"],"pk_columns":["id"],"table_name":"journal_entries"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"journal_lines"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["journal_line_id","source_line_id"],"table_name":"journal_sources14253"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"legal_documents"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"menu_categories104"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"menu_ingredients105"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["menu_item_id","inventory_item_id"],"table_name":"menu_item_ingredients"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"menu_items"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"menu_items104"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":["data","date"],"pk_columns":["id"],"table_name":"menu_sales108"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"opening_state14234"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["actor_id","request_key"],"table_name":"operation_receipts14228"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"operational_reports"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"payroll_employees"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"payroll_leave_records"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"payroll_lines"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":["data","month"],"pk_columns":["id"],"table_name":"payroll_runs"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"period_findings"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"pos_cash118"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"pos_config118"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"pos_orders118"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"pos_shifts118"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"pos_stock118"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["area"],"table_name":"presentation_settings113"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"print_settings"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"profiles"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"recurring_reminders"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"recurring_transactions"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"report_types14253"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["user_id"],"table_name":"restaurant_members121"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["journal_id"],"table_name":"review_routes14229"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"scheduled_journal_occurrences"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"scheduled_journals"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"session_policy1443"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["user_id"],"table_name":"staff_entry_sequences"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"staff_journal_lines"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":["period_start"],"pk_columns":["id"],"table_name":"staff_journals"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"sub_accounts"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"tax_sso_records"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"todo_completions1443"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"transaction_template_lines"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"transaction_templates"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["owner_id"],"table_name":"upcoming_reminders14229"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"user_fund_assignments"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["user_id"],"table_name":"user_permissions"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["owner_id"],"table_name":"user_print_preferences1434"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["year_no","kind"],"table_name":"voucher_sequences14299"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"voucher_settings14299"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"voucher_versions14299"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"vouchers14299"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"workspace_actor_audit138"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"workspace_hook_config138"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"workspace_notifications"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["id"],"table_name":"workspace_todos136"}'::jsonb);

INSERT INTO public.backup_registry113("date_path","pk_columns","table_name") SELECT "date_path","pk_columns","table_name" FROM jsonb_populate_record(NULL::public.backup_registry113,'{"date_path":null,"pk_columns":["year"],"table_name":"year_closings136"}'::jsonb);

INSERT INTO public.business_settings("id","city","email","phone","tax_id","country","website","industry","timezone","legal_name","updated_at","updated_by","postal_code","address_line","display_name","enterprise_no","business_license") SELECT "id","city","email","phone","tax_id","country","website","industry","timezone","legal_name","updated_at","updated_by","postal_code","address_line","display_name","enterprise_no","business_license" FROM jsonb_populate_record(NULL::public.business_settings,'{"id":true,"city":"","email":"","phone":"","tax_id":"","country":"Laos","website":"","industry":"","timezone":"Asia/Vientiane","legal_name":"","updated_at":"2026-10-10T01:28:21.787-06:00","updated_by":null,"postal_code":"","address_line":"","display_name":"","enterprise_no":"","business_license":""}'::jsonb);

INSERT INTO public.currencies("code","name","symbol","is_base","is_active","created_at") SELECT "code","name","symbol","is_base","is_active","created_at" FROM jsonb_populate_record(NULL::public.currencies,'{"code":"LAK","name":"Lao Kip","symbol":"₭","is_base":true,"is_active":true,"created_at":"2026-10-10T01:28:21.81-06:00"}'::jsonb);

INSERT INTO public.currencies("code","name","symbol","is_base","is_active","created_at") SELECT "code","name","symbol","is_base","is_active","created_at" FROM jsonb_populate_record(NULL::public.currencies,'{"code":"USD","name":"US Dollar","symbol":"$","is_base":false,"is_active":true,"created_at":"2026-10-10T01:28:21.81-06:00"}'::jsonb);

INSERT INTO public.currencies("code","name","symbol","is_base","is_active","created_at") SELECT "code","name","symbol","is_base","is_active","created_at" FROM jsonb_populate_record(NULL::public.currencies,'{"code":"THB","name":"Thai Baht","symbol":"฿","is_base":false,"is_active":true,"created_at":"2026-10-10T01:28:21.81-06:00"}'::jsonb);

INSERT INTO public.data_tools_state14232("id","instance") SELECT "id","instance" FROM jsonb_populate_record(NULL::public.data_tools_state14232,'{"id":1,"instance":"0c6d376e-1428-4dcf-8838-10b4e8c0eba8"}'::jsonb);

INSERT INTO public.installation14320("id","checks","version","instance","deployment","updated_at","updated_by","initialized","incoming_admin") SELECT "id","checks","version","instance","deployment","updated_at","updated_by","initialized","incoming_admin" FROM jsonb_populate_record(NULL::public.installation14320,'{"id":true,"checks":{},"version":1,"instance":"ab51ca35-a548-4498-a4a7-ddf10c9213f6","deployment":{},"updated_at":"2026-10-10T01:28:22.15-06:00","updated_by":null,"initialized":false,"incoming_admin":null}'::jsonb);

INSERT INTO public.opening_state14234("id","closed","result","payload","generation","request_key") SELECT "id","closed","result","payload","generation","request_key" FROM jsonb_populate_record(NULL::public.opening_state14234,'{"id":true,"closed":false,"result":null,"payload":null,"generation":"0224283f-4b5a-4152-8dff-50f92e8a4a87","request_key":null}'::jsonb);

INSERT INTO public.print_settings("id","page_size","updated_at","updated_by","footer_path","header_path","orientation") SELECT "id","page_size","updated_at","updated_by","footer_path","header_path","orientation" FROM jsonb_populate_record(NULL::public.print_settings,'{"id":true,"page_size":"A4","updated_at":"2026-10-10T01:28:21.79-06:00","updated_by":null,"footer_path":null,"header_path":null,"orientation":"portrait"}'::jsonb);

INSERT INTO public.report_types14253("id","name","active","created_at") SELECT "id","name","active","created_at" FROM jsonb_populate_record(NULL::public.report_types14253,'{"id":"c3192a0c-06d3-445e-bc40-976707aef5e3","name":"Petty cash liquidation","active":true,"created_at":"2026-10-10T01:28:22.068-06:00"}'::jsonb);

INSERT INTO public.report_types14253("id","name","active","created_at") SELECT "id","name","active","created_at" FROM jsonb_populate_record(NULL::public.report_types14253,'{"id":"e76b8e71-952b-4dc4-b8e9-a20c9d047a14","name":"Cashier report","active":true,"created_at":"2026-10-10T01:28:22.068-06:00"}'::jsonb);

INSERT INTO public.report_types14253("id","name","active","created_at") SELECT "id","name","active","created_at" FROM jsonb_populate_record(NULL::public.report_types14253,'{"id":"f94a86b2-f6e4-4f77-8e46-9cd24ead54b0","name":"Expense report","active":true,"created_at":"2026-10-10T01:28:22.068-06:00"}'::jsonb);

INSERT INTO public.report_types14253("id","name","active","created_at") SELECT "id","name","active","created_at" FROM jsonb_populate_record(NULL::public.report_types14253,'{"id":"8e48771b-638d-4985-a2b2-dd34007ea242","name":"Collection report","active":true,"created_at":"2026-10-10T01:28:22.068-06:00"}'::jsonb);

INSERT INTO public.report_types14253("id","name","active","created_at") SELECT "id","name","active","created_at" FROM jsonb_populate_record(NULL::public.report_types14253,'{"id":"7103ee0c-e901-48ba-9af6-e04ecd22451b","name":"Fund transfer / handover","active":true,"created_at":"2026-10-10T01:28:22.068-06:00"}'::jsonb);

INSERT INTO public.session_policy1443("id","updated_at","timeout_minutes","warning_minutes") SELECT "id","updated_at","timeout_minutes","warning_minutes" FROM jsonb_populate_record(NULL::public.session_policy1443,'{"id":true,"updated_at":"2026-10-10T01:28:21.969-06:00","timeout_minutes":60,"warning_minutes":1}'::jsonb);

INSERT INTO public.voucher_settings14299("id","digits","prefix","updated_at","editor_code","year_digits","editor_label","handwritten_code","handwritten_label") SELECT "id","digits","prefix","updated_at","editor_code","year_digits","editor_label","handwritten_code","handwritten_label" FROM jsonb_populate_record(NULL::public.voucher_settings14299,'{"id":1,"digits":4,"prefix":"OJM","updated_at":"2026-10-10T01:28:22.125-06:00","editor_code":"E","year_digits":2,"editor_label":"Edited and Printed","handwritten_code":"H","handwritten_label":"Handwritten"}'::jsonb);

INSERT INTO public.workspace_hook_config138("id","previous_hook") SELECT "id","previous_hook" FROM jsonb_populate_record(NULL::public.workspace_hook_config138,'{"id":true,"previous_hook":null}'::jsonb);

INSERT INTO storage.buckets("id","name","owner","public","file_size_limit","allowed_mime_types") SELECT "id","name","owner","public","file_size_limit","allowed_mime_types" FROM jsonb_populate_record(NULL::storage.buckets,'{"id":"legal-documents","name":"legal-documents","owner":null,"public":false,"file_size_limit":10485760,"allowed_mime_types":["application/pdf","image/jpeg","image/png","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]}'::jsonb) ON CONFLICT(id) DO NOTHING;

INSERT INTO storage.buckets("id","name","owner","public","file_size_limit","allowed_mime_types") SELECT "id","name","owner","public","file_size_limit","allowed_mime_types" FROM jsonb_populate_record(NULL::storage.buckets,'{"id":"hr-documents14306","name":"hr-documents14306","owner":null,"public":false,"file_size_limit":10485760,"allowed_mime_types":null}'::jsonb) ON CONFLICT(id) DO NOTHING;


-- SECURITY
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public,private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE "private"."password_reset14257" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."account_provisioning14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."account_provisioning14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounting_feature_samples" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."accounting_id_settings" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."accounting_id_settings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounting_operations136" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."accounting_operations136" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounting_periods" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."accounting_periods" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounts" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."approved_reports1443" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."approved_reports1443" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."audit_log" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."audit_reviews136" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."audit_reviews136" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."backup_audit113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."backup_audit113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."backup_registry113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."backup_registry113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."book_sessions136" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."book_sessions136" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."budget_settings14313" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."budget_settings14313" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."budget_templates14313" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."budget_templates14313" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."business_settings" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."business_settings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."cashier_currency_counts" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."cashier_currency_counts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."cashier_shift_closes" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."cashier_shift_closes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."cashier_shift_tenders" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."cashier_shift_tenders" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."catalog_installations106" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."catalog_installations106" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."company_documents105" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."company_documents105" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."currencies" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."data_tools_state14232" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."data_tools_state14232" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."document_download_passwords14312" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."document_download_passwords14312" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."employees" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."entry_prefix_reservations" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."entry_prefix_reservations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."entry_submissions" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."entry_submissions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."fund_adjustment_lines" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."fund_adjustment_lines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."fund_adjustment_requests" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."fund_adjustment_requests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."handover_history14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."handover_history14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."hr_calendar_events14306" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."hr_calendar_events14306" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."hr_calendar_history14306" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."hr_calendar_history14306" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."hr_calendar_settings14306" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."hr_calendar_settings14306" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."installation14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."installation14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."inventory_items" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."inventory_items104" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."inventory_items104" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."inventory_movements" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."inventory_movements104" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."inventory_movements104" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."journal_entries" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."journal_lines" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."journal_lines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."journal_sources14253" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."journal_sources14253" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."legal_documents" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."legal_documents" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_categories104" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_categories104" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_ingredients105" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_ingredients105" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_item_ingredients" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_item_ingredients" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_items" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_items104" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_items104" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."menu_sales108" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."menu_sales108" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."opening_state14234" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."opening_state14234" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."operation_receipts14228" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."operation_receipts14228" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."operational_reports" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."operational_reports" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."payroll_employees" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."payroll_employees" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."payroll_leave_records" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."payroll_leave_records" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."payroll_lines" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."payroll_lines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."payroll_runs" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."payroll_runs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."period_findings" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."period_findings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."pos_cash118" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."pos_config118" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."pos_orders118" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."pos_shifts118" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."pos_stock118" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."presentation_settings113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."presentation_settings113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."print_settings" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."print_settings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."profiles" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."record_deletions108" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."record_deletions108" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_attempts14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_attempts14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_audit113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_audit113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_sessions113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_sessions113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_tickets14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_tickets14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_vault113" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_vault113" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recovery_vaults14320" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recovery_vaults14320" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recurring_reminders" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recurring_reminders" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."recurring_transactions" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."recurring_transactions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."report_types14253" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."report_types14253" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."restaurant_members121" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."review_routes14229" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."review_routes14229" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."scheduled_journal_occurrences" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."scheduled_journal_occurrences" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."scheduled_journals" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."scheduled_journals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."session_policy1443" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."session_policy1443" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."staff_entry_sequences" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."staff_entry_sequences" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."staff_journal_lines" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."staff_journal_lines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."staff_journals" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."staff_journals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."sub_accounts" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."sub_accounts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."tax_sso_records" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."tax_sso_records" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."todo_completions1443" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."todo_completions1443" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."transaction_template_lines" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."transaction_template_lines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."transaction_templates" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."transaction_templates" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."upcoming_reminders14229" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."upcoming_reminders14229" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."user_fund_assignments" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."user_fund_assignments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."user_permissions" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."user_print_preferences1434" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."user_print_preferences1434" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."voucher_sequences14299" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."voucher_sequences14299" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."voucher_settings14299" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."voucher_settings14299" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."voucher_versions14299" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."voucher_versions14299" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."vouchers14299" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."vouchers14299" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."workspace_actor_audit138" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."workspace_actor_audit138" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."workspace_hook_config138" FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON TABLE "public"."workspace_notifications" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."workspace_notifications" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."workspace_todos136" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."workspace_todos136" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."year_closings136" FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE "public"."year_closings136" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION _fund_summary113(uuid,date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION account_request_gate14258() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION accounting_archive_audit126() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION accounting_archive_clear126(jsonb,boolean,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION accounting_archive_preview127(date,date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION accounting_archive_staff_parents128(uuid[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION accounting_workspace_allowed123() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION ack_period14317(date,text,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION active_account14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION add_staff_workspace_entry(uuid,date,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION admin_save_access14281(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION admin_save_access1441(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approve_entry_submission(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approve_fund_adjustment_v49(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approve_report1443(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approve_report_worker14229(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approve_staff_journal(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION approved_report1443(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION assert_final_review14229(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION assigned_ledger14281(uuid,uuid,date,date,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION audit_month1434(date,boolean,text[],text[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION audit_schedule92() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION audit_snapshot14232() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION backup_export113(date,date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION backup_import113(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION begin_book_session136(date,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION block_unreviewed_archive91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION book_sessions_list136() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION book_snapshot136(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION branch_home14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION budget_capabilities14316() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION budget_link_guard14316() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION can_action113(text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION can_use_staff_account(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION can_workspace113(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION cancel_scheduled_posting93(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION capture_report_funds14254() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION check_ledger_entry14228(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION check_workspace_request123() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION close_opening_setup14234() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION close_year136(integer,text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION close_year14317(integer,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION correct_scheduled_date92(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION create_scheduled_journal91(text,text,text,uuid,uuid,numeric,text,text,date,date,integer,integer,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION create_scheduled_journal92(text,text,text,uuid,uuid,numeric,numeric,text,date,date,integer,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION current_access14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION delete_budget14316(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION delete_one_audit1437(text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION delete_record108(text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION delete_scheduled_journal92(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION employee_photo113(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION finish_book_session136(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION finish_book_session14317(uuid,date,text,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION fund_balances136(uuid,date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION fund_request_guard14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION fund_summary113(uuid,date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_actions113() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_delete108() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_hr_calendar14306() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_ledger_assignment14281() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_payroll_report_record82() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_payroll_report_record83() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_period_ack14317() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_sales108() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION guard_separate_members123() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION has_user_permission(text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION in_branch14229(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION install_catalog106() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION installation_status14320() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION internal_operation136() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION journal_receipt14228(text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION journal_visible14229(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION ledger_boundary136() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION ledger_integrity14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION ledger_lock14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION link_account14320(uuid,text,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION link_recorded_workspace_handover(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION mark_journal_entry_under_review(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION next_adjustment_no89() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION next_schedule_no91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION no_duplicate_release136() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION ojm_guard_postable_account_20260929() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION opening_status14234() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION operational_data_backup142() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION operational_data_reset142(jsonb,boolean,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION organization_guard14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION password_change_required14257() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION password_change_status14257() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION password_gate14257() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION password_reset_service14257(text,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION period_pending14317(date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_journal_batch14228(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_manual_journal(date,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_manual_journal14228(date,text,jsonb,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_manual_worker14228(date,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_opening_balances14234(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_review_adjustment136(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_scheduled_one91(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_scheduled_one92(uuid,date,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_summary14253(uuid,date,text,jsonb,text,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION post_workspace_review_v3(uuid,jsonb,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION preview_journal_number14257(text,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION preview_staff_workspace_entry_no(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION process_due_scheduled_journals91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION protect_approved_source1443() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION protect_linked_workspace_line() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION protect_todo1443() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION provisioned_account14320(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION recipe_view113() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION recovery_attempt14320(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reject_entry_submission(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reminder_load14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reminder_save14229(text,bigint,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reopen_staff_journal(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION report_access1443(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION report_history14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION report_labels_lock14253() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION require_admin136() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reserve_account14320(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reserve_entry_prefix89(text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reset_scope_catalog14232() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION reset_scope_tables14232(text[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION resolve_audit_review136(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION restaurant_can121(text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION restaurant_signed_in121() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION return_fund_adjustment_v49(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_collection_report(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_current14229(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_directory14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_exact14229(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_forward14229(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_inbox14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION review_scheduled_occurrence91(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION revise_open_journal_entry(uuid,text,date,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_audit_review136(date,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_installation14320(uuid,integer,integer,text,jsonb,jsonb,jsonb,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_report_type14253(uuid,text,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_staff_workspace_entry_v2(uuid,uuid,date,text,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION save_staff_workspace_entry_v3(uuid,uuid,text,date,text,uuid,uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION schedule_admin91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION schedule_next_date91(date,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION scoped_reset14232(jsonb,boolean,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION scoped_reset_backup14232(text[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION set_accounting_period_status(date,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION set_period_status14317(date,text,text,boolean) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION set_scheduled_status91(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION snapshot_scheduled_occurrence92() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION staff_report1434(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION staff_rules14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION stage_book_operation136(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION stamp_inventory_menu104() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION stamp_workspace105() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION submission_guard14228() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION submit_fund_adjustment_v49(uuid,uuid,jsonb,jsonb,text,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION submit_report14253(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION submit_route14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION submit_staff_journal(uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION sync_id_digits89() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION sync_subaccount_parent14285() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION sync_subaccount_posting14285() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION team_funds113(date) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION unreview_scheduled_header91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION unreview_scheduled_journal91() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION update_future_schedule91(uuid,text,text,text,uuid,uuid,numeric,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION update_future_schedule92(uuid,text,text,text,uuid,uuid,numeric,numeric,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION user_lifecycle14253(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION validate_id_settings89() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION validate_journal14228(date,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION validate_user_prefix89() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION void_journal_entry(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION void_staff_editor1437(uuid,uuid[],text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION void_staff_workspace_entry(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_admin14299() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_config14299(text,text,text,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_issue14299(text,integer,date,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_link14299(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_update14299(uuid,integer,date,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION voucher_void14299(uuid,integer,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workflow_capabilities14253() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workspace_actor_log138() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workspace_context138() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workspace_live_activity_v49(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workspace_pre_request138() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION workspace_write_scope14229() FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION year_preflight136(integer) FROM PUBLIC,anon,authenticated,service_role;

CREATE POLICY "accounting_id_settings_admin_write" ON "public"."accounting_id_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "accounting_id_settings_read" ON "public"."accounting_id_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "active_account14228" ON "public"."accounting_id_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."accounting_id_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."accounting_id_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."accounting_operations136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."accounting_operations136" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."accounting_operations136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "accounting_periods_admin_all" ON "public"."accounting_periods" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "active_account14228" ON "public"."accounting_periods" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."accounting_periods" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."accounting_periods" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_accounts" ON "public"."accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "current_accounts14228" ON "public"."accounts" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((is_admin() OR can_action113('sec-chart-accounts'::text, 'view'::text) OR can_action113('journal'::text, 'view'::text) OR (EXISTS ( SELECT 1
   FROM user_permissions u
  WHERE (can_workspace113(u.user_id) AND ((accounts.id = ANY (u.assigned_fund_account_ids)) OR (accounts.id = ANY (u.allowed_account_ids)) OR (accounts.id = ANY (u.destination_account_ids)) OR (accounts.id = u.money_in_counterpart_account_id)))))));

CREATE POLICY "password_gate14257" ON "public"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "reference_accounts_read" ON "public"."accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "workspace_accounting123" ON "public"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."approved_reports1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "approved_visible14229" ON "public"."approved_reports1443" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (journal_visible14229(journal_id));

CREATE POLICY "assigned_reports1443" ON "public"."approved_reports1443" AS PERMISSIVE FOR SELECT TO "authenticated" USING (report_access1443(owner_id));

CREATE POLICY "password_gate14257" ON "public"."approved_reports1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."approved_reports1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."audit_log" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_audit_log" ON "public"."audit_log" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."audit_log" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."audit_log" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."audit_reviews136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_read136" ON "public"."audit_reviews136" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "password_gate14257" ON "public"."audit_reviews136" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."audit_reviews136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."backup_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "backup_audit_read113" ON "public"."backup_audit113" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_admin());

CREATE POLICY "password_gate14257" ON "public"."backup_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."backup_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."backup_registry113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."backup_registry113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."backup_registry113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."book_sessions136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_read136" ON "public"."book_sessions136" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "password_gate14257" ON "public"."book_sessions136" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."book_sessions136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "budget_admin14313" ON "public"."budget_settings14313" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_admin() AND accounting_workspace_allowed123())) WITH CHECK ((is_admin() AND accounting_workspace_allowed123()));

CREATE POLICY "budget_admin14313" ON "public"."budget_templates14313" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_admin() AND accounting_workspace_allowed123())) WITH CHECK ((is_admin() AND accounting_workspace_allowed123()));

CREATE POLICY "active_account14228" ON "public"."business_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_business_settings" ON "public"."business_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."business_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."business_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."cashier_currency_counts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "cashier_currency_counts_access" ON "public"."cashier_currency_counts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (cashier_shift_closes s
     JOIN staff_journals j ON ((j.id = s.staff_journal_id)))
  WHERE ((s.id = cashier_currency_counts.shift_close_id) AND ((j.owner_id = auth.uid()) OR has_user_permission('approve'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (cashier_shift_closes s
     JOIN staff_journals j ON ((j.id = s.staff_journal_id)))
  WHERE ((s.id = cashier_currency_counts.shift_close_id) AND (j.owner_id = auth.uid())))));

CREATE POLICY "password_gate14257" ON "public"."cashier_currency_counts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."cashier_currency_counts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."cashier_shift_closes" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "cashier_shift_closes_access" ON "public"."cashier_shift_closes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM staff_journals j
  WHERE ((j.id = cashier_shift_closes.staff_journal_id) AND ((j.owner_id = auth.uid()) OR has_user_permission('approve'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM staff_journals j
  WHERE ((j.id = cashier_shift_closes.staff_journal_id) AND (j.owner_id = auth.uid())))));

CREATE POLICY "password_gate14257" ON "public"."cashier_shift_closes" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."cashier_shift_closes" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."cashier_shift_tenders" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "cashier_shift_tenders_access" ON "public"."cashier_shift_tenders" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (cashier_shift_closes s
     JOIN staff_journals j ON ((j.id = s.staff_journal_id)))
  WHERE ((s.id = cashier_shift_tenders.shift_close_id) AND ((j.owner_id = auth.uid()) OR has_user_permission('approve'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (cashier_shift_closes s
     JOIN staff_journals j ON ((j.id = s.staff_journal_id)))
  WHERE ((s.id = cashier_shift_tenders.shift_close_id) AND (j.owner_id = auth.uid())))));

CREATE POLICY "password_gate14257" ON "public"."cashier_shift_tenders" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."cashier_shift_tenders" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."catalog_installations106" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_catalog106" ON "public"."catalog_installations106" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."catalog_installations106" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."catalog_installations106" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."company_documents105" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_documents1443" ON "public"."company_documents105" AS RESTRICTIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_workspace105" ON "public"."company_documents105" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."company_documents105" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."company_documents105" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."currencies" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_currencies" ON "public"."currencies" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."currencies" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "reference_currencies_read" ON "public"."currencies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "workspace_accounting123" ON "public"."currencies" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."data_tools_state14232" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."data_tools_state14232" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."data_tools_state14232" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."document_download_passwords14312" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "download_password_owner14312" ON "public"."document_download_passwords14312" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((owner_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.status = 'active'::record_status)))) AND can_action113('document-editor105'::text, 'export'::text)));

CREATE POLICY "download_password_save14312" ON "public"."document_download_passwords14312" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.status = 'active'::record_status)))) AND can_action113('document-editor105'::text, 'export'::text)));

CREATE POLICY "password_gate14257" ON "public"."document_download_passwords14312" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."document_download_passwords14312" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_employees" ON "public"."employees" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."entry_prefix_reservations" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."entry_prefix_reservations" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "prefix_admin_read" ON "public"."entry_prefix_reservations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role)))));

CREATE POLICY "workspace_accounting123" ON "public"."entry_prefix_reservations" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."entry_submissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "current_submissions14228" ON "public"."entry_submissions" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (can_workspace113(submitted_by));

CREATE POLICY "password_gate14257" ON "public"."entry_submissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "submissions_admin_update" ON "public"."entry_submissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "submissions_insert_own" ON "public"."entry_submissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::submission_status)));

CREATE POLICY "submissions_read_own_or_admin" ON "public"."entry_submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((submitted_by = ( SELECT auth.uid() AS uid)) OR is_admin()));

CREATE POLICY "submissions_reviewer_select" ON "public"."entry_submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_user_permission('approve'::text));

CREATE POLICY "workspace_accounting123" ON "public"."entry_submissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."fund_adjustment_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "fund_adjustment_lines_read" ON "public"."fund_adjustment_lines" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM fund_adjustment_requests r
  WHERE ((r.id = fund_adjustment_lines.request_id) AND ((r.owner_id = auth.uid()) OR has_user_permission('approve'::text))))));

CREATE POLICY "password_gate14257" ON "public"."fund_adjustment_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."fund_adjustment_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."fund_adjustment_requests" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "current_requests14228" ON "public"."fund_adjustment_requests" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (can_workspace113(owner_id));

CREATE POLICY "fund_adjustment_requests_read" ON "public"."fund_adjustment_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((owner_id = auth.uid()) OR has_user_permission('approve'::text)));

CREATE POLICY "password_gate14257" ON "public"."fund_adjustment_requests" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."fund_adjustment_requests" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."handover_history14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."handover_history14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."handover_history14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "hr_admin14306" ON "public"."hr_calendar_events14306" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_admin() AND accounting_workspace_allowed123())) WITH CHECK ((is_admin() AND accounting_workspace_allowed123()));

CREATE POLICY "active_account14228" ON "public"."hr_calendar_history14306" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "hr_history_admin14306" ON "public"."hr_calendar_history14306" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() AND accounting_workspace_allowed123()));

CREATE POLICY "password_gate14257" ON "public"."hr_calendar_history14306" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."hr_calendar_history14306" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "hr_admin14306" ON "public"."hr_calendar_settings14306" AS PERMISSIVE FOR ALL TO "authenticated" USING ((is_admin() AND accounting_workspace_allowed123())) WITH CHECK ((is_admin() AND accounting_workspace_allowed123()));

CREATE POLICY "active_account14228" ON "public"."installation14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."installation14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."installation14320" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."inventory_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_inventory_items" ON "public"."inventory_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."inventory_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."inventory_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."inventory_items104" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_records104" ON "public"."inventory_items104" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."inventory_items104" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."inventory_movements" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_inventory_movements" ON "public"."inventory_movements" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."inventory_movements" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."inventory_movements" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."inventory_movements104" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_records104" ON "public"."inventory_movements104" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."inventory_movements104" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_journal_entries" ON "public"."journal_entries" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "current_ledger14228" ON "public"."journal_entries" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((can_action113('journal'::text, 'view'::text) OR (EXISTS ( SELECT 1
   FROM (staff_journal_lines l
     JOIN staff_journals j ON ((j.id = l.staff_journal_id)))
  WHERE ((l.journal_entry_id = journal_entries.id) AND can_workspace113(j.owner_id))))));

CREATE POLICY "journal_entries_permitted_insert" ON "public"."journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((has_user_permission('post'::text) AND (posted_by = auth.uid())));

CREATE POLICY "journal_entries_permitted_select" ON "public"."journal_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((has_user_permission('post'::text) OR has_user_permission('approve'::text)));

CREATE POLICY "password_gate14257" ON "public"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_journal_lines" ON "public"."journal_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "current_ledger14228" ON "public"."journal_lines" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE (e.id = journal_lines.journal_entry_id))));

CREATE POLICY "journal_lines_permitted_insert" ON "public"."journal_lines" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((has_user_permission('post'::text) AND (EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_lines.journal_entry_id) AND (e.posted_by = auth.uid()))))));

CREATE POLICY "journal_lines_permitted_select" ON "public"."journal_lines" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((has_user_permission('post'::text) OR has_user_permission('approve'::text)));

CREATE POLICY "password_gate14257" ON "public"."journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."journal_sources14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "journal_sources_read14253" ON "public"."journal_sources14253" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((can_action113('journal'::text, 'view'::text) OR report_access1443(submitter_id)));

CREATE POLICY "password_gate14257" ON "public"."journal_sources14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."journal_sources14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."legal_documents" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_legal_documents" ON "public"."legal_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."legal_documents" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."legal_documents" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."menu_categories104" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_records104" ON "public"."menu_categories104" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_categories104" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."menu_ingredients105" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_workspace105" ON "public"."menu_ingredients105" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_ingredients105" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."menu_item_ingredients" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_menu_item_ingredients" ON "public"."menu_item_ingredients" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_item_ingredients" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."menu_item_ingredients" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."menu_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_menu_items" ON "public"."menu_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."menu_items" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."menu_items104" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_records104" ON "public"."menu_items104" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_items104" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."menu_sales108" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_sales108" ON "public"."menu_sales108" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."menu_sales108" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "active_account14228" ON "public"."opening_state14234" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."opening_state14234" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."opening_state14234" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."operation_receipts14228" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."operation_receipts14228" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."operation_receipts14228" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."operational_reports" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_only83" ON "public"."operational_reports" AS RESTRICTIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_records82" ON "public"."operational_reports" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."operational_reports" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."operational_reports" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."payroll_employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_only83" ON "public"."payroll_employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_records82" ON "public"."payroll_employees" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."payroll_employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."payroll_employees" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."payroll_leave_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_only83" ON "public"."payroll_leave_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_records82" ON "public"."payroll_leave_records" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."payroll_leave_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."payroll_leave_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."payroll_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_payroll_lines" ON "public"."payroll_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."payroll_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."payroll_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."payroll_runs" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_payroll_runs" ON "public"."payroll_runs" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_only83" ON "public"."payroll_runs" AS RESTRICTIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_records82" ON "public"."payroll_runs" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."payroll_runs" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."payroll_runs" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."period_findings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."period_findings" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "period_findings_admin_all" ON "public"."period_findings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "workspace_accounting123" ON "public"."period_findings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."presentation_settings113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."presentation_settings113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "presentation_read113" ON "public"."presentation_settings113" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "presentation_write113" ON "public"."presentation_settings113" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "workspace_accounting123" ON "public"."presentation_settings113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."print_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_print_settings" ON "public"."print_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."print_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."print_settings" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."profiles" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "current_profiles14228" ON "public"."profiles" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (((id = auth.uid()) OR is_admin() OR can_workspace113(id)));

CREATE POLICY "password_gate14257" ON "public"."profiles" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "profiles_admin_update" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "profiles_read_self_or_admin" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = ( SELECT auth.uid() AS uid)) OR is_admin()));

CREATE POLICY "profiles_reviewer_read" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (has_user_permission('approve'::text));

CREATE POLICY "active_account14228" ON "public"."record_deletions108" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_read108" ON "public"."record_deletions108" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_admin());

CREATE POLICY "password_gate14257" ON "public"."record_deletions108" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."record_deletions108" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."recovery_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."recovery_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."recovery_audit113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."recovery_sessions113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."recovery_sessions113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."recovery_sessions113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."recovery_vault113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."recovery_vault113" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."recovery_vault113" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."recurring_reminders" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_recurring_reminders" ON "public"."recurring_reminders" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."recurring_reminders" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."recurring_reminders" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."recurring_transactions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_recurring_transactions" ON "public"."recurring_transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."recurring_transactions" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."recurring_transactions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."report_types14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."report_types14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "report_types_read14253" ON "public"."report_types14253" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "workspace_accounting123" ON "public"."report_types14253" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."review_routes14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."review_routes14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."review_routes14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."scheduled_journal_occurrences" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "occurrences_admin_read91" ON "public"."scheduled_journal_occurrences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "password_gate14257" ON "public"."scheduled_journal_occurrences" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."scheduled_journal_occurrences" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."scheduled_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."scheduled_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "scheduled_admin_read91" ON "public"."scheduled_journals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "workspace_accounting123" ON "public"."scheduled_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."session_policy1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "insert_session1443" ON "public"."session_policy1443" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."session_policy1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "read_session1443" ON "public"."session_policy1443" AS PERMISSIVE FOR SELECT TO "authenticated" USING (active_account14228());

CREATE POLICY "update_session1443" ON "public"."session_policy1443" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "workspace_accounting123" ON "public"."session_policy1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."staff_entry_sequences" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."staff_entry_sequences" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."staff_entry_sequences" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."staff_journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "line_visible14229" ON "public"."staff_journal_lines" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (journal_visible14229(staff_journal_id));

CREATE POLICY "password_gate14257" ON "public"."staff_journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "staff_journal_lines_read" ON "public"."staff_journal_lines" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM staff_journals j
  WHERE ((j.id = staff_journal_lines.staff_journal_id) AND ((j.owner_id = auth.uid()) OR has_user_permission('approve'::text))))));

CREATE POLICY "staff_journal_lines_write" ON "public"."staff_journal_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM staff_journals j
  WHERE ((j.id = staff_journal_lines.staff_journal_id) AND (((j.owner_id = auth.uid()) AND (j.status = ANY (ARRAY['draft'::text, 'returned'::text]))) OR has_user_permission('approve'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM staff_journals j
  WHERE ((j.id = staff_journal_lines.staff_journal_id) AND (((j.owner_id = auth.uid()) AND (j.status = ANY (ARRAY['draft'::text, 'returned'::text]))) OR has_user_permission('approve'::text))))) AND can_use_staff_account(account_id)));

CREATE POLICY "workspace_accounting123" ON "public"."staff_journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "workspace_lines_scope113" ON "public"."staff_journal_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM staff_journals s
  WHERE ((s.id = staff_journal_lines.staff_journal_id) AND can_workspace113(s.owner_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM staff_journals s
  WHERE ((s.id = staff_journal_lines.staff_journal_id) AND can_workspace113(s.owner_id)))));

CREATE POLICY "active_account14228" ON "public"."staff_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "journal_visible14229" ON "public"."staff_journals" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (journal_visible14229(id));

CREATE POLICY "password_gate14257" ON "public"."staff_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "staff_journals_delete_draft" ON "public"."staff_journals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((owner_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'returned'::text]))));

CREATE POLICY "staff_journals_insert_own_or_reviewer" ON "public"."staff_journals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((owner_id = auth.uid()) OR has_user_permission('approve'::text)));

CREATE POLICY "staff_journals_read" ON "public"."staff_journals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((owner_id = auth.uid()) OR has_user_permission('approve'::text)));

CREATE POLICY "staff_journals_update_own_or_reviewer" ON "public"."staff_journals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((((owner_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'returned'::text, 'submitted'::text]))) OR has_user_permission('approve'::text))) WITH CHECK ((((owner_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'returned'::text, 'submitted'::text]))) OR has_user_permission('approve'::text)));

CREATE POLICY "workspace_accounting123" ON "public"."staff_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "workspace_scope113" ON "public"."staff_journals" AS RESTRICTIVE FOR ALL TO "authenticated" USING (can_workspace113(owner_id)) WITH CHECK (can_workspace113(owner_id));

CREATE POLICY "active_account14228" ON "public"."sub_accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_sub_accounts" ON "public"."sub_accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "current_subaccounts14228" ON "public"."sub_accounts" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((is_admin() OR can_action113('sec-sub-accounts'::text, 'view'::text) OR (EXISTS ( SELECT 1
   FROM accounts a
  WHERE (a.id = sub_accounts.parent_account_id)))));

CREATE POLICY "password_gate14257" ON "public"."sub_accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "reference_subaccounts_read" ON "public"."sub_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "workspace_accounting123" ON "public"."sub_accounts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."tax_sso_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_tax_sso_records" ON "public"."tax_sso_records" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."tax_sso_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."tax_sso_records" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."todo_completions1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "own_completions1443" ON "public"."todo_completions1443" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((owner_id = auth.uid()) AND can_action113('transactions-recurring'::text, 'view'::text)));

CREATE POLICY "password_gate14257" ON "public"."todo_completions1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."todo_completions1443" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."transaction_template_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_transaction_template_lines" ON "public"."transaction_template_lines" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."transaction_template_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."transaction_template_lines" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."transaction_templates" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_all_transaction_templates" ON "public"."transaction_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."transaction_templates" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."transaction_templates" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."upcoming_reminders14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."upcoming_reminders14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."upcoming_reminders14229" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."user_fund_assignments" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "assignments_current14228" ON "public"."user_fund_assignments" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((is_admin() OR ((user_id = auth.uid()) AND can_action113('sub-users-workspace'::text, 'view'::text)))) WITH CHECK (is_admin());

CREATE POLICY "password_gate14257" ON "public"."user_fund_assignments" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "user_fund_assignments_admin_write" ON "public"."user_fund_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING (has_user_permission('approve'::text)) WITH CHECK (has_user_permission('approve'::text));

CREATE POLICY "user_fund_assignments_read" ON "public"."user_fund_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) OR has_user_permission('approve'::text)));

CREATE POLICY "workspace_accounting123" ON "public"."user_fund_assignments" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."user_permissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."user_permissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "user_permissions_admin_write" ON "public"."user_permissions" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "user_permissions_read_own_or_admin" ON "public"."user_permissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) OR is_admin()));

CREATE POLICY "workspace_accounting123" ON "public"."user_permissions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."user_print_preferences1434" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "own_print_defaults1434" ON "public"."user_print_preferences1434" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "password_gate14257" ON "public"."user_print_preferences1434" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."user_print_preferences1434" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."voucher_sequences14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."voucher_sequences14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "voucher_sequences_read14299" ON "public"."voucher_sequences14299" AS PERMISSIVE FOR SELECT TO "authenticated" USING (voucher_admin14299());

CREATE POLICY "workspace_accounting123" ON "public"."voucher_sequences14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."voucher_settings14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."voucher_settings14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "voucher_settings_read14299" ON "public"."voucher_settings14299" AS PERMISSIVE FOR SELECT TO "authenticated" USING (voucher_admin14299());

CREATE POLICY "workspace_accounting123" ON "public"."voucher_settings14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."voucher_versions14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."voucher_versions14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "voucher_versions_read14299" ON "public"."voucher_versions14299" AS PERMISSIVE FOR SELECT TO "authenticated" USING (voucher_admin14299());

CREATE POLICY "workspace_accounting123" ON "public"."voucher_versions14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."vouchers14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."vouchers14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "vouchers_read14299" ON "public"."vouchers14299" AS PERMISSIVE FOR SELECT TO "authenticated" USING (voucher_admin14299());

CREATE POLICY "workspace_accounting123" ON "public"."vouchers14299" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."workspace_actor_audit138" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "administrator_read138" ON "public"."workspace_actor_audit138" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "password_gate14257" ON "public"."workspace_actor_audit138" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."workspace_actor_audit138" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."workspace_notifications" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "password_gate14257" ON "public"."workspace_notifications" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."workspace_notifications" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "workspace_notifications_read" ON "public"."workspace_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((owner_id = auth.uid()) OR has_user_permission('approve'::text)));

CREATE POLICY "workspace_notifications_update" ON "public"."workspace_notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "active_account14228" ON "public"."workspace_todos136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "own_todos136" ON "public"."workspace_todos136" AS PERMISSIVE FOR ALL TO "authenticated" USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "password_gate14257" ON "public"."workspace_todos136" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."workspace_todos136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "public"."year_closings136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (active_account14228()) WITH CHECK (active_account14228());

CREATE POLICY "admin_read136" ON "public"."year_closings136" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::app_role) AND (profiles.status = 'active'::record_status)))));

CREATE POLICY "password_gate14257" ON "public"."year_closings136" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

CREATE POLICY "workspace_accounting123" ON "public"."year_closings136" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "active_account14228" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "authenticated" USING (accounting_workspace_allowed123()) WITH CHECK (accounting_workspace_allowed123());

CREATE POLICY "hr_documents_admin14306" ON "storage"."objects" AS PERMISSIVE FOR ALL TO "authenticated" USING (((bucket_id = 'hr-documents14306'::text) AND is_admin() AND accounting_workspace_allowed123())) WITH CHECK (((bucket_id = 'hr-documents14306'::text) AND is_admin() AND accounting_workspace_allowed123() AND (EXISTS ( SELECT 1
   FROM payroll_employees
  WHERE ((payroll_employees.id)::text = split_part(objects.name, '/'::text, 1))))));

CREATE POLICY "hr_documents_anon14306" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "anon" USING ((bucket_id <> 'hr-documents14306'::text)) WITH CHECK ((bucket_id <> 'hr-documents14306'::text));

CREATE POLICY "hr_documents_private14306" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "authenticated" USING (((bucket_id <> 'hr-documents14306'::text) OR (is_admin() AND accounting_workspace_allowed123()))) WITH CHECK (((bucket_id <> 'hr-documents14306'::text) OR (is_admin() AND accounting_workspace_allowed123())));

CREATE POLICY "legal_docs_admin_delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'legal-documents'::text) AND is_admin()));

CREATE POLICY "legal_docs_admin_insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'legal-documents'::text) AND is_admin()));

CREATE POLICY "legal_docs_admin_select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'legal-documents'::text) AND is_admin()));

CREATE POLICY "legal_docs_admin_update" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'legal-documents'::text) AND is_admin())) WITH CHECK (((bucket_id = 'legal-documents'::text) AND is_admin()));

CREATE POLICY "password_gate14257" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT password_change_required14257())) WITH CHECK ((NOT password_change_required14257()));

GRANT DELETE ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT INSERT ON TABLE "public"."account_provisioning14320" TO "service_role";


GRANT REFERENCES ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT SELECT ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT TRIGGER ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT UPDATE ON TABLE "public"."account_provisioning14320" TO "service_role";

GRANT INSERT ON TABLE "public"."accounting_id_settings" TO "authenticated";

GRANT SELECT ON TABLE "public"."accounting_id_settings" TO "authenticated";

GRANT UPDATE ON TABLE "public"."accounting_id_settings" TO "authenticated";

GRANT INSERT ON TABLE "public"."accounting_periods" TO "authenticated";

GRANT SELECT ON TABLE "public"."accounting_periods" TO "authenticated";

GRANT UPDATE ON TABLE "public"."accounting_periods" TO "authenticated";

GRANT DELETE ON TABLE "public"."accounts" TO "authenticated";

GRANT INSERT ON TABLE "public"."accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."accounts" TO "authenticated";

GRANT UPDATE ON TABLE "public"."accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."approved_reports1443" TO "authenticated";

GRANT DELETE ON TABLE "public"."audit_log" TO "authenticated";

GRANT INSERT ON TABLE "public"."audit_log" TO "authenticated";

GRANT SELECT ON TABLE "public"."audit_log" TO "authenticated";

GRANT UPDATE ON TABLE "public"."audit_log" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";

GRANT SELECT ON TABLE "public"."audit_reviews136" TO "authenticated";

GRANT SELECT ON TABLE "public"."backup_audit113" TO "authenticated";

GRANT SELECT ON TABLE "public"."book_sessions136" TO "authenticated";

GRANT DELETE ON TABLE "public"."budget_settings14313" TO "authenticated";

GRANT INSERT ON TABLE "public"."budget_settings14313" TO "authenticated";

GRANT SELECT ON TABLE "public"."budget_settings14313" TO "authenticated";

GRANT UPDATE ON TABLE "public"."budget_settings14313" TO "authenticated";

GRANT DELETE ON TABLE "public"."budget_templates14313" TO "authenticated";

GRANT INSERT ON TABLE "public"."budget_templates14313" TO "authenticated";

GRANT SELECT ON TABLE "public"."budget_templates14313" TO "authenticated";

GRANT UPDATE ON TABLE "public"."budget_templates14313" TO "authenticated";

GRANT DELETE ON TABLE "public"."business_settings" TO "authenticated";

GRANT INSERT ON TABLE "public"."business_settings" TO "authenticated";

GRANT SELECT ON TABLE "public"."business_settings" TO "authenticated";

GRANT UPDATE ON TABLE "public"."business_settings" TO "authenticated";

GRANT DELETE ON TABLE "public"."cashier_currency_counts" TO "authenticated";

GRANT INSERT ON TABLE "public"."cashier_currency_counts" TO "authenticated";

GRANT SELECT ON TABLE "public"."cashier_currency_counts" TO "authenticated";

GRANT UPDATE ON TABLE "public"."cashier_currency_counts" TO "authenticated";

GRANT DELETE ON TABLE "public"."cashier_shift_closes" TO "authenticated";

GRANT INSERT ON TABLE "public"."cashier_shift_closes" TO "authenticated";

GRANT SELECT ON TABLE "public"."cashier_shift_closes" TO "authenticated";

GRANT UPDATE ON TABLE "public"."cashier_shift_closes" TO "authenticated";

GRANT DELETE ON TABLE "public"."cashier_shift_tenders" TO "authenticated";

GRANT INSERT ON TABLE "public"."cashier_shift_tenders" TO "authenticated";

GRANT SELECT ON TABLE "public"."cashier_shift_tenders" TO "authenticated";

GRANT UPDATE ON TABLE "public"."cashier_shift_tenders" TO "authenticated";

GRANT INSERT ON TABLE "public"."catalog_installations106" TO "authenticated";

GRANT SELECT ON TABLE "public"."catalog_installations106" TO "authenticated";

GRANT INSERT ON TABLE "public"."company_documents105" TO "authenticated";

GRANT SELECT ON TABLE "public"."company_documents105" TO "authenticated";

GRANT UPDATE ON TABLE "public"."company_documents105" TO "authenticated";

GRANT DELETE ON TABLE "public"."currencies" TO "authenticated";

GRANT INSERT ON TABLE "public"."currencies" TO "authenticated";

GRANT SELECT ON TABLE "public"."currencies" TO "authenticated";

GRANT UPDATE ON TABLE "public"."currencies" TO "authenticated";

GRANT INSERT ON TABLE "public"."document_download_passwords14312" TO "authenticated";

GRANT SELECT ON TABLE "public"."document_download_passwords14312" TO "authenticated";

GRANT DELETE ON TABLE "public"."employees" TO "authenticated";

GRANT INSERT ON TABLE "public"."employees" TO "authenticated";

GRANT SELECT ON TABLE "public"."employees" TO "authenticated";

GRANT UPDATE ON TABLE "public"."employees" TO "authenticated";

GRANT SELECT ON TABLE "public"."entry_prefix_reservations" TO "authenticated";

GRANT INSERT ON TABLE "public"."entry_submissions" TO "authenticated";

GRANT SELECT ON TABLE "public"."entry_submissions" TO "authenticated";

GRANT UPDATE ON TABLE "public"."entry_submissions" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."entry_submissions_submission_no_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."entry_submissions_submission_no_seq" TO "authenticated";

GRANT INSERT ON TABLE "public"."fund_adjustment_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."fund_adjustment_lines" TO "authenticated";

GRANT UPDATE ON TABLE "public"."fund_adjustment_lines" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."fund_adjustment_request_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."fund_adjustment_request_seq" TO "authenticated";

GRANT INSERT ON TABLE "public"."fund_adjustment_requests" TO "authenticated";

GRANT SELECT ON TABLE "public"."fund_adjustment_requests" TO "authenticated";

GRANT UPDATE ON TABLE "public"."fund_adjustment_requests" TO "authenticated";

GRANT INSERT ON TABLE "public"."hr_calendar_events14306" TO "authenticated";

GRANT SELECT ON TABLE "public"."hr_calendar_events14306" TO "authenticated";

GRANT UPDATE ON TABLE "public"."hr_calendar_events14306" TO "authenticated";

GRANT SELECT ON TABLE "public"."hr_calendar_history14306" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."hr_calendar_history14306_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."hr_calendar_history14306_id_seq" TO "authenticated";

GRANT INSERT ON TABLE "public"."hr_calendar_settings14306" TO "authenticated";

GRANT SELECT ON TABLE "public"."hr_calendar_settings14306" TO "authenticated";

GRANT UPDATE ON TABLE "public"."hr_calendar_settings14306" TO "authenticated";

GRANT DELETE ON TABLE "public"."inventory_items" TO "authenticated";

GRANT INSERT ON TABLE "public"."inventory_items" TO "authenticated";

GRANT SELECT ON TABLE "public"."inventory_items" TO "authenticated";

GRANT UPDATE ON TABLE "public"."inventory_items" TO "authenticated";

GRANT INSERT ON TABLE "public"."inventory_items104" TO "authenticated";

GRANT SELECT ON TABLE "public"."inventory_items104" TO "authenticated";

GRANT UPDATE ON TABLE "public"."inventory_items104" TO "authenticated";

GRANT DELETE ON TABLE "public"."inventory_movements" TO "authenticated";

GRANT INSERT ON TABLE "public"."inventory_movements" TO "authenticated";

GRANT SELECT ON TABLE "public"."inventory_movements" TO "authenticated";

GRANT UPDATE ON TABLE "public"."inventory_movements" TO "authenticated";

GRANT INSERT ON TABLE "public"."inventory_movements104" TO "authenticated";

GRANT SELECT ON TABLE "public"."inventory_movements104" TO "authenticated";

GRANT UPDATE ON TABLE "public"."inventory_movements104" TO "authenticated";

GRANT DELETE ON TABLE "public"."journal_entries" TO "authenticated";

GRANT INSERT ON TABLE "public"."journal_entries" TO "authenticated";

GRANT SELECT ON TABLE "public"."journal_entries" TO "authenticated";

GRANT UPDATE ON TABLE "public"."journal_entries" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."journal_entry_number_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."journal_entry_number_seq" TO "authenticated";

GRANT DELETE ON TABLE "public"."journal_lines" TO "authenticated";

GRANT INSERT ON TABLE "public"."journal_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."journal_lines" TO "authenticated";

GRANT UPDATE ON TABLE "public"."journal_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."journal_sources14253" TO "authenticated";

GRANT DELETE ON TABLE "public"."legal_documents" TO "authenticated";

GRANT INSERT ON TABLE "public"."legal_documents" TO "authenticated";

GRANT SELECT ON TABLE "public"."legal_documents" TO "authenticated";

GRANT UPDATE ON TABLE "public"."legal_documents" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_categories104" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_categories104" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_categories104" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_ingredients105" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_ingredients105" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_ingredients105" TO "authenticated";

GRANT DELETE ON TABLE "public"."menu_item_ingredients" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_item_ingredients" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_item_ingredients" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_item_ingredients" TO "authenticated";

GRANT DELETE ON TABLE "public"."menu_items" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_items" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_items" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_items" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_items104" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_items104" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_items104" TO "authenticated";

GRANT DELETE ON TABLE "public"."menu_sales108" TO "authenticated";

GRANT INSERT ON TABLE "public"."menu_sales108" TO "authenticated";

GRANT SELECT ON TABLE "public"."menu_sales108" TO "authenticated";

GRANT UPDATE ON TABLE "public"."menu_sales108" TO "authenticated";

GRANT INSERT ON TABLE "public"."operational_reports" TO "authenticated";

GRANT SELECT ON TABLE "public"."operational_reports" TO "authenticated";

GRANT UPDATE ON TABLE "public"."operational_reports" TO "authenticated";

GRANT INSERT ON TABLE "public"."payroll_employees" TO "authenticated";

GRANT SELECT ON TABLE "public"."payroll_employees" TO "authenticated";

GRANT UPDATE ON TABLE "public"."payroll_employees" TO "authenticated";

GRANT INSERT ON TABLE "public"."payroll_leave_records" TO "authenticated";

GRANT SELECT ON TABLE "public"."payroll_leave_records" TO "authenticated";

GRANT UPDATE ON TABLE "public"."payroll_leave_records" TO "authenticated";

GRANT DELETE ON TABLE "public"."payroll_lines" TO "authenticated";

GRANT INSERT ON TABLE "public"."payroll_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."payroll_lines" TO "authenticated";

GRANT UPDATE ON TABLE "public"."payroll_lines" TO "authenticated";

GRANT INSERT ON TABLE "public"."payroll_runs" TO "authenticated";

GRANT SELECT ON TABLE "public"."payroll_runs" TO "authenticated";

GRANT UPDATE ON TABLE "public"."payroll_runs" TO "authenticated";

GRANT INSERT ON TABLE "public"."period_findings" TO "authenticated";

GRANT SELECT ON TABLE "public"."period_findings" TO "authenticated";

GRANT UPDATE ON TABLE "public"."period_findings" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."period_findings_finding_no_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."period_findings_finding_no_seq" TO "authenticated";

GRANT DELETE ON TABLE "public"."presentation_settings113" TO "authenticated";

GRANT INSERT ON TABLE "public"."presentation_settings113" TO "authenticated";

GRANT SELECT ON TABLE "public"."presentation_settings113" TO "authenticated";

GRANT UPDATE ON TABLE "public"."presentation_settings113" TO "authenticated";

GRANT DELETE ON TABLE "public"."print_settings" TO "authenticated";

GRANT INSERT ON TABLE "public"."print_settings" TO "authenticated";

GRANT SELECT ON TABLE "public"."print_settings" TO "authenticated";

GRANT UPDATE ON TABLE "public"."print_settings" TO "authenticated";

GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."record_deletions108" TO "authenticated";

GRANT DELETE ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_attempts14320" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_attempts14320" TO "service_role";

GRANT DELETE ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_audit113" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_audit113" TO "service_role";

GRANT DELETE ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_sessions113" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_sessions113" TO "service_role";

GRANT DELETE ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_tickets14320" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_tickets14320" TO "service_role";

GRANT DELETE ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_vault113" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_vault113" TO "service_role";

GRANT DELETE ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT INSERT ON TABLE "public"."recovery_vaults14320" TO "service_role";


GRANT REFERENCES ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT SELECT ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT TRIGGER ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT TRUNCATE ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT UPDATE ON TABLE "public"."recovery_vaults14320" TO "service_role";

GRANT DELETE ON TABLE "public"."recurring_reminders" TO "authenticated";

GRANT INSERT ON TABLE "public"."recurring_reminders" TO "authenticated";

GRANT SELECT ON TABLE "public"."recurring_reminders" TO "authenticated";

GRANT UPDATE ON TABLE "public"."recurring_reminders" TO "authenticated";

GRANT DELETE ON TABLE "public"."recurring_transactions" TO "authenticated";

GRANT INSERT ON TABLE "public"."recurring_transactions" TO "authenticated";

GRANT SELECT ON TABLE "public"."recurring_transactions" TO "authenticated";

GRANT UPDATE ON TABLE "public"."recurring_transactions" TO "authenticated";

GRANT SELECT ON TABLE "public"."report_types14253" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."scheduled_journal_number_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."scheduled_journal_number_seq" TO "authenticated";

GRANT SELECT ON TABLE "public"."scheduled_journal_occurrences" TO "authenticated";

GRANT SELECT ON TABLE "public"."scheduled_journals" TO "authenticated";

GRANT INSERT ON TABLE "public"."session_policy1443" TO "authenticated";

GRANT SELECT ON TABLE "public"."session_policy1443" TO "authenticated";

GRANT UPDATE ON TABLE "public"."session_policy1443" TO "authenticated";

GRANT DELETE ON TABLE "public"."staff_journal_lines" TO "authenticated";

GRANT INSERT ON TABLE "public"."staff_journal_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."staff_journal_lines" TO "authenticated";

GRANT UPDATE ON TABLE "public"."staff_journal_lines" TO "authenticated";

GRANT DELETE ON TABLE "public"."staff_journals" TO "authenticated";

GRANT INSERT ON TABLE "public"."staff_journals" TO "authenticated";

GRANT SELECT ON TABLE "public"."staff_journals" TO "authenticated";

GRANT UPDATE ON TABLE "public"."staff_journals" TO "authenticated";

GRANT DELETE ON TABLE "public"."sub_accounts" TO "authenticated";

GRANT INSERT ON TABLE "public"."sub_accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."sub_accounts" TO "authenticated";

GRANT UPDATE ON TABLE "public"."sub_accounts" TO "authenticated";

GRANT DELETE ON TABLE "public"."tax_sso_records" TO "authenticated";

GRANT INSERT ON TABLE "public"."tax_sso_records" TO "authenticated";

GRANT SELECT ON TABLE "public"."tax_sso_records" TO "authenticated";

GRANT UPDATE ON TABLE "public"."tax_sso_records" TO "authenticated";

GRANT SELECT ON TABLE "public"."todo_completions1443" TO "authenticated";

GRANT SELECT ON SEQUENCE "public"."todo_completions1443_id_seq" TO "authenticated";

GRANT USAGE ON SEQUENCE "public"."todo_completions1443_id_seq" TO "authenticated";

GRANT DELETE ON TABLE "public"."transaction_template_lines" TO "authenticated";

GRANT INSERT ON TABLE "public"."transaction_template_lines" TO "authenticated";

GRANT SELECT ON TABLE "public"."transaction_template_lines" TO "authenticated";

GRANT UPDATE ON TABLE "public"."transaction_template_lines" TO "authenticated";

GRANT DELETE ON TABLE "public"."transaction_templates" TO "authenticated";

GRANT INSERT ON TABLE "public"."transaction_templates" TO "authenticated";

GRANT SELECT ON TABLE "public"."transaction_templates" TO "authenticated";

GRANT UPDATE ON TABLE "public"."transaction_templates" TO "authenticated";

GRANT DELETE ON TABLE "public"."user_fund_assignments" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_fund_assignments" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_fund_assignments" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_fund_assignments" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_permissions" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_permissions" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_permissions" TO "authenticated";

GRANT DELETE ON TABLE "public"."user_print_preferences1434" TO "authenticated";

GRANT INSERT ON TABLE "public"."user_print_preferences1434" TO "authenticated";

GRANT SELECT ON TABLE "public"."user_print_preferences1434" TO "authenticated";

GRANT UPDATE ON TABLE "public"."user_print_preferences1434" TO "authenticated";

GRANT SELECT ON TABLE "public"."voucher_sequences14299" TO "authenticated";

GRANT SELECT ON TABLE "public"."voucher_settings14299" TO "authenticated";

GRANT SELECT ON TABLE "public"."voucher_versions14299" TO "authenticated";

GRANT SELECT ON TABLE "public"."vouchers14299" TO "authenticated";

GRANT SELECT ON TABLE "public"."workspace_actor_audit138" TO "authenticated";

GRANT INSERT ON TABLE "public"."workspace_notifications" TO "authenticated";

GRANT SELECT ON TABLE "public"."workspace_notifications" TO "authenticated";

GRANT UPDATE ON TABLE "public"."workspace_notifications" TO "authenticated";

GRANT DELETE ON TABLE "public"."workspace_todos136" TO "authenticated";

GRANT INSERT ON TABLE "public"."workspace_todos136" TO "authenticated";

GRANT SELECT ON TABLE "public"."workspace_todos136" TO "authenticated";

GRANT UPDATE ON TABLE "public"."workspace_todos136" TO "authenticated";

GRANT SELECT ON TABLE "public"."year_closings136" TO "authenticated";

GRANT EXECUTE ON FUNCTION account_request_gate14258() TO "anon";

GRANT EXECUTE ON FUNCTION account_request_gate14258() TO "authenticated";

GRANT EXECUTE ON FUNCTION account_request_gate14258() TO "authenticator";

GRANT EXECUTE ON FUNCTION account_request_gate14258() TO "service_role";

GRANT EXECUTE ON FUNCTION accounting_archive_audit126() TO "authenticated";

GRANT EXECUTE ON FUNCTION accounting_archive_clear126(jsonb,boolean,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION accounting_archive_preview127(date,date) TO "authenticated";

GRANT EXECUTE ON FUNCTION accounting_archive_staff_parents128(uuid[]) TO "authenticated";

GRANT EXECUTE ON FUNCTION accounting_workspace_allowed123() TO "authenticated";

GRANT EXECUTE ON FUNCTION ack_period14317(date,text,boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION active_account14228() TO "authenticated";

GRANT EXECUTE ON FUNCTION admin_save_access14281(uuid,text,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION admin_save_access14281(uuid,text,text,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION admin_save_access1441(uuid,text,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION approve_entry_submission(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION approve_fund_adjustment_v49(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION approve_report1443(uuid,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION approve_report_worker14229(uuid,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION approved_report1443(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION assert_final_review14229(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION assigned_ledger14281(uuid,uuid,date,date,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION assigned_ledger14281(uuid,uuid,date,date,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION audit_month1434(date,boolean,text[],text[]) TO "authenticated";

GRANT EXECUTE ON FUNCTION audit_schedule92() TO "authenticated";

GRANT EXECUTE ON FUNCTION audit_schedule92() TO "service_role";

GRANT EXECUTE ON FUNCTION audit_snapshot14232() TO "authenticated";

GRANT EXECUTE ON FUNCTION audit_snapshot14232() TO "service_role";

GRANT EXECUTE ON FUNCTION backup_export113(date,date) TO "authenticated";

GRANT EXECUTE ON FUNCTION backup_import113(jsonb,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION begin_book_session136(date,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION block_unreviewed_archive91() TO "authenticated";

GRANT EXECUTE ON FUNCTION block_unreviewed_archive91() TO "service_role";

GRANT EXECUTE ON FUNCTION book_sessions_list136() TO "authenticated";

GRANT EXECUTE ON FUNCTION branch_home14229() TO "authenticated";

GRANT EXECUTE ON FUNCTION branch_home14229() TO "service_role";

GRANT EXECUTE ON FUNCTION budget_capabilities14316() TO "authenticated";

GRANT EXECUTE ON FUNCTION budget_capabilities14316() TO "service_role";

GRANT EXECUTE ON FUNCTION budget_link_guard14316() TO "service_role";

GRANT EXECUTE ON FUNCTION can_action113(text,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION can_use_staff_account(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION can_workspace113(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION cancel_scheduled_posting93(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION capture_report_funds14254() TO "service_role";

GRANT EXECUTE ON FUNCTION check_workspace_request123() TO "authenticated";

GRANT EXECUTE ON FUNCTION check_workspace_request123() TO "service_role";

GRANT EXECUTE ON FUNCTION close_opening_setup14234() TO "authenticated";

GRANT EXECUTE ON FUNCTION close_opening_setup14234() TO "service_role";

GRANT EXECUTE ON FUNCTION close_year136(integer,text,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION close_year14317(integer,text,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION close_year14317(integer,text,text,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION correct_scheduled_date92(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION create_scheduled_journal91(text,text,text,uuid,uuid,numeric,text,text,date,date,integer,integer,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION create_scheduled_journal92(text,text,text,uuid,uuid,numeric,numeric,text,date,date,integer,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION current_access14228() TO "authenticated";

GRANT EXECUTE ON FUNCTION delete_budget14316(uuid,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION delete_budget14316(uuid,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION delete_one_audit1437(text,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION delete_record108(text,uuid,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION delete_scheduled_journal92(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION employee_photo113(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION finish_book_session136(uuid,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION finish_book_session14317(uuid,date,text,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION finish_book_session14317(uuid,date,text,boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION fund_balances136(uuid,date) TO "authenticated";

GRANT EXECUTE ON FUNCTION fund_summary113(uuid,date) TO "authenticated";

GRANT EXECUTE ON FUNCTION guard_delete108() TO "authenticated";

GRANT EXECUTE ON FUNCTION guard_delete108() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_hr_calendar14306() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_ledger_assignment14281() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_payroll_report_record82() TO "authenticated";

GRANT EXECUTE ON FUNCTION guard_payroll_report_record82() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_payroll_report_record83() TO "authenticated";

GRANT EXECUTE ON FUNCTION guard_payroll_report_record83() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_period_ack14317() TO "service_role";

GRANT EXECUTE ON FUNCTION guard_sales108() TO "authenticated";

GRANT EXECUTE ON FUNCTION guard_sales108() TO "service_role";

GRANT EXECUTE ON FUNCTION handle_new_user() TO "authenticated";

GRANT EXECUTE ON FUNCTION handle_new_user() TO "service_role";

GRANT EXECUTE ON FUNCTION has_user_permission(text) TO "authenticated";

GRANT EXECUTE ON FUNCTION in_branch14229(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION in_branch14229(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION install_catalog106() TO "authenticated";

GRANT EXECUTE ON FUNCTION installation_status14320() TO "authenticated";

GRANT EXECUTE ON FUNCTION installation_status14320() TO "service_role";

GRANT EXECUTE ON FUNCTION is_admin() TO "authenticated";

GRANT EXECUTE ON FUNCTION journal_receipt14228(text) TO "authenticated";

GRANT EXECUTE ON FUNCTION journal_visible14229(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION journal_visible14229(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION link_account14320(uuid,text,uuid,text) TO "service_role";

GRANT EXECUTE ON FUNCTION link_recorded_workspace_handover(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION mark_journal_entry_under_review(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION next_adjustment_no89() TO "authenticated";

GRANT EXECUTE ON FUNCTION ojm_guard_postable_account_20260929() TO "authenticated";

GRANT EXECUTE ON FUNCTION ojm_guard_postable_account_20260929() TO "service_role";

GRANT EXECUTE ON FUNCTION opening_status14234() TO "authenticated";

GRANT EXECUTE ON FUNCTION opening_status14234() TO "service_role";

GRANT EXECUTE ON FUNCTION operational_data_backup142() TO "authenticated";

GRANT EXECUTE ON FUNCTION operational_data_reset142(jsonb,boolean,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION organization_guard14229() TO "service_role";

GRANT EXECUTE ON FUNCTION password_change_required14257() TO "authenticated";

GRANT EXECUTE ON FUNCTION password_change_required14257() TO "service_role";

GRANT EXECUTE ON FUNCTION password_change_status14257() TO "authenticated";

GRANT EXECUTE ON FUNCTION password_change_status14257() TO "service_role";

GRANT EXECUTE ON FUNCTION password_gate14257() TO "anon";

GRANT EXECUTE ON FUNCTION password_gate14257() TO "authenticated";

GRANT EXECUTE ON FUNCTION password_gate14257() TO "service_role";

GRANT EXECUTE ON FUNCTION password_reset_service14257(text,uuid,uuid,uuid,text) TO "service_role";

GRANT EXECUTE ON FUNCTION period_pending14317(date) TO "authenticated";

GRANT EXECUTE ON FUNCTION period_pending14317(date) TO "service_role";

GRANT EXECUTE ON FUNCTION post_journal_batch14228(text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_manual_journal(date,text,jsonb,text,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_manual_journal14228(date,text,jsonb,text,integer,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_opening_balances14234(uuid,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_opening_balances14234(uuid,text,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION post_review_adjustment136(uuid,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_scheduled_one92(uuid,date,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_summary14253(uuid,date,text,jsonb,text,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION post_summary14253(uuid,date,text,jsonb,text,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION post_workspace_review_v3(uuid,jsonb,text,integer,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION preview_journal_number14257(text,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION preview_journal_number14257(text,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION preview_staff_workspace_entry_no(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION protect_approved_source1443() TO "authenticated";

GRANT EXECUTE ON FUNCTION protect_approved_source1443() TO "service_role";

GRANT EXECUTE ON FUNCTION protect_linked_workspace_line() TO "authenticated";

GRANT EXECUTE ON FUNCTION protect_linked_workspace_line() TO "service_role";

GRANT EXECUTE ON FUNCTION protect_todo1443() TO "authenticated";

GRANT EXECUTE ON FUNCTION protect_todo1443() TO "service_role";

GRANT EXECUTE ON FUNCTION provisioned_account14320(uuid,text) TO "service_role";

GRANT EXECUTE ON FUNCTION recipe_view113() TO "authenticated";

GRANT EXECUTE ON FUNCTION recovery_attempt14320(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION reject_entry_submission(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION reminder_load14229() TO "authenticated";

GRANT EXECUTE ON FUNCTION reminder_load14229() TO "service_role";

GRANT EXECUTE ON FUNCTION reminder_save14229(text,bigint,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION reminder_save14229(text,bigint,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION reopen_staff_journal(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION report_access1443(uuid,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION report_history14229() TO "authenticated";

GRANT EXECUTE ON FUNCTION report_history14229() TO "service_role";

GRANT EXECUTE ON FUNCTION report_labels_lock14253() TO "authenticated";

GRANT EXECUTE ON FUNCTION report_labels_lock14253() TO "service_role";

GRANT EXECUTE ON FUNCTION reserve_account14320(uuid,text,text) TO "service_role";

GRANT EXECUTE ON FUNCTION reset_scope_catalog14232() TO "service_role";

GRANT EXECUTE ON FUNCTION reset_scope_tables14232(text[]) TO "service_role";

GRANT EXECUTE ON FUNCTION resolve_audit_review136(uuid,uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION restaurant_can121(text,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION restaurant_signed_in121() TO "authenticated";

GRANT EXECUTE ON FUNCTION return_fund_adjustment_v49(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION review_collection_report(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION review_current14229(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION review_current14229(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION review_directory14229() TO "authenticated";

GRANT EXECUTE ON FUNCTION review_directory14229() TO "service_role";

GRANT EXECUTE ON FUNCTION review_exact14229(uuid,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION review_forward14229(uuid,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION review_forward14229(uuid,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION review_inbox14229() TO "authenticated";

GRANT EXECUTE ON FUNCTION review_inbox14229() TO "service_role";

GRANT EXECUTE ON FUNCTION review_scheduled_occurrence91(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION revise_open_journal_entry(uuid,text,date,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION save_audit_review136(date,uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION save_installation14320(uuid,integer,integer,text,jsonb,jsonb,jsonb,uuid,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION save_installation14320(uuid,integer,integer,text,jsonb,jsonb,jsonb,uuid,jsonb) TO "service_role";

GRANT EXECUTE ON FUNCTION save_report_type14253(uuid,text,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION save_report_type14253(uuid,text,boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION save_staff_editor1437(uuid,text,jsonb,jsonb,uuid[]) TO "authenticated";

GRANT EXECUTE ON FUNCTION save_staff_workspace_entry_v3(uuid,uuid,text,date,text,uuid,uuid,text,text,numeric,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION schedule_admin91() TO "authenticated";

GRANT EXECUTE ON FUNCTION schedule_next_date91(date,text,text,integer,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION schedule_next_date91(date,text,text,integer,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION scoped_reset14232(jsonb,boolean,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION scoped_reset14232(jsonb,boolean,text) TO "service_role";

GRANT EXECUTE ON FUNCTION scoped_reset_backup14232(text[]) TO "authenticated";

GRANT EXECUTE ON FUNCTION scoped_reset_backup14232(text[]) TO "service_role";

GRANT EXECUTE ON FUNCTION set_accounting_period_status(date,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION set_period_status14317(date,text,text,boolean) TO "authenticated";

GRANT EXECUTE ON FUNCTION set_period_status14317(date,text,text,boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION set_scheduled_status91(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION snapshot_scheduled_occurrence92() TO "authenticated";

GRANT EXECUTE ON FUNCTION snapshot_scheduled_occurrence92() TO "service_role";

GRANT EXECUTE ON FUNCTION staff_report1434(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION stage_book_operation136(uuid,text,jsonb) TO "authenticated";

GRANT EXECUTE ON FUNCTION stamp_inventory_menu104() TO "authenticated";

GRANT EXECUTE ON FUNCTION stamp_inventory_menu104() TO "service_role";

GRANT EXECUTE ON FUNCTION stamp_workspace105() TO "authenticated";

GRANT EXECUTE ON FUNCTION stamp_workspace105() TO "service_role";

GRANT EXECUTE ON FUNCTION submit_fund_adjustment_v49(uuid,uuid,jsonb,jsonb,text,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION submit_report14253(uuid,uuid[]) TO "authenticated";

GRANT EXECUTE ON FUNCTION submit_report14253(uuid,uuid[]) TO "service_role";

GRANT EXECUTE ON FUNCTION submit_route14229() TO "service_role";

GRANT EXECUTE ON FUNCTION submit_staff_journal(uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION sync_id_digits89() TO "authenticated";

GRANT EXECUTE ON FUNCTION sync_id_digits89() TO "service_role";

GRANT EXECUTE ON FUNCTION sync_subaccount_parent14285() TO "service_role";

GRANT EXECUTE ON FUNCTION sync_subaccount_posting14285() TO "service_role";

GRANT EXECUTE ON FUNCTION team_funds113(date) TO "authenticated";

GRANT EXECUTE ON FUNCTION unreview_scheduled_header91() TO "authenticated";

GRANT EXECUTE ON FUNCTION unreview_scheduled_header91() TO "service_role";

GRANT EXECUTE ON FUNCTION unreview_scheduled_journal91() TO "authenticated";

GRANT EXECUTE ON FUNCTION unreview_scheduled_journal91() TO "service_role";

GRANT EXECUTE ON FUNCTION update_future_schedule91(uuid,text,text,text,uuid,uuid,numeric,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION update_future_schedule92(uuid,text,text,text,uuid,uuid,numeric,numeric,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION user_lifecycle14253(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION user_lifecycle14253(uuid,text) TO "service_role";

GRANT EXECUTE ON FUNCTION validate_id_settings89() TO "authenticated";

GRANT EXECUTE ON FUNCTION validate_id_settings89() TO "service_role";

GRANT EXECUTE ON FUNCTION validate_user_prefix89() TO "authenticated";

GRANT EXECUTE ON FUNCTION validate_user_prefix89() TO "service_role";

GRANT EXECUTE ON FUNCTION void_journal_entry(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION void_staff_editor1437(uuid,uuid[],text) TO "authenticated";

GRANT EXECUTE ON FUNCTION void_staff_workspace_entry(uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_admin14299() TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_admin14299() TO "service_role";

GRANT EXECUTE ON FUNCTION voucher_config14299(text,text,text,text,text,integer,integer) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_config14299(text,text,text,text,text,integer,integer) TO "service_role";

GRANT EXECUTE ON FUNCTION voucher_issue14299(text,integer,date,jsonb,uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_issue14299(text,integer,date,jsonb,uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION voucher_link14299(uuid,uuid) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_link14299(uuid,uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION voucher_update14299(uuid,integer,date,jsonb,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_update14299(uuid,integer,date,jsonb,text) TO "service_role";

GRANT EXECUTE ON FUNCTION voucher_void14299(uuid,integer,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION voucher_void14299(uuid,integer,text) TO "service_role";

GRANT EXECUTE ON FUNCTION workflow_capabilities14253() TO "authenticated";

GRANT EXECUTE ON FUNCTION workflow_capabilities14253() TO "service_role";

GRANT EXECUTE ON FUNCTION workspace_context138() TO "authenticated";

GRANT EXECUTE ON FUNCTION workspace_live_activity_v49(uuid,uuid,text) TO "authenticated";

GRANT EXECUTE ON FUNCTION workspace_pre_request138() TO "anon";

GRANT EXECUTE ON FUNCTION workspace_pre_request138() TO "authenticated";

GRANT EXECUTE ON FUNCTION workspace_pre_request138() TO "authenticator";

GRANT EXECUTE ON FUNCTION workspace_pre_request138() TO "service_role";

GRANT EXECUTE ON FUNCTION workspace_write_scope14229() TO "service_role";

GRANT EXECUTE ON FUNCTION year_preflight136(integer) TO "authenticated";

GRANT USAGE ON SCHEMA public TO authenticated,service_role;

REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;

GRANT USAGE ON SCHEMA private TO service_role;


-- TRIGGERS
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER sync_id_digits89 AFTER INSERT OR UPDATE OF journal_digits ON public.accounting_id_settings FOR EACH ROW EXECUTE FUNCTION sync_id_digits89();

CREATE TRIGGER validate_id_settings89 BEFORE INSERT OR UPDATE ON public.accounting_id_settings FOR EACH ROW EXECUTE FUNCTION validate_id_settings89();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION guard_actions113('period-review');

CREATE TRIGGER guard_period_ack14317 BEFORE INSERT OR UPDATE OF status ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION guard_period_ack14317();

CREATE TRIGGER ledger_boundary136 BEFORE DELETE OR UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION ledger_boundary136();

CREATE TRIGGER scheduled_archive_gate91 BEFORE INSERT OR UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION block_unreviewed_archive91();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION guard_actions113('sec-chart-accounts');

CREATE TRIGGER sync_subaccount_parent14285 AFTER UPDATE OF code, account_type, is_posting ON public.accounts FOR EACH ROW WHEN ((old.is_posting IS FALSE)) EXECUTE FUNCTION sync_subaccount_parent14285();

CREATE TRIGGER capture_report_funds14254 BEFORE INSERT ON public.approved_reports1443 FOR EACH ROW EXECUTE FUNCTION capture_report_funds14254();

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.company_documents105 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER stamp_workspace105 BEFORE INSERT OR UPDATE ON public.company_documents105 FOR EACH ROW EXECUTE FUNCTION stamp_workspace105();

CREATE TRIGGER ojm_postable_submission_20260929 BEFORE INSERT OR UPDATE ON public.entry_submissions FOR EACH ROW EXECUTE FUNCTION ojm_guard_postable_account_20260929('debit_account_id', 'credit_account_id');

CREATE TRIGGER submission_guard14228 BEFORE INSERT OR DELETE OR UPDATE ON public.entry_submissions FOR EACH ROW EXECUTE FUNCTION submission_guard14228();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.entry_submissions FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.fund_adjustment_lines FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER fund_request_guard14228 BEFORE INSERT OR DELETE OR UPDATE ON public.fund_adjustment_requests FOR EACH ROW EXECUTE FUNCTION fund_request_guard14228();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.fund_adjustment_requests FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER guard_hr_calendar14306 BEFORE INSERT OR UPDATE ON public.hr_calendar_events14306 FOR EACH ROW EXECUTE FUNCTION guard_hr_calendar14306();

CREATE TRIGGER guard_hr_calendar14306 BEFORE INSERT OR UPDATE ON public.hr_calendar_settings14306 FOR EACH ROW EXECUTE FUNCTION guard_hr_calendar14306();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.inventory_items104 FOR EACH ROW EXECUTE FUNCTION guard_actions113('inv-items');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.inventory_items104 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER inventory_items_guard104 BEFORE INSERT OR UPDATE ON public.inventory_items104 FOR EACH ROW EXECUTE FUNCTION stamp_inventory_menu104();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.inventory_movements104 FOR EACH ROW EXECUTE FUNCTION guard_actions113('inv-stock-in');

CREATE TRIGGER inventory_movements_guard104 BEFORE INSERT OR DELETE OR UPDATE ON public.inventory_movements104 FOR EACH ROW EXECUTE FUNCTION stamp_inventory_menu104();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION guard_actions113('journal');

CREATE TRIGGER close_opening_setup14234 AFTER INSERT ON public.journal_entries FOR EACH STATEMENT EXECUTE FUNCTION close_opening_setup14234();

CREATE TRIGGER ledger_boundary136 BEFORE INSERT OR DELETE OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION ledger_boundary136();

CREATE CONSTRAINT TRIGGER ledger_integrity14228 AFTER INSERT OR UPDATE ON public.journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_integrity14228();

CREATE TRIGGER scheduled_header_change91 AFTER UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION unreview_scheduled_header91();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION guard_actions113('journal');

CREATE TRIGGER ledger_boundary136 BEFORE INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION ledger_boundary136();

CREATE CONSTRAINT TRIGGER ledger_integrity14228 AFTER INSERT OR DELETE OR UPDATE ON public.journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_integrity14228();

CREATE TRIGGER ledger_lock14228 BEFORE INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION ledger_lock14228();

CREATE TRIGGER ojm_postable_journal_20260929 BEFORE INSERT OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION ojm_guard_postable_account_20260929('account_id');

CREATE TRIGGER scheduled_line_change91 AFTER INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION unreview_scheduled_journal91();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.menu_categories104 FOR EACH ROW EXECUTE FUNCTION guard_actions113('menu-categories');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.menu_categories104 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.menu_ingredients105 FOR EACH ROW EXECUTE FUNCTION guard_actions113('menu-ingredients');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.menu_ingredients105 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER stamp_workspace105 BEFORE INSERT OR UPDATE ON public.menu_ingredients105 FOR EACH ROW EXECUTE FUNCTION stamp_workspace105();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.menu_items104 FOR EACH ROW EXECUTE FUNCTION guard_actions113('menu-recipe');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.menu_items104 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER menu_items_guard104 BEFORE INSERT OR UPDATE ON public.menu_items104 FOR EACH ROW EXECUTE FUNCTION stamp_inventory_menu104();

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.menu_sales108 FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER guard_sales108 BEFORE INSERT OR UPDATE ON public.menu_sales108 FOR EACH ROW EXECUTE FUNCTION guard_sales108();

CREATE TRIGGER budget_link_guard14316 BEFORE INSERT OR UPDATE ON public.operational_reports FOR EACH ROW EXECUTE FUNCTION budget_link_guard14316();

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.operational_reports FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER guard_record83 BEFORE INSERT OR UPDATE ON public.operational_reports FOR EACH ROW EXECUTE FUNCTION guard_payroll_report_record83();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_employees FOR EACH ROW EXECUTE FUNCTION guard_actions113('payroll-employees');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.payroll_employees FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER guard_record83 BEFORE INSERT OR UPDATE ON public.payroll_employees FOR EACH ROW EXECUTE FUNCTION guard_payroll_report_record83();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.payroll_employees FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_leave_records FOR EACH ROW EXECUTE FUNCTION guard_actions113('hr-leaves');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.payroll_leave_records FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER guard_record83 BEFORE INSERT OR UPDATE ON public.payroll_leave_records FOR EACH ROW EXECUTE FUNCTION guard_payroll_report_record83();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION guard_actions113('payroll-entries');

CREATE TRIGGER guard_delete108 BEFORE DELETE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION guard_delete108();

CREATE TRIGGER guard_record83 BEFORE INSERT OR UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION guard_payroll_report_record83();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.period_findings FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER guard_separate_members123 BEFORE INSERT OR UPDATE ON public.restaurant_members121 FOR EACH ROW EXECUTE FUNCTION guard_separate_members123();

CREATE TRIGGER scheduled_occurrence_snapshot92 BEFORE INSERT ON public.scheduled_journal_occurrences FOR EACH ROW EXECUTE FUNCTION snapshot_scheduled_occurrence92();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.scheduled_journals FOR EACH ROW EXECUTE FUNCTION guard_actions113('transactions-recurring');

CREATE TRIGGER scheduled_audit92 AFTER INSERT OR DELETE OR UPDATE ON public.scheduled_journals FOR EACH ROW EXECUTE FUNCTION audit_schedule92();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.scheduled_journals FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION guard_actions113('staff');

CREATE TRIGGER approved_source1443 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION protect_approved_source1443();

CREATE TRIGGER no_duplicate_release136 BEFORE INSERT OR UPDATE OF direction, account_id, fund_account_id, amount ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION no_duplicate_release136();

CREATE TRIGGER ojm_postable_staff_20260929 BEFORE INSERT OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION ojm_guard_postable_account_20260929('account_id', 'fund_account_id');

CREATE TRIGGER protect_linked_workspace_line BEFORE DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION protect_linked_workspace_line();

CREATE TRIGGER staff_rules14228 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION staff_rules14228();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER write_scope14229 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journal_lines FOR EACH ROW EXECUTE FUNCTION workspace_write_scope14229();

CREATE TRIGGER action_guard113 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION guard_actions113('staff');

CREATE TRIGGER approved_journal1443 BEFORE DELETE OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION protect_approved_source1443();

CREATE TRIGGER report_labels_lock14253 BEFORE UPDATE OF report_types14253 ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION report_labels_lock14253();

CREATE TRIGGER submit_route14229 AFTER INSERT OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION submit_route14229();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER write_scope14229 BEFORE INSERT OR DELETE OR UPDATE ON public.staff_journals FOR EACH ROW EXECUTE FUNCTION workspace_write_scope14229();

CREATE TRIGGER sync_subaccount_delete14285 AFTER DELETE ON public.sub_accounts FOR EACH ROW EXECUTE FUNCTION sync_subaccount_posting14285();

CREATE TRIGGER sync_subaccount_write14285 BEFORE INSERT OR UPDATE ON public.sub_accounts FOR EACH ROW EXECUTE FUNCTION sync_subaccount_posting14285();

CREATE TRIGGER guard_ledger_assignment14281 BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION guard_ledger_assignment14281();

CREATE TRIGGER guard_separate_members123 BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION guard_separate_members123();

CREATE TRIGGER organization_structure14229 BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION organization_guard14229();

CREATE TRIGGER validate_user_prefix89 BEFORE INSERT OR UPDATE OF entry_prefix, entry_initials, entry_digits ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION validate_user_prefix89();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.workspace_notifications FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();

CREATE TRIGGER permanent_steps1443 BEFORE INSERT OR DELETE OR UPDATE ON public.workspace_todos136 FOR EACH ROW EXECUTE FUNCTION protect_todo1443();

CREATE TRIGGER workspace_actor_log138 AFTER INSERT OR DELETE OR UPDATE ON public.workspace_todos136 FOR EACH ROW EXECUTE FUNCTION workspace_actor_log138();


-- HOOKS
ALTER ROLE authenticator SET pgrst.db_pre_request='public.account_request_gate14258';

ALTER ROLE authenticator SET pgrst.db_pre_request='public.account_request_gate14258';

SET LOCAL check_function_bodies=on;
NOTIFY pgrst,'reload config';
NOTIFY pgrst,'reload schema';

-- OWNER-ONLY MAINTENANCE TOOLS
-- Install once. Creates owner-only tools; this file never deletes business records.
-- Fresh installation already includes this file. Existing sites may run it independently.

CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.maintenance_backups14322(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),scope text NOT NULL,
 date_from date NOT NULL,date_to date NOT NULL,payload jsonb NOT NULL,
 fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 removed_at timestamptz,executed_by text, CHECK(date_from<=date_to)
);
CREATE TABLE IF NOT EXISTS private.removed_journal_requests14322(
 actor_id uuid NOT NULL,request_key text NOT NULL,backup_id uuid NOT NULL REFERENCES private.maintenance_backups14322(id),
 PRIMARY KEY(actor_id,request_key)
);
REVOKE ALL ON private.maintenance_backups14322,private.removed_journal_requests14322 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.count_tables14322()
RETURNS TABLE(table_name text,record_count bigint,storage_bytes bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r record;BEGIN
 FOR r IN SELECT n.nspname,c.relname,c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname LOOP
  table_name:=r.nspname||'.'||r.relname;
  EXECUTE format('SELECT count(*) FROM %I.%I',r.nspname,r.relname) INTO record_count;
  storage_bytes:=pg_total_relation_size(r.oid); RETURN NEXT;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.maintenance_snapshot14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE ids uuid[];pack jsonb;BEGIN
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_to-p_from>3660 THEN
  RAISE EXCEPTION 'Provide a start date and end date, in that order, spanning at most ten years';END IF;
 IF p_scope='journals' THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO ids FROM public.journal_entries WHERE transaction_date BETWEEN p_from AND p_to;
  SELECT jsonb_build_object(
   'journal_entries',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY id),'[]') FROM public.journal_entries e WHERE id=ANY(ids)),
   'journal_lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY id),'[]') FROM public.journal_lines l WHERE journal_entry_id=ANY(ids)),
   'operation_receipts14228',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY actor_id,request_key),'[]') FROM public.operation_receipts14228 r WHERE operation='journal' AND EXISTS(
     SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.result)='array' THEN r.result ELSE '[]' END) x WHERE x->>'entry_id'=ANY(ids::text[])))
  ) INTO pack;
 ELSIF p_scope='draft-transactions' THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}') INTO ids FROM public.staff_journal_lines WHERE transaction_date BETWEEN p_from AND p_to;
  SELECT jsonb_build_object('staff_journal_lines',coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]')) INTO pack FROM public.staff_journal_lines l WHERE l.id=ANY(ids);
 ELSE RAISE EXCEPTION 'Choose journals or draft-transactions';END IF;
 RETURN pack;
END $$;

CREATE OR REPLACE FUNCTION private.preview_removal14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE pack jsonb:=private.maintenance_snapshot14322(p_scope,p_from,p_to);
 ids uuid[];reasons jsonb:='[]';r record;n bigint;target regclass;
BEGIN
 IF p_scope='journals' THEN
  SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->'journal_entries') x;
  target:='public.journal_entries'::regclass;
  IF EXISTS(SELECT 1 FROM public.journal_entries WHERE id=ANY(ids) AND (source<>'manual' OR correction_status NOT IN ('normal','voided'))) THEN
   reasons:=reasons||jsonb_build_array('Only independent manual journals can be removed here. Use the app workflow for system, staff, payroll or correction entries.');END IF;
  IF EXISTS(SELECT 1 FROM public.journal_lines WHERE journal_entry_id=ANY(ids) AND coalesce(line_date,(SELECT transaction_date FROM public.journal_entries WHERE id=journal_entry_id)) NOT BETWEEN p_from AND p_to) THEN
   reasons:=reasons||jsonb_build_array('A journal has line dates outside the selected range. Whole journals must stay together.');END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_periods p JOIN public.journal_entries e ON date_trunc('month',e.transaction_date)::date=p.period_month WHERE e.id=ANY(ids) AND p.status IN ('closed','locked'))
   OR EXISTS(SELECT 1 FROM public.year_closings136 y JOIN public.journal_entries e ON extract(year FROM e.transaction_date)::integer=y.year WHERE e.id=ANY(ids)) THEN
   reasons:=reasons||jsonb_build_array('Closed periods and year-closing balances cannot be purged by this template.');END IF;
  IF cardinality(ids)>0 AND EXISTS(SELECT 1 FROM public.journal_entries WHERE transaction_date>p_to AND status='posted') THEN
   reasons:=reasons||jsonb_build_array('Later posted journals remain. A verified carry-forward installation is required before removing their earlier balance history.');END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(pack->'operation_receipts14228') receipt CROSS JOIN LATERAL jsonb_array_elements(receipt->'result') x WHERE NOT (x->>'entry_id'=ANY(ids::text[]))) THEN
   reasons:=reasons||jsonb_build_array('A posting batch contains journals outside this range. Expand the dates to include the whole batch.');END IF;
 ELSE
  SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->'staff_journal_lines') x;
  target:='public.staff_journal_lines'::regclass;
  IF EXISTS(SELECT 1 FROM public.staff_journal_lines l JOIN public.staff_journals j ON j.id=l.staff_journal_id WHERE l.id=ANY(ids) AND (j.status NOT IN ('draft','returned') OR l.journal_entry_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.approved_reports1443 WHERE journal_id=j.id))) THEN
   reasons:=reasons||jsonb_build_array('Only unposted transactions in draft or returned, unapproved staff reports can be removed here.');END IF;
  IF EXISTS(SELECT 1 FROM public.staff_journal_lines a JOIN public.staff_journal_lines b ON b.staff_journal_id=a.staff_journal_id AND b.editor_group1437=a.editor_group1437 WHERE a.id=ANY(ids) AND NOT b.id=ANY(ids)) THEN
   reasons:=reasons||jsonb_build_array('A transaction editor group extends outside the dates. Expand the range to keep the group together.');END IF;
 END IF;
 -- Detect incoming relationships, including ON DELETE CASCADE links: do not silently delete their parents or reports.
 FOR r IN SELECT c.conname,n.nspname,t.relname,a.attname,cardinality(c.conkey) AS columns
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1]
 WHERE c.contype='f' AND c.confrelid=target AND NOT (p_scope='journals' AND c.conrelid='public.journal_lines'::regclass)
 LOOP
  IF r.columns<>1 AND cardinality(ids)>0 THEN reasons:=reasons||jsonb_build_array('Composite relationship requires review: '||r.conname);CONTINUE;END IF;
  EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I=ANY($1)',r.nspname,r.relname,r.attname) INTO n USING ids;
  IF n>0 THEN reasons:=reasons||jsonb_build_array(format('%s linked records in %s.%s (%s)',n,r.nspname,r.relname,r.conname));END IF;
 END LOOP;
 RETURN jsonb_build_object('scope',p_scope,'from',p_from,'to',p_to,'records',cardinality(ids),'counts',
  (SELECT jsonb_object_agg(key,jsonb_array_length(value)) FROM jsonb_each(pack)),
  'fingerprint',encode(extensions.digest(pack::text,'sha256'),'hex'),'blockers',reasons,'canRemove',jsonb_array_length(reasons)=0 AND cardinality(ids)>0);
END $$;

CREATE OR REPLACE FUNCTION private.export_removal_backup14322(p_scope text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE pack jsonb:=private.maintenance_snapshot14322(p_scope,p_from,p_to);b private.maintenance_backups14322;BEGIN
 INSERT INTO private.maintenance_backups14322(scope,date_from,date_to,payload,fingerprint)
 VALUES(p_scope,p_from,p_to,pack,encode(extensions.digest(pack::text,'sha256'),'hex')) RETURNING * INTO b;
 RETURN jsonb_build_object('format','oonjai-maintenance14322','backupId',b.id,'createdAt',b.created_at,'scope',p_scope,'from',p_from,'to',p_to,'fingerprint',b.fingerprint,'tables',pack,
 'includes','Selected rows only. Keep the full application archive plus Auth and Storage backups separately.');
END $$;

CREATE OR REPLACE FUNCTION private.remove_backed_up_records14322(p_scope text,p_from date,p_to date,p_confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE b private.maintenance_backups14322;preview jsonb;pack jsonb;ids uuid[];g record;r record;guards jsonb:='[]';removed integer;
BEGIN
 IF p_confirmation IS DISTINCT FROM 'I_SAVED_THE_BACKUP' THEN RAISE EXCEPTION 'Save the exported backup file first, then replace NOT_CONFIRMED with I_SAVED_THE_BACKUP';END IF;
 -- Freeze application writes for this short maintenance transaction. Deterministic lock order.
 FOR r IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY 1,2 LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',r.nspname,r.relname);
 END LOOP;
 SELECT * INTO b FROM private.maintenance_backups14322 WHERE scope=p_scope AND date_from=p_from AND date_to=p_to AND removed_at IS NULL ORDER BY created_at DESC,id LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Export and save a matching date-range backup first';END IF;
 preview:=private.preview_removal14322(p_scope,p_from,p_to);
 IF NOT (preview->>'canRemove')::boolean THEN RAISE EXCEPTION 'Removal blocked: %',preview->'blockers';END IF;
 IF preview->>'fingerprint' IS DISTINCT FROM b.fingerprint THEN RAISE EXCEPTION 'Records changed after export. Export and save a new backup, then retry';END IF;
 pack:=b.payload;
 SELECT coalesce(array_agg((x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(pack->CASE WHEN p_scope='journals' THEN 'journal_entries' ELSE 'staff_journal_lines' END) x;
 -- SQL Editor has no application JWT. Suspend only application triggers on the selected tables.
 -- Incoming foreign keys remain enabled. Trigger state is restored before commit; failure rolls everything back.
 FOR g IN SELECT n.nspname,c.relname,t.tgname,t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal AND t.tgenabled<>'D' AND t.tgrelid=ANY(CASE WHEN p_scope='journals' THEN ARRAY['public.journal_entries'::regclass,'public.journal_lines'::regclass] ELSE ARRAY['public.staff_journal_lines'::regclass] END) ORDER BY 1,2,3 LOOP
  guards:=guards||jsonb_build_array(to_jsonb(g));EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I',g.nspname,g.relname,g.tgname);
 END LOOP;
 IF p_scope='journals' THEN
  INSERT INTO private.removed_journal_requests14322(actor_id,request_key,backup_id)
   SELECT (x->>'actor_id')::uuid,x->>'request_key',b.id FROM jsonb_array_elements(pack->'operation_receipts14228') x ON CONFLICT DO NOTHING;
  DELETE FROM public.journal_lines WHERE journal_entry_id=ANY(ids);
  DELETE FROM public.journal_entries WHERE id=ANY(ids);GET DIAGNOSTICS removed=ROW_COUNT;
 ELSE DELETE FROM public.staff_journal_lines WHERE id=ANY(ids);GET DIAGNOSTICS removed=ROW_COUNT;END IF;
 FOR g IN SELECT value AS data FROM jsonb_array_elements(guards) LOOP
  EXECUTE format('ALTER TABLE %I.%I ENABLE %s TRIGGER %I',g.data->>'nspname',g.data->>'relname',CASE g.data->>'tgenabled' WHEN 'A' THEN 'ALWAYS' WHEN 'R' THEN 'REPLICA' ELSE '' END,g.data->>'tgname');
 END LOOP;
 UPDATE private.maintenance_backups14322 SET removed_at=now(),executed_by=current_user,payload='{}'::jsonb WHERE id=b.id;
 INSERT INTO public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 VALUES('maintenance',b.id::text,'DATE_RANGE_DELETE',jsonb_build_object('backupId',b.id,'fingerprint',b.fingerprint),preview||jsonb_build_object('removed',removed,'databaseRole',current_user),
 'SQL Editor maintenance after exported backup; original identifiers and numbering sequences preserved',NULL);
 RETURN preview||jsonb_build_object('removed',removed,'backupId',b.id,'databaseRole',current_user);
END $$;

REVOKE ALL ON FUNCTION private.count_tables14322(),private.maintenance_snapshot14322(text,date,date),private.preview_removal14322(text,date,date),private.export_removal_backup14322(text,date,date),private.remove_backed_up_records14322(text,date,date,text) FROM PUBLIC,anon,authenticated,service_role;

-- Retain posting receipts, and reject retries of explicitly removed batches.
CREATE OR REPLACE FUNCTION public.post_journal_batch14228(p_request_key text, p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE actor uuid:=auth.uid();receipt public.operation_receipts14228;entry jsonb;saved record;result jsonb:='[]';
BEGIN
 IF EXISTS(SELECT 1 FROM private.removed_journal_requests14322 WHERE actor_id=auth.uid() AND request_key=p_request_key) THEN RAISE EXCEPTION 'This journal batch was archived and permanently removed. Create a new entry with a new save reference';END IF;
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal posting permission required' USING ERRCODE='42501';END IF;
 IF p_request_key IS NULL OR length(p_request_key) NOT BETWEEN 10 AND 200 THEN RAISE EXCEPTION 'A stable posting reference is required';END IF;
 IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Posting entries must be an array';END IF;
 IF jsonb_array_length(p_entries) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Provide 1 to 100 posting dates';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_key,0));
 SELECT * INTO receipt FROM operation_receipts14228 WHERE actor_id=actor AND request_key=p_request_key;
 IF FOUND THEN
  IF receipt.operation<>'journal' OR receipt.payload IS DISTINCT FROM p_entries THEN RAISE EXCEPTION 'Posting reference already used for different data';END IF;
  RETURN receipt.result;
 END IF;
 -- Preflight every date and lock periods in consistent order before inserting headers.
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) ORDER BY value->>'p_transaction_date' LOOP
  PERFORM public.validate_journal14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines');
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
  SELECT * INTO saved FROM public.post_manual_worker14228((entry->>'p_transaction_date')::date,entry->>'p_memo',entry->'p_lines',coalesce(entry->>'p_prefix','OJM'),coalesce((entry->>'p_digits')::integer,6));
  result:=result||jsonb_build_array(jsonb_build_object('date',entry->>'p_transaction_date','entry_id',saved.entry_id,'entry_no',saved.entry_no));
 END LOOP;
 INSERT INTO operation_receipts14228(actor_id,request_key,operation,payload,result) VALUES(actor,p_request_key,'journal',p_entries,result);
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.journal_receipt14228(p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r public.operation_receipts14228;
BEGIN
 IF EXISTS(SELECT 1 FROM private.removed_journal_requests14322 WHERE actor_id=auth.uid() AND request_key=p_request_key) THEN RAISE EXCEPTION 'This journal batch was archived and permanently removed. Create a new entry with a new save reference';END IF;
 IF NOT public.can_action113('journal','post') THEN RAISE EXCEPTION 'Current journal permission required';END IF;
 SELECT * INTO r FROM operation_receipts14228 WHERE actor_id=auth.uid() AND request_key=p_request_key AND operation='journal';
 IF NOT FOUND THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('payload',r.payload,'result',r.result);
END $function$
;


-- Edge handlers verify the caller profile using the backend role.
GRANT SELECT ON public.profiles TO service_role;
COMMIT;

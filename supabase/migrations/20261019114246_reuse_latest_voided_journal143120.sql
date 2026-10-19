-- Only an explicit final audit deletion releases a latest manual journal ID.
-- The sequence stays monotonic; historical UUIDs and deletion archives are retained.
CREATE TABLE private.reusable_journal_ids143120 (
 entry_no text PRIMARY KEY, original_entry uuid NOT NULL, entry_date date NOT NULL,
 released_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.reusable_journal_ids143120 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.reusable_journal_ids143120 FROM PUBLIC, anon, authenticated;
CREATE FUNCTION private.reusable_journal_ids143120(p_prefix text,p_date date,p_digits integer)
RETURNS TABLE(entry_no text,number bigint) LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT r.entry_no,n.number FROM private.reusable_journal_ids143120 r
 CROSS JOIN LATERAL (SELECT CASE WHEN substring(r.entry_no from length(p_prefix)+3) ~ '^[0-9]{1,18}$' THEN substring(r.entry_no from length(p_prefix)+3)::bigint END number) n
 WHERE extract(year from r.entry_date)=extract(year from p_date)
 AND r.entry_no=private.format_entry_id143114(p_prefix,p_date,n.number,p_digits)
 AND NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.entry_no=r.entry_no)
 ORDER BY n.number;
$$;
REVOKE ALL ON FUNCTION private.reusable_journal_ids143120(text,date,integer) FROM PUBLIC,anon,authenticated;

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
  
  v_prefix := left(coalesce(nullif(v_prefix,''),'OJM'),8);
  v_digits := greatest(3,least(9,coalesce(p_digits,6)));

  PERFORM pg_advisory_xact_lock(143120,1);
  -- Sequence allocation and collision retry also skip headers left by older,
  -- non-atomic posting attempts.
  loop
    v_attempt := v_attempt + 1;
    if v_attempt>1000 then raise exception 'Unable to allocate a unique journal number'; end if;
    SELECT r.entry_no INTO v_entry_no FROM private.reusable_journal_ids143120(v_prefix,p_transaction_date,v_digits) r LIMIT 1;
    IF v_entry_no IS NOT NULL THEN
      DELETE FROM private.reusable_journal_ids143120 r WHERE r.entry_no=v_entry_no;
    ELSE
      v_entry_no := private.format_entry_id143114(v_prefix,p_transaction_date,nextval('public.journal_entry_number_seq'),v_digits);
    END IF;
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
      journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak
    ) values(
      v_entry_id,v_line_no,(v_line->>'account_id')::uuid,
      coalesce(v_line->>'description',p_memo),v_line->>'currency_code',
      v_debit,v_credit,coalesce(nullif(v_line->>'line_date','')::date,p_transaction_date),nullif(v_line->>'fx_rate_lak','')::numeric,nullif(v_line->>'book_rate_lak','')::numeric
    );
  end loop;

  insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id)
  values('journal_entries',v_entry_id::text,'POST',jsonb_build_object('entry_no',v_entry_no,'line_count',v_line_no),'Atomic manual journal posting',auth.uid());

  return query select v_entry_id,v_entry_no;
end $function$

;
CREATE OR REPLACE FUNCTION public.preview_journal_number143114(p_date date, p_prefix text DEFAULT 'OJM'::text, p_digits integer DEFAULT 6)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE next_number bigint; prefix text; digits integer; attempts integer:=0; reusable bigint;
BEGIN
 IF NOT public.can_action113('journal','view') THEN RAISE EXCEPTION 'Journal access required' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN is_called THEN last_value+1 ELSE last_value END INTO next_number FROM public.journal_entry_number_seq;
 prefix:=left(coalesce(nullif(upper(regexp_replace(coalesce(nullif(trim(p_prefix),''),'OJM'),'[^A-Za-z0-9]','','g')),''),'OJM'),8);
 digits:=greatest(3,least(9,coalesce(p_digits,6)));
 SELECT r.number INTO reusable FROM private.reusable_journal_ids143120(prefix,p_date,digits) r LIMIT 1;
 IF reusable IS NOT NULL THEN RETURN reusable; END IF;
 WHILE EXISTS(SELECT 1 FROM public.journal_entries WHERE entry_no=private.format_entry_id143114(prefix,p_date,next_number,digits)) LOOP
  next_number:=next_number+1;attempts:=attempts+1;
  IF attempts>1000 THEN RAISE EXCEPTION 'Unable to preview a unique journal number'; END IF;
 END LOOP;
 RETURN next_number;
END $function$

;
CREATE OR REPLACE FUNCTION public.purge_voided_after_audit14260()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE target uuid;state text; released public.journal_entries; latest boolean;
BEGIN
 IF OLD.table_name IS DISTINCT FROM 'journal_entries' OR
    OLD.record_id IS NULL OR OLD.record_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN RETURN OLD; END IF;
 -- Audit deletion is administrator-only. A maintenance SQL cleanup uses its
 -- own explicit, separate script rather than silently purging journal records.
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RETURN OLD; END IF;
 PERFORM pg_advisory_xact_lock(143120,1);
 target:=OLD.record_id::uuid;
 SELECT status::text INTO state FROM public.journal_entries WHERE id=target FOR UPDATE;
 IF state IS DISTINCT FROM 'voided' THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE table_name='journal_entries' AND record_id=target::text) THEN RETURN OLD; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_journal_lines WHERE journal_entry_id=target) THEN
  RAISE EXCEPTION 'Voided journal remains linked to a sub-user report. Audit deletion rolled back.';
 END IF;
 -- Any other foreign-key references remain authoritative: a failed DELETE
 -- rolls back the audit deletion too. No CASCADE or trigger disabling.
 SELECT * INTO released FROM public.journal_entries WHERE id=target;
 latest:=released.source='manual' AND NOT EXISTS(
  SELECT 1 FROM public.journal_entries e WHERE e.source='manual' AND e.id<>target
  AND (e.created_at,length(e.entry_no),e.entry_no)>(released.created_at,length(released.entry_no),released.entry_no));
 -- Freeze the complete voided entry before removing its lines. Failure rolls back the delete.
 INSERT INTO public.record_deletions108(table_name,record_id,record_data)
 SELECT 'journal_entries',e.id,jsonb_build_object('entry',to_jsonb(e),'lines',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.line_no),'[]') FROM public.journal_lines l WHERE l.journal_entry_id=e.id),'accounts',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.code),'[]') FROM public.accounts a WHERE a.id IN (SELECT account_id FROM public.journal_lines WHERE journal_entry_id=e.id)),'last_audit',to_jsonb(OLD),'archive_reason','Voided journal removed after its final audit record') FROM public.journal_entries e WHERE e.id=target;
 DELETE FROM public.journal_lines WHERE journal_entry_id=target;
 DELETE FROM public.journal_entries WHERE id=target AND status::text='voided';
 IF latest THEN
  INSERT INTO private.reusable_journal_ids143120(entry_no,original_entry,entry_date)
  VALUES(released.entry_no,released.id,released.transaction_date) ON CONFLICT(entry_no) DO NOTHING;
 END IF;
 RETURN OLD;
END $function$

;

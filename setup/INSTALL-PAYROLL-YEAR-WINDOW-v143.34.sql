-- Read-only payroll windows plus compact historic leave usage.
-- Uses the caller's existing RLS permissions; changes no payroll or journal rows.
BEGIN;
CREATE OR REPLACE FUNCTION public.payroll_window14334(p_from date,p_to date,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE records jsonb; carry jsonb:='[]'; revision text; history_index jsonb:='[]';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_from>p_to OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'Invalid payroll period'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]') INTO records FROM (
  SELECT * FROM public.payroll_runs
  WHERE jsonb_typeof(data->'rows')='array' AND coalesce(data->>'month',to_char(period_start,'YYYY-MM')) BETWEEN to_char(p_from,'YYYY-MM') AND to_char(p_to,'YYYY-MM')
  ORDER BY period_start DESC,id LIMIT 200 OFFSET p_offset
 ) r;
 IF p_offset=0 THEN
  -- Dates are retained because each employee has a different entitlement renewal date.
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') INTO carry FROM (
   SELECT r.id AS "runId",result->>'employeeId' AS "employeeId",r.data->>'month' AS month,
    day->>'date' AS date,day->>'leaveType' AS type,
    sum(coalesce((day->>'scheduleFraction')::numeric,1)) AS days
   FROM public.payroll_runs r
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.data->'results')='array' THEN r.data->'results' ELSE '[]'::jsonb END) result
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(result->'attendance95')='array' THEN result->'attendance95' ELSE '[]'::jsonb END) day
   WHERE r.data->>'status'='finalized'
    AND NOT(coalesce(r.data->>'month',to_char(r.period_start,'YYYY-MM')) BETWEEN to_char(p_from,'YYYY-MM') AND to_char(p_to,'YYYY-MM'))
    AND coalesce(day->>'linked','false') IN ('false','0','')
    AND day->>'leaveType' IS NOT NULL
   GROUP BY r.id,result->>'employeeId',r.data->>'month',day->>'date',day->>'leaveType'
  ) x;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'month',data->>'month','status',data->>'status','employees',(SELECT coalesce(jsonb_agg(e->>'employeeId'),'[]') FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'rows')='array' THEN data->'rows' ELSE '[]'::jsonb END) e))),'[]') INTO history_index FROM public.payroll_runs;
 SELECT md5(coalesce(sum(hashtextextended(concat_ws('|',id,version,updated_at,data::text),0)::numeric)::text,'0')) INTO revision FROM public.payroll_runs;
 RETURN jsonb_build_object('rows',records,'carry',carry,'index',CASE WHEN p_offset=0 THEN history_index ELSE '[]'::jsonb END,'revision',revision);
END $$;
REVOKE ALL ON FUNCTION public.payroll_window14334(date,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.payroll_window14334(date,date,integer) TO authenticated;
COMMIT;

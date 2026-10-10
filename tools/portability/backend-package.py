#!/usr/bin/env python3
"""Build a clean schema installer from the verified server, without bookkeeping data."""
import argparse,hashlib,json,os,pathlib,re,subprocess,sys,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
def run(args,env):
    # Credentials are supplied through PG environment variables, never CLI arguments.
    result=subprocess.run(args,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if result.returncode: raise RuntimeError('PostgreSQL command failed. Check the connection, permissions and client version. Credentials and raw server messages are withheld.')
    return result.stdout

def contracts():
    source='\n'.join(p.read_text() for p in (ROOT/'scripts').glob('*.js') if not p.name.startswith('desktop14245-'))
    calls=set(re.findall(r"(?:\.rpc|\brpc|\bread)\(['\"]([a-zA-Z0-9_]+)['\"]",source))
    calls.discard('standalone') # Browser-local audit storage namespace, not a backend RPC.
    calls.discard('recipe_view113') # Restaurant feature explicitly belongs to the separate app.
    return sorted(calls)

def validate(sql):
    names=set(re.findall(r'(?i)CREATE(?: OR REPLACE)? FUNCTION (?:public\.)?([a-z0-9_]+)\s*\(',sql))
    missing=sorted(set(contracts())-names)
    if missing: raise RuntimeError('Schema is missing client functions: '+', '.join(missing))
    for table in ['profiles','user_permissions','business_settings','accounts','journal_entries','journal_lines','staff_journals','staff_journal_lines','payroll_employees','payroll_runs','operational_reports']:
        if not re.search(r'(?i)CREATE TABLE(?: IF NOT EXISTS)? (?:\"?public\"?\.)\"?'+table+r'\"?\b',sql): raise RuntimeError('Schema is missing '+table)
    if not re.search(r'(?i)ENABLE ROW LEVEL SECURITY',sql) or not re.search(r'(?i)GRANT ',sql): raise RuntimeError('Security policies and grants must be included')
    if re.search(r'(?im)^COPY |^INSERT INTO ',sql): raise RuntimeError('A fresh installer must contain schema only, without source records')

def export(output):
    env=dict(os.environ)
    if not all(env.get(k) for k in ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD']): raise RuntimeError('Set PGHOST, PGDATABASE, PGUSER and PGPASSWORD privately in your terminal first')
    # Keep ACLs and RLS: --no-privileges would silently remove the access rules.
    sql=run(['pg_dump','--schema-only','--no-owner','--schema=public','--schema=private','--no-comments'],env)
    validate(sql)
    sql=re.sub(r'CREATE SCHEMA (public|private);',r'CREATE SCHEMA IF NOT EXISTS \1;',sql)
    output.mkdir(parents=True,exist_ok=False)
    (output/'001-foundation.sql').write_text(sql)
    for order,name in enumerate(['INSTALL-PORTABILITY-v143.20.sql','INSTALL-EDGE-SERVICES-v143.20.sql'],2):
        (output/(f'{order:03d}-'+name)).write_text((ROOT/'setup'/name).read_text())
    manifest={'format':'accounting-schema-package14320','sourceRecordsIncluded':False,'authUsersIncluded':False,'requiredFunctions':contracts(),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.glob('*.sql'))}}
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Verified schema package created. Restore it into a disposable Supabase project and run the acceptance checklist before distribution.')

def install_clean(directory):
    manifest=json.loads((directory/'manifest.json').read_text())
    for name,digest in manifest['files'].items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest: raise RuntimeError('Package integrity check failed: '+name)
    sql=(directory/'001-Install-Empty-Database.sql').read_text()
    validate_clean(sql)
    env=dict(os.environ)
    if not all(env.get(k) for k in ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD']): raise RuntimeError('Set the new project connection privately using PG environment variables')
    run(['psql','-X','--set=ON_ERROR_STOP=1','-f',str(directory/'001-Install-Empty-Database.sql')],env)
    print('Complete backend installed. Create/confirm the first Auth user, then edit and run 002-Create-First-Administrator.sql.')

def validate_clean(sql):
    names=set(re.findall(r'(?i)CREATE(?: OR REPLACE)? FUNCTION (?:public\.)?([a-z0-9_]+)\s*\(',sql))
    missing=sorted(set(contracts())-names)
    if missing: raise RuntimeError('Schema is missing client functions: '+', '.join(missing))
    for table in ['profiles','user_permissions','business_settings','accounts','journal_entries','journal_lines','staff_journals','staff_journal_lines','payroll_employees','payroll_runs','operational_reports']:
        if not re.search(r'(?i)CREATE TABLE(?: IF NOT EXISTS)? \"?public\"?\.\"?'+table+r'\"?\s*\(',sql): raise RuntimeError('Schema is missing '+table)
    if not all(x in sql for x in ['Fresh installation requires empty','ENABLE ROW LEVEL SECURITY','REVOKE ALL','storage.buckets','CREATE TRIGGER','pgrst.db_pre_request','maintenance_backups14322']): raise RuntimeError('Clean installation structure or security is incomplete')

def install(directory):
    manifest=json.loads((directory/'manifest.json').read_text())
    if manifest.get('format')=='accounting-clean-backend14322': return install_clean(directory)
    if manifest.get('format')!='accounting-schema-package14320': raise RuntimeError('Unsupported package')
    files=manifest.get('files',{})
    if set(files)!={'001-foundation.sql','002-INSTALL-PORTABILITY-v143.20.sql','003-INSTALL-EDGE-SERVICES-v143.20.sql'}: raise RuntimeError('Invalid migration order')
    for name,digest in files.items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest: raise RuntimeError('Package integrity check failed: '+name)
    validate((directory/'001-foundation.sql').read_text())
    env=dict(os.environ)
    if not env.get('PGHOST') or not env.get('PGPASSWORD'): raise RuntimeError('Set the fresh target connection privately in PG environment variables')
    existing=run(['psql','-X','-At','--set=ON_ERROR_STOP=1','-c',"SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')"],env).strip()
    if existing!='0': raise RuntimeError('Target public schema contains tables. Fresh installation refuses to overwrite an existing database')
    # One transaction: a failed schema restore cannot leave a half-installed app.
    with tempfile.NamedTemporaryFile(mode='w',suffix='.sql',delete=False) as bundle:
        for name in sorted(files):
            text=(directory/name).read_text()
            bundle.write(re.sub(r'(?im)^\s*(?:BEGIN|COMMIT);\s*$', '', text)+'\n')
        bundle_path=pathlib.Path(bundle.name)
    try: run(['psql','-X','--single-transaction','--set=ON_ERROR_STOP=1','-f',str(bundle_path)],env)
    finally: bundle_path.unlink(missing_ok=True)
    print('Fresh schema installed. Create the first Auth administrator, bootstrap their profile, then deploy the functions and configure the website.')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['export','install','validate']);parser.add_argument('path',type=pathlib.Path);args=parser.parse_args()
    try:
        if args.action=='export': export(args.path)
        elif args.action=='install': install(args.path)
        else:
            sql=args.path.read_text()
            (validate_clean if 'complete clean backend' in sql else validate)(sql)
            print('Schema contracts validated')
    except (RuntimeError,OSError,ValueError) as error: print(str(error),file=sys.stderr);return 1
    return 0
if __name__=='__main__': sys.exit(main())

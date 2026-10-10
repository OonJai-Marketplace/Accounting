"""Tests package integrity and installation guards without connecting to any server."""
import importlib.util,json,os,pathlib,tempfile,unittest
from unittest.mock import patch
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('backend',ROOT/'tools/portability/backend-package.py');backend=importlib.util.module_from_spec(spec);spec.loader.exec_module(backend)
def fixture():
    tables=['profiles','user_permissions','business_settings','accounts','journal_entries','journal_lines','staff_journals','staff_journal_lines','payroll_employees','payroll_runs','operational_reports']
    return 'CREATE SCHEMA public;\nCREATE SCHEMA private;\n'+'\n'.join('CREATE TABLE public.'+t+' (id uuid);' for t in tables)+'\n'+'\n'.join('CREATE FUNCTION public.'+f+"() RETURNS boolean LANGUAGE sql AS $$SELECT true$$;" for f in backend.contracts())+'\nALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\nGRANT SELECT ON public.profiles TO authenticated;\n'
class PackageTests(unittest.TestCase):
    def test_incomplete_foundation_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError,'missing client functions'):backend.validate('CREATE TABLE public.profiles(id uuid);')
    def test_data_and_missing_grants_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError,'without source records'):backend.validate(fixture()+'INSERT INTO public.profiles VALUES(NULL);')
        with self.assertRaisesRegex(RuntimeError,'Security policies'):backend.validate(fixture().replace('GRANT SELECT ON public.profiles TO authenticated;',''))
    def test_export_preserves_security_and_uses_environment_credentials(self):
        with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,{'PGHOST':'fixture','PGDATABASE':'postgres','PGUSER':'postgres','PGPASSWORD':'test-only'}),patch.object(backend,'run',return_value=fixture()) as run:
            out=pathlib.Path(tmp)/'package';backend.export(out);args,env=run.call_args.args
            self.assertIn('--schema-only',args);self.assertNotIn('--no-privileges',args);self.assertNotIn('test-only',' '.join(args));self.assertEqual(env['PGPASSWORD'],'test-only');self.assertIn('IF NOT EXISTS public',(out/'001-foundation.sql').read_text());self.assertFalse(json.loads((out/'manifest.json').read_text())['sourceRecordsIncluded'])
    def make_package(self,out):
        with patch.dict(os.environ,{'PGHOST':'fixture','PGDATABASE':'postgres','PGUSER':'postgres','PGPASSWORD':'test-only'}),patch.object(backend,'run',return_value=fixture()):backend.export(out)
    def test_checksums_and_existing_database_guard(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=pathlib.Path(tmp)/'package';self.make_package(out)
            with patch.dict(os.environ,{'PGHOST':'fixture','PGPASSWORD':'test-only'}),patch.object(backend,'run',return_value='1'):
                with self.assertRaisesRegex(RuntimeError,'refuses to overwrite'):backend.install(out)
            with (out/'001-foundation.sql').open('a') as f:f.write('--changed')
            with self.assertRaisesRegex(RuntimeError,'integrity'):backend.install(out)
    def test_restore_is_one_transaction_without_nested_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=pathlib.Path(tmp)/'package';self.make_package(out);calls=[]
            def run(args,env):
                calls.append(args)
                if '-c' in args:return '0'
                text=pathlib.Path(args[args.index('-f')+1]).read_text();self.assertNotIn('\nCOMMIT;',text);self.assertIn('--single-transaction',args);self.assertIn('save_installation14320',text);return ''
            with patch.dict(os.environ,{'PGHOST':'fixture','PGPASSWORD':'test-only'}),patch.object(backend,'run',side_effect=run):backend.install(out)
            self.assertEqual(len(calls),2)
if __name__=='__main__':unittest.main()

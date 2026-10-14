#!/usr/bin/env python3
"""Package all deployable assets with neutral configuration and only current setup files."""
import argparse,hashlib,json,pathlib,re,subprocess,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
def build(target):
    version_source=(ROOT/'src/core/sync/offline14239.js').read_text()
    version=re.search(r"const SHELL_VERSION='([0-9]+\.[0-9]+)'",version_source)
    if not version:raise RuntimeError('Current application release is missing')
    release=version.group(1)
    manifest=json.loads((ROOT/'setup/fresh/manifest.json').read_text())
    order=manifest.get('installationOrder',[])
    if not order or set(order)!=set(manifest.get('files',{})) or len(order)!=len(set(order)):
        raise RuntimeError('Fresh installation order and checksums must agree')
    for name in order:
        if pathlib.PurePosixPath(name).name!=name or not name.endswith('.sql'):
            raise RuntimeError('Invalid fresh installation filename')
        if hashlib.sha256((ROOT/'setup/fresh'/name).read_bytes()).hexdigest()!=manifest['files'][name]:
            raise RuntimeError('Fresh installer checksum mismatch: '+name)
    numbered=', '.join(name.split('-')[0] for name in order)
    # Offline installation must not request a setup asset omitted from the ZIP.
    # Keep those exact referenced scripts as compatibility resources; START-HERE
    # still defines the clean installation sequence.
    worker_sources='\n'.join((ROOT/name).read_text() for name in ('desktop-sw14242.js','phone-sw.js','sw14239.js','offline-assets14239.js'))
    offline_setup=set(re.findall(r'[\"\'](setup/[^\"\'?]+\.sql)(?:\?[^\"\']*)?[\"\']',worker_sources))
    tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
    files=[]
    for name in tracked:
        if not name:continue
        p=pathlib.PurePosixPath(name)
        if p.parts[0]=='validation' and name not in ('validation/test-fresh-backend14322.cjs','validation/platform14322.sql','validation/fresh-backend14322-results.json'):continue
        if p.parts[0] in ('archive','history') or '__pycache__' in p.parts or name.endswith('.zip'):continue
        if p.parts[0]=='setup' and not (name.startswith(('setup/fresh/','setup/maintenance/')) or name in offline_setup or name in ('setup/README.txt','setup/INSTALL-BACKEND-AND-MAINTENANCE-v143.22.sql')):continue
        if name.startswith('docs/history/'):continue
        files.append(name)
    payload={name:(ROOT/name).read_bytes() for name in files}
    missing=offline_setup-set(payload)
    if missing:raise RuntimeError('Offline setup assets missing from package: '+', '.join(sorted(missing)))
    payload['deployment-config.js']=(ROOT/'deployment-config.example.js').read_bytes()
    payload['README.txt']=(f'OON JAI ACCOUNTING — PORTABLE INSTALLATION v{release}\n\n'
      'Start at setup/fresh/START-HERE.md for a new Supabase project.\n'
      f'Included SQL files: {numbered}. Follow setup/fresh/START-HERE.md for required and optional steps.\n'
      'SQL maintenance templates are separated in setup/maintenance/.\n'
      'The website connection file is intentionally empty. Open setup.html to configure it.\n'
      'Upload all web folders and files to your new GitHub repository and publish its root.\n'
      'The complete protocol will be supplied separately.\n').encode()
    payload['DATABASE-README.txt']=('NEW DATABASE: setup/fresh/START-HERE.md.\n'
      f'Included files: {numbered}; follow setup/fresh/START-HERE.md for required and optional steps.\n'
      'SQL MAINTENANCE: setup/maintenance/START-HERE.md.\n'
      'Hosted Auth, Edge secrets, SMTP and service ownership use their own account settings.\n').encode()
    payload['setup/README.txt']=(f'NEW PROJECT: follow fresh/START-HERE.md; included numbered files: {numbered}.\n'
      'MAINTENANCE: maintenance/START-HERE.md; choose one add/edit/read/backup/delete file.\n'
      'EXISTING SITE ONLY: INSTALL-BACKEND-AND-MAINTENANCE-v143.22.sql.\n').encode()
    # Include the actual local acceptance result without shipping fixture database installers.
    results=ROOT/'validation/fresh-backend14322-results.json'
    if results.exists():payload[f'docs/FRESH-BACKEND-TEST-RESULTS-v{release}.json']=results.read_bytes()
    sha={n:hashlib.sha256(data).hexdigest() for n,data in sorted(payload.items())}
    payload['PACKAGE-CHECKSUMS.json']=(json.dumps({'release':release,'emptyConnectionConfiguration':True,'files':sha},indent=2)+'\n').encode()
    target.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(payload.items()):z.writestr('Oon-Jai-Accounting/'+name,data)
    with zipfile.ZipFile(target) as z:
        if z.testzip():raise RuntimeError('ZIP integrity failure')
        for name,digest in sha.items():
            if hashlib.sha256(z.read('Oon-Jai-Accounting/'+name)).hexdigest()!=digest:raise RuntimeError('ZIP content mismatch: '+name)
        config=z.read('Oon-Jai-Accounting/deployment-config.js').decode()
        if 'supabase.co' in config or 'OonJai-Marketplace' in config:raise RuntimeError('Source deployment connection leaked into ZIP')
        historical=[n for n in z.namelist() if '/setup/' in n and any(x in n for x in ['ONE-TIME','FIX-','REPAIR-'])]
        if historical:raise RuntimeError('Historical repair/cleanup files entered clean release')
    print(json.dumps({'zip':str(target.resolve()),'files':len(payload),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'checks':'CRC, per-file SHA-256, neutral configuration, historical SQL exclusion'},indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('output',type=pathlib.Path);build(parser.parse_args().output)

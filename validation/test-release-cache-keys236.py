import importlib.util
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release_tool', 'tools/refresh-release-manifest.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    module.ROOT = root
    (root/'scripts').mkdir()
    asset = root/'scripts/payroll.js'
    asset.write_text('old')
    worker = 'const FILES=["scripts/payroll.js?v=1.1"];'
    for name in ('desktop-sw14242.js', 'phone-sw.js'):
        (root/name).write_text(worker)
    previous = {'scripts/payroll.js': b'old', 'desktop-sw14242.js': worker.encode(), 'phone-sw.js': worker.encode()}
    def git(args, **kwargs):
        if args[1] == 'rev-parse':
            return subprocess.CompletedProcess(args, 0, b'head', b'')
        content = previous.get(args[2].removeprefix('HEAD:'))
        return subprocess.CompletedProcess(args, int(content is None), content or b'', b'')
    with patch.object(module.subprocess, 'run', git):
        module.check_changed_cache_keys()
        asset.write_text('new')
        try:
            module.check_changed_cache_keys()
        except ValueError as error:
            assert 'Changed cached asset keeps its old URL' in str(error)
        else:
            raise AssertionError('A changed file reused its old cache key')
        for name in ('desktop-sw14242.js', 'phone-sw.js'):
            (root/name).write_text(worker.replace('v=1.1', 'v=1.2'))
        module.check_changed_cache_keys()
print('PASS unchanged asset reuse, rejected stale cache key and fresh versioned URLs.')

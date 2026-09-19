"""Compile only the pure selector; production orchestration cannot execute."""
import ast
from pathlib import Path
import unittest
tree=ast.parse(Path(__file__).with_name('resume-erpnext-database.py').read_text())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='active_site_credentials')
scope={}
exec(compile(ast.Module(body=[function],type_ignores=[]),'selector','exec'),scope)
select=scope['active_site_credentials']
class ActiveSiteTests(unittest.TestCase):
 def test_legacy_first_cannot_mask_active_account(self):
  result=select({'frontend':{'db_name':'legacy','db_password':'invalid-test-only'},'ops.kecktech.net':{'db_name':'active','db_password':'test-only'}})
  self.assertEqual(result,[('active','test-only','active')])
 def test_missing_active_site_fails_closed(self):
  with self.assertRaises(RuntimeError):select({'frontend':{'db_name':'legacy','db_password':'test-only'}})
 def test_missing_password_does_not_become_zero_site_success(self):
  with self.assertRaises(RuntimeError):select({'ops.kecktech.net':{'db_name':'active'}})
if __name__=='__main__':unittest.main()

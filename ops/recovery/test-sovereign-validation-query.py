"""Isolated regression for candidate validation calculation and SQL binding."""
import asyncio
import sys
from pathlib import Path
import unittest

sys.path.insert(0, 'F:/Github/sovereign-standalone/app')
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.recovery-private/sovereign-validation'))
from alert_evaluator_light import check_validation_pass_rate

class Connection:
    def __init__(self, row, error=False):
        self.row, self.error = row, error
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass
    async def fetchrow(self, query, days):
        assert 'WHERE ts >=' in query
        assert 'days => $1' in query
        assert '$days' not in query and 'ran_at' not in query
        assert days == 7
        if self.error: raise RuntimeError('isolated database failure')
        return self.row

class Pool:
    def __init__(self, row, error=False): self.connection=Connection(row,error)
    def acquire(self): return self.connection

class ValidationTests(unittest.TestCase):
    def setUp(self): self.loop=asyncio.new_event_loop(); asyncio.set_event_loop(self.loop)
    def tearDown(self): self.loop.close(); asyncio.set_event_loop(None)
    def test_empty_is_not_a_pass(self):
        result=check_validation_pass_rate(Pool({'runs':0,'passed':0}))
        self.assertIsNone(result['pass_rate_pct']); self.assertFalse(result['below_threshold'])
    def test_low_rate_alerts_only_with_three_runs(self):
        self.assertFalse(check_validation_pass_rate(Pool({'runs':2,'passed':0}))['below_threshold'])
        self.assertTrue(check_validation_pass_rate(Pool({'runs':3,'passed':2}))['below_threshold'])
    def test_full_pass(self):
        result=check_validation_pass_rate(Pool({'runs':3,'passed':3}))
        self.assertTrue(result['checked']); self.assertEqual(result['pass_rate_pct'],100)
    def test_failure_is_visible(self):
        result=check_validation_pass_rate(Pool(None,True))
        self.assertFalse(result['checked']); self.assertIn('error',result)
    def test_missing_pool(self):
        self.assertEqual(check_validation_pass_rate(None),{'checked':False,'reason':'no_kb_pool'})

if __name__ == '__main__': unittest.main()

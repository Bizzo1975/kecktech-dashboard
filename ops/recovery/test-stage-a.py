"""Isolated safety regressions; never contacts Docker or production."""
import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('stage', Path(__file__).with_name('execute-stage-a.py'))
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)

class RecoverySafetyTests(unittest.TestCase):
    def agent(self, identity='original'):
        return {'Id':identity,'Image':'digest','Mounts':[], 'State':{'Status':'running'}}

    def test_agent_restored_when_stage_aborts(self):
        with patch.object(stage,'inspect',return_value=self.agent()), patch.object(stage,'stop'), \
             patch.object(stage,'main',side_effect=RuntimeError('preflight_failed')), \
             patch.object(stage,'command') as cmd, patch.object(stage.time,'sleep'), patch.object(stage,'emit'):
            with self.assertRaisesRegex(RuntimeError,'preflight_failed'):
                stage.approved_run({},'200')
            cmd.assert_called_once_with(['docker','start','portainer_agent'])

    def test_agent_identity_drift_prevents_start_of_replacement(self):
        with patch.object(stage,'inspect',side_effect=[self.agent(),self.agent('changed')]), \
             patch.object(stage,'stop'), patch.object(stage,'main'), patch.object(stage,'command') as cmd, \
             patch.object(stage,'emit'):
            with self.assertRaisesRegex(RuntimeError,'identity_changed'):
                stage.approved_run({},'112')
            cmd.assert_not_called()

    def test_graceful_timeout_never_sends_force_kill(self):
        with patch.object(stage,'command',side_effect=subprocess.TimeoutExpired('docker',45)) as cmd:
            with self.assertRaises(subprocess.TimeoutExpired):
                stage.stop('umami')
            cmd.assert_called_once_with(['docker','stop','--timeout','-1','umami'],timeout=45)

    def test_scheduler_uses_registered_interrupt_without_force_kill(self):
        with patch.object(stage,'command') as cmd, patch.object(stage,'inspect',return_value={'State':{'Status':'exited'}}), patch.object(stage,'emit'):
            stage.stop('erpnext-scheduler-1')
            cmd.assert_called_once_with(['docker','kill','--signal','SIGINT','erpnext-scheduler-1'])

    def test_unapproved_host_cannot_contact_docker(self):
        with patch.object(stage,'inspect') as inspect:
            with self.assertRaisesRegex(RuntimeError,'unapproved_host'):
                stage.approved_run({},'400')
            inspect.assert_not_called()

if __name__ == '__main__':
    unittest.main()

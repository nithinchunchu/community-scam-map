from tests.adversarial.run_adversarial import run_adversarial_suite

def test_full_adversarial_suite():
    assert run_adversarial_suite() is True

import pytest
from app.core.normalize import (
    normalize_phone,
    normalize_upi,
    normalize_url,
    normalize_sender_id,
    normalize_identifier,
    mask_identifier,
)

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+91 98765 43210", "+919876543210"),
        ("09876543210", "+919876543210"),
        ("98765-43210", "+919876543210"),
        ("919876543210", "+919876543210"),
        ("+91 80 4100 2233", "+918041002233"),
        ("08041002233", "+918041002233"),
        ("+91 (80) 2553-0190", "+918025530190"),
        ("1800 1600", "18001600"),
        ("1800 2600", "18002600"),
        ("1860 419 5555", "18604195555"),
        ("1860-266-2666", "18602662666"),
        ("1930", "1930"),
        ("1909", "1909"),
    ],
)
def test_normalize_phone_valid(raw, expected):
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "12345",
        "test",
        "0000000000",
        "1111111111",
        "1234567890",
        "0123456789",
        "1234",
        "1111",
        "+91 1234567890", # First digit is 1
        "98765abcde",
        "",
        None,
    ],
)
def test_normalize_phone_invalid(raw):
    with pytest.raises(ValueError):
        normalize_phone(raw)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Ravi12@OKAXIS", "ravi12@okaxis"),
        ("freshbakes@okaxis ", "freshbakes@okaxis"),
        ("  user.name-1@oksbi  ", "user.name-1@oksbi"),
        ("scammer_99@paytm", "scammer_99@paytm"),
    ],
)
def test_normalize_upi_valid(raw, expected):
    assert normalize_upi(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "test",
        "user#name@axis",
        "user!@axis",
        "user@",
        "user@@axis",
        "@okaxis",
        "",
        None,
    ],
)
def test_normalize_upi_invalid(raw):
    with pytest.raises(ValueError):
        normalize_upi(raw)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("http://www.sbi-kyc.in/pay?utm=sms", "https://sbi-kyc.in/pay"),
        ("http://sbi-kyc.in/pay/", "https://sbi-kyc.in/pay"),
        ("https://cybercrime.gov.in/", "https://cybercrime.gov.in"),
        ("https://sancharsaathi.gov.in", "https://sancharsaathi.gov.in"),
        ("www.fake-bank-login.com/login?token=abc#hash", "https://fake-bank-login.com/login"),
    ],
)
def test_normalize_url_valid(raw, expected):
    assert normalize_url(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "test",
        "http://",
        "http:///something",
        "not-a-domain",
        "",
        None,
    ],
)
def test_normalize_url_invalid(raw):
    with pytest.raises(ValueError):
        normalize_url(raw)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("VM-HDFCBK", "HDFCBK"),
        ("AD-HDFCBK", "HDFCBK"),
        ("HDFCBK", "HDFCBK"),
        ("vmhdfcbk", "HDFCBK"),
        ("AX-SBIINB-T", "SBIINB"),
        ("ICICIB", "ICICIB"),
    ],
)
def test_normalize_sender_id_valid(raw, expected):
    assert normalize_sender_id(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "12345",
        "TEST",
        "TOOLONGNAME",
        "",
        None,
    ],
)
def test_normalize_sender_id_invalid(raw):
    with pytest.raises(ValueError):
        normalize_sender_id(raw)


def test_mask_identifier():
    assert mask_identifier("phone", "+919876543210") == "98XXXXX210"
    assert mask_identifier("upi", "ravi12@okaxis") == "r***@okaxis"
    assert mask_identifier("url", "https://sbi-kyc.in/pay") == "sbi***.in/..."
    assert mask_identifier("sender_id", "HDFCBK") == "HD****"

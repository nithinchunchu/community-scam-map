# AGENTS.md - Working Rules & Source Data

## Working Rules

1. **Write tests first** for normalisation and trust.
2. **Adversarial Suite**: After any trust change, run the full adversarial suite to ensure zero regressions.
3. **No Special-Casing**: NEVER hardcode specific numbers in logic (e.g. `if number == "+919876543210": return "SUSPICIOUS"`). Verified data lives in a seeded database table.
4. **Explainable Rules**: Keep code simple and transparent enough to explain every trust rule aloud to judges.
5. **Privacy First**: Never commit secrets, private keys, or real personal data. All test data must be synthetic / fake.
6. **Delivery Standard**: Every stage ends with:
   - What changed
   - How to verify it
   - Exact commands to run

---

## Seed Data: Verified Identifiers

Must show verdict `VERIFIED_BUSINESS` (never a scam):

| Type | Raw Input | Canonical Key | Owner / Belongs To |
|---|---|---|---|
| phone | 1930 | 1930 | National Cybercrime Helpline |
| phone | 1909 | 1909 | TRAI Do Not Disturb |
| phone | 1800 1600 | 18001600 | HDFC Bank customer care |
| phone | 1800 2600 | 18002600 | HDFC Bank customer care |
| phone | 1800 1080 | 18001080 | ICICI Bank customer care |
| phone | 1800 1234 | 18001234 | State Bank of India customer care |
| phone | 1800 2100 | 18002100 | State Bank of India customer care |
| phone | 1860 419 5555 | 18604195555 | Axis Bank customer care |
| phone | 1860 266 2666 | 18602662666 | Kotak Mahindra Bank customer care |
| phone | +91 80 4100 2233 | +918041002233 | Fresh Bakes, Indiranagar (made up) |
| phone | +91 80 2553 0190 | +918025530190 | Koramangala Pharmacy (made up) |
| sender_id | HDFCBK | HDFCBK | HDFC Bank SMS sender |
| sender_id | ICICIB | ICICIB | ICICI Bank SMS sender |
| sender_id | SBIINB | SBIINB | State Bank of India SMS sender |
| sender_id | AXISBK | AXISBK | Axis Bank SMS sender |
| sender_id | KOTAKB | KOTAKB | Kotak Mahindra Bank SMS sender |
| url | https://cybercrime.gov.in | https://cybercrime.gov.in | National Cyber Crime Reporting Portal |
| url | https://sancharsaathi.gov.in | https://sancharsaathi.gov.in | Sanchar Saathi |
| upi | freshbakes@okaxis | freshbakes@okaxis | Fresh Bakes, Indiranagar (made up) |

---

## Seed Data: Areas (25 from Appendix B + 2 Demo)

Must be stored in `app/data/areas.json`:

1. `560102`: HSR Layout, Bengaluru (12.9116, 77.6473)
2. `560038`: Indiranagar, Bengaluru (12.9784, 77.6408)
3. `560034`: Koramangala, Bengaluru (12.9352, 77.6245)
4. `560066`: Whitefield, Bengaluru (12.9698, 77.7500)
5. `560076`: BTM Layout, Bengaluru (12.9166, 77.6101)
6. `560011`: Jayanagar, Bengaluru (12.9299, 77.5826)
7. `560037`: Marathahalli, Bengaluru (12.9591, 77.6974)
8. `560103`: Bellandur, Bengaluru (12.9260, 77.6762)
9. `560100`: Electronic City, Bengaluru (12.8452, 77.6602)
10. `560078`: JP Nagar, Bengaluru (12.9077, 77.5851)
11. `560003`: Malleshwaram, Bengaluru (13.0035, 77.5709)
12. `560010`: Rajajinagar, Bengaluru (12.9915, 77.5520)
13. `560024`: Hebbal, Bengaluru (13.0358, 77.5970)
14. `560064`: Yelahanka, Bengaluru (13.1007, 77.5963)
15. `560070`: Banashankari, Bengaluru (12.9250, 77.5468)
16. `400050`: Bandra West, Mumbai (19.0596, 72.8295)
17. `110016`: Hauz Khas, Delhi (28.5494, 77.2001)
18. `500081`: Madhapur, Hyderabad (17.4486, 78.3908)
19. `600020`: Adyar, Chennai (13.0012, 80.2565)
20. `411014`: Viman Nagar, Pune (18.5679, 73.9143)
21. `700091`: Salt Lake Sector V, Kolkata (22.5790, 88.4290)
22. `380015`: Satellite, Ahmedabad (23.0260, 72.5085)
23. `302017`: Malviya Nagar, Jaipur (26.8570, 75.8080)
24. `226010`: Gomti Nagar, Lucknow (26.8540, 80.9990)
25. `682030`: Kakkanad, Kochi (10.0159, 76.3419)
26. `506002`: Warangal, Warangal (17.9689, 79.5941)
27. `506001`: Hanamkonda, Warangal (18.0073, 79.5583)

Only these pincodes are valid; any other pincode is rejected with HTTP 400.

---

## Allowed Scam Types
- `digital-arrest`
- `fake-kyc-link`
- `upi-refund-qr`
- `investment-group`
- `courier-customs`
- `job-offer`
- `lottery-prize`
- `loan-app-harassment`
- `electricity-disconnection`
- `fake-customer-care`
- `otp-call`
- `sextortion`
- Any unknown scam type becomes `"other"`.

## Allowed Channels
- `Phone call`
- `SMS or WhatsApp`
- `QR code`
- `Fake website`
- `UPI request`
- `Something else` (unknown channel becomes `"Something else"`).

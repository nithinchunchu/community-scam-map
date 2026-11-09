# Trust Engine Architecture & Rules

The Community Scam Map trust engine is designed to be fully transparent, explainable to judges, and robust against adversarial manipulation while protecting privacy and never missing authentic scam waves.

---

## Adversarial Defense Matrix

| Trick | Rule That Stops It | Why a Real Campaign Still Passes |
|---|---|---|
| **One person spamming (reporting 6 times in an hour)** | **Union-Find by reporter_key**: Multiple reports on the same identifier from the same reporter collapse into a single "Person". Person weight uses the maximum report quality, never the sum. | Real scam victims are distinct individuals with unique keys. Multiple reports from different individuals count as distinct reporters. |
| **Fake accounts on one Wi-Fi (22 accounts from one connection)** | **IP Temporal Windowing**: Reports on the same identifier sharing the same `ip_key` within a 60-minute window collapse into one person. | A real campaign hits victims across the city and nation on cellular data, different home broadband lines, and distinct IP subnets. |
| **Report-bombing / Brigading (40 friends reporting a rival bakery)** | **4-Gram Shingle Similarity (Jaccard $\ge$ 0.7)**: Pre-scripted copy-paste reports share high 4-gram similarity and collapse into a single person. | Authentic victims write descriptions in their own unique words, dialects (English/Hindi/Hinglish), and describe their specific scam experience, resulting in low similarity ($< 0.4$). |
| **Bot burst with rotating IPs (Coordinated attack)** | **Coordination Gate**: If $\ge 5$ persons arrive within 60 minutes and either IP diversity is low ($\frac{\text{unique IPs}}{\text{persons}} < 0.5$) or average text dissimilarity $< 0.4$, the entire burst collapses into 1 person. | A real scam wave reaches diverse network blocks and naturally high linguistic entropy across different times and locations. |
| **High-volume serial reporter (Spam reporter)** | **Serial Reporter Multiplier ($\times 0.3$)**: Any `reporter_key` submitting reports for 8 or more different identifiers within 1 hour receives an immediate $0.3\times$ weight penalty. | Normal citizens report 1 or 2 scams they encountered, retaining full reputation ($1.0\times$ or boosted). |
| **Junk input ("12345", "test")** | **Strict Format Normalization Gate**: Immediate HTTP 400 rejection for numbers with sequential patterns, all-same digits, invalid lengths, or missing valid prefixes. | Real phone numbers, UPI IDs, URLs, and SMS headers normalize to canonical forms (+91, valid VPA, clean domain). |
| **Malicious smear of a legitimate business** | **Pre-seeded Verified Identifiers**: Government helplines and verified local businesses return `VERIFIED_BUSINESS` unconditionally. | Verified entries are seeded from authenticated registry records. |
| **Disputed business under false accusation** | **Dispute Capping (`POST /challenges`)**: Any identifier under active review is capped at `SUSPICIOUS`, strictly preventing `KNOWN_SCAM` classification. | Legitimate business owners can file a challenge with proof to protect their reputation while claims are audited. |

---

## Formula Reference

1. **Reputation ($R$):**
   - Base = $0.7$
   - $+0.15$ for earlier reports that reached `KNOWN_SCAM` (confirmed by $\ge 3$ independent peers)
   - $-0.20$ for earlier reports against verified businesses or challenged entries
   - Clamped to $[0.3, 1.5]$

2. **Note Quality ($Q$):**
   - Empty = $0.6$
   - $< 20$ characters = $0.8$
   - $\ge 20$ characters = $1.0$
   - $+0.2$ if `amount_lost_inr > 0` or `has_screenshot == True`
   - Clamped to $[0.6, 1.2]$

3. **Person Weight:**
   $$\text{Weight} = \max_{r \in \text{Person}} \left( R(r) \times Q(r) \times P_{\text{spam}}(r) \right)$$

4. **Verdict Thresholds:**
   - `KNOWN_SCAM`: $\ge 3$ distinct persons **AND** $\sum \text{Person Weights} \ge 2.5$
   - `SUSPICIOUS`: $\ge 1$ trusted report (below `KNOWN_SCAM` threshold)
   - `NO_REPORTS`: $0$ reports
   - `VERIFIED_BUSINESS`: Matched in verified business registry

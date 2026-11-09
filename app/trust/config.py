# Trust Engine Configuration Constants

INITIAL_REPUTATION: float = 0.7
REPUTATION_BOOST_KNOWN_SCAM: float = 0.15
REPUTATION_PENALTY_VERIFIED_OR_CHALLENGED: float = 0.20
MIN_REPUTATION: float = 0.30
MAX_REPUTATION: float = 1.50

# Note quality weights (empty notes are neutral: 1.00, only near-duplicate non-empty notes are penalised)
NOTE_QUALITY_EMPTY: float = 1.00
NOTE_QUALITY_SHORT: float = 0.90  # length < 20 chars
NOTE_QUALITY_STANDARD: float = 1.00  # length >= 20 chars
NOTE_QUALITY_BONUS: float = 0.20  # if amount_lost_inr > 0 or has_screenshot
NOTE_QUALITY_CAP: float = 1.20

# Same IP person merge window
SAME_IP_WINDOW_SECONDS: int = 3600  # 60 minutes

# Note shingle similarity threshold to merge as duplicate (Jaccard index)
JACCARD_DUPLICATE_THRESHOLD: float = 0.70

# Spam reporter penalty (reporting >= 8 different identifiers in 1 hour)
SPAM_REPORTER_DISTINCT_IDENTIFIERS_THRESHOLD: int = 8
SPAM_REPORTER_WINDOW_SECONDS: int = 3600
SPAM_REPORTER_MULTIPLIER: float = 0.30

# Coordination gate
COORDINATION_WINDOW_SECONDS: int = 3600
COORDINATION_MIN_PERSONS: int = 5
COORDINATION_IP_RATIO_THRESHOLD: float = 0.50
COORDINATION_AVG_DISSIMILARITY_THRESHOLD: float = 0.40

# Impossible travel velocity threshold
IMPOSSIBLE_TRAVEL_MAX_SPEED_KMH: float = 600.0  # Max travel velocity (>600 km/h)
IMPOSSIBLE_TRAVEL_PENALTY_MULTIPLIER: float = 0.20

# Verdict thresholds
KNOWN_SCAM_MIN_PERSONS: int = 3
KNOWN_SCAM_MIN_SCORE: float = 2.00
MASKING_MIN_PERSONS: int = 3

# Map severity thresholds
SEVERITY_CRIT_THRESHOLD: int = 15
SEVERITY_HIGH_THRESHOLD: int = 8

# Alert thresholds
SPIKE_MIN_REPORTS: int = 5
SPIKE_BASELINE_MULTIPLIER: float = 2.0

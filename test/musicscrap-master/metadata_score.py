"""
Metadata Score Engine - "FICO Score for Songs"

Creates a 0-100 score based on metadata completeness and consistency.
This score identifies songs that are likely missing royalties due to
metadata issues.

Scoring Formula (from PHASE 1 spec):
- Missing ISWC: -25
- Title mismatch: -10
- Conflicting writer shares: -20
- Recording not linked: -15
- No publisher listed: -15

Grade Scale:
- 90-100 = A (Excellent - minimal issues)
- 75-89 = B (Good - minor issues)
- 60-74 = C (Fair - some issues need attention)
- 40-59 = D (Poor - significant issues)
- Below 40 = F (Critical - likely losing royalties)
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ScoreGrade(Enum):
    """Grade levels for metadata scores."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


@dataclass
class MetadataIssue:
    """Represents a single metadata issue found."""
    code: str
    severity: str  # "critical", "high", "medium", "low"
    description: str
    deduction: int
    fix_suggestion: str
    affected_field: str


@dataclass
class MetadataScoreResult:
    """Complete metadata score result for a song."""
    score: int
    grade: ScoreGrade
    issues: List[MetadataIssue] = field(default_factory=list)
    estimated_lost_revenue: float = 0.0
    territories_affected: List[str] = field(default_factory=list)
    priority_fixes: List[str] = field(default_factory=list)
    data_sources_checked: List[str] = field(default_factory=list)


# ============================================================================
# Issue Definitions
# ============================================================================

ISSUE_DEFINITIONS = {
    "MISSING_ISWC": {
        "severity": "critical",
        "deduction": 25,
        "description": "No ISWC (International Standard Musical Work Code) found",
        "fix_suggestion": "Register the composition with your PRO to obtain an ISWC",
        "affected_field": "iswc",
        "revenue_impact": 0.15  # 15% of potential mechanicals
    },
    "MISSING_ISRC": {
        "severity": "high",
        "deduction": 20,
        "description": "No ISRC (International Standard Recording Code) found",
        "fix_suggestion": "Request ISRC from your distributor or apply directly through your local ISRC agency",
        "affected_field": "isrc",
        "revenue_impact": 0.10
    },
    "TITLE_MISMATCH": {
        "severity": "medium",
        "deduction": 10,
        "description": "Song title differs across databases",
        "fix_suggestion": "Standardize the title across all platforms and PRO registrations",
        "affected_field": "title",
        "revenue_impact": 0.05
    },
    "CONFLICTING_SPLITS": {
        "severity": "critical",
        "deduction": 20,
        "description": "Writer/publisher shares don't add up to 100% or conflict across databases",
        "fix_suggestion": "Verify and correct split percentages with all parties and re-register",
        "affected_field": "splits",
        "revenue_impact": 0.20
    },
    "RECORDING_NOT_LINKED": {
        "severity": "high",
        "deduction": 15,
        "description": "Recording (ISRC) not linked to composition (ISWC)",
        "fix_suggestion": "Contact your PRO to link the recording to the underlying composition",
        "affected_field": "isrc_iswc_link",
        "revenue_impact": 0.10
    },
    "MISSING_PUBLISHER": {
        "severity": "high",
        "deduction": 15,
        "description": "No publisher listed for the composition",
        "fix_suggestion": "Register publisher information with your PRO or consider self-publishing",
        "affected_field": "publisher",
        "revenue_impact": 0.08
    },
    "MISSING_PRO_REGISTRATION": {
        "severity": "critical",
        "deduction": 25,
        "description": "Song not registered with any PRO (ASCAP/BMI/SESAC)",
        "fix_suggestion": "Register the composition with your PRO immediately",
        "affected_field": "pro_registration",
        "revenue_impact": 0.25
    },
    "MISSING_MLC_REGISTRATION": {
        "severity": "high",
        "deduction": 15,
        "description": "Song not registered with The MLC for mechanical royalties",
        "fix_suggestion": "Register at themlc.com to collect US mechanical royalties",
        "affected_field": "mlc_registration",
        "revenue_impact": 0.12
    },
    "ARTIST_NAME_INCONSISTENT": {
        "severity": "low",
        "deduction": 5,
        "description": "Artist name varies across platforms",
        "fix_suggestion": "Standardize artist name across all platforms",
        "affected_field": "artist",
        "revenue_impact": 0.02
    },
    "WRITER_NAME_INCONSISTENT": {
        "severity": "medium",
        "deduction": 10,
        "description": "Writer name varies across PRO registrations",
        "fix_suggestion": "Update writer name to be consistent across all registrations",
        "affected_field": "writer",
        "revenue_impact": 0.05
    },
    "MULTIPLE_VERSIONS_UNLINKED": {
        "severity": "medium",
        "deduction": 10,
        "description": "Multiple versions/remixes exist but are not linked to original",
        "fix_suggestion": "Register all versions under the same work ID or link them properly",
        "affected_field": "versions",
        "revenue_impact": 0.08
    },
    "MISSING_TERRITORY_REGISTRATION": {
        "severity": "medium",
        "deduction": 10,
        "description": "Song not registered in major territories (EU, UK, etc.)",
        "fix_suggestion": "Register with sub-publishers or directly with foreign CMOs",
        "affected_field": "territories",
        "revenue_impact": 0.10
    }
}


# ============================================================================
# Core Scoring Functions
# ============================================================================

def calculate_metadata_score(
    song_data: Dict,
    cross_check_results: Dict = None,
    songview_results: List[Dict] = None
) -> MetadataScoreResult:
    """
    Calculate the metadata score for a song.

    Args:
        song_data: Original song data from catalog
        cross_check_results: Results from cross_check_song()
        songview_results: Results from BMI/ASCAP search

    Returns:
        MetadataScoreResult with score, grade, issues, and recommendations
    """
    score = 100  # Start at perfect score
    issues = []
    territories_affected = []
    estimated_revenue_loss = 0.0
    sources_checked = []

    # Extract data
    has_iswc = bool(song_data.get("iswc"))
    has_isrc = bool(song_data.get("isrc"))
    has_publisher = bool(song_data.get("publisher"))
    title = song_data.get("title", "")
    artist = song_data.get("artist", song_data.get("performer", ""))
    writer = song_data.get("writer", "")

    # Analyze cross-check results if available
    if cross_check_results:
        analysis = cross_check_results.get("analysis", {})
        sources = cross_check_results.get("sources", {})

        # Track which sources we checked
        for source_name, source_data in sources.items():
            if source_data.get("found") or "error" not in source_data:
                sources_checked.append(source_name)

        # Check for ISRCs/ISWCs from external sources
        found_isrcs = analysis.get("found_isrcs", [])
        found_iswcs = analysis.get("found_iswcs", [])

        if found_isrcs and not has_isrc:
            # We found ISRCs externally but user didn't provide one
            has_isrc = True  # They exist, just not in catalog

        if found_iswcs and not has_iswc:
            has_iswc = True

        # Check for title variations (potential mismatches)
        title_variations = analysis.get("title_variations", [])
        if title_variations:
            # Significant title variations found
            issue = _create_issue("TITLE_MISMATCH")
            issue.description += f". Found variations: {', '.join(title_variations[:3])}"
            issues.append(issue)
            score -= issue.deduction

        # Check for inconsistent artist names
        found_artists = analysis.get("found_artists", [])
        if artist and found_artists:
            artist_lower = artist.lower()
            mismatches = [a for a in found_artists if a.lower() != artist_lower]
            if mismatches:
                issue = _create_issue("ARTIST_NAME_INCONSISTENT")
                issue.description += f". Found variations: {', '.join(mismatches[:3])}"
                issues.append(issue)
                score -= issue.deduction

    # Analyze Songview results if available
    if songview_results:
        sources_checked.append("songview")

        if not songview_results:
            # Song not found in PRO databases at all!
            issue = _create_issue("MISSING_PRO_REGISTRATION")
            issues.append(issue)
            score -= issue.deduction
            territories_affected.extend(["US", "CA"])
        else:
            # Check for conflicting writer info
            writers_found = set()
            publishers_found = set()

            for result in songview_results:
                writers = result.get("writers", result.get("Writers", ""))
                publishers = result.get("publishers", result.get("Publishers", ""))

                if writers and writers != "-":
                    writers_found.add(writers)
                if publishers and publishers != "-":
                    publishers_found.add(publishers)

            # Multiple different writer listings could indicate conflicts
            if len(writers_found) > 1:
                issue = _create_issue("CONFLICTING_SPLITS")
                issue.description += f". Found {len(writers_found)} different writer listings"
                issues.append(issue)
                score -= issue.deduction

            # Update publisher status
            if publishers_found:
                has_publisher = True

    # ========================================================================
    # Core Metadata Checks
    # ========================================================================

    # Missing ISWC
    if not has_iswc:
        issues.append(_create_issue("MISSING_ISWC"))
        score -= ISSUE_DEFINITIONS["MISSING_ISWC"]["deduction"]
        territories_affected.extend(["US", "EU", "UK", "CA", "AU"])

    # Missing ISRC
    if not has_isrc:
        issues.append(_create_issue("MISSING_ISRC"))
        score -= ISSUE_DEFINITIONS["MISSING_ISRC"]["deduction"]

    # Missing Publisher
    if not has_publisher:
        issues.append(_create_issue("MISSING_PUBLISHER"))
        score -= ISSUE_DEFINITIONS["MISSING_PUBLISHER"]["deduction"]

    # ISRC-ISWC linkage check
    if has_isrc and has_iswc:
        # Both exist - check if they're linked (would need cross-check data)
        if cross_check_results:
            mb_data = cross_check_results.get("sources", {}).get("musicbrainz", {})
            if mb_data.get("recordings"):
                # Check if any recording has linked works
                has_link = False
                for rec in mb_data.get("recordings", []):
                    # This would need the full recording details
                    pass

                if not has_link:
                    issues.append(_create_issue("RECORDING_NOT_LINKED"))
                    score -= ISSUE_DEFINITIONS["RECORDING_NOT_LINKED"]["deduction"]

    # ========================================================================
    # Calculate estimated revenue loss
    # ========================================================================

    # Base annual revenue estimate per song (conservative)
    base_revenue = 500  # $500/year for an active song

    for issue in issues:
        issue_def = ISSUE_DEFINITIONS.get(issue.code, {})
        revenue_impact = issue_def.get("revenue_impact", 0.05)
        estimated_revenue_loss += base_revenue * revenue_impact

    # ========================================================================
    # Finalize results
    # ========================================================================

    # Ensure score stays in bounds
    score = max(0, min(100, score))

    # Determine grade
    if score >= 90:
        grade = ScoreGrade.A
    elif score >= 75:
        grade = ScoreGrade.B
    elif score >= 60:
        grade = ScoreGrade.C
    elif score >= 40:
        grade = ScoreGrade.D
    else:
        grade = ScoreGrade.F

    # Sort issues by severity (critical first)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    issues.sort(key=lambda x: severity_order.get(x.severity, 4))

    # Generate priority fixes (top 3 most impactful)
    priority_fixes = [issue.fix_suggestion for issue in issues[:3]]

    # Deduplicate territories
    territories_affected = list(set(territories_affected))

    return MetadataScoreResult(
        score=score,
        grade=grade,
        issues=issues,
        estimated_lost_revenue=round(estimated_revenue_loss, 2),
        territories_affected=territories_affected,
        priority_fixes=priority_fixes,
        data_sources_checked=sources_checked
    )


def _create_issue(code: str) -> MetadataIssue:
    """Create a MetadataIssue from an issue code."""
    defn = ISSUE_DEFINITIONS.get(code, {})
    return MetadataIssue(
        code=code,
        severity=defn.get("severity", "medium"),
        description=defn.get("description", code),
        deduction=defn.get("deduction", 5),
        fix_suggestion=defn.get("fix_suggestion", "Review and correct metadata"),
        affected_field=defn.get("affected_field", "unknown")
    )


# ============================================================================
# Batch Scoring for Catalogs
# ============================================================================

def score_catalog(
    songs: List[Dict],
    cross_check_results: List[Dict] = None,
    progress_callback=None
) -> Dict[str, Any]:
    """
    Score an entire catalog and generate summary statistics.

    Args:
        songs: List of song data dictionaries
        cross_check_results: Optional cross-check results for each song
        progress_callback: Optional callback(current, total) for progress

    Returns:
        Dictionary with individual scores and catalog summary
    """
    results = {
        "songs": [],
        "summary": {
            "total_songs": len(songs),
            "average_score": 0,
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
            "total_estimated_lost_revenue": 0.0,
            "most_common_issues": {},
            "critical_songs": [],  # Songs with grade F
            "priority_actions": []
        }
    }

    total_score = 0
    issue_counts = {}

    for i, song in enumerate(songs):
        if progress_callback:
            progress_callback(i + 1, len(songs))

        # Get cross-check results for this song if available
        cc_result = None
        if cross_check_results and i < len(cross_check_results):
            cc_result = cross_check_results[i]

        # Calculate score
        score_result = calculate_metadata_score(
            song_data=song,
            cross_check_results=cc_result
        )

        # Store result
        song_result = {
            "original": song,
            "score": score_result.score,
            "grade": score_result.grade.value,
            "issues": [
                {
                    "code": issue.code,
                    "severity": issue.severity,
                    "description": issue.description,
                    "fix": issue.fix_suggestion
                }
                for issue in score_result.issues
            ],
            "estimated_lost_revenue": score_result.estimated_lost_revenue,
            "territories_affected": score_result.territories_affected,
            "priority_fixes": score_result.priority_fixes
        }
        results["songs"].append(song_result)

        # Update summary stats
        total_score += score_result.score
        results["summary"]["grade_distribution"][score_result.grade.value] += 1
        results["summary"]["total_estimated_lost_revenue"] += score_result.estimated_lost_revenue

        # Track issue frequency
        for issue in score_result.issues:
            issue_counts[issue.code] = issue_counts.get(issue.code, 0) + 1

        # Track critical songs
        if score_result.grade == ScoreGrade.F:
            results["summary"]["critical_songs"].append({
                "title": song.get("title", "Unknown"),
                "artist": song.get("artist", song.get("performer", "Unknown")),
                "score": score_result.score,
                "top_issue": score_result.issues[0].description if score_result.issues else "Unknown"
            })

    # Calculate averages
    if songs:
        results["summary"]["average_score"] = round(total_score / len(songs), 1)

    # Sort and limit common issues
    sorted_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)
    results["summary"]["most_common_issues"] = dict(sorted_issues[:10])

    # Generate priority actions based on most impactful fixes
    critical_count = results["summary"]["grade_distribution"]["F"]
    poor_count = results["summary"]["grade_distribution"]["D"]

    if critical_count > 0:
        results["summary"]["priority_actions"].append(
            f"Fix {critical_count} critical songs (Grade F) immediately - these are likely losing significant royalties"
        )

    if poor_count > 0:
        results["summary"]["priority_actions"].append(
            f"Review {poor_count} poor-scoring songs (Grade D) - potential royalty leaks"
        )

    # Add specific issue-based recommendations
    if issue_counts.get("MISSING_ISWC", 0) > 5:
        results["summary"]["priority_actions"].append(
            f"Register {issue_counts['MISSING_ISWC']} songs with PROs to obtain ISWCs"
        )

    if issue_counts.get("MISSING_PRO_REGISTRATION", 0) > 0:
        results["summary"]["priority_actions"].append(
            f"URGENT: {issue_counts['MISSING_PRO_REGISTRATION']} songs are not registered with any PRO"
        )

    results["summary"]["total_estimated_lost_revenue"] = round(
        results["summary"]["total_estimated_lost_revenue"], 2
    )

    return results


# ============================================================================
# Grade Utilities
# ============================================================================

def get_grade_color(grade: str) -> str:
    """Get color code for grade display."""
    colors = {
        "A": "#22c55e",  # Green
        "B": "#84cc16",  # Lime
        "C": "#eab308",  # Yellow
        "D": "#f97316",  # Orange
        "F": "#ef4444"   # Red
    }
    return colors.get(grade, "#6b7280")


def get_grade_description(grade: str) -> str:
    """Get description for a grade."""
    descriptions = {
        "A": "Excellent - Your metadata is well-maintained with minimal issues",
        "B": "Good - Minor issues that should be addressed when possible",
        "C": "Fair - Some issues need attention to maximize royalty collection",
        "D": "Poor - Significant issues likely causing royalty leakage",
        "F": "Critical - Major problems, you are almost certainly losing money"
    }
    return descriptions.get(grade, "Unknown grade")


def score_to_percentage_bar(score: int) -> str:
    """Generate ASCII progress bar for score."""
    filled = int(score / 10)
    empty = 10 - filled
    return f"[{'█' * filled}{'░' * empty}] {score}%"


# ============================================================================
# Export Utilities
# ============================================================================

def export_score_results_to_dict(result: MetadataScoreResult) -> Dict:
    """Convert MetadataScoreResult to JSON-serializable dict."""
    return {
        "score": result.score,
        "grade": result.grade.value,
        "issues": [
            {
                "code": i.code,
                "severity": i.severity,
                "description": i.description,
                "deduction": i.deduction,
                "fix_suggestion": i.fix_suggestion,
                "affected_field": i.affected_field
            }
            for i in result.issues
        ],
        "estimated_lost_revenue": result.estimated_lost_revenue,
        "territories_affected": result.territories_affected,
        "priority_fixes": result.priority_fixes,
        "data_sources_checked": result.data_sources_checked
    }

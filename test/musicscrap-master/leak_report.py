"""
Leak Report Generator

Generates comprehensive reports showing:
- Problems found in catalog metadata
- Estimated value of missing royalties
- Territories affected
- Prioritized fixes required
- Overall catalog health score

Output formats: JSON, HTML, PDF (via WeasyPrint)
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from metadata_score import (
    score_catalog,
    get_grade_color,
    get_grade_description,
    score_to_percentage_bar,
    MetadataScoreResult,
    ISSUE_DEFINITIONS
)

logger = logging.getLogger(__name__)


@dataclass
class LeakReport:
    """Complete Leak Report for a catalog."""
    generated_at: str
    catalog_name: str
    total_songs: int
    overall_score: float
    overall_grade: str
    total_estimated_lost_revenue: float
    grade_distribution: Dict[str, int]
    top_issues: List[Dict]
    critical_songs: List[Dict]
    priority_actions: List[str]
    territories_affected: List[str]
    songs: List[Dict]


# ============================================================================
# Report Generation
# ============================================================================

def generate_leak_report(
    catalog_name: str,
    songs: List[Dict],
    cross_check_results: List[Dict] = None,
    include_song_details: bool = True
) -> LeakReport:
    """
    Generate a complete leak report for a catalog.

    Args:
        catalog_name: Name for the catalog
        songs: List of song data dictionaries
        cross_check_results: Optional cross-check results
        include_song_details: Whether to include per-song breakdown

    Returns:
        LeakReport dataclass with all analysis
    """
    # Score the entire catalog
    scoring_results = score_catalog(songs, cross_check_results)
    summary = scoring_results["summary"]

    # Determine overall grade
    avg_score = summary["average_score"]
    if avg_score >= 90:
        overall_grade = "A"
    elif avg_score >= 75:
        overall_grade = "B"
    elif avg_score >= 60:
        overall_grade = "C"
    elif avg_score >= 40:
        overall_grade = "D"
    else:
        overall_grade = "F"

    # Compile top issues with descriptions
    top_issues = []
    for issue_code, count in summary["most_common_issues"].items():
        issue_def = ISSUE_DEFINITIONS.get(issue_code, {})
        top_issues.append({
            "code": issue_code,
            "count": count,
            "percentage": round(count / len(songs) * 100, 1) if songs else 0,
            "severity": issue_def.get("severity", "medium"),
            "description": issue_def.get("description", issue_code),
            "fix_suggestion": issue_def.get("fix_suggestion", "Review metadata")
        })

    # Collect all affected territories
    all_territories = set()
    for song_result in scoring_results["songs"]:
        all_territories.update(song_result.get("territories_affected", []))

    # Prepare songs list (optionally limited)
    songs_for_report = scoring_results["songs"] if include_song_details else []

    return LeakReport(
        generated_at=datetime.now().isoformat(),
        catalog_name=catalog_name,
        total_songs=summary["total_songs"],
        overall_score=avg_score,
        overall_grade=overall_grade,
        total_estimated_lost_revenue=summary["total_estimated_lost_revenue"],
        grade_distribution=summary["grade_distribution"],
        top_issues=top_issues,
        critical_songs=summary["critical_songs"],
        priority_actions=summary["priority_actions"],
        territories_affected=sorted(list(all_territories)),
        songs=songs_for_report
    )


def leak_report_to_dict(report: LeakReport) -> Dict:
    """Convert LeakReport to JSON-serializable dictionary."""
    return {
        "generated_at": report.generated_at,
        "catalog_name": report.catalog_name,
        "summary": {
            "total_songs": report.total_songs,
            "overall_score": report.overall_score,
            "overall_grade": report.overall_grade,
            "grade_color": get_grade_color(report.overall_grade),
            "grade_description": get_grade_description(report.overall_grade),
            "total_estimated_lost_revenue": report.total_estimated_lost_revenue,
            "grade_distribution": report.grade_distribution,
            "territories_affected": report.territories_affected
        },
        "issues": {
            "top_issues": report.top_issues,
            "critical_songs_count": len(report.critical_songs),
            "critical_songs": report.critical_songs
        },
        "recommendations": {
            "priority_actions": report.priority_actions
        },
        "songs": report.songs
    }


# ============================================================================
# HTML Report Generation
# ============================================================================

def generate_html_report(report: LeakReport) -> str:
    """Generate an HTML version of the leak report."""
    grade_color = get_grade_color(report.overall_grade)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leak Report - {report.catalog_name}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {{
            --grade-color: {grade_color};
        }}
        body {{
            background: #f8f9fa;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }}
        .report-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 2rem;
            margin-bottom: 2rem;
        }}
        .score-circle {{
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }}
        .score-value {{
            font-size: 3rem;
            font-weight: 700;
            color: var(--grade-color);
            line-height: 1;
        }}
        .score-grade {{
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--grade-color);
        }}
        .stat-card {{
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            height: 100%;
        }}
        .stat-value {{
            font-size: 2rem;
            font-weight: 700;
            color: #2c3e50;
        }}
        .stat-label {{
            color: #6c757d;
            font-size: 0.9rem;
        }}
        .issue-card {{
            background: white;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border-left: 4px solid;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }}
        .issue-critical {{ border-color: #ef4444; }}
        .issue-high {{ border-color: #f97316; }}
        .issue-medium {{ border-color: #eab308; }}
        .issue-low {{ border-color: #22c55e; }}
        .grade-badge {{
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.8rem;
        }}
        .grade-A {{ background: #dcfce7; color: #166534; }}
        .grade-B {{ background: #ecfccb; color: #3f6212; }}
        .grade-C {{ background: #fef9c3; color: #854d0e; }}
        .grade-D {{ background: #ffedd5; color: #9a3412; }}
        .grade-F {{ background: #fee2e2; color: #991b1b; }}
        .priority-action {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border-radius: 0 8px 8px 0;
        }}
        .song-table {{
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }}
        .song-table th {{
            background: #f8f9fa;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="report-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1 class="mb-2"><i class="fas fa-file-medical-alt me-3"></i>Leak Scanner Report</h1>
                    <p class="mb-1 opacity-75">Catalog: <strong>{report.catalog_name}</strong></p>
                    <p class="mb-0 opacity-75">Generated: {report.generated_at[:10]}</p>
                </div>
                <div class="col-md-4 text-md-end mt-3 mt-md-0">
                    <div class="score-circle d-inline-flex">
                        <span class="score-value">{int(report.overall_score)}</span>
                        <span class="score-grade">Grade {report.overall_grade}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="container pb-5">
        <!-- Summary Stats -->
        <div class="row g-4 mb-4">
            <div class="col-md-3">
                <div class="stat-card text-center">
                    <div class="stat-value">{report.total_songs}</div>
                    <div class="stat-label">Total Songs</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center">
                    <div class="stat-value text-danger">${report.total_estimated_lost_revenue:,.0f}</div>
                    <div class="stat-label">Est. Lost Revenue/Year</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center">
                    <div class="stat-value text-warning">{len(report.critical_songs)}</div>
                    <div class="stat-label">Critical Issues</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card text-center">
                    <div class="stat-value">{len(report.territories_affected)}</div>
                    <div class="stat-label">Territories Affected</div>
                </div>
            </div>
        </div>

        <!-- Grade Distribution -->
        <div class="row g-4 mb-4">
            <div class="col-lg-6">
                <div class="stat-card">
                    <h5 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Grade Distribution</h5>
                    <div class="row text-center">
                        {"".join([f'''
                        <div class="col">
                            <div class="grade-badge grade-{grade} mb-2">{grade}</div>
                            <div class="fw-bold">{count}</div>
                            <small class="text-muted">{round(count/report.total_songs*100 if report.total_songs else 0)}%</small>
                        </div>
                        ''' for grade, count in report.grade_distribution.items()])}
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="stat-card">
                    <h5 class="mb-3"><i class="fas fa-globe me-2"></i>Territories Affected</h5>
                    <div class="d-flex flex-wrap gap-2">
                        {"".join([f'<span class="badge bg-secondary">{t}</span>' for t in report.territories_affected[:10]])}
                    </div>
                    <p class="text-muted mt-2 mb-0 small">
                        These territories may have unregistered or incorrectly registered works.
                    </p>
                </div>
            </div>
        </div>

        <!-- Priority Actions -->
        <div class="stat-card mb-4">
            <h5 class="mb-3"><i class="fas fa-exclamation-triangle text-warning me-2"></i>Priority Actions</h5>
            {"".join([f'''
            <div class="priority-action">
                <i class="fas fa-arrow-right me-2"></i>{action}
            </div>
            ''' for action in report.priority_actions]) if report.priority_actions else '<p class="text-muted">No urgent actions required.</p>'}
        </div>

        <!-- Top Issues -->
        <div class="stat-card mb-4">
            <h5 class="mb-3"><i class="fas fa-bug me-2"></i>Most Common Issues</h5>
            <div class="row">
                {"".join([f'''
                <div class="col-lg-6">
                    <div class="issue-card issue-{issue['severity']}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>{issue['description']}</strong>
                                <p class="mb-1 small text-muted">{issue['fix_suggestion']}</p>
                            </div>
                            <span class="badge bg-dark">{issue['count']} songs</span>
                        </div>
                    </div>
                </div>
                ''' for issue in report.top_issues[:6]])}
            </div>
        </div>

        <!-- Critical Songs -->
        {f'''
        <div class="stat-card mb-4">
            <h5 class="mb-3"><i class="fas fa-skull-crossbones text-danger me-2"></i>Critical Songs (Grade F)</h5>
            <div class="table-responsive">
                <table class="table song-table mb-0">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Score</th>
                            <th>Top Issue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {"".join([f"""
                        <tr>
                            <td><strong>{song['title']}</strong></td>
                            <td>{song['artist']}</td>
                            <td><span class="badge bg-danger">{song['score']}</span></td>
                            <td class="small">{song['top_issue'][:50]}...</td>
                        </tr>
                        """ for song in report.critical_songs[:10]])}
                    </tbody>
                </table>
            </div>
        </div>
        ''' if report.critical_songs else ''}

        <!-- Full Song List (first 50) -->
        {f'''
        <div class="stat-card">
            <h5 class="mb-3"><i class="fas fa-list me-2"></i>All Songs</h5>
            <div class="table-responsive">
                <table class="table song-table mb-0">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Score</th>
                            <th>Grade</th>
                            <th>Issues</th>
                            <th>Est. Loss</th>
                        </tr>
                    </thead>
                    <tbody>
                        {"".join([f"""
                        <tr>
                            <td><strong>{song['original'].get('title', 'Unknown')}</strong></td>
                            <td>{song['original'].get('artist', song['original'].get('performer', '-'))}</td>
                            <td>{song['score']}</td>
                            <td><span class="grade-badge grade-{song['grade']}">{song['grade']}</span></td>
                            <td><span class="badge bg-secondary">{len(song['issues'])}</span></td>
                            <td>${song['estimated_lost_revenue']:,.0f}</td>
                        </tr>
                        """ for song in report.songs[:50]])}
                    </tbody>
                </table>
            </div>
            {f'<p class="text-muted mt-3 mb-0 small">Showing {min(50, len(report.songs))} of {len(report.songs)} songs</p>' if len(report.songs) > 50 else ''}
        </div>
        ''' if report.songs else ''}
    </div>

    <footer class="bg-dark text-white text-center py-4">
        <p class="mb-0">Generated by <strong>Producer Tour Leak Scanner</strong></p>
        <small class="opacity-75">Helping creators find missing royalties</small>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>"""

    return html


# ============================================================================
# Export Functions
# ============================================================================

def export_report_json(report: LeakReport, filepath: str = None) -> str:
    """Export report as JSON."""
    report_dict = leak_report_to_dict(report)
    json_str = json.dumps(report_dict, indent=2)

    if filepath:
        with open(filepath, 'w') as f:
            f.write(json_str)

    return json_str


def export_report_html(report: LeakReport, filepath: str = None) -> str:
    """Export report as HTML."""
    html = generate_html_report(report)

    if filepath:
        with open(filepath, 'w') as f:
            f.write(html)

    return html


# ============================================================================
# Quick Analysis Functions
# ============================================================================

def quick_scan_summary(songs: List[Dict]) -> Dict:
    """
    Generate a quick summary without full cross-checking.
    Useful for instant feedback when user uploads catalog.

    Args:
        songs: List of song data

    Returns:
        Quick summary dict
    """
    total = len(songs)
    missing_iswc = sum(1 for s in songs if not s.get("iswc"))
    missing_isrc = sum(1 for s in songs if not s.get("isrc"))
    missing_publisher = sum(1 for s in songs if not s.get("publisher"))

    # Estimate issues
    potential_issues = missing_iswc + missing_isrc + missing_publisher

    # Quick score estimate (simplified)
    completeness = 100 - (
        (missing_iswc / total * 25 if total else 0) +
        (missing_isrc / total * 20 if total else 0) +
        (missing_publisher / total * 15 if total else 0)
    )
    completeness = max(0, min(100, completeness))

    return {
        "total_songs": total,
        "quick_score": round(completeness, 1),
        "issues_detected": {
            "missing_iswc": missing_iswc,
            "missing_isrc": missing_isrc,
            "missing_publisher": missing_publisher
        },
        "estimated_problems": potential_issues,
        "recommendation": _get_quick_recommendation(completeness, missing_iswc, missing_isrc)
    }


def _get_quick_recommendation(score: float, missing_iswc: int, missing_isrc: int) -> str:
    """Generate a quick recommendation based on preliminary analysis."""
    if score >= 90:
        return "Your catalog looks well-maintained! Run a full scan to verify."
    elif score >= 70:
        return f"Found some gaps. {missing_iswc} songs missing ISWCs - consider registering with your PRO."
    elif score >= 50:
        return f"Significant metadata gaps detected. {missing_iswc + missing_isrc} songs need attention."
    else:
        return "Critical metadata issues found. A full scan is strongly recommended to prevent royalty loss."

"""
Data Sources for Leak Scanner
Cross-checks catalog against multiple free databases for metadata validation.

Supported Sources:
- MusicBrainz: Canonical metadata, MBIDs, ISWCs (FREE)
- MLC Public Search: Mechanical shares (FREE)
- Discogs: Releases, alt titles (FREE)
- Spotify: Track metadata, popularity (FREE via Producer Tour API)
"""

import os
import logging
import requests
import time
from typing import Optional, Dict, List, Any
from functools import lru_cache
from urllib.parse import quote_plus
import json

logger = logging.getLogger(__name__)

# ============================================================================
# MusicBrainz API (Free, rate-limited to 1 req/sec)
# ============================================================================

MUSICBRAINZ_API_URL = "https://musicbrainz.org/ws/2"
MUSICBRAINZ_USER_AGENT = "LeakScanner/1.0 (https://producertour.com)"


def _mb_request(endpoint: str, params: dict = None) -> Optional[dict]:
    """Make a rate-limited request to MusicBrainz API."""
    headers = {
        "User-Agent": MUSICBRAINZ_USER_AGENT,
        "Accept": "application/json"
    }
    params = params or {}
    params["fmt"] = "json"

    try:
        time.sleep(1.1)  # MusicBrainz rate limit: 1 request per second
        response = requests.get(
            f"{MUSICBRAINZ_API_URL}/{endpoint}",
            params=params,
            headers=headers,
            timeout=15
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"MusicBrainz API error: {e}")
        return None


def search_musicbrainz_recording(title: str, artist: str = "") -> List[Dict]:
    """
    Search MusicBrainz for recordings (songs).

    Args:
        title: Song title
        artist: Optional artist name

    Returns:
        List of matching recordings with MBID, ISRC, artist info
    """
    query = f'recording:"{title}"'
    if artist:
        query += f' AND artist:"{artist}"'

    data = _mb_request("recording", {"query": query, "limit": 10})

    if not data or "recordings" not in data:
        return []

    results = []
    for rec in data["recordings"]:
        result = {
            "source": "MusicBrainz",
            "mbid": rec.get("id"),
            "title": rec.get("title"),
            "length_ms": rec.get("length"),
            "artists": ", ".join([a.get("name", "") for a in rec.get("artist-credit", []) if "name" in a]),
            "isrcs": rec.get("isrcs", []),
            "score": rec.get("score", 0),
            "first_release_date": None,
            "releases": []
        }

        # Get release info
        if rec.get("releases"):
            result["releases"] = [
                {
                    "title": r.get("title"),
                    "date": r.get("date"),
                    "country": r.get("country"),
                    "mbid": r.get("id")
                }
                for r in rec.get("releases", [])[:3]
            ]
            if rec["releases"][0].get("date"):
                result["first_release_date"] = rec["releases"][0]["date"]

        results.append(result)

    return results


def search_musicbrainz_work(title: str, composer: str = "") -> List[Dict]:
    """
    Search MusicBrainz for works (compositions).

    Args:
        title: Composition title
        composer: Optional composer name

    Returns:
        List of matching works with ISWC, composer info
    """
    query = f'work:"{title}"'
    if composer:
        query += f' AND artist:"{composer}"'

    data = _mb_request("work", {"query": query, "limit": 10})

    if not data or "works" not in data:
        return []

    results = []
    for work in data["works"]:
        result = {
            "source": "MusicBrainz",
            "mbid": work.get("id"),
            "title": work.get("title"),
            "type": work.get("type"),
            "iswcs": work.get("iswcs", []),
            "score": work.get("score", 0),
            "language": work.get("language"),
            "relations": []
        }

        # Get composer/writer relations
        if work.get("relations"):
            for rel in work.get("relations", []):
                if rel.get("type") in ["writer", "composer", "lyricist"]:
                    result["relations"].append({
                        "type": rel.get("type"),
                        "name": rel.get("artist", {}).get("name"),
                        "mbid": rel.get("artist", {}).get("id")
                    })

        results.append(result)

    return results


def get_musicbrainz_recording_details(mbid: str) -> Optional[Dict]:
    """
    Get full details for a recording by MBID.

    Args:
        mbid: MusicBrainz recording ID

    Returns:
        Recording details including work links, ISRCs
    """
    data = _mb_request(f"recording/{mbid}", {"inc": "artist-credits+isrcs+work-rels+releases"})

    if not data:
        return None

    result = {
        "source": "MusicBrainz",
        "mbid": data.get("id"),
        "title": data.get("title"),
        "length_ms": data.get("length"),
        "artists": [],
        "isrcs": data.get("isrcs", []),
        "works": [],
        "releases": []
    }

    # Parse artist credits
    for credit in data.get("artist-credit", []):
        if "artist" in credit:
            result["artists"].append({
                "name": credit["artist"].get("name"),
                "mbid": credit["artist"].get("id"),
                "type": credit["artist"].get("type")
            })

    # Parse work relations
    for rel in data.get("relations", []):
        if rel.get("type") == "performance" and rel.get("work"):
            work = rel["work"]
            result["works"].append({
                "title": work.get("title"),
                "mbid": work.get("id"),
                "iswcs": work.get("iswcs", [])
            })

    # Parse releases
    for release in data.get("releases", [])[:5]:
        result["releases"].append({
            "title": release.get("title"),
            "date": release.get("date"),
            "country": release.get("country"),
            "mbid": release.get("id")
        })

    return result


# ============================================================================
# Discogs API (Free, requires User-Agent, rate limited)
# ============================================================================

DISCOGS_API_URL = "https://api.discogs.com"
DISCOGS_USER_AGENT = "LeakScanner/1.0"
DISCOGS_TOKEN = os.environ.get("DISCOGS_TOKEN", "")  # Optional for higher rate limits


def search_discogs(title: str, artist: str = "") -> List[Dict]:
    """
    Search Discogs for releases.

    Args:
        title: Track or album title
        artist: Optional artist name

    Returns:
        List of matching releases
    """
    headers = {
        "User-Agent": DISCOGS_USER_AGENT,
        "Accept": "application/json"
    }
    if DISCOGS_TOKEN:
        headers["Authorization"] = f"Discogs token={DISCOGS_TOKEN}"

    params = {
        "type": "release",
        "per_page": 10
    }

    if artist:
        params["q"] = f"{artist} - {title}"
    else:
        params["q"] = title

    try:
        time.sleep(1)  # Rate limiting
        response = requests.get(
            f"{DISCOGS_API_URL}/database/search",
            params=params,
            headers=headers,
            timeout=15
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        logger.error(f"Discogs API error: {e}")
        return []

    results = []
    for item in data.get("results", []):
        result = {
            "source": "Discogs",
            "id": item.get("id"),
            "title": item.get("title"),
            "type": item.get("type"),
            "year": item.get("year"),
            "country": item.get("country"),
            "genre": item.get("genre", []),
            "style": item.get("style", []),
            "label": item.get("label", []),
            "catno": item.get("catno"),
            "format": item.get("format", []),
            "thumb": item.get("thumb"),
            "uri": item.get("uri")
        }
        results.append(result)

    return results


# ============================================================================
# MLC (The Mechanical Licensing Collective) Public Search
# ============================================================================

MLC_SEARCH_URL = "https://www.themlc.com/search/works"


def search_mlc(title: str, writer: str = "") -> List[Dict]:
    """
    Search MLC public database for mechanical licensing info.
    Note: MLC may require scraping as they don't have a public API.

    Args:
        title: Song title
        writer: Optional writer name

    Returns:
        List of matching works with mechanical share info
    """
    # MLC doesn't have a public API - this is a placeholder
    # In production, you'd need to scrape their search page
    logger.warning("MLC search not yet implemented - requires web scraping")
    return []


# ============================================================================
# Spotify Search via Producer Tour API
# ============================================================================

PRODUCER_TOUR_API_URL = os.environ.get("PRODUCER_TOUR_API_URL", "http://localhost:3001")


def search_spotify(title: str, artist: str = "") -> Optional[Dict]:
    """
    Search Spotify via Producer Tour's API for track metadata.

    Args:
        title: Song title
        artist: Optional artist name

    Returns:
        Track info including popularity, ISRC, etc.
    """
    query = f"{artist} {title}" if artist else title

    try:
        response = requests.get(
            f"{PRODUCER_TOUR_API_URL}/api/spotify/search",
            params={"q": query, "limit": 1},
            timeout=5
        )

        if response.status_code == 503:
            logger.debug("Spotify API not configured")
            return None

        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("tracks"):
                track = data["tracks"][0]
                return {
                    "source": "Spotify",
                    "id": track.get("id"),
                    "name": track.get("name"),
                    "artist": track.get("artist"),
                    "album": track.get("album"),
                    "release_date": track.get("releaseDate"),
                    "isrc": track.get("isrc"),
                    "popularity": track.get("popularity"),
                    "duration_ms": track.get("duration"),
                    "image": track.get("image"),
                    "preview_url": track.get("previewUrl"),
                    "external_url": track.get("externalUrl")
                }

    except requests.exceptions.ConnectionError:
        logger.debug("Producer Tour API not available")
    except Exception as e:
        logger.debug(f"Spotify search error: {e}")

    return None


# ============================================================================
# Combined Cross-Check Function
# ============================================================================

def cross_check_song(
    title: str,
    artist: str = "",
    writer: str = "",
    isrc: str = "",
    iswc: str = "",
    sources: List[str] = None
) -> Dict[str, Any]:
    """
    Cross-check a song against multiple data sources.

    Args:
        title: Song title
        artist: Optional artist/performer name
        writer: Optional writer/composer name
        isrc: Optional ISRC code
        iswc: Optional ISWC code
        sources: List of sources to check (default: all)

    Returns:
        Dictionary with results from each source and analysis
    """
    if sources is None:
        sources = ["musicbrainz", "discogs", "spotify", "songview"]

    results = {
        "query": {
            "title": title,
            "artist": artist,
            "writer": writer,
            "isrc": isrc,
            "iswc": iswc
        },
        "sources": {},
        "analysis": {
            "found_isrcs": [],
            "found_iswcs": [],
            "found_artists": [],
            "found_writers": [],
            "found_publishers": [],
            "title_variations": [],
            "release_dates": [],
            "confidence_score": 0
        }
    }

    # MusicBrainz
    if "musicbrainz" in sources:
        try:
            mb_recordings = search_musicbrainz_recording(title, artist)
            mb_works = search_musicbrainz_work(title, writer or artist)

            results["sources"]["musicbrainz"] = {
                "recordings": mb_recordings[:5],
                "works": mb_works[:5],
                "found": len(mb_recordings) > 0 or len(mb_works) > 0
            }

            # Extract ISRCs and ISWCs
            for rec in mb_recordings:
                results["analysis"]["found_isrcs"].extend(rec.get("isrcs", []))
                if rec.get("artists"):
                    results["analysis"]["found_artists"].append(rec["artists"])

            for work in mb_works:
                results["analysis"]["found_iswcs"].extend(work.get("iswcs", []))
                for rel in work.get("relations", []):
                    if rel.get("name"):
                        results["analysis"]["found_writers"].append(rel["name"])

        except Exception as e:
            logger.error(f"MusicBrainz cross-check error: {e}")
            results["sources"]["musicbrainz"] = {"error": str(e), "found": False}

    # Discogs
    if "discogs" in sources:
        try:
            discogs_results = search_discogs(title, artist)
            results["sources"]["discogs"] = {
                "releases": discogs_results[:5],
                "found": len(discogs_results) > 0
            }

            # Extract release years and title variations
            for release in discogs_results:
                if release.get("year"):
                    results["analysis"]["release_dates"].append(str(release["year"]))
                if release.get("title") and release["title"] != title:
                    results["analysis"]["title_variations"].append(release["title"])

        except Exception as e:
            logger.error(f"Discogs cross-check error: {e}")
            results["sources"]["discogs"] = {"error": str(e), "found": False}

    # Spotify
    if "spotify" in sources:
        try:
            spotify_result = search_spotify(title, artist)
            if spotify_result:
                results["sources"]["spotify"] = {
                    "track": spotify_result,
                    "found": True
                }

                if spotify_result.get("isrc"):
                    results["analysis"]["found_isrcs"].append(spotify_result["isrc"])
                if spotify_result.get("artist"):
                    results["analysis"]["found_artists"].append(spotify_result["artist"])
            else:
                results["sources"]["spotify"] = {"found": False}

        except Exception as e:
            logger.error(f"Spotify cross-check error: {e}")
            results["sources"]["spotify"] = {"error": str(e), "found": False}

    # Deduplicate and clean analysis
    results["analysis"]["found_isrcs"] = list(set(results["analysis"]["found_isrcs"]))
    results["analysis"]["found_iswcs"] = list(set(results["analysis"]["found_iswcs"]))
    results["analysis"]["found_artists"] = list(set(results["analysis"]["found_artists"]))
    results["analysis"]["found_writers"] = list(set(results["analysis"]["found_writers"]))
    results["analysis"]["title_variations"] = list(set(results["analysis"]["title_variations"]))
    results["analysis"]["release_dates"] = sorted(list(set(results["analysis"]["release_dates"])))

    # Calculate confidence score
    confidence = 0
    sources_found = sum(1 for s in results["sources"].values() if s.get("found"))
    confidence += sources_found * 20  # Up to 60 points for source matches

    if results["analysis"]["found_isrcs"]:
        confidence += 15
    if results["analysis"]["found_iswcs"]:
        confidence += 15
    if results["analysis"]["found_writers"]:
        confidence += 10

    results["analysis"]["confidence_score"] = min(confidence, 100)

    return results


# ============================================================================
# Batch Cross-Check for Catalog
# ============================================================================

def cross_check_catalog(
    songs: List[Dict],
    sources: List[str] = None,
    progress_callback=None
) -> List[Dict]:
    """
    Cross-check an entire catalog against multiple sources.

    Args:
        songs: List of song dictionaries with title, artist, etc.
        sources: List of sources to check
        progress_callback: Optional callback for progress updates (current, total)

    Returns:
        List of cross-check results for each song
    """
    results = []
    total = len(songs)

    for i, song in enumerate(songs):
        if progress_callback:
            progress_callback(i + 1, total)

        result = cross_check_song(
            title=song.get("title", ""),
            artist=song.get("artist", song.get("performer", "")),
            writer=song.get("writer", ""),
            isrc=song.get("isrc", ""),
            iswc=song.get("iswc", ""),
            sources=sources
        )

        result["original"] = song
        results.append(result)

        # Small delay to be nice to APIs
        time.sleep(0.5)

    return results

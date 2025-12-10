#!/usr/bin/env python
"""
MusicScrap - Flask Web Application
Search BMI/ASCAP/Songview for music rights information.
Includes Leak Scanner for catalog analysis.
"""

import os
import io
import csv
import logging
from flask import Flask, flash, redirect, render_template, request, url_for, jsonify, send_file
from flask_bootstrap import Bootstrap
from werkzeug.utils import secure_filename
from music import query_api, scrape_songview, scrape_mlc, get_cover_art_batch, get_cover_art_itunes
import pandas as pd

# Import Leak Scanner modules
from data_sources import cross_check_song, cross_check_catalog
from metadata_score import calculate_metadata_score, score_catalog, export_score_results_to_dict
from leak_report import (
    generate_leak_report, leak_report_to_dict,
    export_report_json, export_report_html, quick_scan_summary
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['UPLOAD_FOLDER'] = '/tmp/musicscrap_uploads'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
Bootstrap(app)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.context_processor
def override_url_for():
    return dict(url_for=dated_url_for)


def dated_url_for(endpoint, **values):
    if endpoint == 'static':
        filename = values.get('filename', None)
        if filename:
            file_path = os.path.join(app.root_path, endpoint, filename)
            if os.path.exists(file_path):
                values['q'] = int(os.stat(file_path).st_mtime)
    return url_for(endpoint, **values)


@app.route('/')
def index():
    return render_template('index.html')


@app.route("/result", methods=['GET', 'POST'])
def result():
    import json
    results_list = []
    search_title = ''
    search_performer = ''

    if request.method == 'POST':
        search_title = request.form.get('title', '').strip()
        search_performer = request.form.get('performer', '').strip()

        if not search_title:
            flash('Please enter a song title to search.', 'warning')
            return redirect(url_for('index'))

        logger.info(f"Search request: title='{search_title}', performer='{search_performer}'")

        try:
            # Use the scrape function directly to get list of dicts
            results_list = scrape_songview(search_title, search_performer)
            logger.info(f"Search completed: {len(results_list)} results found")

            if not results_list:
                flash(f'No results found for "{search_title}". Try a different search term.', 'info')

        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            flash(f'An error occurred during search. Please try again.', 'error')
            results_list = []

    # Convert results to JSON for JavaScript
    results_json = json.dumps(results_list)

    return render_template(
        "result.html",
        results_json=results_json,
        search_title=search_title,
        search_performer=search_performer,
        result_count=len(results_list)
    )


@app.route("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "MusicScrap"}


# ============================================================================
# JSON API Endpoints for Lazy Loading
# ============================================================================

@app.route("/api/search", methods=['GET'])
def api_search():
    """
    JSON API endpoint for searching music data.
    Supports lazy loading with offset/limit.

    Query params:
        - title: Song title (required)
        - performer: Performer name (optional)
        - include_art: Whether to fetch cover art (default: true)
    """
    title = request.args.get('title', '').strip()
    performer = request.args.get('performer', '').strip()
    include_art = request.args.get('include_art', 'true').lower() == 'true'

    if not title:
        return jsonify({
            'error': 'Title parameter is required',
            'status': 'error'
        }), 400

    try:
        logger.info(f"API search: title='{title}', performer='{performer}'")

        # Scrape results
        results = scrape_songview(title, performer)

        # Add cover art if requested
        if include_art and results:
            results = get_cover_art_batch(results)

        return jsonify({
            'status': 'success',
            'query': {
                'title': title,
                'performer': performer
            },
            'results': results,
            'count': len(results)
        })

    except Exception as e:
        logger.error(f"API search error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500


@app.route("/api/cover-art", methods=['GET'])
def api_cover_art():
    """
    Fetch cover art for a single song.

    Query params:
        - title: Song title (required)
        - artist: Artist name (optional)
    """
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    cover_url = get_cover_art_itunes(title, artist)

    return jsonify({
        'title': title,
        'artist': artist,
        'cover_url': cover_url or None
    })


@app.route("/api/mlc", methods=['GET'])
def api_mlc_search():
    """
    Search the MLC (Mechanical Licensing Collective) public database.

    Returns mechanical royalty registration data including:
    - Work titles
    - HFA Song Codes
    - Writers/Composers
    - Publishers
    - ISWCs (when available)

    Query params:
        - title: Song title (required)
        - writer: Writer name (optional, for filtering)
    """
    title = request.args.get('title', '').strip()
    writer = request.args.get('writer', '').strip()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    logger.info(f"MLC API search: title='{title}', writer='{writer}'")

    try:
        results = scrape_mlc(title, writer)

        return jsonify({
            'status': 'success',
            'query': {
                'title': title,
                'writer': writer
            },
            'count': len(results),
            'results': results
        })

    except Exception as e:
        logger.error(f"MLC API error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500


# ============================================================================
# LEAK SCANNER ROUTES
# ============================================================================

@app.route("/leak-scanner")
def leak_scanner():
    """Leak Scanner home page - catalog upload."""
    return render_template('leak_scanner.html')


@app.route("/api/catalog/upload", methods=['POST'])
def upload_catalog():
    """
    Upload a catalog file (CSV or XLSX) for analysis.

    Expected columns:
        - title (required)
        - artist OR performer
        - writer (optional)
        - isrc (optional)
        - iswc (optional)
        - publisher (optional)

    Returns:
        Quick scan summary and catalog ID for full analysis
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload CSV or XLSX'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Parse the file
        if filename.endswith('.csv'):
            # Try different encodings
            content = file.read()
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
        else:
            df = pd.read_excel(file)

        # Normalize column names
        df.columns = [col.lower().strip().replace(' ', '_') for col in df.columns]

        # Map common column variations
        column_mapping = {
            'song_title': 'title',
            'track_title': 'title',
            'track_name': 'title',
            'song_name': 'title',
            'performer': 'artist',
            'artist_name': 'artist',
            'writer_name': 'writer',
            'composer': 'writer',
            'songwriter': 'writer'
        }

        for old_col, new_col in column_mapping.items():
            if old_col in df.columns and new_col not in df.columns:
                df.rename(columns={old_col: new_col}, inplace=True)

        # Validate required columns
        if 'title' not in df.columns:
            return jsonify({
                'error': 'Missing required column: title',
                'found_columns': list(df.columns)
            }), 400

        # Convert to list of dicts
        songs = df.fillna('').to_dict('records')

        # Run quick scan
        quick_summary = quick_scan_summary(songs)

        # Store songs in session or temp file for full scan
        import json
        import uuid
        catalog_id = str(uuid.uuid4())[:8]
        catalog_path = os.path.join(app.config['UPLOAD_FOLDER'], f'catalog_{catalog_id}.json')

        with open(catalog_path, 'w') as f:
            json.dump({
                'name': filename,
                'songs': songs,
                'uploaded_at': pd.Timestamp.now().isoformat()
            }, f)

        return jsonify({
            'status': 'success',
            'catalog_id': catalog_id,
            'filename': filename,
            'quick_summary': quick_summary,
            'message': f'Successfully parsed {len(songs)} songs'
        })

    except Exception as e:
        logger.error(f"Catalog upload error: {str(e)}")
        return jsonify({'error': f'Failed to parse file: {str(e)}'}), 500


@app.route("/api/catalog/<catalog_id>/scan", methods=['POST'])
def run_full_scan(catalog_id):
    """
    Run a full leak scan on a previously uploaded catalog.

    Args:
        catalog_id: ID returned from upload

    Returns:
        Full leak report
    """
    import json

    catalog_path = os.path.join(app.config['UPLOAD_FOLDER'], f'catalog_{catalog_id}.json')

    if not os.path.exists(catalog_path):
        return jsonify({'error': 'Catalog not found'}), 404

    try:
        with open(catalog_path, 'r') as f:
            catalog_data = json.load(f)

        songs = catalog_data['songs']
        catalog_name = catalog_data.get('name', f'Catalog {catalog_id}')

        # Get scan options from request
        options = request.get_json() or {}
        include_cross_check = options.get('cross_check', False)  # Disabled by default (slow)
        sources = options.get('sources', ['musicbrainz', 'spotify'])

        # Run cross-check if requested
        cross_check_results = None
        if include_cross_check:
            logger.info(f"Running cross-check on {len(songs)} songs...")
            cross_check_results = cross_check_catalog(songs, sources=sources)

        # Generate leak report
        logger.info(f"Generating leak report for {len(songs)} songs...")
        report = generate_leak_report(
            catalog_name=catalog_name,
            songs=songs,
            cross_check_results=cross_check_results,
            include_song_details=True
        )

        return jsonify({
            'status': 'success',
            'catalog_id': catalog_id,
            'report': leak_report_to_dict(report)
        })

    except Exception as e:
        logger.error(f"Scan error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Scan failed: {str(e)}'}), 500


@app.route("/api/catalog/<catalog_id>/report/<format>")
def download_report(catalog_id, format):
    """
    Download a leak report in specified format.

    Args:
        catalog_id: Catalog ID
        format: 'json' or 'html'
    """
    import json

    catalog_path = os.path.join(app.config['UPLOAD_FOLDER'], f'catalog_{catalog_id}.json')

    if not os.path.exists(catalog_path):
        return jsonify({'error': 'Catalog not found'}), 404

    try:
        with open(catalog_path, 'r') as f:
            catalog_data = json.load(f)

        # Generate report (simplified without cross-check for download)
        report = generate_leak_report(
            catalog_name=catalog_data.get('name', f'Catalog {catalog_id}'),
            songs=catalog_data['songs'],
            include_song_details=True
        )

        if format == 'json':
            json_content = export_report_json(report)
            return send_file(
                io.BytesIO(json_content.encode()),
                mimetype='application/json',
                as_attachment=True,
                download_name=f'leak_report_{catalog_id}.json'
            )
        elif format == 'html':
            html_content = export_report_html(report)
            return send_file(
                io.BytesIO(html_content.encode()),
                mimetype='text/html',
                as_attachment=True,
                download_name=f'leak_report_{catalog_id}.html'
            )
        else:
            return jsonify({'error': 'Invalid format. Use json or html'}), 400

    except Exception as e:
        logger.error(f"Report download error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route("/api/song/score", methods=['POST'])
def score_single_song():
    """
    Score a single song's metadata.

    Request body:
        - title (required)
        - artist (optional)
        - writer (optional)
        - isrc (optional)
        - iswc (optional)
        - publisher (optional)
        - cross_check (optional, default: true)
    """
    data = request.get_json()

    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    try:
        # Run cross-check if requested
        cross_check_results = None
        if data.get('cross_check', True):
            cross_check_results = cross_check_song(
                title=data['title'],
                artist=data.get('artist', ''),
                writer=data.get('writer', ''),
                isrc=data.get('isrc', ''),
                iswc=data.get('iswc', '')
            )

        # Search Songview for PRO data
        songview_results = scrape_songview(
            data['title'],
            data.get('artist', '')
        )

        # Calculate score
        score_result = calculate_metadata_score(
            song_data=data,
            cross_check_results=cross_check_results,
            songview_results=songview_results
        )

        return jsonify({
            'status': 'success',
            'song': data,
            'score': export_score_results_to_dict(score_result),
            'cross_check': cross_check_results,
            'songview_results': songview_results[:5] if songview_results else []
        })

    except Exception as e:
        logger.error(f"Song score error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route("/api/song/cross-check", methods=['GET'])
def cross_check_single():
    """
    Cross-check a single song against external databases.

    Query params:
        - title (required)
        - artist (optional)
        - writer (optional)
        - sources (optional, comma-separated: musicbrainz,discogs,spotify)
    """
    title = request.args.get('title', '').strip()
    artist = request.args.get('artist', '').strip()
    writer = request.args.get('writer', '').strip()
    sources_param = request.args.get('sources', '')

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    sources = sources_param.split(',') if sources_param else None

    try:
        results = cross_check_song(
            title=title,
            artist=artist,
            writer=writer,
            sources=sources
        )

        return jsonify({
            'status': 'success',
            'results': results
        })

    except Exception as e:
        logger.error(f"Cross-check error: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('Starting MusicScrap server...')
    print('Access the app at: http://127.0.0.1:5001')
    app.run(debug=True, host='0.0.0.0', port=5001)

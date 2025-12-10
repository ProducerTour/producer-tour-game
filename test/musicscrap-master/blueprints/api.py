from flask import Blueprint, request, jsonify
from scraper.music_scraper import MusicScraper
from scraper.exceptions import ScrapingError
import asyncio

api_bp = Blueprint('api', __name__)

@api_bp.route('/search', methods=['GET'])
def search_api():
    """API endpoint for searching music data"""
    try:
        title = request.args.get('title', '').strip()
        performer = request.args.get('performer', '').strip()

        if not title:
            return jsonify({
                'error': 'Title parameter is required',
                'status': 'error'
            }), 400

        # Create scraper and run search
        scraper = MusicScraper()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            results_df = loop.run_until_complete(scraper.scrape_music_data(title, performer))
            loop.close()

            # Convert DataFrame to dict
            results = results_df.to_dict('records') if not results_df.empty else []

            return jsonify({
                'status': 'success',
                'query': {
                    'title': title,
                    'performer': performer
                },
                'results': results,
                'count': len(results)
            })

        except ScrapingError as e:
            loop.close()
            return jsonify({
                'error': str(e),
                'status': 'error'
            }), 500

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'status': 'error'
        }), 500

@api_bp.route('/health', methods=['GET'])
def api_health():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'MusicScrap API',
        'version': '2.0.0'
    })

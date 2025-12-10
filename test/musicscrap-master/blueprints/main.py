import asyncio
from flask import Blueprint, render_template, request, flash, redirect, url_for
from wtforms import Form, StringField, validators
from wtforms.validators import Regexp
from scraper.music_scraper import MusicScraper
from scraper.exceptions import ScrapingError
from flask import current_app, session
import pandas as pd

main_bp = Blueprint('main', __name__)

# Initialize limiter for this blueprint
limiter = Limiter(key_func=get_remote_address)

class SearchForm(Form):
    title = StringField('Release Title', [
        validators.DataRequired(),
        validators.Length(min=1, max=200),
        Regexp(r"^[a-zA-Z0-9\s\-'.,&()]+$", message="Invalid characters in title")
    ])
    performer = StringField('Performer', [
        validators.Optional(),
        validators.Length(max=200)
    ])

@main_bp.route('/', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def index():
    form = SearchForm(request.form)

    if request.method == 'POST' and form.validate():
        title = form.title.data.strip()
        performer = form.performer.data.strip() if form.performer.data else ""

        # Additional sanitization
        import html
        import re
        title = html.escape(title)
        if performer:
            performer = html.escape(performer)
            # Validate performer input
            if not re.match(r"^[a-zA-Z0-9\s\-'.,&()]+$", performer):
                flash('Invalid characters in performer name.', 'error')
                return redirect(url_for('main.index'))

        try:
            # Create cache key
            cache_key = hashlib.md5(f"{title}|{performer}".encode()).hexdigest()
            cache = current_app.cache

            # Check cache first
            cached_results = cache.get(cache_key)
            if cached_results:
                # Save search history
                search_history = SearchHistory(
                    title=title,
                    performer=performer or "",
                    results_count=len(cached_results),
                    cached=True
                )
                db.session.add(search_history)
                db.session.commit()
                return render_template('results.html', results=cached_results, title=title, performer=performer, cached=True)

            scraper = MusicScraper()
            # Run scraping in thread pool to avoid blocking
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            results_df = loop.run_until_complete(scraper.scrape_music_data(title, performer))
            loop.close()

            if results_df.empty:
                flash('No results found for the given search criteria.', 'warning')
                return redirect(url_for('main.index'))

            # Convert DataFrame to dict for template
            results = results_df.to_dict('records')

            # Save search history
            search_history = SearchHistory(
                title=title,
                performer=performer or "",
                results_count=len(results),
                cached=False
            )
            db.session.add(search_history)
            db.session.commit()

            # Cache the results
            cache.set(cache_key, results, timeout=3600)  # Cache for 1 hour

            return render_template('results.html', results=results, title=title, performer=performer, cached=False)

        except ScrapingError as e:
            flash(f'Scraping error: {str(e)}', 'error')
        except Exception as e:
            flash(f'An unexpected error occurred: {str(e)}', 'error')

    return render_template('index.html', form=form)

@main_bp.route('/health')
def health():
    return {'status': 'healthy', 'service': 'MusicScrap'}

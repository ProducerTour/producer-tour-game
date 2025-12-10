import unittest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from blueprints.main import main_bp, SearchForm
import pandas as pd

class TestMainBlueprint(unittest.TestCase):

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.app.config['SECRET_KEY'] = 'test-secret-key'
        self.app.register_blueprint(main_bp)
        self.client = self.app.test_client()

    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {'status': 'healthy', 'service': 'MusicScrap'})

    def test_index_get(self):
        """Test index page GET request"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'MusicScrap', response.data)

    def test_search_form_validation(self):
        """Test search form validation"""
        form = SearchForm()
        self.assertFalse(form.validate())

        form = SearchForm(title="Test Song")
        self.assertTrue(form.validate())

        form = SearchForm(title="Test Song", performer="Test Performer")
        self.assertTrue(form.validate())

    def test_search_form_invalid_characters(self):
        """Test search form with invalid characters"""
        form = SearchForm(title="Test<script>alert('xss')</script>Song")
        self.assertFalse(form.validate())

    @patch('blueprints.main.MusicScraper')
    def test_search_success(self, mock_scraper_class):
        """Test successful search"""
        # Mock the scraper
        mock_scraper = Mock()
        mock_scraper_class.return_value = mock_scraper

        # Mock the dataframe result
        mock_df = pd.DataFrame({
            'Source': ['ASCAP'],
            'Titles': ['Test Song'],
            'Writers': ['Test Writer'],
            'Performers': ['Test Performer']
        })
        mock_scraper.scrape_music_data.return_value = mock_df

        response = self.client.post('/', data={
            'title': 'Test Song',
            'performer': 'Test Performer'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Test Song', response.data)

    @patch('blueprints.main.MusicScraper')
    def test_search_no_results(self, mock_scraper_class):
        """Test search with no results"""
        mock_scraper = Mock()
        mock_scraper_class.return_value = mock_scraper

        mock_df = pd.DataFrame()  # Empty dataframe
        mock_scraper.scrape_music_data.return_value = mock_df

        response = self.client.post('/', data={
            'title': 'Nonexistent Song'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'No results found', response.data)

    @patch('blueprints.main.MusicScraper')
    def test_search_scraping_error(self, mock_scraper_class):
        """Test search with scraping error"""
        mock_scraper = Mock()
        mock_scraper_class.return_value = mock_scraper

        from scraper.exceptions import ScrapingError
        mock_scraper.scrape_music_data.side_effect = ScrapingError("Test error")

        response = self.client.post('/', data={
            'title': 'Test Song'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Scraping error', response.data)

if __name__ == '__main__':
    unittest.main()

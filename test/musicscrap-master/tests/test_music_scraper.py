import unittest
from unittest.mock import Mock, patch, MagicMock
import pandas as pd
from scraper.music_scraper import MusicScraper
from scraper.exceptions import ScrapingError, BMIScrapingError, ASCAPApiError


class TestMusicScraper(unittest.TestCase):
    def setUp(self):
        self.scraper = MusicScraper()

    def tearDown(self):
        self.scraper.__del__()

    @patch('scraper.music_scraper.webdriver.Chrome')
    def test_bmi_scraping_success(self, mock_chrome):
        # Mock the webdriver
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        # Mock page source with sample BMI data
        mock_driver.page_source = """
        <html>
        <body>
            <tr class='work-title-header'>
                <td class='work_title'>Test Song</td>
            </tr>
            <div class='table-responsive'>
                <a href='writerid=1'>John Doe</a>
                <a href='artistid=1'>Jane Smith</a>
            </div>
        </body>
        </html>
        """

        # Mock WebDriverWait
        with patch('scraper.music_scraper.WebDriverWait') as mock_wait:
            mock_element = Mock()
            mock_element.send_keys = Mock()
            mock_element.click = Mock()
            mock_wait.return_value.until.return_value = mock_element

            result = self.scraper._scrape_bmi("Test Song")

            self.assertIsNotNone(result)
            self.assertEqual(len(result), 1)
            self.assertEqual(result.iloc[0]['Source'], 'BMI')
            self.assertEqual(result.iloc[0]['Titles'], 'Test Song')

    @patch('scraper.music_scraper.requests.get')
    def test_ascap_scraping_success(self, mock_get):
        # Mock the requests response
        mock_response = Mock()
        mock_response.json.return_value = {
            'result': [{
                'workTitle': 'Test Song',
                'interestedParties': [
                    {'roleCde': 'W', 'fullName': 'John Doe'},
                    {'roleCde': 'P', 'fullName': 'Jane Smith'}
                ]
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_ascap("Test Song", "Jane Smith")

        self.assertIsNotNone(result)
        self.assertEqual(len(result), 1)
        self.assertEqual(result.iloc[0]['Source'], 'ASCAP')
        self.assertEqual(result.iloc[0]['Titles'], 'Test Song')

    @patch('scraper.music_scraper.webdriver.Chrome')
    def test_bmi_scraping_no_results(self, mock_chrome):
        # Mock the webdriver
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        # Mock empty page source
        mock_driver.page_source = "<html><body></body></html>"

        # Mock WebDriverWait
        with patch('scraper.music_scraper.WebDriverWait') as mock_wait:
            mock_element = Mock()
            mock_wait.return_value.until.return_value = mock_element

            result = self.scraper._scrape_bmi("Nonexistent Song")

            self.assertIsNone(result)

    @patch('scraper.music_scraper.requests.get')
    def test_ascap_scraping_no_results(self, mock_get):
        # Mock the requests response with no results
        mock_response = Mock()
        mock_response.json.return_value = {'result': []}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_ascap("Nonexistent Song", "")

        self.assertIsNone(result)

    @patch('scraper.music_scraper.webdriver.Chrome')
    def test_bmi_scraping_error(self, mock_chrome):
        # Mock the webdriver to raise an exception
        mock_chrome.side_effect = Exception("Chrome error")

        with self.assertRaises(BMIScrapingError):
            self.scraper._scrape_bmi("Test Song")

    @patch('scraper.music_scraper.requests.get')
    def test_ascap_scraping_error(self, mock_get):
        # Mock the requests to raise an exception
        mock_get.side_effect = Exception("Request error")

        with self.assertRaises(ASCAPApiError):
            self.scraper._scrape_ascap("Test Song", "")

    @patch('scraper.music_scraper.webdriver.Chrome')
    @patch('scraper.music_scraper.requests.get')
    def test_combined_scraping(self, mock_get, mock_chrome):
        # Mock BMI webdriver
        mock_bmi_driver = Mock()
        mock_chrome.return_value = mock_bmi_driver
        mock_bmi_driver.page_source = """
        <html>
        <body>
            <tr class='work-title-header'>
                <td class='work_title'>Test Song</td>
            </tr>
        </body>
        </html>
        """

        # Mock ASCAP response
        mock_ascap_response = Mock()
        mock_ascap_response.json.return_value = {'result': []}
        mock_ascap_response.raise_for_status = Mock()
        mock_get.return_value = mock_ascap_response

        # Mock WebDriverWait
        with patch('scraper.music_scraper.WebDriverWait') as mock_wait:
            mock_element = Mock()
            mock_wait.return_value.until.return_value = mock_element

            async def run_scrape():
                return await self.scraper.scrape_music_data("Test Song", "")

            result = asyncio.run(run_scrape())

            self.assertIsNotNone(result)
            self.assertFalse(result.empty)
            self.assertEqual(result.iloc[0]['Source'], 'BMI')


if __name__ == '__main__':
    unittest.main()

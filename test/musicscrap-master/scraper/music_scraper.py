import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
import pandas as pd
from .exceptions import ScrapingError, BMIScrapingError, ASCAPApiError, NetworkError

logger = logging.getLogger(__name__)

class MusicScraper:
    def __init__(self):
        self.chrome_options = Options()
        self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--window-size=1920,1080")
        # Performance optimizations
        self.chrome_options.add_argument("--disable-extensions")
        self.chrome_options.add_argument("--disable-plugins")
        self.chrome_options.add_argument("--disable-images")
        self.chrome_options.add_argument("--disable-javascript")
        self.chrome_options.add_argument("--disable-css")
        self.chrome_options.add_argument("--disable-web-security")
        self.chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        self.chrome_options.add_argument("--page-load-strategy=eager")
        self.chrome_options.add_experimental_option("useAutomationExtension", False)
        self.chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.executor = ThreadPoolExecutor(max_workers=2)

    async def scrape_music_data(self, songtitle: str, performer: str = "") -> pd.DataFrame:
        """Main method to scrape music data from BMI and ASCAP"""
        try:
            # Run BMI and ASCAP scraping concurrently
            bmi_task = asyncio.get_event_loop().run_in_executor(
                self.executor, self._scrape_bmi, songtitle
            )
            ascap_task = asyncio.get_event_loop().run_in_executor(
                self.executor, self._scrape_ascap, songtitle, performer
            )

            bmi_results, ascap_results = await asyncio.gather(bmi_task, ascap_task)

            # Combine results
            if bmi_results and ascap_results:
                combined_df = pd.concat([bmi_results, ascap_results], ignore_index=True)
            elif bmi_results:
                combined_df = bmi_results
            elif ascap_results:
                combined_df = ascap_results
            else:
                combined_df = pd.DataFrame()

            return combined_df.fillna('-')

        except Exception as e:
            logger.error(f"Error in scrape_music_data: {e}")
            raise ScrapingError(f"Failed to scrape music data: {str(e)}")

    def _scrape_bmi(self, songtitle: str) -> Optional[pd.DataFrame]:
        """Scrape BMI database"""
        driver = None
        try:
            logger.info(f"Starting BMI scrape for: {songtitle}")
            driver = webdriver.Chrome(
                ChromeDriverManager().install(),
                options=self.chrome_options
            )

            driver.get("http://repertoire.bmi.com/StartPage.aspx")

            # Wait for page load and find search elements
            search_bar = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.ID, "searchControl_txtSearchFor"))
            )
            search_bar.clear()
            search_bar.send_keys(songtitle)

            # Select artists search
            artist_checkbox = driver.find_element(By.ID, "searchControl_incArtists")
            if not artist_checkbox.is_selected():
                artist_checkbox.click()

            # Submit search
            submit_btn = driver.find_element(By.ID, "searchControl_btnSubmit")
            submit_btn.click()

            # Wait for results
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "btnSubmit"))
            )

            # Click submit on results page
            driver.find_element(By.ID, "btnSubmit").click()

            # Parse results
            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            titles = []
            writers = []
            artists = []

            # Extract titles
            title_elements = soup.find_all('tr', class_='work-title-header')
            for tr in title_elements:
                title_td = tr.find('td', class_='work_title')
                if title_td:
                    titles.append(title_td.get_text().strip().title())

            # Extract writers and artists
            table_containers = soup.find_all('div', class_='table-responsive')
            for container in table_containers:
                writer_links = container.find_all('a', href=lambda x: x and 'writerid' in x)
                artist_links = container.find_all('a', href=lambda x: x and 'artistid' in x)

                writers.append(', '.join([a.get_text().strip().title() for a in writer_links]))
                artists.append(', '.join([a.get_text().strip().title() for a in artist_links]))

            if not titles:
                logger.info("No BMI results found")
                return None

            return pd.DataFrame({
                'Source': 'BMI',
                'Titles': titles,
                'Writers': writers,
                'Performers': artists
            })

        except Exception as e:
            logger.error(f"BMI scraping error: {e}")
            raise BMIScrapingError(f"BMI scraping failed: {str(e)}")
        finally:
            if driver:
                driver.quit()

    def _scrape_ascap(self, songtitle: str, performer: str = "") -> Optional[pd.DataFrame]:
        """Scrape ASCAP API"""
        try:
            logger.info(f"Starting ASCAP scrape for: {songtitle}, performer: {performer}")

            if performer:
                url = f"https://www.ascap.com/api/wservice/MobileWeb/service/ace/api/v2.0/search/title/{songtitle}?limit=100&page=1&universe=IncludeATT&searchType2=perfName&searchValue2={performer}"
            else:
                url = f"https://www.ascap.com/api/wservice/MobileWeb/service/ace/api/v2.0/works/details?limit=100&page=1&universe=IncludeATT&workTitle={songtitle}"

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            data = response.json()

            if data.get('result') is None or data.get('result') == []:
                logger.info("No ASCAP results found")
                return None

            titles = []
            writers = []
            performers = []

            for result in data['result']:
                titles.append(result.get('workTitle', '').title())

                # Extract writers
                writer_names = []
                performer_names = []

                for party in result.get('interestedParties', []):
                    if party.get('roleCde') == 'W':
                        writer_names.append(party.get('fullName', '').title())
                    elif party.get('roleCde') == 'P':
                        performer_names.append(party.get('fullName', '').title())

                writers.append(', '.join(writer_names))
                performers.append(', '.join(performer_names))

            return pd.DataFrame({
                'Source': 'ASCAP',
                'Titles': titles,
                'Writers': writers,
                'Performers': performers
            })

        except requests.RequestException as e:
            logger.error(f"ASCAP API request error: {e}")
            raise NetworkError(f"ASCAP API request failed: {str(e)}")
        except Exception as e:
            logger.error(f"ASCAP scraping error: {e}")
            raise ASCAPApiError(f"ASCAP scraping failed: {str(e)}")

    def __del__(self):
        """Cleanup executor"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)

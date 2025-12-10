"""
MusicScrap - BMI/ASCAP/Songview Music Rights Scraper
Updated for 2024-2025+ compatibility

This module scrapes the Songview database (joint ASCAP/BMI) for music rights information.
"""

import os
import requests
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import pandas as pd
import logging
import sys
import time
import re
from urllib.parse import quote_plus
import json
from functools import lru_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


def get_chrome_options():
    """Configure Chrome options for headless scraping."""
    options = Options()
    options.add_argument("--headless=new")  # New headless mode
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    # Set a realistic user agent
    options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    return options


def create_driver():
    """Create and configure a Chrome WebDriver instance."""
    logger.info("Initializing Chrome WebDriver...")
    try:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=get_chrome_options())
        # Remove webdriver property to avoid detection
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            '''
        })
        return driver
    except Exception as e:
        logger.error(f"Failed to create WebDriver: {str(e)}")
        raise


def extract_all_metadata_from_detail(soup) -> dict:
    """
    Extract ALL metadata from BMI Songview expanded detail section.

    This extracts:
    - ISWC (International Standard Musical Work Code)
    - BMI Work ID and ASCAP Work ID
    - All Writers/Composers with IPI numbers
    - All Publishers with IPI numbers
    - Performers
    - Percentage controlled (BMI/ASCAP splits)

    Args:
        soup: BeautifulSoup object of the expanded page

    Returns:
        Dictionary with all extracted metadata
    """
    metadata = {
        'iswc': '',
        'bmi_work_id': '',
        'ascap_work_id': '',
        'writers': [],          # List of {name, affiliation, ipi}
        'publishers': [],       # List of {name, affiliation, ipi}
        'performers': [],
        'writer_percent_bmi': '',
        'writer_percent_ascap': '',
        'publisher_percent_bmi': '',
        'publisher_percent_ascap': '',
    }

    # =========================================================================
    # Extract ISWC
    # =========================================================================
    iswc_header = soup.find('strong', string=re.compile(r'^\s*ISWC\s*$', re.I))
    if iswc_header:
        parent_tr = iswc_header.find_parent('tr')
        if parent_tr:
            next_row = parent_tr.find_next_sibling('tr')
            if next_row and 'soc-details-row' in next_row.get('class', []):
                iswc_td = next_row.find('td')
                if iswc_td:
                    iswc_text = iswc_td.get_text(strip=True)
                    if re.match(r'^T\d{9,11}$', iswc_text):
                        metadata['iswc'] = iswc_text

    # =========================================================================
    # Extract Work IDs (BMI and ASCAP)
    # =========================================================================
    work_id_rows = soup.select('tr.soc-details-row')
    for row in work_id_rows:
        tds = row.find_all('td')
        if len(tds) >= 4:
            society = tds[0].get_text(strip=True)
            work_id = tds[3].get_text(strip=True) if len(tds) > 3 else ''
            if society == 'BMI' and work_id and work_id.isdigit():
                metadata['bmi_work_id'] = work_id
            elif society == 'ASCAP' and work_id and work_id.isdigit():
                metadata['ascap_work_id'] = work_id

    # =========================================================================
    # Extract Writers / Composers with IPI numbers
    # =========================================================================
    # Writers use a SIMPLE table structure (unlike Publishers which use nested expandable tables)
    # IMPORTANT: Match PLURAL "Writers / Composers" (actual table), NOT singular "Writer / Composer" (percentage section)
    writers_section = soup.find('strong', class_='title', string=re.compile(r'Writers\s*/\s*Composers', re.I))
    if writers_section:
        # Find the next table (simple structure, no class="style-01")
        writers_table = writers_section.find_next('table')
        if writers_table:
            tbody = writers_table.find('tbody')
            if tbody:
                for row in tbody.find_all('tr'):
                    tds = row.find_all('td')
                    if len(tds) >= 3:
                        # Writer name is in <a> tag within first td
                        name_td = tds[0]
                        name_link = name_td.find('a')
                        writer_name = name_link.get_text(strip=True) if name_link else name_td.get_text(strip=True)

                        affiliation = tds[1].get_text(strip=True) if len(tds) > 1 else ''
                        ipi = tds[2].get_text(strip=True) if len(tds) > 2 else ''

                        # Filter out non-writer rows (must have valid IPI number)
                        if writer_name and ipi and re.match(r'^\d{8,11}$', ipi):
                            metadata['writers'].append({
                                'name': writer_name,
                                'affiliation': affiliation,
                                'ipi': ipi
                            })

    # =========================================================================
    # Extract Publishers with IPI numbers
    # =========================================================================
    publishers_section = soup.find('strong', class_='title', string=re.compile(r'^Publishers?$', re.I))
    if publishers_section:
        # Look for percentage controlled
        parent_block = publishers_section.find_parent('div', class_='details-content-block-03')
        if parent_block:
            percent_spans = parent_block.select('.value-info-row .content')
            for span in percent_spans:
                text = span.get_text(strip=True)
                if 'BMI:' in text:
                    metadata['publisher_percent_bmi'] = text.replace('BMI:', '').strip()
                elif 'Ascap:' in text or 'ASCAP:' in text:
                    metadata['publisher_percent_ascap'] = text.replace('Ascap:', '').replace('ASCAP:', '').strip()

        # Find the publishers table (structure is more complex with expandable rows)
        publishers_table = publishers_section.find_next('table', class_='style-01')
        if publishers_table:
            # Publishers are in nested tables with class 'expandable'
            expandable_cells = publishers_table.select('td.expandable table')
            for nested_table in expandable_cells:
                # First row has publisher name, affiliation, IPI
                first_row = nested_table.find('tr')
                if first_row:
                    tds = first_row.find_all('td')
                    if len(tds) >= 3:
                        # Publisher name is in td.e-header with an <a> tag
                        header_td = first_row.find('td', class_='e-header')
                        if header_td:
                            name_link = header_td.find('a', class_='expander')
                            pub_name = name_link.get_text(strip=True) if name_link else ''
                        else:
                            pub_name = tds[0].get_text(strip=True)

                        affiliation = tds[1].get_text(strip=True) if len(tds) > 1 else ''
                        ipi = tds[2].get_text(strip=True) if len(tds) > 2 else ''

                        if pub_name and 'View Catalog' not in pub_name:
                            metadata['publishers'].append({
                                'name': pub_name,
                                'affiliation': affiliation,
                                'ipi': ipi
                            })

    # =========================================================================
    # Extract Performers
    # =========================================================================
    performers_section = soup.find('strong', class_='title', string=re.compile(r'^Performers?$', re.I))
    if performers_section:
        performers_list = performers_section.find_next('ul', class_='items-list')
        if performers_list:
            for li in performers_list.find_all('li'):
                performer = li.get_text(strip=True)
                if performer:
                    metadata['performers'].append(performer)

    return metadata


def extract_iswc_from_detail(soup, detail_sections) -> str:
    """
    Extract ISWC from BMI Songview expanded detail section.
    Legacy wrapper - now uses extract_all_metadata_from_detail().
    """
    metadata = extract_all_metadata_from_detail(soup)
    return metadata.get('iswc', '')


def extract_publishers_from_detail(soup) -> str:
    """
    Extract publishers from BMI Songview expanded detail section.
    Legacy wrapper - now uses extract_all_metadata_from_detail().
    """
    metadata = extract_all_metadata_from_detail(soup)
    publishers = metadata.get('publishers', [])
    return ', '.join([p['name'] for p in publishers]) if publishers else ""


def scrape_songview(title: str, performer: str = "") -> list:
    """
    Scrape the Songview database (joint ASCAP/BMI) for music rights information.

    Args:
        title: Song title to search for
        performer: Optional performer name to filter results

    Returns:
        List of dictionaries containing song information
    """
    logger.info(f">>> Starting Songview search for: '{title}'" + (f" by '{performer}'" if performer else ""))

    driver = None
    results = []

    try:
        driver = create_driver()

        # Navigate to BMI Songview
        logger.info("Navigating to Songview (repertoire.bmi.com)...")
        driver.get("https://repertoire.bmi.com/")

        # Wait for page to fully load
        logger.info("Waiting for page to load...")
        time.sleep(4)

        # Find the main search input using the correct ID
        try:
            search_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "Main_Search_Text"))
            )
            logger.info("Found main search input (#Main_Search_Text)")
        except TimeoutException:
            logger.error("Could not find Main_Search_Text input")
            with open("/tmp/bmi_page_debug.html", "w") as f:
                f.write(driver.page_source)
            logger.info("Saved page HTML to /tmp/bmi_page_debug.html for debugging")
            return results

        # Clear and enter search title
        search_input.clear()
        search_input.send_keys(title)
        logger.info(f"Entered search title: '{title}'")

        # If performer provided, use the secondary search field
        if performer:
            try:
                # BMI uses JCF (jQuery Custom Form) which hides the real select
                # We need to use JavaScript to set the hidden input value directly
                # and trigger the onchange handlers

                # Set the sub_search type to Performer (data-id=2)
                driver.execute_script("""
                    // Set the hidden input that tracks the selection
                    var subSearchInput = document.getElementById('subSearch');
                    if (subSearchInput) subSearchInput.value = 'Performer';

                    // Also set the select element's value to trigger proper state
                    var selectElem = document.getElementById('selectSubSearch');
                    if (selectElem) {
                        // Find the Performer option and select it
                        for (var i = 0; i < selectElem.options.length; i++) {
                            if (selectElem.options[i].text === 'Performer' ||
                                selectElem.options[i].getAttribute('data-key') === 'Performer') {
                                selectElem.selectedIndex = i;
                                break;
                            }
                        }
                        // Trigger change event to update the UI and enable the text input
                        var event = new Event('change', { bubbles: true });
                        selectElem.dispatchEvent(event);
                    }

                    // Call BMI's checkSecondSel function if it exists
                    if (typeof checkSecondSel === 'function') {
                        checkSecondSel();
                    }
                """)
                time.sleep(0.5)  # Wait for dropdown change to register

                sub_search_input = driver.find_element(By.ID, "Sub_Search_Text")
                # Wait for input to be enabled (it's disabled until dropdown is selected)
                WebDriverWait(driver, 5).until(
                    lambda d: not d.find_element(By.ID, "Sub_Search_Text").get_attribute("disabled")
                )
                sub_search_input.clear()
                sub_search_input.send_keys(performer)
                logger.info(f"Entered performer filter: '{performer}'")
            except Exception as e:
                logger.warning(f"Could not set performer filter: {e}")

        # Click the search button using JavaScript to trigger the Search() function
        try:
            driver.execute_script("Search();")
            logger.info("Triggered Search() JavaScript function")
        except Exception as e:
            logger.warning(f"Could not call Search() function: {e}")
            try:
                search_btn = driver.find_element(By.ID, "btnSearch")
                driver.execute_script("arguments[0].click();", search_btn)
                logger.info("Clicked search button as fallback")
            except Exception as e2:
                search_input.send_keys(Keys.RETURN)
                logger.info("Pressed Enter to submit as last resort")

        # Wait for page navigation
        logger.info("Waiting for search to process...")
        time.sleep(4)

        # Check if we hit the disclaimer page and accept it
        current_url = driver.current_url
        logger.info(f"Current URL: {current_url}")

        if "Disclaimer" in current_url:
            logger.info("Disclaimer page detected, clicking Accept button...")
            try:
                # Try clicking the Accept button
                accept_btn = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.ID, "btnAccept"))
                )
                driver.execute_script("arguments[0].click();", accept_btn)
                logger.info("Clicked Accept button")
                time.sleep(3)
            except Exception as e:
                logger.warning(f"Could not click Accept button: {e}")
                # Try calling the JavaScript function directly
                try:
                    driver.execute_script("createDisclaimer();")
                    logger.info("Called createDisclaimer() JavaScript function")
                    time.sleep(3)
                except Exception as e2:
                    logger.error(f"Could not accept disclaimer: {e2}")

        # Wait for results page to load
        logger.info("Waiting for results to load...")
        time.sleep(5)

        # Check current URL after disclaimer
        current_url = driver.current_url
        logger.info(f"Current URL after disclaimer: {current_url}")

        # Get page source for parsing
        html = driver.page_source

        # Save HTML for debugging
        with open("/tmp/bmi_results_debug.html", "w") as f:
            f.write(html)
        logger.info("Saved results HTML to /tmp/bmi_results_debug.html")

        # Parse results
        soup = BeautifulSoup(html, 'html.parser')

        # Check for actual "0 results" message
        results_count_elem = soup.select_one('#results-count')
        if results_count_elem:
            count_text = results_count_elem.get_text().strip()
            logger.info(f"Results count text: {count_text}")
            # Only consider it "0 results" if explicitly "0 results found" (not "1,000 results found")
            if re.search(r'^\s*0\s+results', count_text, re.I):
                logger.info("Page indicates 0 results found")
                return results

        # BMI Songview uses "a.opener.result-row-small-browser" for each result row
        # The ISWC is in the EXPANDED detail section, so we need to click each row
        result_rows = soup.select('a.opener.result-row-small-browser')
        logger.info(f"Found {len(result_rows)} result rows (a.opener.result-row-small-browser)")

        # Parse each result row - need to click to expand and get ALL metadata
        for i, row in enumerate(result_rows[:20]):  # Limit to top 20 results
            # First parse basic info from collapsed row
            result = parse_songview_result(row, None)
            if result and result.get('title'):
                # Click row to expand and extract ALL metadata
                try:
                    row_elements = driver.find_elements(By.CSS_SELECTOR, 'a.opener.result-row-small-browser')
                    if i < len(row_elements):
                        driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", row_elements[i])
                        time.sleep(0.3)
                        driver.execute_script("arguments[0].click();", row_elements[i])
                        time.sleep(0.8)

                        # Get updated page and extract ALL metadata
                        updated_html = driver.page_source
                        updated_soup = BeautifulSoup(updated_html, 'html.parser')
                        metadata = extract_all_metadata_from_detail(updated_soup)

                        # Update result with extracted metadata
                        if metadata['iswc']:
                            result['iswc'] = metadata['iswc']
                        if metadata['bmi_work_id']:
                            result['bmi_work_id'] = metadata['bmi_work_id']
                        if metadata['ascap_work_id']:
                            result['ascap_work_id'] = metadata['ascap_work_id']

                        # Use expanded writers/publishers (more complete than collapsed)
                        if metadata['writers']:
                            result['writers'] = ', '.join([w['name'] for w in metadata['writers']])
                            result['writers_detail'] = metadata['writers']  # Full detail with IPI
                        if metadata['publishers']:
                            result['publishers'] = ', '.join([p['name'] for p in metadata['publishers']])
                            result['publishers_detail'] = metadata['publishers']  # Full detail with IPI
                        if metadata['performers']:
                            result['performers'] = ', '.join(metadata['performers'])

                        # Collapse row
                        try:
                            driver.execute_script("arguments[0].click();", row_elements[i])
                            time.sleep(0.2)
                        except:
                            pass

                except Exception as e:
                    logger.debug(f"Could not expand row {i+1}: {e}")

                results.append(result)
                # Log extracted data
                writers_count = len(result.get('writers_detail', [])) if 'writers_detail' in result else 0
                pubs_count = len(result.get('publishers_detail', [])) if 'publishers_detail' in result else 0
                iswc_info = f" | ISWC: {result.get('iswc')}" if result.get('iswc') else ""
                work_ids = f" | BMI:{result.get('bmi_work_id', 'N/A')}" if result.get('bmi_work_id') else ""
                logger.info(f"Parsed {i+1}: '{result.get('title')}' | {writers_count} writers | {pubs_count} publishers{iswc_info}{work_ids}")

        # If no results from the main selector, try alternative parsing
        if not results:
            logger.info("No results from primary selector, trying alternatives...")
            # Try finding any song-title elements
            song_titles = soup.select('td.song-title')
            logger.info(f"Found {len(song_titles)} song-title elements")
            for title_elem in song_titles:
                title_text = title_elem.get_text(strip=True)
                # Clean up title text (remove tooltip text)
                title_text = re.sub(r'BMI Award Winning Song', '', title_text).strip()
                if title_text and title_text != "BMI Award Winning Song":
                    result = {
                        'source': 'Songview',
                        'title': title_text,
                        'writers': '',
                        'performers': '',
                        'publishers': ''
                    }
                    results.append(result)

        logger.info(f">>> Songview search complete! Found {len(results)} results")

    except WebDriverException as e:
        logger.error(f"WebDriver error: {str(e)}")
    except Exception as e:
        logger.error(f"Songview scraping error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

    return results


def parse_songview_result(row, detail_section=None) -> dict:
    """
    Parse a Songview result row and its detail section.

    BMI Songview HTML structure (2024+):
    <a class="opener result-row-small-browser">
      <table>
        <tr>
          <td class="song-title">SONG TITLE</td>
          <td>WORK_ID</td>
          <td><span class="status-txt">...</span></td>
          <td>
            <strong class="title hide-for-large">Writer / Composer</strong>
            <ul><li>WRITER NAME</li></ul>
          </td>
          <td>
            <strong class="title hide-for-large">PERFORMER</strong>
            <ul><li>PERFORMER NAME</li></ul>
          </td>
        </tr>
      </table>
    </a>
    """
    result = {
        'source': 'Songview',
        'title': '',
        'writers': '',
        'performers': '',
        'publishers': '',
        'iswc': '',
        'bmi_work_id': '',
        'ascap_work_id': '',
        'writers_detail': [],    # [{name, affiliation, ipi}, ...]
        'publishers_detail': []  # [{name, affiliation, ipi}, ...]
    }

    # Get the song title from the row
    title_elem = row.select_one('td.song-title')
    if title_elem:
        # Get text but clean up the award indicator
        title_text = title_elem.get_text(strip=True)
        # Remove "BMI Award Winning Song" tooltip text
        title_text = re.sub(r'BMI Award Winning Song', '', title_text).strip()
        result['title'] = title_text

    # NEW: Get all td cells and extract writers/performers from ul/li structure
    all_cells = row.select('td')

    for cell in all_cells:
        # Check for header text to identify the column
        strong = cell.select_one('strong.title')
        header_text = strong.get_text(strip=True).lower() if strong else ''

        # Get all list items in this cell
        list_items = cell.select('ul li')
        # Only get visible items (some are hidden with display:none)
        visible_items = []
        for li in list_items:
            style = li.get('style', '')
            if 'display: none' not in style and 'display:none' not in style:
                text = li.get_text(strip=True)
                if text:
                    visible_items.append(text)

        if visible_items:
            if 'writer' in header_text or 'composer' in header_text:
                result['writers'] = ', '.join(visible_items)
            elif 'performer' in header_text:
                result['performers'] = ', '.join(visible_items)
            elif 'publisher' in header_text:
                result['publishers'] = ', '.join(visible_items)
            else:
                # No header but has list items - check position
                # Writers are typically before performers in the table
                if not result['writers'] and cell != title_elem:
                    # First cell with list items after title might be writers
                    pass
                elif not result['performers']:
                    # Second might be performers
                    pass

    # If no writers found from header, try finding by position/content
    if not result['writers']:
        # Look for any cell with Writer text
        for cell in all_cells:
            cell_text = cell.get_text()
            if 'Writer' in cell_text:
                list_items = cell.select('ul li')
                if list_items:
                    writers = [li.get_text(strip=True) for li in list_items if li.get_text(strip=True)]
                    result['writers'] = ', '.join(writers)
                    break

    # If no performers found from header, try finding by position/content
    if not result['performers']:
        # Look for any cell with PERFORMER text (BMI uses uppercase)
        for cell in all_cells:
            cell_text = cell.get_text()
            if 'PERFORMER' in cell_text or 'Performer' in cell_text:
                list_items = cell.select('ul li')
                if list_items:
                    performers = [li.get_text(strip=True) for li in list_items if li.get_text(strip=True)]
                    result['performers'] = ', '.join(performers)
                    break

    # Parse the detail section for additional/more complete info
    if detail_section:
        # Find Writers / Composers section
        writers_section = detail_section.find('strong', string=re.compile(r'Writers?\s*/?\s*Composers?', re.I))
        if writers_section:
            parent = writers_section.find_parent('div') or writers_section.find_parent('section') or writers_section.find_parent('td')
            if parent:
                writer_links = parent.select('a[href*="WriterList"]')
                if writer_links:
                    writers = [link.get_text(strip=True) for link in writer_links]
                    if writers:
                        result['writers'] = ', '.join(writers)

        # Find Performers section
        performers_section = detail_section.find('strong', string=re.compile(r'Performers?', re.I))
        if performers_section:
            parent = performers_section.find_parent('div') or performers_section.find_parent('section') or performers_section.find_parent('td')
            if parent:
                performer_links = parent.select('a[href*="Performer"]')
                if performer_links:
                    performers = [link.get_text(strip=True) for link in performer_links]
                    if performers:
                        result['performers'] = ', '.join(performers)

        # Find Publishers section
        publishers_section = detail_section.find('strong', string=re.compile(r'Publishers?', re.I))
        if publishers_section:
            parent = publishers_section.find_parent('div') or publishers_section.find_parent('section') or publishers_section.find_parent('td')
            if parent:
                publisher_links = parent.select('a[href*="PublisherList"]')
                if publisher_links:
                    publishers = [link.get_text(strip=True) for link in publisher_links if 'View Catalog' not in link.get_text()]
                    if publishers:
                        result['publishers'] = ', '.join(publishers)

    return result


def scrape_ascap_direct(title: str, performer: str = "") -> list:
    """
    Attempt to scrape ASCAP directly using their web interface.
    Falls back gracefully if blocked.

    Args:
        title: Song title to search for
        performer: Optional performer name

    Returns:
        List of dictionaries containing song information
    """
    logger.info(f">>> Starting ASCAP direct search for: '{title}'")

    driver = None
    results = []

    try:
        driver = create_driver()

        # Try ASCAP ACE interface
        logger.info("Navigating to ASCAP ACE...")
        driver.get("https://www.ascap.com/repertory")

        # Wait for page load
        time.sleep(3)

        # Check if we're blocked or redirected
        if "403" in driver.page_source or "Access Denied" in driver.page_source:
            logger.warning("ASCAP is blocking automated access")
            return results

        # Try to find and use search form
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text'], input[type='search'], #searchInput"))
            )

            search_input = driver.find_element(By.CSS_SELECTOR, "input[type='text'], input[type='search'], #searchInput")
            search_input.clear()
            search_input.send_keys(title)
            search_input.send_keys(Keys.RETURN)

            time.sleep(3)

            # Parse results
            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            # Look for result entries
            result_items = soup.select('.result-item, .work-item, .search-result, tr[data-work]')

            for item in result_items:
                result = {
                    'source': 'ASCAP',
                    'title': '',
                    'writers': '',
                    'performers': '',
                    'publishers': ''
                }

                title_elem = item.select_one('.title, .work-title, td:first-child')
                if title_elem:
                    result['title'] = title_elem.get_text(strip=True)
                    results.append(result)

            logger.info(f">>> ASCAP search complete! Found {len(results)} results")

        except TimeoutException:
            logger.warning("ASCAP search form not found or page structure changed")

    except Exception as e:
        logger.error(f"ASCAP scraping error: {str(e)}")
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

    return results


def query_api(songtitle: str, perfname: str = "") -> pd.DataFrame:
    """
    Main entry point: Query both BMI/Songview and ASCAP for music rights information.

    Args:
        songtitle: Song title to search for
        perfname: Optional performer name to filter results

    Returns:
        Pandas DataFrame with combined results
    """
    logger.info(f"=== Starting music rights search ===")
    logger.info(f"Title: '{songtitle}'")
    logger.info(f"Performer: '{perfname}'" if perfname else "Performer: (none)")

    all_results = []

    # Search Songview (primary source - has both ASCAP and BMI data)
    try:
        songview_results = scrape_songview(songtitle, perfname)
        all_results.extend(songview_results)
        logger.info(f"Songview returned {len(songview_results)} results")
    except Exception as e:
        logger.error(f"Songview search failed: {str(e)}")

    # Optionally try ASCAP direct (often blocked, but worth trying)
    # Uncomment if you want to try ASCAP separately:
    # try:
    #     ascap_results = scrape_ascap_direct(songtitle, perfname)
    #     all_results.extend(ascap_results)
    # except Exception as e:
    #     logger.error(f"ASCAP direct search failed: {str(e)}")

    # Convert to DataFrame
    if all_results:
        df = pd.DataFrame(all_results)
        # Standardize column names
        df.columns = [col.title() for col in df.columns]
        # Reorder columns
        cols = ['Source', 'Title', 'Writers', 'Performers', 'Publishers', 'Iswc']
        df = df.reindex(columns=[c for c in cols if c in df.columns])
    else:
        # Return empty DataFrame with expected columns
        df = pd.DataFrame(columns=['Source', 'Title', 'Writers', 'Performers', 'Iswc'])
        logger.warning("No results found from any source")

    df = df.fillna('-')

    logger.info(f"=== Search complete! Total results: {len(df)} ===")
    return df


# For backwards compatibility with existing code
def clean_names(names_list):
    """Clean and format a list of names."""
    cleaned_names = []
    for name in names_list:
        if isinstance(name, list):
            my_lst_str = ', '.join(map(str, name))
            cleaned_names.append(my_lst_str)
        else:
            cleaned_names.append(str(name))
    return cleaned_names


# ============================================================================
# Cover Art API Functions
# ============================================================================

# Producer Tour API base URL - configure via environment variable
PRODUCER_TOUR_API_URL = os.environ.get('PRODUCER_TOUR_API_URL', 'http://localhost:3001')


@lru_cache(maxsize=500)
def get_cover_art_spotify(song_title: str, artist: str = "") -> str:
    """
    Fetch cover art from Producer Tour's Spotify API (higher quality, 640x640).

    Args:
        song_title: Song title to search for
        artist: Optional artist name

    Returns:
        URL to album artwork or empty string if not found
    """
    try:
        query = f"{artist} {song_title}" if artist else song_title

        response = requests.get(
            f"{PRODUCER_TOUR_API_URL}/api/spotify/search",
            params={"q": query, "limit": 1},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('tracks') and len(data['tracks']) > 0:
                return data['tracks'][0].get('image', '')
        elif response.status_code == 503:
            # Spotify not configured, fall back to iTunes
            logger.debug("Spotify API not configured, falling back to iTunes")
            return get_cover_art_itunes(song_title, artist)

    except requests.exceptions.ConnectionError:
        # Producer Tour API not running, fall back to iTunes
        logger.debug("Producer Tour API not available, falling back to iTunes")
        return get_cover_art_itunes(song_title, artist)
    except Exception as e:
        logger.debug(f"Spotify API error: {e}")
        return get_cover_art_itunes(song_title, artist)

    return ""


@lru_cache(maxsize=500)
def get_cover_art_itunes(song_title: str, artist: str = "") -> str:
    """
    Fetch cover art from iTunes Search API (fallback, no auth required).

    Args:
        song_title: Song title to search for
        artist: Optional artist name

    Returns:
        URL to album artwork or empty string if not found
    """
    try:
        # Build search query
        query = song_title
        if artist:
            query = f"{artist} {song_title}"

        url = f"https://itunes.apple.com/search?term={quote_plus(query)}&media=music&entity=song&limit=1"

        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('resultCount', 0) > 0:
                # Get artwork URL and upgrade to higher resolution
                artwork_url = data['results'][0].get('artworkUrl100', '')
                # Replace 100x100 with 300x300 for better quality
                if artwork_url:
                    artwork_url = artwork_url.replace('100x100', '300x300')
                return artwork_url
    except Exception as e:
        logger.debug(f"iTunes API error: {e}")

    return ""


def get_cover_art_batch(results: list, use_spotify: bool = True) -> list:
    """
    Fetch cover art for a batch of results.

    Args:
        results: List of result dictionaries
        use_spotify: If True, try Spotify first (higher quality), fallback to iTunes

    Returns:
        Updated list with 'cover_art' field added
    """
    for result in results:
        title = result.get('title', result.get('Title', ''))
        # Use first writer as artist hint if no performer
        artist = result.get('performers', result.get('Performers', ''))
        if not artist or artist == '-':
            writers = result.get('writers', result.get('Writers', ''))
            if writers and writers != '-':
                # Use first writer name
                artist = writers.split(',')[0].strip()

        # Try Spotify first (640x640), falls back to iTunes (300x300) automatically
        if use_spotify:
            cover_url = get_cover_art_spotify(title, artist)
        else:
            cover_url = get_cover_art_itunes(title, artist)

        result['cover_art'] = cover_url if cover_url else '/static/img/no-cover.png'

    return results


# ============================================================================
# Pagination Support for Songview
# ============================================================================

def scrape_songview_paginated(title: str, performer: str = "", max_pages: int = 10, page_size: int = 20) -> dict:
    """
    Scrape Songview with pagination support for loading all results.

    Args:
        title: Song title to search for
        performer: Optional performer name
        max_pages: Maximum number of pages to scrape (default 10 = 200 results)
        page_size: Results per page (Songview default is 20)

    Returns:
        Dictionary with 'results', 'total_count', 'pages_scraped', 'has_more'
    """
    logger.info(f">>> Starting paginated Songview search for: '{title}'")

    driver = None
    all_results = []
    total_count = 0
    pages_scraped = 0
    has_more = False

    try:
        driver = create_driver()

        # Navigate to Songview
        driver.get("https://repertoire.bmi.com/")
        time.sleep(4)

        # Find and fill search input
        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "Main_Search_Text"))
        )
        search_input.clear()
        search_input.send_keys(title)

        # If performer provided, add to secondary search
        if performer:
            try:
                sub_dropdown = Select(driver.find_element(By.ID, "selectSubSearch"))
                sub_dropdown.select_by_value("Performer")
                sub_input = driver.find_element(By.ID, "Sub_Search_Text")
                sub_input.clear()
                sub_input.send_keys(performer)
            except:
                pass

        # Submit search
        driver.execute_script("Search();")
        time.sleep(4)

        # Handle disclaimer
        if "Disclaimer" in driver.current_url:
            try:
                accept_btn = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.ID, "btnAccept"))
                )
                driver.execute_script("arguments[0].click();", accept_btn)
                time.sleep(3)
            except:
                pass

        time.sleep(5)

        # Parse first page and get total count
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Get total result count
        count_elem = soup.select_one('#results-count')
        if count_elem:
            count_text = count_elem.get_text()
            match = re.search(r'([\d,]+)\s+results?', count_text)
            if match:
                total_count = int(match.group(1).replace(',', ''))
                logger.info(f"Total results available: {total_count}")

        # Parse pages
        for page in range(max_pages):
            pages_scraped = page + 1

            soup = BeautifulSoup(driver.page_source, 'html.parser')
            result_rows = soup.select('a.opener.result-row-small-browser')

            if not result_rows:
                break

            logger.info(f"Page {pages_scraped}: Found {len(result_rows)} results")

            for row in result_rows:
                result = parse_songview_result(row, None)
                if result and result.get('title'):
                    all_results.append(result)

            # Check if there are more pages
            next_btn = soup.select_one('.pagination .next:not(.disabled), [data-page="next"]:not(.disabled)')
            if not next_btn or len(all_results) >= total_count:
                break

            # Navigate to next page
            try:
                next_link = driver.find_element(By.CSS_SELECTOR, '.pagination .next a, [data-page="next"]')
                driver.execute_script("arguments[0].click();", next_link)
                time.sleep(3)
            except:
                break

        has_more = len(all_results) < total_count

    except Exception as e:
        logger.error(f"Paginated scraping error: {e}")
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

    return {
        'results': all_results,
        'total_count': total_count,
        'pages_scraped': pages_scraped,
        'has_more': has_more,
        'fetched_count': len(all_results)
    }


def query_api_with_pagination(songtitle: str, perfname: str = "", page: int = 1, per_page: int = 20, include_cover_art: bool = True) -> dict:
    """
    Query API with pagination support and optional cover art.

    Args:
        songtitle: Song title to search
        perfname: Optional performer name
        page: Page number (1-indexed)
        per_page: Results per page
        include_cover_art: Whether to fetch cover art

    Returns:
        Dictionary with paginated results
    """
    logger.info(f"=== Paginated search: '{songtitle}' page {page} ===")

    # Scrape with pagination
    scraped = scrape_songview_paginated(songtitle, perfname, max_pages=page, page_size=per_page)

    results = scraped['results']

    # Calculate pagination slice
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    page_results = results[start_idx:end_idx] if start_idx < len(results) else []

    # Fetch cover art if requested
    if include_cover_art and page_results:
        page_results = get_cover_art_batch(page_results)

    return {
        'results': page_results,
        'total_count': scraped['total_count'],
        'page': page,
        'per_page': per_page,
        'total_pages': (scraped['total_count'] + per_page - 1) // per_page if scraped['total_count'] > 0 else 0,
        'has_more': scraped['has_more'] or end_idx < len(results),
        'fetched_count': scraped['fetched_count']
    }


def scrape_mlc(title: str, writer: str = "") -> list:
    """
    Scrape the MLC (Mechanical Licensing Collective) public work search.

    The MLC handles mechanical royalties in the US. This search finds:
    - Registered works
    - HFA Song Codes
    - Writers/Composers
    - Publishers
    - Ownership shares

    Args:
        title: Song title to search for
        writer: Optional writer name to filter results

    Returns:
        List of dictionaries containing MLC work information
    """
    logger.info(f">>> Starting MLC search for: '{title}'" + (f" by writer '{writer}'" if writer else ""))

    driver = None
    results = []

    try:
        driver = create_driver()

        # Navigate to MLC public search
        logger.info("Navigating to MLC portal (portal.themlc.com/search)...")
        driver.get("https://portal.themlc.com/search#work")

        # Wait longer for React SPA to fully hydrate
        time.sleep(6)

        # Save initial page state for debugging
        with open("/tmp/mlc_debug_initial.html", "w") as f:
            f.write(driver.page_source)

        # Try multiple approaches to find and interact with the search input
        search_success = False

        # Approach 1: Try direct URL with query parameter
        try:
            encoded_title = quote_plus(title)
            direct_url = f"https://portal.themlc.com/search?term={encoded_title}#work"
            logger.info(f"Trying direct URL approach: {direct_url}")
            driver.get(direct_url)
            time.sleep(5)
            search_success = True
        except Exception as e:
            logger.debug(f"Direct URL approach failed: {e}")

        if not search_success:
            # Approach 2: Click on Work tab first
            try:
                work_tabs = driver.find_elements(By.XPATH, "//button[contains(text(), 'Work')] | //a[contains(text(), 'Work')] | //span[contains(text(), 'Work')]/parent::*")
                for tab in work_tabs:
                    try:
                        driver.execute_script("arguments[0].click();", tab)
                        time.sleep(2)
                        break
                    except:
                        continue
            except:
                logger.debug("Work tab not found")

            # Approach 3: Use JavaScript to find and set input value
            try:
                # Find any visible text input on the page
                inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type='hidden'])")
                for inp in inputs:
                    try:
                        if inp.is_displayed():
                            # Use JavaScript to set the value (bypasses React state issues)
                            driver.execute_script(
                                """
                                arguments[0].value = arguments[1];
                                arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
                                arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
                                """,
                                inp, title
                            )
                            time.sleep(1)
                            # Try to submit
                            inp.send_keys(Keys.RETURN)
                            time.sleep(3)
                            search_success = True
                            logger.info(f"Successfully entered search term using JavaScript")
                            break
                    except Exception as e:
                        logger.debug(f"Input interaction failed: {e}")
                        continue
            except Exception as e:
                logger.debug(f"JavaScript approach failed: {e}")

        # Save debug HTML after search attempt
        with open("/tmp/mlc_debug.html", "w") as f:
            f.write(driver.page_source)

        # Wait for results to load
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr, .search-results, .result-item"))
            )
        except TimeoutException:
            logger.info("No results found or timeout waiting for results")
            return results

        # Parse the results
        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # Save debug HTML
        with open("/tmp/mlc_results_debug.html", "w") as f:
            f.write(driver.page_source)

        # Look for result rows in a table
        result_rows = soup.select('table tbody tr')
        if not result_rows:
            # Try alternative selectors
            result_rows = soup.select('.search-result, .result-item, .work-result')

        logger.info(f"Found {len(result_rows)} MLC result rows")

        for row in result_rows[:20]:  # Limit to first 20
            result = {
                'source': 'MLC',
                'title': '',
                'hfa_code': '',  # HFA Song Code
                'writers': [],
                'publishers': [],
                'share_percentage': '',
                'iswc': ''
            }

            # Try to extract data from table cells
            cells = row.find_all('td')
            if cells:
                # Common MLC table structure: Title, Writers, Publishers, HFA Code
                if len(cells) >= 1:
                    title_cell = cells[0]
                    title_link = title_cell.find('a')
                    result['title'] = title_link.get_text(strip=True) if title_link else title_cell.get_text(strip=True)

                if len(cells) >= 2:
                    result['writers'] = [w.strip() for w in cells[1].get_text(strip=True).split(',') if w.strip()]

                if len(cells) >= 3:
                    result['publishers'] = [p.strip() for p in cells[2].get_text(strip=True).split(',') if p.strip()]

                if len(cells) >= 4:
                    result['hfa_code'] = cells[3].get_text(strip=True)

            # Also try to find ISWC if present
            iswc_match = re.search(r'T\d{9,11}', row.get_text())
            if iswc_match:
                result['iswc'] = iswc_match.group()

            # Only add if we got a title
            if result['title']:
                results.append(result)
                logger.info(f"Parsed MLC result: '{result['title']}' - Writers: {len(result['writers'])}")

        logger.info(f">>> MLC search complete! Found {len(results)} results")
        return results

    except WebDriverException as e:
        logger.error(f"WebDriver error: {e}")
        return results
    except Exception as e:
        logger.error(f"Error scraping MLC: {e}")
        return results
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


if __name__ == "__main__":
    # Test the scraper
    import sys

    title = sys.argv[1] if len(sys.argv) > 1 else "Hello"
    performer = sys.argv[2] if len(sys.argv) > 2 else ""

    results = query_api(title, performer)
    print("\n" + "="*60)
    print("RESULTS:")
    print("="*60)
    print(results.to_string())

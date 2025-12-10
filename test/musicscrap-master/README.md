# MusicScrap
Python scraper that looks for song title and writers/performers information in BMI and ASCAP databases, saves the data into a Pandas DataFrame and expose the results in an HTML table. (Flask, Selenium, BeautifulSoup, Pandas)

## Instalation
To install dependencies:

`pip3 install -r requirements.txt`

## Install Chromedriver 

Please download Chromedriver from https://sites.google.com/a/chromium.org/chromedriver/downloads and place it somewhere on your PATH

This app was tested with:
Chrome: Versión 74.0.3729.169 (Build oficial) (64 bits)
ChromeDriver 74.0.3729.6 https://chromedriver.storage.googleapis.com/index.html?path=74.0.3729.6/

## API Documentation

### Endpoints

#### GET /api/search
Search for music data across BMI and ASCAP databases.

**Parameters:**
- `title` (required): Song title to search for
- `performer` (optional): Performer name to filter results

**Example Request:**
```
GET /api/search?title=hello&performer=adele
```

**Response:**
```json
{
  "status": "success",
  "query": {
    "title": "hello",
    "performer": "adele"
  },
  "results": [
    {
      "Source": "ASCAP",
      "Titles": "Hello",
      "Writers": "Adele Adkins, Greg Kurstin",
      "Performers": "Adele"
    }
  ],
  "count": 1
}
```

#### GET /api/health
Health check endpoint for the API.

**Response:**
```json
{
  "status": "healthy",
  "service": "MusicScrap API",
  "version": "2.0.0",
  "checks": {
    "bmi_website": "reachable",
    "ascap_api": "reachable",
    "scraper": "operational"
  }
}
```

#### GET /health
Basic health check for the web application.

**Response:**
```json
{
  "status": "healthy",
  "service": "MusicScrap",
  "checks": {
    "bmi_website": "reachable",
    "ascap_api": "reachable",
    "scraper": "operational"
  }
}
```

## Troubleshooting

### Common Issues

#### ChromeDriver Issues
**Problem:** `WebDriverException: Message: 'chromedriver' executable needs to be in PATH`

**Solution:**
1. Install ChromeDriver using WebDriver Manager (already configured)
2. Or manually download from https://chromedriver.chromium.org/downloads
3. Ensure ChromeDriver version matches your Chrome browser version

#### Selenium Timeout Errors
**Problem:** `TimeoutException: Message: timeout`

**Solutions:**
1. Check your internet connection
2. BMI/ASCAP websites may be slow - try again later
3. Increase timeout values in `music_scraper.py` if needed

#### No Results Found
**Problem:** Search returns no results

**Possible causes:**
1. Song title spelling or formatting
2. Song not registered with BMI/ASCAP
3. Performer name filter too restrictive
4. Website changes requiring scraper updates

#### Docker Issues
**Problem:** Container fails to start

**Solutions:**
1. Ensure Docker and docker-compose are installed
2. Check port 5000 is not in use: `lsof -i :5000`
3. Rebuild containers: `docker-compose up --build`

#### Memory Issues
**Problem:** Application crashes with memory errors

**Solutions:**
1. Reduce ThreadPoolExecutor workers in `music_scraper.py`
2. Close browser instances properly
3. Monitor system resources during scraping

### Debug Mode
Run the application in debug mode for detailed error messages:
```bash
export FLASK_ENV=development
python main.py
```

### Logs
Check application logs for detailed error information:
- Web interface logs appear in console
- Use logging level DEBUG for more verbose output

## Security Considerations

### Input Validation
- All user inputs are validated and sanitized using WTForms validators
- HTML escaping is applied to prevent XSS attacks
- Regex patterns restrict input to safe characters only

### Rate Limiting
- Flask-Limiter is implemented to prevent abuse
- Default limits: 100 requests per hour per IP
- Configurable via environment variables

### HTTPS
- Always deploy behind HTTPS in production
- Set `SESSION_COOKIE_SECURE=True` for secure cookies
- Use `SESSION_COOKIE_HTTPONLY=True` to prevent XSS access

### Environment Variables
- Never commit secrets to version control
- Use `.env` files for local development
- Set secure permissions on environment files

### Docker Security
- Run containers as non-root user
- Use minimal base images
- Regularly update base images for security patches
- Don't expose unnecessary ports

### Web Scraping Considerations
- Respect robots.txt files (BMI and ASCAP)
- Implement reasonable delays between requests
- Handle CAPTCHAs gracefully
- Monitor for website changes that may indicate blocking

### Data Privacy
- No user data is stored permanently
- Search history is stored in session only
- Logs don't contain sensitive information

### Dependencies
- Regularly update dependencies for security patches
- Use `pip-audit` to check for known vulnerabilities
- Pin dependency versions in production

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

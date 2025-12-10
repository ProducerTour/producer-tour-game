class ScrapingError(Exception):
    """Base exception for scraping errors"""
    pass

class BMIScrapingError(ScrapingError):
    """Exception for BMI scraping errors"""
    pass

class ASCAPApiError(ScrapingError):
    """Exception for ASCAP API errors"""
    pass

class NetworkError(ScrapingError):
    """Exception for network-related errors"""
    pass

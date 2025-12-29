# Landing Page Carousel Images

This folder contains images for the landing page producer carousel.

## Folder Structure

- **`/producers/`** - Producer and artist photos
- **`/studios/`** - Studio and workspace images
- **`/products/`** - Product screenshots and app interfaces
- **`/events/`** - Event photos and tour images

## How to Add Images

1. **Add your image file** to the appropriate folder
   - Recommended: Use descriptive names (e.g., `alex-rivera.jpg`, `studio-session-1.jpg`)
   - Supported formats: JPG, PNG, WebP
   - Recommended size: 600x400px or similar aspect ratio

2. **Import the image** in `LandingPage.tsx`:
   ```typescript
   import alexRivera from '@/assets/images/carousel/producers/alex-rivera.jpg';
   ```

3. **Add to producersData** array:
   ```typescript
   {
     name: "Alex Rivera",
     genre: "Electronic/House",
     image: alexRivera,  // Add this line
     gradient: "135deg, #3b82f6, #2563eb",  // Fallback if image fails to load
     stats: [
       { value: "2.5M", label: "Streams" },
       { value: "8", label: "Playlists" }
     ],
     accomplishment: "Secured placement on Spotify's Summer Hits playlist"
   }
   ```

## Notes

- The `gradient` field is still required as a fallback
- Images will be automatically optimized by Vite during build
- If no image is provided, the gradient will display instead
- Images maintain the 300px height with responsive width

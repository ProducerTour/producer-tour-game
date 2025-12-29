# Public Images

This folder contains static images that are served as-is without processing.

## Usage

Reference images from this folder using absolute paths:

```tsx
// In any component
<img src="/images/logos/my-logo.png" alt="Logo" />
```

## Folder Structure

- `/logos/` - Logo images for navigation, footer, etc.
- Add more folders as needed

## Notes

- Images here are NOT processed by Vite
- Good for: logos, favicons, static assets
- Bad for: images that need optimization

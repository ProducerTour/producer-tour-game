# Source Assets

This folder contains images that are imported and bundled by Vite.

## Usage

Import images in your components:

```tsx
// In any component
import logo from '@/assets/images/logos/my-logo.png';

function Header() {
  return <img src={logo} alt="Logo" />;
}
```

## Folder Structure

- `/logos/` - Logo images for navigation, footer, etc.
- Add more folders as needed

## Notes

- Images here ARE processed and optimized by Vite
- Good for: images that need optimization, tree-shaking
- Vite adds cache-busting hashes to filenames

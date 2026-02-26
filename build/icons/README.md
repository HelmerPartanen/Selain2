# App icons for packaging

Place packaging icons here for electron-builder:

- **Windows:** `icon.ico` in the `build/` folder (256x256 or multi-size .ico).
- **macOS:** `icon.icns` in the `build/` folder (512x512 or multi-size .icns).
- **Linux:** PNG files in `build/icons/` (e.g. 256.png, 512.png).

If icons are missing, electron-builder will use the default Electron icon. In-app UI continues to use SVGs from `src/renderer/assets/icons/`.

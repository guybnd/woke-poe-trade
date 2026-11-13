---
title: OCR Guide
---

Map scan, essence scan and death recap read the game screen with OCR.
The installer ships the OCR files, and if they go missing (an antivirus can
remove them) the app downloads them again on its own the first time a scan
starts. This guide is for setting them up by hand when that download fails.

### OCR Setup ###

1. Download a 6MB archive with OCR files from [here](https://github.com/SnosMe/awakened-poe-trade/releases/download/v3.20.10007/cv-ocr.zip).

2. Open the folder with the configuration file: paste
   `%APPDATA%\woke-poe-trade\apt-data` into the Explorer address bar.

3. Extract "cv-ocr" folder, inside the archive, into it.\
   You should have the following structure:

   ```
   apt-data/
   ├── config.json
   └── cv-ocr/
      ├── eng.traineddata
      ├── ... more files ...
      └── tesseract-core-simd.wasm
   ```

4. Restart the application.

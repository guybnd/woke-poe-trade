---
title: OCR Guide
---

Map scan, essence scan and death recap read the game screen with OCR.
The installer ships the OCR files; this guide is for setting them up by hand.

### OCR Setup ###

1. Download a 6MB archive with OCR files from [here](https://github.com/SnosMe/awakened-poe-trade/releases/download/v3.20.10007/cv-ocr.zip).

2. Open the folder with configuration file.
   ![](https://i.imgur.com/z5WI9Fx.png)

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

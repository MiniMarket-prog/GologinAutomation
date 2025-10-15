# Buster CAPTCHA Solver Setup Guide

Buster is a free browser extension that automatically solves reCAPTCHA challenges using audio recognition.

## Installation Steps

### Option 1: Download from Chrome Web Store (Recommended)

1. Visit the Buster extension page: https://chrome.google.com/webstore/detail/buster-captcha-solver-for/mpbjkejclgfgadiemmefgebjfooflfhl

2. Click "Add to Chrome" to install

3. Find the extension folder:
   - **Windows**: `C:\Users\{YourUsername}\AppData\Local\Google\Chrome\User Data\Default\Extensions\mpbjkejclgfgadiemmefgebjfooflfhl\{version}`
   - **Mac**: `~/Library/Application Support/Google/Chrome/Default/Extensions/mpbjkejclgfgadiemmefgebjfooflfhl/{version}`
   - **Linux**: `~/.config/google-chrome/Default/Extensions/mpbjkejclgfgadiemmefgebjfooflfhl/{version}`

4. Copy the full path to the extension folder (including the version number folder)

### Option 2: Download CRX File

1. Use a CRX downloader tool to download the extension:
   - Visit: https://crxextractor.com/
   - Enter extension ID: `mpbjkejclgfgadiemmefgebjfooflfhl`
   - Download and extract the CRX file

2. Extract the CRX file to a folder (e.g., `C:\extensions\buster\`)

3. Use this folder path in the application

## Using Buster in the Application

### For Single Profile Creation:

1. When creating a local profile, expand "Local Browser Configuration (Optional)"
2. Enter the Buster extension path in the "Buster Extension Path" field
3. Example: `C:\Users\HP\AppData\Local\Google\Chrome\User Data\Default\Extensions\mpbjkejclgfgadiemmefgebjfooflfhl\1.3.0_0`

### For Bulk Profile Creation:

1. In the bulk upload tab, select "Local" as profile type
2. Expand "Local Browser Configuration (Optional)"
3. Enter the Buster extension path
4. This path will be applied to all profiles in the bulk upload

## How It Works

- Buster automatically detects reCAPTCHA challenges on web pages
- When a CAPTCHA appears, Buster clicks the audio challenge button
- It uses speech recognition to solve the audio CAPTCHA
- The process is automatic and requires no manual intervention

## Troubleshooting

**Extension not loading:**
- Make sure the path points to the folder containing `manifest.json`
- Check that the extension folder has read permissions
- Try using the full absolute path

**CAPTCHA not being solved:**
- Buster works best with reCAPTCHA v2 (checkbox CAPTCHA)
- Some CAPTCHAs may be too difficult for Buster to solve
- In such cases, the system will fall back to "Try another method"

**Extension conflicts:**
- Make sure no other CAPTCHA solving extensions are installed
- Disable other extensions that might interfere with automation

## Alternative: System-Wide Extension

If you want Buster to work for all local profiles automatically:

1. Install Buster in your default Chrome profile
2. The extension will be available in all local profiles that use the same Chrome installation
3. No need to specify the path for each profile

## Notes

- Buster is free and open-source
- No API keys or subscriptions required
- Works offline (no external API calls)
- Success rate: ~70-80% for reCAPTCHA v2

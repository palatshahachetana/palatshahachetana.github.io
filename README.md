# Chetana's Tutoring website

Live at https://palatshahachetana.github.io

## What is where
| File | What it is |
|---|---|
| `index.html` | Page shell, security rules (Content-Security-Policy), link-preview tags |
| `app.js` | All the site's code: pages, learning modules, Kids' World, Pune Ride, starting check, teacher console |
| `styles.css` | Colours and layout (Chalk & Marigold theme, dark mode) |
| `config.js` | **The only setting:** the Google Apps Script web-app URL |
| `img/`, `og.jpg`, `three.min.js` | Images and the 3D library (served from here, no outside scripts) |
| `apps-script/Code.gs` | The private data store. Paste into the Google Sheet's Apps Script. **Not run by the website itself.** |
| `tests/` | Automatic tests. GitHub runs them on every upload (Actions tab). |

## Changing something
1. Edit the file on GitHub (pencil icon) or upload a new copy.
2. Open the **Actions** tab: a green tick means every test passed. A red cross means something broke: open it to see which test.
3. The live site updates a minute or two after the upload.

## Run the tests on a computer
```
pip install pytest playwright
python -m playwright install chromium
pytest -q tests
```

## Data and privacy
No data is kept in this repository. Student records live in Chetana's private Google Sheet.
The repository is public (GitHub Pages needs that on the free plan), so never put PINs, phone numbers or other private details in these files.

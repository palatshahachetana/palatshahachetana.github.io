# Chetana's Tutoring website

Live at https://palatshahachetana.github.io

## What is where
| File | What it is |
|---|---|
| `index.html` | Page shell, security rules (Content-Security-Policy), link-preview tags |
| `app.js` | All the site's code: pages, learning modules, Kids' World, Pune Ride, starting check, teacher console |
| `styles.css` | Colours and layout (Chalk & Marigold theme, dark mode) |
| `config.js` | **Settings:** Google Sheet script URL, optional Google sign-in client ID |
| `manifest.webmanifest`, `sw.js` | Lets the site be installed on a phone like an app, and open on weak internet |
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

## Second teacher
Teacher console > Setup > **Add a teacher**: name, their own 6-8 digit PIN, and the batches they teach.
They see only those batches (attendance, class logs, reading levels, notes). They never see fees, parents' numbers or leads.
Turn a teacher off from the same screen. Needs the Google Sheet connection.

## Optional: Sign in with Google for the teacher area
Adds a second lock: the right Google account **and** the PIN.
1. https://console.cloud.google.com > create a project > **APIs & Services > OAuth consent screen**: External, app name "Chetana's Tutoring", her email. Publish it.
2. **Credentials > Create credentials > OAuth client ID** > Web application. Authorised JavaScript origins: `https://palatshahachetana.github.io`. Copy the Client ID.
3. In Apps Script, fill `CLIENT_ID` and `OWNER_EMAIL` inside `setGoogleSignIn`, Run it, then **Deploy > Manage deployments > Edit > New version**.
4. In `config.js`, set `GOOGLE_CLIENT_ID` to the same Client ID and upload.
Each extra teacher then also needs their Google email filled in (Setup > Edit teacher).
To turn it off: run `setGoogleSignIn` with `CLIENT_ID = ''` and clear `GOOGLE_CLIENT_ID` in `config.js`.

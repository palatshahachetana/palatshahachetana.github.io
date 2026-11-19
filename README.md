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

## Teacher console extras
- **Notes:** a notebook per child or general (parent calls, concerns, wins, test results).
- **Weekly updates:** Students > Weekly updates and monthly reports. One WhatsApp message per child: attendance, topics, homework, notes, practice, next test.
- **Roadmaps:** one per batch and subject. Paste the chapters, let it plan the weeks, add school test dates. Tick chapters in the class log; Today warns when a test is close and chapters are left.
- **Documents:** upload PDFs, photos, Word, Excel or PowerPoint (up to 5 MB) on a student's page. They go to Drive folder "Tutoring documents", one folder per child.
  The first upload asks Google for Drive permission again: approve it in Apps Script after redeploying.
- **Assign:** set a chapter or a single practice set for a batch or one child, with a due date. It appears on the child's Kids' Zone page; you see who has finished.
- **Worksheets:** pick a subject, chapters and 10–30 questions; print or save as PDF. The answer key prints on its own page.
- **Cards:** concept card builder for WhatsApp/Instagram posts (square, story or wide), five starter templates, saved on this device.
- **Homework check:** the class log shows the previous class's homework; tap each child: done, late, missing. Missing homework shows on Today and in weekly updates.
- **Test marks:** on each student's page, with a trend line; included in weekly and monthly reports.
- **Parent guide:** public page at #guide (English, Marathi, Hindi), printable.
- Opening any children's area (Kids' Zone, Kids' World, Practice...) locks the teacher console automatically.

## Lesson maker (AI)
Teacher console > **Lessons**: type any topic, pick grade, board, language and number of questions. Gemini drafts a concept page,
worked examples, questions and a concept card. Chetana edits and fixes anything flagged, then **Publish**: it appears under
Learn > Chetana's lessons, and in Assign and Worksheets. She can also write lessons by hand without the AI.
Setup (once): get a free key at https://aistudio.google.com > Get API key. In Apps Script, paste it into `setGeminiKey`, Run, then clear it and save.
Only the topic is sent to the AI. Limit: 40 lessons a day. If Google retires the model, change `MODEL` in `setGeminiKey` and run it again.

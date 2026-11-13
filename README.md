# OpeningsPro

A chess openings trainer you install on your iPhone like an app. Built for improving players around 1000 rating: plain language, short lessons, and spaced repetition so the moves actually stick.

- **Learn** curated openings move by move, with a reason for every move
- **Review** with spaced repetition (FSRS) — positions come back just before you would forget them
- **Quiz** yourself: name the opening, find the next move, spot the trap, judge the position, or take a 20-question timed test
- **Checkmates**: 14 traps with "how to defend", 8 mating patterns, and 1,500 mate-in-1/2/3 puzzles
- **Works offline** and needs no account. Progress is saved on your device (optional cloud sync with Supabase)

## What is inside

| Area | Details |
| --- | --- |
| Curated openings | Italian Game, London System, Queen's Gambit, Vienna Game (White) · 1...e5, Two Knights / Fried Liver defence, Caro-Kann, Scandinavian (vs 1.e4) · Queen's Gambit Declined, Slav (vs 1.d4) · recognise-only: Ruy Lopez, Sicilian, French, King's Indian, Scotch |
| Library | 3,865 named openings from the Lichess openings list, searchable by name or ECO code |
| Puzzles | 1,500 Lichess checkmate puzzles (500 each of mate in 1, 2 and 3), rated 600–1500 |
| Stack | Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui-style components · framer-motion · chess.js · react-chessboard · ts-fsrs · Zustand · Serwist (PWA) · optional Supabase |

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

`npm run dev` is for working on the app; the offline service worker is switched off there. To try the real, installable version:

```bash
npm run build
npm run start
```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (also generates the service worker) |
| `npm run start` | Serve the production build |
| `npm run validate` | Replay every curated line, trap, pattern, library opening and puzzle with chess.js. Fails on any illegal move, and checks that everything labelled "mate" really is checkmate |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, strict mode |
| `npm test` | Unit tests (Vitest): training engine, FSRS scheduling, puzzle handling, quiz generation |

---

## 2. Re-building the data

The data files are already committed in `/data`, so you never *have* to do this. Run the scripts only if you want fresher Lichess data.

```bash
npm run data:openings   # downloads a.tsv–e.tsv and writes data/openings.json
npm run data:puzzles    # streams the ~300 MB puzzle database and writes data/puzzles.json
npm run data:icons      # redraws the app icons in /public
npm run validate        # always run this afterwards
```

Notes:

- **Openings** come from <https://github.com/lichess-org/chess-openings> (CC0). Every line is validated with chess.js and stored with its id, ECO code, name, family, variation, SAN moves, final FEN and the side it mainly concerns.
- **Puzzles** come from <https://database.lichess.org/#puzzles> (CC0). The file is decompressed and read as a stream — it is never loaded into memory. Kept: themes `mateIn1`, `mateIn2` or `mateIn3`, rating 600–1500, popularity above 80; 500 per theme, half of them with an opening tag so the "filter by opening" control is useful. The selection is random but reproducible.
  - Already downloaded the file? Use `npm run data:puzzles -- --file path/to/lichess_db_puzzle.csv.zst`.
  - Needs Node 22.15+ (built-in Zstandard support).
  - Behind a corporate proxy, run it as `NODE_USE_ENV_PROXY=1 npm run data:puzzles`.
- **Curated content** (lessons, traps, mating patterns) is hand-written in `/data/curated/*.ts`. After editing it, run `npm run validate`. The validator also checks that your own moves are consistent inside each opening and that every move has an explanation.

---

## 3. Optional: sync progress with Supabase

Without any setup the app stores progress in the browser and never shows a login. If you want a backup, or the same progress on several devices:

1. Create a free project at <https://supabase.com>.
2. In the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase/migrations/0001_user_progress.sql`](supabase/migrations/0001_user_progress.sql) and press **Run**. This creates the `user_progress` table with Row Level Security, so each person can only read and write their own row.
3. Open **Authentication → URL Configuration** and set:
   - **Site URL** to your app's address (for example `https://openingspro.vercel.app`)
   - **Redirect URLs**: add `https://your-app-address/settings` (and `http://localhost:3000/settings` for local use)
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
5. Give them to the app:
   - locally: copy `.env.example` to `.env.local` and fill in the two values
   - on Vercel: **Project → Settings → Environment Variables**, add both, then redeploy

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

A **Sync** section now appears in Settings. Enter your email, tap the link you receive, and progress syncs automatically. The most recently changed copy wins.

The anon key is designed to be public; the Row Level Security policies are what protect the data.

---

## 4. Put it online with Vercel (step by step)

You need a GitHub account and a free Vercel account.

1. **Get the code onto GitHub.** If this project is already in your GitHub repository, skip this step. Otherwise:
   ```bash
   git add -A
   git commit -m "OpeningsPro"
   git push
   ```
2. Go to <https://vercel.com> and sign in **with GitHub**.
3. Click **Add New… → Project**.
4. Find your repository in the list and click **Import**. (If it is not listed, click **Adjust GitHub App Permissions** and give Vercel access to it.)
5. Leave every setting as it is — Vercel detects Next.js by itself. The build command is `npm run build`.
6. *(Only if you set up Supabase)* open **Environment Variables** and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
7. Click **Deploy** and wait about a minute. You get an address like `https://openingspro.vercel.app`.

From now on, every push to the main branch on GitHub updates the live app automatically. Phones that have it installed pick up the new version the next time they open it with an internet connection.

---

## 5. Install it on your iPhone

1. Open your Vercel address in **Safari** (it must be Safari, not Chrome).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.

OpeningsPro now has its own icon and opens full-screen with no browser bars. Open it once while online so it can save everything; after that it works with no connection at all.

Good to know:

- Progress is stored per device. The Home Screen app and Safari keep separate storage on iOS, so do your training in the installed app.
- If you remove the app from the Home Screen, iOS deletes its saved progress. Set up Supabase sync (section 3) if you want a backup.

---

## How the project is organised

```
data/
  openings.json          Lichess openings (generated)
  puzzles.json           Lichess mate puzzles (generated)
  curated/               Hand-written lessons, traps and mating patterns
scripts/
  build-openings.ts      Downloads and validates the openings list
  build-puzzles.ts       Streams and samples the puzzle database
  generate-icons.ts      Draws the app icons
  validate.ts            npm run validate
src/
  app/                   Screens (Home, Library, Explorer, Repertoire, Train, Quiz, Mates, Progress, Settings)
  components/            Board, trainer and UI components
  lib/
    training/engine.ts   Cards, line runs and review sessions (pure functions)
    srs.ts               FSRS scheduling
    puzzle.ts            Puzzle move handling
    quiz.ts              Quiz question generation
    sound.ts             Web Audio sound effects (no audio files)
  store/                 Zustand stores saved to localStorage
  app/sw.ts              Service worker (offline support)
supabase/migrations/     SQL for optional sync
tests/                   Vitest unit tests
```

### How training works

- Every position where it is your turn is a **card**. Cards are scheduled with FSRS.
- **Learn** plays a whole line with hints. When you finish, each of your moves becomes a card. Moves you got wrong are marked "again" and come back sooner.
- **Review** shows the cards that are due today. A wrong move shakes the board, shows the right move with an arrow, asks you to play it, and marks the card "again".
- **Drill** picks random positions from one opening. It counts towards your accuracy but does not change the review schedule.

---

## Licences and credits

- Opening names and puzzles: [Lichess](https://lichess.org) open data, **CC0**.
- Board and piece graphics: [react-chessboard](https://github.com/Clariity/react-chessboard), **MIT**.
- Move rules: [chess.js](https://github.com/jhlywa/chess.js), BSD-2-Clause. Scheduling: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs), MIT.
- Sounds are generated in the browser with the Web Audio API; the app icon is original artwork. No GPL-licensed boards, piece sets or sounds are used.
- Lessons, traps and mating patterns were written for this app. Every line is replayed by `npm run validate`, and the repertoire lines were also checked with a chess engine for blunders.

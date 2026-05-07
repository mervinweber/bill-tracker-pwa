# Onboarding & GitHub setup

This repo is the working home for the vendor email automation PWA + pipeline. To get started and publish it to your GitHub account:

1. **Create the remote repository**
   - Log into GitHub (https://github.com) and create a new repository (`bill-vendor-email`, `vendor-automation`, etc.). Keep it private or public depending on your policy.
   - Do _not_ initialize the remote with a README/`.gitignore` if you will push this repo as-is.

2. **Link the local repo**
   ```bash
   git remote add origin git@github.com:<your-org>/<repo-name>.git
   git branch -M main                   # if your local default is not `main`
   git push -u origin main
   ```
   Replace `<your-org>` and `<repo-name>` with your GitHub organization/account and repository name. Use SSH or HTTPS depending on how your credentials are set up.

3. **Configure secrets**
   - Store Convex keys, Hookdeck endpoints, FileMaker credentials, and any email parser webhook secrets outside of the repo. Use environment variables or a secrets manager. Add `.env.example` to document the required variables.

4. **Local tooling**
   - Install Node.js 18+ if you haven’t already.
   - Run `npm install` from the repo root.
   - Start the dev server with `npm run dev` (Vite) to preview the PWA.

5. **First worklog**
   - Review `docs/automation-overview.md` to understand the intended pipeline.
   - Sketch the initial Convex schema + sample mutations (save them under `src/convex/` or similar).
   - Begin designing the PWA dashboard (reuse `src/views` or create a new `src/app` entrypoint that mirrors the automation interface).

6. **Daily cadence**
   - Commit early and often once you start making changes, keeping each commit focused (`feat: add parser stub`, `docs: describe Convex schema`).
   - Push to GitHub frequently so collaborators can review progress and connect Hookdeck/webhook tests.

If you’d like me to help craft the initial `package.json` scripts, Convex fixtures, or the first PWA wireframes, just say so and I can start coding them next.

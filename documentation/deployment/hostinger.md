# Deploying the AlphaGrew demo to Hostinger

The demo runs at **https://alphagrew.chromologtechnologies.com** on a Hostinger Premium (shared hosting) plan. The website and the API share that address: the React site is served as files, and `/api/...` goes to Laravel.

## How it works

Shared hosting can pull files from Git, but it cannot run `composer install` or `npm run build`. So GitHub builds the site for it:

1. You merge a change into `main`.
2. The **Deploy to Hostinger** GitHub Action ([.github/workflows/deploy-hostinger.yml](../../.github/workflows/deploy-hostinger.yml)) builds a ready-to-run copy (Laravel with production `vendor/`, the built React site in `public/`, the web server rules) and commits it to the **`hostinger-deploy`** branch.
3. Hostinger's Git deployment pulls `hostinger-deploy` into the subdomain's folder. With auto-deployment on, this happens a few seconds after step 2.

The server keeps its own files between deploys: `.env`, uploaded resumes, photos and logos, and logs are never in Git, so a pull leaves them alone.

---

## One-time setup

### 1. GitHub: let the Action publish the deploy branch

1. Merge the pull request that adds the workflow.
2. **Settings → Actions → General → Workflow permissions**: choose **Read and write permissions**, then **Save**.
3. **Actions → Deploy to Hostinger → Run workflow** (branch `main`). When it finishes, a `hostinger-deploy` branch exists.

Optional repository variables (**Settings → Secrets and variables → Actions → Variables**):

| Variable | Default | Use |
|---|---|---|
| `HOSTINGER_SITE_URL` | `https://alphagrew.chromologtechnologies.com` | The address the site is built for (link previews, canonical URLs). |
| `HOSTINGER_NOINDEX` | `true` | Keeps the demo out of search engines (noindex header and a blocking robots.txt). |

### 2. Hostinger: subdomain, PHP, database, SSL

In **hPanel**, for chromologtechnologies.com:

1. **Domains → Subdomains**: make sure `alphagrew` exists. Note its folder (for example `public_html/alphagrew`). The Git deployment needs this folder **empty**: delete any default `index.php` or `default.php` in it with the File Manager.
2. **Advanced → PHP Configuration**: select **PHP 8.3** (8.2 or newer). Under **PHP extensions**, make sure `intl`, `pdo_mysql`, `zip`, `fileinfo`, `bcmath` and `mbstring` are on.
3. **Databases → Management**: create a MySQL database and user. Write down the database name, user and password (they start with your `u123456789_` prefix).
4. **Security → SSL**: make sure the subdomain has an SSL certificate (Hostinger's free one is fine) and HTTPS is enforced.

### 3. Hostinger: connect Git

1. **Advanced → Git → Create a new repository**:
   - **Repository address**: `https://github.com/chromolog-technologies/alphagrew.git` (the repository is public, so no key is needed)
   - **Branch**: `hostinger-deploy`
   - **Install path**: the subdomain's folder from step 2.1 (as hPanel asks for it, usually relative to `public_html`, for example `alphagrew`)
2. Click **Create**, then **Deploy**. The folder now holds the app.
3. **Auto deployment**: on the same Git page, open **Auto deployment** and copy the **webhook URL**. In GitHub, go to **Settings → Webhooks → Add webhook**, paste it as the **Payload URL**, keep **Just the push event**, and **Add webhook**. From now on, every push to `hostinger-deploy` is pulled automatically.

### 4. Hostinger: configure the app (SSH)

1. **Advanced → SSH Access**: enable SSH and note the command shown (Hostinger uses port **65002**), then connect from a terminal:

   ```bash
   ssh -p 65002 u123456789@<server IP>
   ```

2. Go to the site folder. The exact path is shown in the File Manager; it usually looks like:

   ```bash
   cd ~/domains/chromologtechnologies.com/public_html/alphagrew
   ```

3. Check PHP on the command line is 8.2 or newer:

   ```bash
   php -v
   ```

   If it shows an older version, use the 8.3 binary instead of `php` in every command below (on Hostinger it is usually `/opt/alt/php83/usr/bin/php`).

4. Create the server's settings file from the template and fill in the `<...>` values (database, mailbox password, a **private demo password**):

   ```bash
   cp hostinger.env.example .env
   nano .env
   ```

   Save with Ctrl+O, Enter, then exit with Ctrl+X. Never commit this file or paste its contents anywhere.

5. Create the app key, the database tables and the demo data:

   ```bash
   php artisan key:generate --force
   php artisan migrate --seed --force
   ```

6. Check the storage link exists (it ships in the deploy branch; this recreates it if the host removed it):

   ```bash
   ls -l public/storage || php artisan storage:link
   ```

### 5. Hostinger: the every-minute job

Background work (resume analysis, interview evaluation, readiness scores, offer expiry, cleanup) runs from Laravel's scheduler. **Advanced → Cron Jobs → Custom**, every minute (`* * * * *`):

```bash
cd ~/domains/chromologtechnologies.com/public_html/alphagrew && php artisan schedule:run >> /dev/null 2>&1
```

Use the same folder as in step 4.2, and the full PHP path if step 4.3 needed it.

### 6. Check it

- **https://alphagrew.chromologtechnologies.com**: the home page.
- **https://alphagrew.chromologtechnologies.com/up**: should say the application is up.
- **/login**: sign in as `admin@demo.com` with the demo password you set in `.env` (`owner@demo.com` at **/owner/login**).
- **/contact**: send a test demo request. It should appear in the Owner Console under **CRM & onboarding** and arrive at info@chromologtechnologies.com within a minute (the cron job sends it).

---

## Every update after that

1. Merge the change into `main`. The Action builds and publishes `hostinger-deploy`, and Hostinger pulls it automatically.
2. If the change added database migrations, run them once over SSH:

   ```bash
   cd ~/domains/chromologtechnologies.com/public_html/alphagrew && php artisan migrate --force
   ```

To redeploy without a code change: **GitHub → Actions → Deploy to Hostinger → Run workflow**, or **hPanel → Git → Deploy**.

## Troubleshooting

| Symptom | Check |
|---|---|
| The Action fails at "Commit it to the hostinger-deploy branch" | Workflow permissions must be **Read and write** (setup step 1.2). |
| hPanel Git says the folder is not empty | Empty the subdomain folder (setup step 2.1), then create the repository again. |
| Error 500 | `storage/logs/laravel-*.log` in the site folder. Usually a missing `APP_KEY` (step 4.5) or wrong database details in `.env`. |
| Every API call says "Unauthenticated" | The `Authorization` header must reach PHP; `public/.htaccess` passes it on. Make sure that file was deployed. |
| Demo requests are saved but no email arrives | The cron job (step 5) must run, and the mailbox password in `.env` must be right. |
| Logos or staff photos do not load | `public/storage` link (step 4.6). |

## Security notes

- The repository is public. Use a private `DEMO_PASSWORD` and share it only with people you demo to. Keep `DEMO_RESET_ENABLED=false`.
- `.env` lives only on the server. The web server rules send every request into `public/`, so `.env`, `vendor/` and `storage/` cannot be downloaded, and hidden files return 403.
- The demo is hidden from search engines by default (`HOSTINGER_NOINDEX`).

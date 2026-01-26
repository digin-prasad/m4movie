# How to Set Up a Professional Domain (e.g., m4movie.com)

To change your link from `m4movie.onrender.com` to `m4movie.com`, you need to **buy** the domain and **connect** it to Render.

## Step 1: Purchase the Domain
You need to buy the name from a domain registrar.
- **Where to buy**: [Namecheap](https://www.namecheap.com), [GoDaddy](https://www.godaddy.com), or [Cloudflare](https://www.cloudflare.com).
- **Cost**: Usually $10 - $15 per year.
- **Example**: Search for `m4movie.com`. If it's taken, try `m4movie.net` or `m4movie.org`.

## Step 2: Add Domain to Render
1. Go to your **Render Dashboard**.
2. Click on your **Web Service** (the M4MOVIE app).
3. Go to **Settings** > **Custom Domains**.
4. Click **+ Add Custom Domain**.
5. Enter your domain (e.g., `m4movie.com`).
6. Render will show you two things you need to verify:
    - **CNAME Record**: pointing to `m4movie.onrender.com`
    - **A Record**: pointing to Render's IP address (usually `216.24.57.1`)

## Step 3: Configure DNS (Connect them)
Go back to where you bought the domain (Namecheap, GoDaddy, etc.) and find the **DNS Settings** or **Manage DNS** page.

Add the records Render gave you. It usually looks like this:

| Type | Host / Name | Value / Target |
| :--- | :--- | :--- |
| **CNAME** | `www` | `m4movie.onrender.com` |
| **A** | `@` | `216.24.57.1` (Check Render for exact IP) |

## Step 4: Wait
- It can take **1 hour to 24 hours** for the changes to spread across the internet (Propagation).
- Render will automatically issue a **Free SSL Certificate** (so you get `https://`).

## Done!
Once finished, `https://m4movie.onrender.com` will redirect to your new professional `https://m4movie.com`.

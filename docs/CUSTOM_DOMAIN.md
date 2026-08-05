# Custom domain cutover

Do not perform these steps until the domain has been purchased and its exact spelling is confirmed.

## Values to configure

Replace `CONFIRMED_DOMAIN` below with the purchased domain, without `https://`.

1. Add a root `CNAME` file containing only `CONFIRMED_DOMAIN`, then publish it to `main`.
2. In GitHub repository **Settings → Pages**, set the custom domain to `CONFIRMED_DOMAIN`.
3. At the registrar, configure the apex-domain DNS records GitHub displays and configure `www` as a CNAME to `msriram.github.io`.
4. After GitHub's DNS check succeeds, enable **Enforce HTTPS**.
5. In Supabase **Authentication → URL Configuration**:
   - Set Site URL to `https://CONFIRMED_DOMAIN/`.
   - Add `https://CONFIRMED_DOMAIN/**` to Redirect URLs.
   - Keep `https://msriram.github.io/folsom-fireflies/**` temporarily during the cutover.
6. Set the Supabase Edge Function secret `ALLOWED_SITE_ORIGINS` to:

   ```text
   https://msriram.github.io,https://CONFIRMED_DOMAIN,https://www.CONFIRMED_DOMAIN
   ```

7. Deploy the `firefly-guide` Edge Function.
8. Verify the home page, Google sign-in/out, admin approvals, parent/student access boundaries, accounting, and Ask AI on the custom domain.
9. Keep the old GitHub Pages redirect URL authorized until all active sessions have moved to the custom domain.

Google's OAuth callback remains the Supabase callback URL; no client secret belongs in this repository.

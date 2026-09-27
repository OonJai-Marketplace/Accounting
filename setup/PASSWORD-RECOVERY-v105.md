# Password recovery — version 109

## Is it fixable?

Yes. Version 105 improves the app's password-change flow and its error handling. The actual reported broken email link has not been reproduced against the live deployment: the published app URL and Supabase Auth dashboard settings were not available in this workspace. App changes cannot repair a domain or path that does not load the app.

## One-time setup

1. Publish the complete contents of this package to the same site used to sign in. Include every JavaScript and CSS file, not just index.html and script.js.
2. Open that published site and copy its full HTTPS address, including the repository path for GitHub Pages.
3. Open **Settings → System → Password Recovery**. Paste that address and save. The form displays the exact recovery return address. This convenience setting applies to the current browser.
4. For the same return address on every device, set `window.OJM_PUBLIC_APP_URL` in `scripts/supabase-config.js` to that published address. It takes priority when configured. Leave it empty only when resets are always requested from the correct published site.
5. In the Supabase project, open **Authentication → URL Configuration**:
   - Set **Site URL** to the actual published app address.
   - Add the exact recovery return address shown by the app to **Redirect URLs**, including `?password-recovery=1`.
   - A preview address, localhost, an old site, or a missing GitHub Pages repository path will not reach the right app.
6. Under the **Reset Password email template**, use the normal confirmation link, for example:

   ```html
   <a href="{{ .ConfirmationURL }}">Reset Password</a>
   ```

   Linking only to the home page or `{{ .SiteURL }}` does not include the recovery token. Custom token-hash templates are supported when they return to the app with `type=recovery&token_hash=...`.
7. Request a **new** email after these changes. An old, expired, or consumed link cannot be repaired by updating the app.

## Live acceptance check

Request a reset from the published app, open the newest email, and confirm the **Set a New Password** form appears. Enter matching passwords, save, and then sign in with the new password. Do not share the reset token or full token-bearing URL.

If the browser says the website cannot be reached or shows 404, first verify the destination's domain and path. If the app opens but reports an expired link, request another email. If the form reports a connection failure, retry when connected; it will not falsely report success.

## Implemented and tested locally

- One published HTTPS return address for user and administrator reset requests.
- Recovery mode stays on the password form instead of opening the ordinary workspace.
- SDK-managed recovery sessions and custom token-hash verification.
- Explicit errors for invalid, expired, or consumed links.
- Password confirmation and minimum length checks.
- Password update failure preserves the fields for correction/retry.
- The form clears and returns to Sign In only after an update succeeds.
- Browser tests used controlled authentication responses; no real account password or Supabase Auth dashboard setting was changed.

Official references:
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-email-templates

## Recovery code for local HTML use (version 109)

For an extracted app opened with file://, request a reset using **Forgot password?**. The app also accepts a numeric email recovery code. In Supabase → Authentication → Email Templates → Reset Password, retain the confirmation link and add:

```html
<p>Your password recovery code is: {{ .Token }}</p>
```

Save the template, request a new email, enter its code in the app, then set a new password. This code is issued and verified by Supabase; it is not a bypass or an app-generated password. Internet access and working Supabase email delivery are required. If the email contains only a link, configure the template or use the published-site link flow. Do not change templates to expose tokens in public logs.

Pushing files to a repository only updates recovery if that repository actually deploys the app. The app URL, Supabase URL configuration, and email template must also be correct. These provider settings were not changed by this update.

# GitGift

Gift a heartfelt message to someone special through Git.

## Concept

GitGift delivers a message from one GitHub user to another and records it in the recipient's own repository. Three properties define the design:

1. **Authenticated sender.** The sender signs in with GitHub, and GitHub itself records who wrote the gift.
2. **A specific recipient.** Every gift is addressed to one GitHub user.
3. **Stored in Git.** An accepted gift becomes a row in the recipient's `GitGiftBOX` README, committed with the sender as the commit author.

## How a gift travels

| Step | Actor | What happens on GitHub |
| --- | --- | --- |
| Get a box | Recipient | The recipient creates a public repository named `GitGiftBOX` and installs the GitGift GitHub App on that repository only. |
| Wrap | Sender | An Issue titled `🎁 A gift from @<sender>` is opened on the recipient's box. The message is placed in a fenced code block between `<!-- gitgift:message:start -->` and `<!-- gitgift:message:end -->` markers. The Issue author identifies the sender, so the sender cannot be spoofed. |
| Unwrap | Recipient | The recipient reads the message on their GitGift page and then either adds it to the box or declines it. |
| Add | Recipient | GitGift appends `\| <date linked to the Issue> \| @<sender> \| <message> \|` to the README table and commits it with the sender as author (`<id>+<login>@users.noreply.github.com`) and the recipient as committer. It then closes the Issue as *completed*. |
| Decline | Recipient | The Issue is closed as *not planned*; nothing is committed. |

Adding is idempotent. If the commit succeeded but closing the Issue failed, a retry detects the existing row through the Issue link and only closes the Issue.

Gifts are public, because both the Issue and the README live in a public repository. The send form states this.

A gift can only be sent to a user whose box is ready: the repository exists, its Issues are enabled, and the app is installed on it. GitGift does not notify users who have not set up a box, because doing so would require writing to their account unasked. Instead, the sender can copy a link to the recipient's GitGift page and pass it on; that page shows its owner how to set up the box.

## Sharing and drafts

GitGift never contacts anyone by itself. Instead:

- **Invitations.** When a recipient has no box yet, the sender can share the recipient's GitGift page on X, through the system share sheet, or by copying the link. The page shows its owner how to set up a box. Post text never contains `@login`, because a GitHub username can belong to someone else on X.
- **Drafts.** A message written to someone who cannot receive gifts yet is saved only in the sender's browser (`localStorage`), never on the server. When the sender returns after the recipient has set up a box, the message is restored and can be sent.
- **Share your box.** Owners can share their own page in the same ways.
- **Link previews.** Every page has Open Graph and Twitter card metadata. `src/app/opengraph-image.tsx` and `src/app/[user]/opengraph-image.tsx` render 1200×630 images laid out like GitHub's repository cards (a `<login>/GitGiftBOX` title, the user's avatar and gift count) in Mona Sans, GitHub's open-source typeface (SIL OFL 1.1, from `@fontsource/mona-sans`), using the same cached data as the pages.

## Languages

The interface is available in English, Japanese, Simplified Chinese, Korean, Spanish, Brazilian Portuguese, French and German. The language is chosen from the `gitgift-locale` cookie (set by the selector in the footer) or, failing that, the browser's `Accept-Language` header. It is not part of the URL, because the first path segment is a GitHub username.

- Messages live in `src/i18n/messages/<locale>.ts`. English (`en.ts`) is the reference; TypeScript requires every other locale to define exactly the same keys, and `tests/i18n.test.ts` checks that each translation keeps the same `{placeholders}` and `<tags>`.
- API routes return an error `code` (and `params`) alongside the English `error` text, and the browser shows the message in the user's language.
- Content written to GitHub (Issue titles and bodies, README tables, commit messages) and the Open Graph images stay in English, because their readers' language is unknown.
- To add a language, add it to `LOCALES` in `src/i18n/config.ts`, create its message file, and register it in `src/i18n/messages/index.ts` (and in the test).

## Security model

| Concern | Mitigation |
| --- | --- |
| Token scope | GitGift is a **GitHub App**. A user's token can only act on repositories where the app is installed, i.e. GitGiftBOX repositories. The app requests only *Contents* and *Issues* (read and write). |
| Token lifetime | User tokens expire after 8 hours, and the session lasts at most 8 hours. Signing out revokes the token at GitHub. |
| Token exposure | The token is kept in the encrypted, httpOnly session cookie and used only by Route Handlers under `src/app/api/`. It is never sent to the browser. Octokit redacts it from logged errors. |
| CSRF | The session cookie is `SameSite=Lax`. In addition, every state-changing route requires `Content-Type: application/json` and a same-origin `Origin` header (or `Sec-Fetch-Site: same-origin`). See `src/lib/request-guard.ts`. |
| Sender spoofing | The sender is taken from the Issue author recorded by GitHub, never from the message. |
| Attribution of edited content | Repository owners can edit any Issue in their repository. A gift whose body was last edited by someone other than its author is refused, so text is never committed under a sender's name that they did not write. Git commit authorship is not cryptographically verified in general; the Issue and its edit history are the evidence. |
| Gifts that bypass GitGift | Gift Issues can be created directly on GitHub. Adding a gift therefore re-applies the message validation used on send, and the recipient always reads the message before committing it. |
| Mentions and references | The message is placed in a code block in the Issue, so `@user`, `#123` and URLs do not notify or cross-reference third parties. |
| Forged gift history | The README is written by the box owner, who could type in a row naming anyone. GitGift therefore shows a README row only if it links to an Issue on that box, the Issue was written (and, if edited, last edited) by the user the row names, and the row's message equals the message in the Issue. Other rows are hidden, and the owner is told how many. See `verifyRows` in `src/lib/gift.ts`. |
| Untrusted README values | Rows whose sender is not a valid GitHub login are ignored, and a link is used only if it is a `https://github.com/<user>/GitGiftBOX/issues/<n>` URL, so README content cannot inject links such as `javascript:` or `//other.site`. |
| Markup injection | React renders messages as text. README cells escape `&`, `<`, `>`, `\|`, backslashes and newlines; GitHub sanitises the rendered README. |
| Rate-limit exhaustion | Public profile data (user, box and verified history) is cached for 60 seconds per user (`src/lib/public-data.ts`), so reloading pages does not consume the server's GitHub quota. Adding or declining a gift invalidates the owner's cache. A rejected `GITHUB_TOKEN` is retried after five minutes. |
| Framing and browser hardening | Every response sets `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` (plus `base-uri`, `object-src` and `form-action` restrictions), `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `Permissions-Policy` (`next.config.js`). |
| Abuse | Recipients can decline gifts and can block users on GitHub, which prevents them from opening Issues in the recipient's repositories. |

## Setup

1. Create a GitHub App (*Settings → Developer settings → GitHub Apps → New GitHub App*):
   - **Callback URL**: `<NEXTAUTH_URL>/api/auth/callback/github`
   - **Expire user authorization tokens**: enabled
   - **Webhook**: disabled (uncheck *Active*)
   - **Repository permissions**: *Contents* read and write, *Issues* read and write (*Metadata* read-only is added automatically)
   - **Account permissions**: none
   - **Where can this GitHub App be installed?**: *Any account*
2. Generate a client secret, then create `.env.development.local` (or set the variables in your host):

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `NEXTAUTH_URL` | yes | Public origin of the app, e.g. `http://localhost:3000`. Also the only origin accepted by state-changing routes. |
   | `NEXTAUTH_SECRET` | yes | Secret that encrypts the session cookie. Use at least 32 random bytes, e.g. `openssl rand -base64 32`. |
   | `GITHUB_ID` / `GITHUB_SECRET` | yes | Client ID and client secret of the GitHub App. |
   | `GITHUB_APP_SLUG` | yes | The app's slug, as in `https://github.com/apps/<slug>`. |
   | `GITHUB_TOKEN` | in production | Server-only token for public reads. Use a fine-grained token with access to public repositories only (read-only) and no other permissions. It raises the API rate limit from 60 to 5,000 requests per hour and is required to verify gift history, because GitHub's GraphQL API does not accept unauthenticated requests. Without it, gift history is not shown. |

3. Run `npm install`, then `npm run dev`.

## Development

- `npm test` runs the unit tests in `tests/` with Node's built-in test runner. The tests cover the gift envelope, the README table format, the CSRF guard and token expiry. They require Node.js 22.18 or later, which strips TypeScript types natively.
- `npm run lint` and `npm run build` run the usual Next.js checks.

## Deployment

The app relies on NextAuth and Route Handlers, so it needs a Node.js server (e.g. Vercel). The GitHub Pages workflow in `.github/workflows/nextjs.yml` performs a static export and cannot serve these routes.

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
| Markup injection | React renders messages as text. README cells escape `&`, `<`, `>`, `\|`, backslashes and newlines; GitHub sanitises the rendered README. |
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
   | `GITHUB_TOKEN` | no | Server-only token for public reads. It only raises the API rate limit; an invalid token falls back to unauthenticated requests. |

3. Run `npm install`, then `npm run dev`.

## Development

- `npm test` runs the unit tests in `tests/` with Node's built-in test runner. The tests cover the gift envelope, the README table format, the CSRF guard and token expiry. They require Node.js 22.18 or later, which strips TypeScript types natively.
- `npm run lint` and `npm run build` run the usual Next.js checks.

## Deployment

The app relies on NextAuth and Route Handlers, so it needs a Node.js server (e.g. Vercel). The GitHub Pages workflow in `.github/workflows/nextjs.yml` performs a static export and cannot serve these routes.

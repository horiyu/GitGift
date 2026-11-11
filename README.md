# GitGift

Gift a heartfelt message to someone special through Git.

## Concept

GitGift delivers a message from one GitHub user to another and records it in the recipient's own repository. Three properties define the design:

1. **Authenticated sender.** The sender signs in with GitHub, and GitHub itself records who wrote the gift.
2. **A specific recipient.** Every gift is addressed to one GitHub user.
3. **Stored in Git.** An opened gift becomes a row in the recipient's `GitGiftBOX` README, committed with the sender as the commit author.

## How a gift travels

| Step | Actor | What happens on GitHub |
| --- | --- | --- |
| Get a box | Recipient | `horiyu/GitGiftBOX-Fork` is forked as `<recipient>/GitGiftBOX`, and Issues are enabled on the fork (forks have Issues disabled by default). |
| Wrap | Sender | An Issue titled `🎁 A gift from @<sender>` is opened on the recipient's box. The message sits between `<!-- gitgift:message:start -->` and `<!-- gitgift:message:end -->` markers. The Issue author identifies the sender, so the sender cannot be spoofed. |
| Open | Recipient | On their GitGift page the recipient presses **Open**. GitGift appends `\| <date linked to the Issue> \| @<sender> \| <message> \|` to the README table and commits the change with the sender as author (`<id>+<login>@users.noreply.github.com`) and the recipient as committer. It then closes the Issue as completed. |

Opening is idempotent. If the commit succeeded but closing the Issue failed, a retry detects the existing row through the Issue link and only closes the Issue.

Gifts are public, because both the Issue and the README live in a public repository.

## Setup

1. Create a GitHub OAuth App with the callback URL `<NEXTAUTH_URL>/api/auth/callback/github`.
2. Create `.env.development.local` (or set the variables in your host):

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `NEXTAUTH_URL` | yes | Public origin of the app, e.g. `http://localhost:3000`. |
   | `NEXTAUTH_SECRET` | yes | Secret that encrypts the session JWT. |
   | `GITHUB_ID` / `GITHUB_SECRET` | yes | OAuth App credentials. |
   | `GITHUB_TOKEN` | no | Server-only token for public reads. It only raises the API rate limit; an invalid token falls back to unauthenticated requests. |

3. Run `npm install`, then `npm run dev`.

The app requests the OAuth scopes `read:user public_repo`. The user's access token is stored only in the encrypted session cookie and is used only by the Route Handlers under `src/app/api/`. It is never sent to the browser. Users who signed in before this scope was added must sign in again.

## Development

- `npm test` runs the unit tests for the gift envelope and README table format (`src/lib/gift.ts`) with Node's built-in test runner. It requires Node.js 22.18 or later, which strips TypeScript types natively.
- `npm run lint` and `npm run build` run the usual Next.js checks.

## Deployment

The app relies on NextAuth and Route Handlers, so it needs a Node.js server (e.g. Vercel). The GitHub Pages workflow in `.github/workflows/nextjs.yml` performs a static export and cannot serve these routes.

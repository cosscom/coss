# sdks/ — the generated SDKs

SDKs for Python, Go, Ruby, PHP, Java and .NET, generated from the public API's OpenAPI document
(`apps/api/openapi.json`) by [Fern](https://github.com/fern-api/fern)'s open-source generators,
run locally (`fern generate --local`: Docker, no Fern account). MIT licensed (each its own
`LICENSE`); never copy AGPL code into them. Docs: `apps/site/content/docs/(tools)/sdks/`
(coss.com/docs/sdks), and every operation's sample in each language on its API reference page.

| Directory | Package | Client | Tests |
| --- | --- | --- | --- |
| `python/` | `cosscom` on PyPI (`import coss`; `coss` is taken there) | `coss.Coss`, `coss.AsyncCoss` | `uv venv && uv pip install -e . pytest pytest-asyncio && .venv/bin/pytest` |
| `go/` | `github.com/cosscom/coss-go` (the mirror `cosscom/coss-go`) | `client.NewClient(...)` | `go vet ./... && go test ./...` |
| `ruby/` | `coss` gem | `Coss::Client` | `bundle exec rubocop && bundle exec rake test` |
| `php/` | `coss/coss` (the mirror `cosscom/coss-php`) | `Coss\Coss` | `composer update && composer test` |
| `java/` | `com.coss:coss` on Maven Central | `com.coss.Coss` | `./gradlew test` |
| `dotnet/` | `Coss` on NuGet | `Coss.CossClient` | `DOTNET_ROLL_FORWARD=Major dotnet test src/Coss.Test/Coss.Test.csproj` |

End to end: `bun run --cwd apps/api serve:test` prints `{ base_url, sandbox_key, … }`; each SDK's
e2e test reads it from `COSS_E2E` (that JSON) and is skipped without it, like the drivers'.
CI's `sdks` job runs all of this on the oldest and newest runtime of each: for an SDK whose directory, the
API's contract (`apps/api/openapi.json`, `apps/api/test/serve.ts`) or `integrations/conformance/webhooks.json`
changed, and for all of them nightly.

## How they're made

`bun run sdks:generate [--lang python,go,…]` (`tooling/sdkgen/scripts/generate.ts`), for each
language in turn:

1. **Derive** (`tooling/sdkgen/src/derive.ts`, pure, tested) the spec Fern reads,
   `fern/openapi.sdk.json` (gitignored): every operation's SDK group and method from `SDK_METHODS`
   (the TypeScript SDK's names; a test keeps them equal to `apps/site/src/lib/sdk-samples.ts`);
   `x-fern-retries: disabled` for `NO_RETRY` (what the API doesn't deduplicate); `Coss-Version` as
   one client option instead of a parameter of every method; the key from `COSS_API_KEY`; int64
   integers; names for anonymous schemas; per-language schema renames (`RENAMES`: C# can't have a
   type named like a namespace beside it, so `Email` is `EmailMessage` there).
2. **Generate** with the group of `fern/generators.yml`: pinned generator versions and their
   config (package names, client names, `User-Agent: coss-<language>/<version>`, 2 retries,
   automatic `Idempotency-Key` on every `POST`, reused by its retries). Python and Java are also
   packaged (`--package`, in Docker), the only way they write their project files.
3. **Post-process** (`tooling/sdkgen/src/languages.ts`) what no option covers: 409 is retried
   (an idempotent request still in progress) everywhere; PHP and .NET keep an idempotency key the
   caller passed (their generators overwrite it); Ruby sends the key at all (in its header only),
   and lowercase paths (`require "coss"`); PHP and Ruby send a field the caller sets to null
   (which clears it: a webhook endpoint's `description`, a broadcast's `segment_id`, …) instead of
   dropping it, as the others do through generator options (Java's `OptionalNullable`, .NET's
   `Optional<T?>`); PyPI metadata; name clashes with the `environment` resource. Each edit
   fails loudly when its target is gone: after a generator upgrade, fix the edit (or drop it if
   the generator now does it) and check the SDK's tests.
4. **Snippets**: `tooling/sdkgen/snippets.json`, every operation's sample in every language
   (`reference.md`'s usage examples, with imports and the client's setup added), which the site
   shows as code tabs (`x-codeSamples`, `apps/site/src/lib/openapi.ts`).

The version is `sdks/VERSION` (all six share it); generating writes it into each SDK (but never
into the CHANGELOGs, which Fern would date). Fern's `.fern/metadata.json` records the generating
commit, so it is git-ignored: a regeneration that changes nothing else is no change. On main,
`.github/workflows/sdks-regenerate.yml` runs all of this after every change to the OpenAPI
document or the generator, and when anything changed bumps the minor version, adds a CHANGELOG
entry to each SDK and opens the "Regenerate SDKs" PR. Merging it publishes them
(`release-sdks.yml`). So API pull requests never regenerate (nor need Docker); a generator change
does it in the PR itself.

## Hand-written files

Everything in an SDK directory is generated except what its `.fernignore` lists, which
regeneration keeps: `LICENSE`, `CHANGELOG.md`, the webhook verification, our tests and some
metadata (`ruby/custom.gemspec.rb`, `dotnet/src/Coss/Coss.Custom.props`,
`java/publish.gradle`, applied by the generated `build.gradle`). Never edit a generated file by
hand: change the derive step, the generator config or a post-process edit, and regenerate.

- **Webhook verification** (`verify_webhook` / `VerifyWebhook` / `Webhooks.verify` …, and the
  log drain variant): a port of `packages/sdk/src/webhooks.ts` (Standard Webhooks HMAC, `whsec_`
  secrets, 300 s tolerance, several signatures while a secret rolls, the same error messages).
  The only functions that throw by design. Every SDK runs `integrations/conformance/webhooks.json`
  (read from there, never copied), which `packages/sdk/test/webhooks-conformance.test.ts` checks
  against the TypeScript SDK: change all seven together.
- **Client tests** (`*client*`/`ClientBehaviour*`): headers (`User-Agent`, `Coss-Version`),
  retries of 503 and 409 reusing one `Idempotency-Key`, a caller's key kept, no retry of 4xx or
  of `NO_RETRY` operations. They pin what the post-processing fixes.
- **E2E tests**: send, get, list with `limit`, typed 422 and 404 errors, and reads that must parse
  into the generated models.

## Known differences between the languages

They come from the generators; the docs state each SDK's own behaviour.

- Network errors are retried by Python and PHP only (all retry 408, 409, 429 and 5xx responses).
- Default timeouts: Python 30 s, .NET 30 s, Java 60 s, Ruby 60 s; Go and PHP use the HTTP
  client's (Go: the context).
- Errors: Python, Go, Java and .NET parse the error envelope into a typed `body`; Ruby and PHP
  carry it as JSON text.
- `COSS_BASE_URL` is not read (only `COSS_API_KEY`): pass the base URL option.
- Ruby's send is `send_` (`send` is `Object#send`).

## Publishing

`release-sdks.yml` publishes a version a registry doesn't have yet and tags
`coss-sdk-<language>@<version>`; every job is skipped until the repository variable
`SDKS_PUBLISH` is `true`. Before setting it, once (the GitHub environments deployable from
`main` only, like the existing ones):

1. **PyPI** (`pypi` environment, exists): a (pending) trusted publisher for the project
   `cosscom`: owner `cosscom`, repository `coss`, workflow `release-sdks.yml`, environment `pypi`.
2. **RubyGems** (`rubygems`, exists): a (pending) trusted publisher for the gem `coss`, same
   repository and workflow, environment `rubygems`.
3. **NuGet** (`nuget`, new): a trusted publishing policy on nuget.org for `cosscom/coss`,
   `release-sdks.yml`, environment `nuget`, owned by the account that will own `Coss`; that
   account's name in the repository variable `NUGET_USER`.
4. **Maven Central** (`maven-central`, new): verify the namespace `com.coss` in the Central
   Portal (a DNS TXT record on coss.com, which is on Cloudflare); a Portal user token as
   `MAVEN_CENTRAL_USERNAME` / `MAVEN_CENTRAL_PASSWORD`; a GPG key (published to a keyserver) as
   `SIGNING_KEY` (armored private key) / `SIGNING_PASSWORD`.
5. **Go** (`go-mirror`, new): the public, empty repository `cosscom/coss-go` ("Read-only mirror of
   sdks/go in cosscom/coss"), a deploy key with write access, its private key as the secret
   `COSS_GO_DEPLOY_KEY`.
6. **PHP** (`packagist`, exists): the same with `cosscom/coss-php` and `COSS_PHP_DEPLOY_KEY`; after
   the first push, submit the mirror on packagist.org as `coss/coss` (the vendor of `coss/laravel`).

Never commit to the mirrors.

## Fern

Self-hosted generation is free to run (the CLI and generators are Apache-2.0), though Fern's own
docs list it under their Enterprise plan; a few generator options are marked Enterprise and
unused here. Upgrading: bump `fern.config.json` (the CLI, which `generate.ts` runs as
`bun x fern-api@<version>`) and the generator versions in `generators.yml` deliberately (prefer
releases at least two weeks old), regenerate, and review the diff and the post-processing.

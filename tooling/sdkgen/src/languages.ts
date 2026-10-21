/** The generated SDKs: their generator group (sdks/fern/generators.yml) and directory. */
import { cp, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export type Language = {
  /** Group name in generators.yml. */
  group: "python" | "go" | "ruby" | "php" | "java" | "csharp";
  /** Directory under sdks/. */
  dir: string;
  /**
   * Whether the generator only writes its project files (pyproject.toml, build.gradle) when asked
   * to package the SDK (`fern generate --package`). Packaging builds it too, so it's slow, and
   * it fails before `postProcess` can fix what doesn't compile; the others skip it.
   */
  package: boolean;
};

export const LANGUAGES: readonly Language[] = [
  { group: "python", dir: "python", package: true },
  { group: "go", dir: "go", package: false },
  { group: "ruby", dir: "ruby", package: false },
  { group: "php", dir: "php", package: false },
  { group: "java", dir: "java", package: true },
  { group: "csharp", dir: "dotnet", package: false },
];

/**
 * Fixes what the generators can't be configured to do, after each run. Every edit fails loudly
 * when its target is gone, so a generator upgrade that changes the code is noticed.
 *
 * - 409 is retried like in every other coss.com client (an idempotent request still in progress:
 *   the retry gets the original's result). Python's generator already does.
 * - Python's distribution is `cosscom` (`coss` is taken on PyPI), with its PyPI metadata; the
 *   import stays `coss`.
 * - Ruby sends an Idempotency-Key on every POST, as the other generators do on their own.
 * - Ruby's gem and paths are lowercase (`gem "coss"`, `require "coss"`); the generator names them
 *   after the module (`Coss`). `require "coss"` also loads the hand-written webhooks.rb.
 * - Java publishes through sdks/java/publish.gradle (hand-written): local output has no
 *   publishing configuration.
 * - .NET keeps an Idempotency-Key the caller passes (the generator overwrites it), and the
 *   `environment` resource's property no longer hides `System.Environment` inside the client.
 * - PHP and Ruby send a field the caller sets to null (clearing it) instead of dropping it, and
 *   Ruby keeps the idempotency key out of the request body.
 * - PHP keeps an Idempotency-Key the caller passes (the generator overwrites it), and its
 *   exceptions, named after the Fern organization, become `CossApiException` and `CossException`.
 */
export async function postProcess(language: Language, dir: string): Promise<void> {
  switch (language.group) {
    case "python":
      await replaceIn(join(dir, "pyproject.toml"), /^name = "coss"$/gm, 'name = "cosscom"');
      await replaceIn(
        join(dir, "pyproject.toml"),
        'description = ""\nreadme = "README.md"\nauthors = []\n',
        'description = "The coss.com SDK for Python"\nreadme = "README.md"\nauthors = ["coss.com"]\nlicense = "MIT"\n' +
          'homepage = "https://coss.com/docs/sdks/python"\nrepository = "https://github.com/cosscom/coss"\n',
      );
      await replaceIn(
        join(dir, "src/coss/version.py"),
        'metadata.version("coss")',
        'metadata.version("cosscom")',
      );
      return;
    case "go":
      await replaceIn(
        join(dir, "internal/retrier.go"),
        "return response.StatusCode == http.StatusTooManyRequests ||",
        "return response.StatusCode == http.StatusTooManyRequests ||\n\t\tresponse.StatusCode == http.StatusConflict ||",
      );
      return;
    case "ruby":
      await moveMerging(join(dir, "lib/Coss"), join(dir, "lib/coss"));
      await moveMerging(join(dir, "lib/Coss.rb"), join(dir, "lib/coss.rb"));
      await moveMerging(join(dir, "Coss.gemspec"), join(dir, "coss.gemspec"));
      await replaceIn(
        join(dir, "lib/coss.rb"),
        'require_relative "Coss/',
        'require_relative "coss/',
      );
      await appendTo(join(dir, "lib/coss.rb"), 'require_relative "coss/webhooks"\n');
      await replaceIn(join(dir, "test/test_helper.rb"), '"../lib/Coss"', '"../lib/coss"');
      // A key the caller passes is sent even when it's nil (which clears a field): the model
      // drops nils of optional fields, and marks optional fields as never nullable.
      await replaceIn(
        join(dir, "lib/coss/internal/types/model.rb"),
        "          @data = {}\n",
        "          @data = {}\n          @given = []\n",
      );
      await replaceIn(
        join(dir, "lib/coss/internal/types/model.rb"),
        "              candidate = values.delete(key)\n",
        "              candidate = values.delete(key)\n              @given << field_name\n",
      );
      await replaceIn(
        join(dir, "lib/coss/internal/types/model.rb"),
        "            next if value.nil? && field.optional && !field.nullable\n",
        "            next if value.nil? && field.optional && !field.nullable && !@given&.include?(name)\n",
      );
      // The idempotency key goes in its header only. Where the body is built from the params
      // after it (`send_`, …), the request model would send it in the body too, which the API
      // refuses (an unknown field).
      await replaceInTree(
        join(dir, "lib"),
        ".rb",
        /^( +)(headers\["Idempotency-Key"\] = params\[:idempotency_key\] if params\[:idempotency_key\]\n)(?=\n\1request = Coss::Internal::JSON::Request\.new\(\n(?:\1 {2}.*\n)*?\1 {2}body: [\w:]+\.new\(params\)\.to_h,)/gm,
        "$1$2$1params = params.except(:idempotency_key)\n",
      );
      // `nil.to_h` is `{}`: a nil kept above must stay nil.
      await replaceIn(
        join(dir, "lib/coss/internal/types/model.rb"),
        "            elsif value.respond_to?(:to_h)\n",
        "            elsif !value.nil? && value.respond_to?(:to_h)\n",
      );
      // The base URLs and the `environment` resource share `Coss::Environment`: a class can't
      // also be a module, but a module can hold both.
      await replaceIn(
        join(dir, "lib/coss/environment.rb"),
        "  class Environment\n",
        "  module Environment\n",
      );
      await replaceIn(join(dir, "coss.gemspec"), '"lib/Coss/version"', '"lib/coss/version"');
      await replaceIn(join(dir, "coss.gemspec"), 'spec.name = "Coss"', 'spec.name = "coss"');
      await replaceIn(
        join(dir, "coss.gemspec"),
        'spec.authors = ["Coss"]',
        'spec.authors = ["coss.com"]',
      );
      await replaceIn(
        join(dir, "lib/coss/internal/http/raw_client.rb"),
        "RETRYABLE_STATUSES = [408, 429,",
        "RETRYABLE_STATUSES = [408, 409, 429,",
      );
      // This generator version has the key helper but never sends a key: send one per POST,
      // reused by every retry (a key the caller passes wins).
      await replaceIn(
        join(dir, "lib/coss/internal/http/raw_client.rb"),
        "          auth_headers = resolve_auth_headers\n",
        '          auth_headers = resolve_auth_headers\n          idempotency_headers = request.method.to_s.upcase == "POST" ? { "Idempotency-Key" => Coss::Internal::IdempotencyKey.generate } : {}\n',
      );
      await replaceIn(
        join(dir, "lib/coss/internal/http/raw_client.rb"),
        "              headers: request.encode_headers(protected_keys: protected_header_keys + auth_headers.keys),",
        "              headers: idempotency_headers.merge(request.encode_headers(protected_keys: protected_header_keys + auth_headers.keys)),",
      );
      return;
    case "php":
      await replaceIn(
        join(dir, "src/Core/Client/RetryDecoratingClient.php"),
        "RETRY_STATUS_CODES = [408, 429];",
        "RETRY_STATUS_CODES = [408, 409, 429];",
      );
      // The generated key overwrites the one the caller passed.
      await replaceInTree(
        join(dir, "src"),
        ".php",
        "$headers['Idempotency-Key'] = IdempotencyKey::generate();",
        "$headers['Idempotency-Key'] ??= IdempotencyKey::generate();",
      );
      // A key the caller passes is sent even when it's null (which clears a field): the base
      // class sends fields marked with `_setField`, which the generated constructors never call.
      await replaceInTree(
        join(dir, "src"),
        ".php",
        /^( {8})\$this->(\w+) = \$values\['(\w+)'\] \?\? null;$/gm,
        "$1$this->$2 = $values['$3'] ?? null;\n$1if (array_key_exists('$3', $values)) {\n$1    $this->_setField('$2');\n$1}",
      );
      // The exceptions are named after the Fern organization (`cosscom`).
      for (const name of ["CosscomApiException", "CosscomException"]) {
        const renamed = name.replace("Cosscom", "Coss");
        await rename(
          join(dir, `src/Exceptions/${name}.php`),
          join(dir, `src/Exceptions/${renamed}.php`),
        );
        await replaceInTree(join(dir, "src"), ".php", name, renamed);
        await replaceInTree(join(dir, "tests"), ".php", name, renamed, { required: false });
      }
      return;
    case "java":
      await replaceIn(
        join(dir, "src/main/java/com/coss/core/RetryInterceptor.java"),
        "return statusCode == 408 || statusCode == 429 ||",
        "return statusCode == 408 || statusCode == 409 || statusCode == 429 ||",
      );
      await appendTo(join(dir, "build.gradle"), "\napply from: 'publish.gradle'\n");
      return;
    case "csharp":
      await replaceIn(
        join(dir, "src/Coss/Core/RawClient.cs"),
        "return statusCode is 408 or 429 or",
        "return statusCode is 408 or 409 or 429 or",
      );
      await replaceIn(
        join(dir, "src/Coss.Test/Core/RawClientTests/RetriesTests.cs"),
        "    [TestCase(400)]\n    [TestCase(409)]\n    public async SystemTask SendRequestAsync_ShouldRetry_OnNonRetryableStatusCodes",
        "    [TestCase(400)]\n    public async SystemTask SendRequestAsync_ShouldRetry_OnNonRetryableStatusCodes",
      );
      // The generated key overwrites the one the caller passed.
      await replaceIn(
        join(dir, "src/Coss/Core/HeadersBuilder.cs"),
        "        public Builder Add(string key, string? value)\n",
        "        internal bool Contains(string key) => _headers.ContainsKey(key);\n\n        public Builder Add(string key, string? value)\n",
      );
      await replaceIn(
        join(dir, "src/Coss/Core/IdempotencyHeaderExtensions.cs"),
        "return builder.Add(IdempotencyKeyHeaderName, global::System.Guid.NewGuid().ToString());",
        "return builder.Contains(IdempotencyKeyHeaderName)\n            ? builder\n            : builder.Add(IdempotencyKeyHeaderName, global::System.Guid.NewGuid().ToString());",
      );
      await replaceIn(
        join(dir, "src/Coss/CossClient.cs"),
        "return Environment.GetEnvironmentVariable(env)",
        "return System.Environment.GetEnvironmentVariable(env)",
      );
      return;
  }
}

/** Replaces `pattern` in a generated file, failing when it's gone (the generator changed). */
async function replaceIn(
  path: string,
  pattern: RegExp | string,
  replacement: string,
): Promise<void> {
  const text = await Bun.file(path).text();
  const replaced = text.replaceAll(pattern, replacement);
  if (replaced === text)
    throw new Error(`${path} no longer contains ${pattern}: update postProcess`);
  await Bun.write(path, replaced);
}

/** `replaceIn` on every file with the extension under `root` that contains `from` (at least one). */
async function replaceInTree(
  root: string,
  extension: string,
  from: string | RegExp,
  to: string,
  { required = true } = {},
): Promise<void> {
  let files = 0;
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
    const path = join(entry.parentPath, entry.name);
    const text = await Bun.file(path).text();
    const replaced = text.replaceAll(from, to);
    if (replaced === text) continue;
    await Bun.write(path, replaced);
    files += 1;
  }
  if (files === 0 && required)
    throw new Error(`No file under ${root} contains ${from}: update postProcess`);
}

async function appendTo(path: string, text: string): Promise<void> {
  await Bun.write(path, `${await Bun.file(path).text()}${text}`);
}

/**
 * Renames a generated path to `to`, merging into what's already there (hand-written files the
 * generator kept). Goes through a temporary name, so it also works on case-insensitive file
 * systems, where `from` and `to` are the same path.
 */
async function moveMerging(from: string, to: string): Promise<void> {
  const temporary = `${to}.sdkgen-tmp`;
  await rename(from, temporary);
  if (await exists(to)) {
    await cp(to, temporary, { recursive: true, force: false, errorOnExist: false });
    await rm(to, { recursive: true });
  }
  await rename(temporary, to);
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

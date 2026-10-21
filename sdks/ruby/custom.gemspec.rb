# frozen_string_literal: true

# Hand-written (listed in .fernignore): the gem's metadata, loaded by the generated gemspec.
def add_custom_gemspec_data(spec)
  spec.summary = "The coss.com SDK for Ruby"
  spec.description = "Every endpoint of the coss.com API, typed, with retries, idempotency keys and webhook verification."
  spec.homepage = "https://coss.com/docs/sdks/ruby"
  spec.license = "MIT"
  spec.metadata["source_code_uri"] = "https://github.com/cosscom/coss/tree/main/sdks/ruby"
  spec.metadata["changelog_uri"] = "https://github.com/cosscom/coss/blob/main/sdks/ruby/CHANGELOG.md"
end

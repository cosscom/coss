# frozen_string_literal: true

module Coss
  module Rails
    # The message helpers every coss.com driver shares (`integrations/README.md`, "The message"),
    # mirroring `packages/sdk/src/core/mime.ts`.
    module Mime
      # Headers the API refuses because coss.com or the provider sets them (`RESERVED_HEADERS` in
      # `packages/email/src/schemas.ts`). Mail sets several on every message, so they are dropped.
      RESERVED_HEADERS = %w[
        from to cc bcc reply-to subject sender return-path date message-id mime-version
        content-type content-transfer-encoding content-disposition dkim-signature received
      ].freeze

      # RFC 5322 specials (minus "."): the API refuses them in an unquoted display name.
      NAME_SPECIALS = /["<>,;:@()\[\]\\]/

      PRINTABLE_ASCII = /\A[ -~]*\z/

      # One encoded-word holds at most 75 characters: `=?UTF-8?B?` + base64 + `?=` leaves 63 for
      # the base64, i.e. 45 bytes of UTF-8 (rounded down to whole characters).
      ENCODED_WORD_BYTES = 45

      # What JavaScript's `String#trim` removes (Ruby's `strip` only knows ASCII whitespace).
      TRIM_LEADING = /\A[[:space:]\u{FEFF}]+/
      TRIM_TRAILING = /[[:space:]\u{FEFF}]+\z/

      module_function

      # Whether the API would refuse a custom header with this name.
      def reserved_header?(name)
        lower = name.to_s.downcase
        RESERVED_HEADERS.include?(lower) || lower.start_with?("x-ses-")
      end

      # `addr`, or `Name <addr>` with the name quoted when it needs to be.
      def format_address(address, name = nil)
        trimmed = name.nil? ? "" : trim(utf8(name))
        return address if trimmed.empty?

        display = if NAME_SPECIALS.match?(trimmed)
                    %("#{trimmed.gsub(/["\\]/) { |char| "\\#{char}" }}")
                  else
                    trimmed
                  end
        "#{display} <#{address}>"
      end

      # A header value as the API takes it: one line of printable ASCII. Folded lines are unfolded,
      # other control characters become spaces, and anything non-ASCII becomes RFC 2047
      # encoded-words (`=?UTF-8?B?…?=`). Returns `""` for a value that ends up empty.
      def encode_header_value(value)
        unfolded = trim(utf8(value.to_s).gsub(/\r?\n[ \t]*/, " ").gsub(/\p{Cc}/, " "))
        return unfolded if PRINTABLE_ASCII.match?(unfolded)

        words = []
        chunk = +"".b
        unfolded.each_char do |char|
          if chunk.bytesize + char.bytesize > ENCODED_WORD_BYTES
            words << encoded_word(chunk)
            chunk = +"".b
          end
          chunk << char.b
        end
        words << encoded_word(chunk) unless chunk.empty?
        words.join(" ")
      end

      # Standard, padded base64 without line breaks.
      def base64(bytes)
        [bytes.to_s].pack("m0")
      end

      # `type/subtype` without parameters, lowercase (`text/plain; charset=utf-8` → `text/plain`),
      # `nil` when there is none.
      def media_type(content_type)
        type = content_type.to_s.split(";").first.to_s.strip.downcase
        type.empty? ? nil : type
      end

      # A Content-ID without its angle brackets (`<logo@acme>` → `logo@acme`), `nil` when empty.
      def bare_content_id(content_id)
        id = content_id.to_s.strip.delete_prefix("<").delete_suffix(">")
        id.empty? ? nil : id
      end

      # `value` as a valid UTF-8 string (invalid bytes replaced).
      def utf8(value)
        string = value.to_s
        string = string.dup.force_encoding(Encoding::UTF_8) unless string.encoding == Encoding::UTF_8
        string.valid_encoding? ? string : string.scrub
      end

      def trim(string)
        string.sub(TRIM_LEADING, "").sub(TRIM_TRAILING, "")
      end

      def encoded_word(bytes)
        "=?UTF-8?B?#{base64(bytes)}?="
      end
      private_class_method :encoded_word
    end
  end
end

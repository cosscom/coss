import { API_VERSIONS, VERSION_CHANGES } from "@coss/versioning";

/** Every API version, newest first, with the breaking changes it introduced (from `@coss/versioning`). */
export function ApiChangelog() {
  const [first] = API_VERSIONS;
  return (
    <div className="flex flex-col gap-6">
      {[...API_VERSIONS].reverse().map((version) => {
        const changes = VERSION_CHANGES.filter((change) => change.version === version);
        return (
          <section key={version}>
            <h2
              className="mt-12 scroll-m-20 font-heading font-semibold text-2xl first:mt-0 lg:mt-16"
              id={version}
            >
              <a className="no-underline underline-offset-4 hover:underline" href={`#${version}`}>
                {version}
              </a>
            </h2>
            {version === first ? (
              <p className="mt-4 text-muted-foreground leading-relaxed">
                The first version of the API.
              </p>
            ) : (
              <ul className="my-6 ms-6 list-disc text-muted-foreground">
                {changes.map((change) => (
                  <li className="mt-2" key={change.title}>
                    <strong className="font-medium text-foreground">{change.title}.</strong>{" "}
                    <span className="whitespace-pre-line">{change.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

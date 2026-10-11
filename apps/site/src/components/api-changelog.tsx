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
            <h2 id={version}>{version}</h2>
            {version === first ? (
              <p>The first version of the API.</p>
            ) : (
              <ul>
                {changes.map((change) => (
                  <li key={change.title}>
                    <strong>{change.title}.</strong>{" "}
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

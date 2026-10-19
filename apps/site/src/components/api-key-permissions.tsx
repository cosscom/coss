import { API_KEY_RESOURCES } from "@coss/auth/api-key-permissions";
import { API_KEY_PERMISSIONS } from "@coss/auth/constants";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** Every permission an API key can hold (from `@coss/auth`, which the API enforces). */
export function ApiKeyPermissionsTable() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Resource</DocsTh>
          <DocsTh>Permissions</DocsTh>
          <DocsTh>Covers</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {API_KEY_RESOURCES.map((info) => (
          <DocsTr key={info.resource} id={`permission-${info.resource}`}>
            <DocsTd className="whitespace-nowrap">{info.label}</DocsTd>
            <DocsTd>
              {(API_KEY_PERMISSIONS[info.resource] ?? []).map((action, index) => (
                <span key={action}>
                  {index > 0 ? ", " : null}
                  <code>
                    {info.resource}:{action}
                  </code>
                </span>
              ))}
            </DocsTd>
            <DocsTd>{info.description}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

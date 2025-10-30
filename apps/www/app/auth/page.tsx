import { Metadata } from "next";
import { CodeBlock } from "@workspace/ui/components/code-block";

export const metadata: Metadata = {
  title: "coss.com auth",
  description: "open source is the foundation of all modern software",
}

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.auth.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const users = `// Register a new user
await coss.auth.users.register({
  email: 'jane@example.com',
  password: 'securePassword123',
});

// Log in a user
await coss.auth.users.login({
  email: 'jane@example.com',
  password: 'securePassword123',
});

// Retrieve user profile
await coss.auth.users.retrieve('user_abc123');

// Update user profile
await coss.auth.users.update('user_abc123', {
  name: 'Jane Doe',
});

// Delete user
await coss.auth.users.delete('user_abc123');`;

  const sessions = `// Validate session token
const session = await coss.auth.sessions.validate('session_token_123');

// Log out
await coss.auth.sessions.logout('session_token_123');`;

  const passwordReset = `// Request password reset email
await coss.auth.passwords.requestReset({
  email: 'jane@example.com',
});

// Confirm password reset
await coss.auth.passwords.confirmReset({
  token: 'reset_token_123',
  newPassword: 'newSecurePassword456',
});`;

  const webhooks = `// Webhook events
coss.auth.webhooks.on('user.registered', (event) => {
  console.log('New user registered:', event.data);
});

coss.auth.webhooks.on('user.deleted', (event) => {
  console.log('User deleted:', event.data);
});`;

  const utilities = `// Validate webhook signature
const isValid = coss.auth.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-auth-signature'],
  secret: 'whsec_auth_123',
});`;

  return (
    <main className="container w-full flex-1 mb-16 lg:mb-20">   
      <div className="mt-12 lg:mt-16 max-w-2xl mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Initialization</h2>
        <CodeBlock
          code={initialization}
          language="tsx"
          copyButton={false}
        />   
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Users</h2>
        <CodeBlock
          code={users}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Sessions</h2>
        <CodeBlock
          code={sessions}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Password Reset</h2>
        <CodeBlock
          code={passwordReset}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Webhooks</h2>
        <CodeBlock
          code={webhooks}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Utilities</h2>
        <CodeBlock
          code={utilities}
          language="tsx"
          copyButton={false}
        />                
      </div>
    </main>
  );
}

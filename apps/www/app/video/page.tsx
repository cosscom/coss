import { Metadata } from "next";
import { CodeBlock } from "@workspace/ui/components/code-block";

export const metadata: Metadata = {
  title: "coss.com video",
  description: "open source is the foundation of all modern software",
} 

export default function Page() {
  const initialization = `import { coss } from '@coss';

coss.video.init({
  apiKey: process.env.COSS_KEY,
  environment: 'production', // or 'sandbox'
});`;

  const rooms = `// Create a room
await coss.video.rooms.create({
  name: 'team-sync-0422',
  privacy: 'private',
  config: {
    enableChat: true,
    enableRecording: false,
    maxParticipants: 10,
  },
});

// List rooms
await coss.video.rooms.list();

// Retrieve room details
await coss.video.rooms.retrieve('team-sync-0422');

// Update room settings
await coss.video.rooms.update('team-sync-0422', {
  config: { enableRecording: true },
});

// Delete a room
await coss.video.rooms.delete('team-sync-0422');`;

  const tokens = `// Generate a join token
const token = await coss.video.tokens.create({
  roomName: 'team-sync-0422',
  userId: 'user_abc123',
  role: 'host',
  exp: Math.floor(Date.now() / 1000) + 60 * 60,
});`;

  const participants = `// List participants
await coss.video.participants.list('team-sync-0422');

// Kick a participant
await coss.video.participants.remove('team-sync-0422', 'user_abc123');

// Get participant history
await coss.video.participants.history({
  roomName: 'team-sync-0422',
  userId: 'user_abc123',
});`;

  const recordings = `// Start recording
await coss.video.recordings.start('team-sync-0422');

// Stop recording
await coss.video.recordings.stop('team-sync-0422');

// List past recordings
await coss.video.recordings.list();

// Retrieve a recording
await coss.video.recordings.retrieve('rec_abc123');

// Delete a recording
await coss.video.recordings.delete('rec_abc123');`;

  const webhooks = `// Webhook events
coss.video.webhooks.on('room.started', (event) => {
  console.log(\`Room started: \${event.data.roomName}\`);
});

coss.video.webhooks.on('participant.joined', (event) => {
  const { userId, roomName } = event.data;
  console.log(\`\${userId} joined \${roomName}\`);
});

// Other events:
// room.ended, participant.left, recording.started, recording.stopped`;

  const utilities = `// Validate webhook signature
const isValid = coss.video.utils.verifySignature({
  payload: req.body,
  signature: req.headers['coss-video-signature'],
  secret: 'whsec_video_123',
});`;

  const bonus = `// Generate a meeting URL
const meetingUrl = coss.video.utils.generateJoinUrl({
  roomName: 'team-sync-0422',
  token,
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
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Rooms</h2>
        <CodeBlock
          code={rooms}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Tokens</h2>
        <CodeBlock
          code={tokens}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Participants</h2>
        <CodeBlock
          code={participants}
          language="tsx"
          copyButton={false}
        />                
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Recordings</h2>
        <CodeBlock
          code={recordings}
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
        <h2 className="mt-12 scroll-m-20 font-heading text-2xl first:mt-0 [&+p]:!mt-4 *:[code]:text-2xl text-foreground">Bonus - Meeting URL Generator</h2>
        <CodeBlock
          code={bonus}
          language="tsx"
          copyButton={false}
        />                
      </div>
    </main>
  );
}

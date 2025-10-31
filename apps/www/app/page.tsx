import { PageHeader, PageHeaderHeading } from "@coss/ui/components/page-header";
import { CodeBlock } from "@coss/ui/components/code-block";

export default async function Page() {
  const code = `"dependencies": {
  "@coss/auth": "1.18.6",
  "@coss/video": "1.18.6",
  "@coss/calendar": "1.18.6",
  "@coss/mail": "1.18.6",
  "@coss/sms": "1.18.6",
  "@coss/payments": "1.18.6"
},`;

  return (
    <main className="container w-full flex-1 mb-16 lg:mb-20">
      <PageHeader>
        <PageHeaderHeading>the <span className="relative z-4 before:absolute before:inset-y-0 before:-inset-x-1 before:bg-gradient-to-r before:from-blue-500 before:to-orange-500 before:via-purple-500 before:opacity-16 before:-rotate-1 before:pointer-events-none before:z-4 before:mix-blend-hard-ligt">everything but AI</span> company.</PageHeaderHeading>
      </PageHeader>
      <div className="max-w-2xl mx-auto text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">dear friend,</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6"><strong className="font-medium">open source</strong> is the foundation of all modern software. every app, website, and system we use today is built on open source. it is the most important driver of global GDP growth, powering innovation and businesses worldwide.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">but building and maintaining open source is not easy. for open source to thrive, we need a sustainable model. that&apos;s where <strong className="font-medium">commercial open source software (coss)</strong> can come in: one of the best ways to create open, future-proof software while ensuring long-term success.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6"><a href="https://coss.com" className="font-medium underline underline-offset-4">coss.com</a> is the new holding company of <a href="https://cal.com" className="font-medium underline underline-offset-4">cal.com</a>, the pioneers of open source scheduling infrastructure and cal.com continues to be the &apos;google search&apos; of our alphabet.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">our mission is to build a home for amazing open source projects, giving them the support they need to grow and succeed.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">for developers we are building the coss stack, a one line <code className="relative z-10 text-primary-foreground before:absolute before:inset-0 before:bg-primary before:-rotate-1 before:rounded-xs px-[0.3rem] py-[0.2rem] font-mono text-sm outline-none before:pointer-events-none before:-z-10">npm install @coss</code> package that includes everything you need to build your application, from email, sms, calendar APIs, scheduling, video conferencing, notifications and more.</p>

        <CodeBlock
          code={code}
          language="json"
          title="package.json"
          copyButton={false}
          showLineNumbers={false}
        />

        <p className="leading-relaxed [&:not(:first-child)]:mt-6">to achieve that, we are partnering up with the best-in-class coss companies in the space to offer a unified infrastructure API, react package and a single <code className="relative z-10 before:absolute before:inset-0 before:bg-muted before:-rotate-1 before:rounded-xs px-[0.3rem] py-[0.2rem] font-mono text-sm outline-none before:pointer-events-none before:-z-10">.env</code> environment key: <code className="relative z-10 text-primary-foreground before:absolute before:inset-0 before:bg-primary before:-rotate-1 before:rounded-xs px-[0.3rem] py-[0.2rem] font-mono text-sm outline-none before:pointer-events-none before:-z-10">COSS_KEY=ITSTIMETOBUILD</code></p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">think of this as <strong className="font-medium">react-on-rails</strong>, but with a commercial service attached.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">let us run the infrastructure, so you can focus on writing code.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">open source is the future. and with coss, we&apos;re making sure that future is bright.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">and who knows… maybe one day you can purchase <strong className="font-medium">$COSS</strong> on your favourite <span className="line-through">stack</span> stock exchange.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">if you are interested in coss.com, consider joining the early access <a href="https://i.cal.com/forms/0129f2a8-7b15-4850-b3fb-07944dfacb3c" className="font-medium underline underline-offset-4">waitlist</a> or apply for our <a href="https://cal.com/jobs" className="font-medium underline underline-offset-4">open positions</a>.</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">best,</p>
        <p className="leading-relaxed [&:not(:first-child)]:mt-6">bailey & peer</p>
      </div>
    </main>
  );
}

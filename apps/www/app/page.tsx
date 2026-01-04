import { CodeBlock } from "@coss/ui/shared/code-block";
import { PageHeader, PageHeaderHeading } from "@coss/ui/shared/page-header";

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
    <main className="container mb-16 w-full flex-1 lg:mb-20">
      <PageHeader>
        <PageHeaderHeading>
          the{" "}
          <span className="before:-inset-x-1 before:-rotate-1 relative z-4 before:pointer-events-none before:absolute before:inset-y-0 before:z-4 before:bg-linear-to-r before:from-blue-500 before:via-purple-500 before:to-orange-500 before:opacity-16 before:mix-blend-hard-light">
            everything but AI
          </span>{" "}
          company.
        </PageHeaderHeading>
      </PageHeader>
      <div className="mx-auto max-w-2xl text-muted-foreground [&_a:not([data-slot='button'])]:text-foreground [&_strong]:text-foreground">
        <p className="not-first:mt-6 leading-relaxed">dear friend,</p>
        <p className="not-first:mt-6 leading-relaxed">
          <strong className="font-medium">open source</strong> is the foundation
          of all modern software. every app, website, and system we use today is
          built on open source. it is the most important driver of global GDP
          growth, powering innovation and businesses worldwide.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          but building and maintaining open source is not easy. for open source
          to thrive, we need a sustainable model. that&apos;s where{" "}
          <strong className="font-medium">
            commercial open source software (coss)
          </strong>{" "}
          can come in: one of the best ways to create open, future-proof
          software while ensuring long-term success.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          <a
            className="font-medium underline underline-offset-4"
            href="https://coss.com"
          >
            coss.com
          </a>{" "}
          is the new holding company of{" "}
          <a
            className="font-medium underline underline-offset-4"
            href="https://cal.com"
          >
            cal.com
          </a>
          , the pioneers of open source scheduling infrastructure and cal.com
          continues to be the &apos;google search&apos; of our alphabet.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          our mission is to build a home for amazing open source projects,
          giving them the support they need to grow and succeed.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          for developers we are building the coss stack, a one line{" "}
          <code className="before:-rotate-1 before:-z-10 relative z-10 inline-block px-[0.3rem] py-[0.2rem] font-mono text-primary-foreground text-sm outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-xs before:bg-primary">
            npm install @coss
          </code>{" "}
          package that includes everything you need to build your application,
          from email, sms, calendar APIs, scheduling, video conferencing,
          notifications and more.
        </p>

        <CodeBlock
          code={code}
          copyButton={false}
          language="json"
          showLineNumbers={false}
          title="package.json"
        />

        <p className="not-first:mt-6 leading-relaxed">
          to achieve that, we are partnering up with the best-in-class coss
          companies in the space to offer a unified infrastructure API, react
          package and a single{" "}
          <code className="before:-rotate-1 before:-z-10 relative z-10 px-[0.3rem] py-[0.2rem] font-mono text-[.8125rem] outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-xs before:bg-muted">
            .env
          </code>{" "}
          environment key:{" "}
          <code className="before:-rotate-1 before:-z-10 relative z-10 px-[0.3rem] py-[0.2rem] font-mono text-primary-foreground text-sm outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-xs before:bg-primary">
            COSS_KEY=ITSTIMETOBUILD
          </code>
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          think of this as{" "}
          <strong className="font-medium">react-on-rails</strong>, but with a
          commercial service attached.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          let us run the infrastructure, so you can focus on writing code.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          open source is the future. and with coss, we&apos;re making sure that
          future is bright.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          and who knows… maybe one day you can purchase{" "}
          <strong className="font-medium">$COSS</strong> on your favourite{" "}
          <span className="line-through">stack</span> stock exchange.
        </p>
        <p className="not-first:mt-6 leading-relaxed">
          if you are interested in coss.com, consider joining the early access{" "}
          <a
            className="font-medium underline underline-offset-4"
            href="https://i.cal.com/forms/0129f2a8-7b15-4850-b3fb-07944dfacb3c"
          >
            waitlist
          </a>{" "}
          or apply for our{" "}
          <a
            className="font-medium underline underline-offset-4"
            href="https://cal.com/jobs"
          >
            open positions
          </a>
          .
        </p>
        <p className="not-first:mt-6 leading-relaxed">best,</p>
        <p className="not-first:mt-6 leading-relaxed">bailey & peer</p>
      </div>
    </main>
  );
}

import Link from "next/link";

export function Logo({ ...props }) {
  return (
    <Link href="/" {...props}>
      <h1 className="font-heading text-foreground text-xl leading-none md:text-base lg:text-lg">
        Cal<span className="md:max-lg:sr-only">.com</span>
      </h1>
    </Link>
  );
}

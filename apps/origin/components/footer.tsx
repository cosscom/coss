export default function Footer() {
  return (
    <footer className="before:-inset-x-32 relative mt-16 py-8 before:absolute before:top-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))] md:mt-20">
      <div
        aria-hidden="true"
        className="before:-top-px before:-left-12 before:-ml-px after:-top-px after:-right-12 after:-mr-px before:absolute before:z-10 before:size-[3px] before:bg-ring/50 after:absolute after:z-10 after:size-[3px] after:bg-ring/50"
      />
      <div className="flex justify-between gap-2 max-sm:flex-col max-sm:text-center">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} coss.com
        </p>
      </div>
    </footer>
  );
}

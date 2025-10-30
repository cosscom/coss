function PageHeader({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <h1 className="scroll-m-20 font-heading text-2xl">
        {title}
      </h1>
      <p className="text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

export { PageHeader }
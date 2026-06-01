export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return <section className="p-5">{children}</section>;
}

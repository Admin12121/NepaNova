export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return <section>{children}</section>;
}

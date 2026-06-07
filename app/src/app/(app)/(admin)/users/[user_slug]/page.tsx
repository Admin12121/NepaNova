import User from "./_components";

export default async function Page({
  params,
}: {
  params: Promise<{ user_slug: string }>;
}) {
  const userSlug = decodeURIComponent((await params).user_slug);

  return <User userSlug={userSlug} />;
}

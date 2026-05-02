import SignUpSuccess from "@/components/auth/sign-up-success";

interface SignedUpPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignedUpPage({ searchParams }: SignedUpPageProps) {
  // Extraction sécurisée de l'email depuis les query params (ex: ?email=jean@example.com)
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <main>
      <SignUpSuccess email={email} />
    </main>
  );
}
import NextLink from "next/link";

export const ProjectOverview = () => {
  return (
    <div className="flex flex-col items-center justify-end pb-44 sm:pb-0">
      <h1 className="w-full text-2xl flex-col tracking-tight sm:text-3xl text-primary flex items-center justify-center text-center">
        Hi, I'm Atlas<span className="text-zinc-500 dark:text-gray">How can I help you today?</span>
      </h1>
    </div>
  );
};

const Link = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <NextLink
      target="_blank"
      className="text-blue-500 hover:text-blue-600 transition-colors duration-75"
      href={href}
    >
      {children}
    </NextLink>
  );
};

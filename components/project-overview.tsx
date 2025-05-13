import NextLink from "next/link";

export const ProjectOverview = () => {
  return (
    <div className="flex flex-col items-center justify-end pb-44 sm:pb-0">
      <h1 className="w-full text-2xl sm:text-3xl text-primary flex flex-col items-center tracking-tight text-center">
        {/* Wrapper for the first line to make "Hi, I'm Atlas" a single flex item */}
        <div className="flex items-baseline"> {/* Aligns "Hi, I'm" and "Atlas" along their text baseline */}
          Hi, I'm  {/* Use non-breaking space for proper spacing */}
          <span className="font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            Atlas
          </span>
        </div>

        {/* Second line - sub-headline */}
        {/* Overriding inherited font size to be smaller, adjusting color, and adding margin */}
        <span className="text-zinc-500 dark:text-gray">
          What brings you here today?
        </span>
      </h1>
    </div>
  );
};

// Link component (remains unchanged)
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